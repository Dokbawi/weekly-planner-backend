package com.planner.weekly

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication(
    exclude = [
        de.flapdoodle.embed.mongo.spring.autoconfigure.EmbeddedMongoAutoConfiguration::class
    ]
)
@EnableScheduling
class WeeklyPlannerApplication

fun main(args: Array<String>) {
    runApplication<WeeklyPlannerApplication>(*args)
}
