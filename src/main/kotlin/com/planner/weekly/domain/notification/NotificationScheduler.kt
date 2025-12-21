package com.planner.weekly.domain.notification

import com.planner.weekly.domain.plan.PlanStatus
import com.planner.weekly.domain.plan.TaskStatus
import com.planner.weekly.domain.plan.WeeklyPlanRepository
import com.planner.weekly.domain.user.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

@Component
class NotificationScheduler(
    private val weeklyPlanRepository: WeeklyPlanRepository,
    private val notificationService: NotificationService,
    private val userRepository: UserRepository
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val timezone = ZoneId.of("Asia/Seoul")

    // Check task reminders every minute
    @Scheduled(cron = "0 * * * * *")
    fun checkTaskReminders() {
        val now = LocalDateTime.now(timezone)
        val today = now.toLocalDate()

        weeklyPlanRepository.findAll()
            .filter { it.status == PlanStatus.CONFIRMED }
            .forEach { plan ->
                val dailyPlan = plan.dailyPlans[today] ?: return@forEach
                dailyPlan.tasks
                    .filter { it.reminderEnabled && it.scheduledTime != null && it.status == TaskStatus.PENDING }
                    .forEach { task ->
                        val reminderMinutes = task.reminderMinutesBefore ?: 30
                        val reminderTime = task.scheduledTime!!.minusMinutes(reminderMinutes.toLong())

                        if (now.toLocalTime().hour == reminderTime.hour &&
                            now.toLocalTime().minute == reminderTime.minute) {
                            notificationService.createNotification(
                                userId = plan.userId,
                                type = NotificationType.TASK_REMINDER,
                                title = "Task Reminder",
                                message = "\"${task.title}\" is scheduled in $reminderMinutes minutes",
                                relatedPlanId = plan.id,
                                relatedTaskId = task.id
                            )
                            logger.info("Sent task reminder for task: ${task.id}")
                        }
                    }
            }
    }

    // Daily summary at 08:00
    @Scheduled(cron = "0 0 8 * * *")
    fun sendDailySummary() {
        val today = LocalDate.now(timezone)

        weeklyPlanRepository.findAll()
            .filter { it.status == PlanStatus.CONFIRMED && it.isDateInWeek(today) }
            .forEach { plan ->
                val dailyPlan = plan.dailyPlans[today]
                val taskCount = dailyPlan?.tasks?.count { it.status == TaskStatus.PENDING } ?: 0

                if (taskCount > 0) {
                    notificationService.createNotification(
                        userId = plan.userId,
                        type = NotificationType.DAILY_SUMMARY,
                        title = "Today's Tasks",
                        message = "You have $taskCount pending task(s) for today",
                        relatedPlanId = plan.id
                    )
                    logger.info("Sent daily summary for user: ${plan.userId}")
                }
            }
    }

    // Planning reminder at 09:00
    @Scheduled(cron = "0 0 9 * * *")
    fun sendPlanningReminder() {
        val today = LocalDate.now(timezone)
        val users = userRepository.findBySettingsPlanningDay(today.dayOfWeek)

        users.forEach { user ->
            val weekStartDate = today.with(java.time.DayOfWeek.MONDAY)
            val existingPlan = weeklyPlanRepository.findByUserIdAndWeekStartDate(user.id!!, weekStartDate)

            if (existingPlan.isEmpty || existingPlan.get().status == PlanStatus.DRAFT) {
                notificationService.createNotification(
                    userId = user.id,
                    type = NotificationType.PLANNING_REMINDER,
                    title = "Weekly Planning",
                    message = "It's your planning day! Time to plan your week ahead.",
                    relatedPlanId = existingPlan.orElse(null)?.id
                )
                logger.info("Sent planning reminder for user: ${user.id}")
            }
        }
    }

    // Review reminder at 18:00
    @Scheduled(cron = "0 0 18 * * *")
    fun sendReviewReminder() {
        val today = LocalDate.now(timezone)
        val users = userRepository.findBySettingsReviewDay(today.dayOfWeek)

        users.forEach { user ->
            val weekStartDate = today.with(java.time.DayOfWeek.MONDAY)
            val existingPlan = weeklyPlanRepository.findByUserIdAndWeekStartDate(user.id!!, weekStartDate)

            if (existingPlan.isPresent && existingPlan.get().status == PlanStatus.CONFIRMED) {
                notificationService.createNotification(
                    userId = user.id,
                    type = NotificationType.REVIEW_REMINDER,
                    title = "Weekly Review",
                    message = "It's your review day! Take time to reflect on your week.",
                    relatedPlanId = existingPlan.get().id
                )
                logger.info("Sent review reminder for user: ${user.id}")
            }
        }
    }
}
