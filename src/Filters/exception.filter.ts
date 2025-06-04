import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    switch (status) {
      case 400:
        const errorResponse = {
          errorsMessages: [],
        };
        const responseBody: any = exception.getResponse();
        if (Array.isArray(responseBody.message)) {
          responseBody.message?.forEach((m) =>
            errorResponse.errorsMessages.push(m),
          );
        }

        response.status(status).json(errorResponse);
        break;
      default:
        response.sendStatus(status);
        break;
    }
  }
}
