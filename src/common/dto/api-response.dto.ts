import { ApiProperty } from '@nestjs/swagger';

export class ErrorDetail {
  @ApiProperty()
  code: string;

  @ApiProperty()
  message: string;
}

export class ApiResponse<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ required: false })
  data?: T;

  @ApiProperty({ required: false, type: ErrorDetail })
  error?: ErrorDetail;

  static ok<T>(data: T): ApiResponse<T> {
    return { success: true, data };
  }

  static fail(code: string, message: string): ApiResponse<null> {
    return { success: false, error: { code, message } };
  }
}
