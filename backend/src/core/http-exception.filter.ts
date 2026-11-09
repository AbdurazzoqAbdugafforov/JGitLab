import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resBody = exception.getResponse();

      if (typeof resBody === 'string') {
        response.status(status).json({
          statusCode: status,
          detail: resBody,
          message: resBody,
        });
        return;
      }

      if (typeof resBody === 'object' && resBody !== null) {
        const obj = resBody as Record<string, any>;
        const detail =
          obj.detail !== undefined
            ? obj.detail
            : Array.isArray(obj.message)
              ? obj.message.join('; ')
              : obj.message || exception.message;

        response.status(status).json({
          statusCode: status,
          ...obj,
          detail,
          message:
            typeof detail === 'string'
              ? detail
              : detail?.message || exception.message,
        });
        return;
      }
    }

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: message,
      message,
    });
  }
}
