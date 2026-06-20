import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status: HttpStatus = exception.getStatus();
    const timestamp = new Date().toISOString();
    const correlation_id = randomUUID();

    const message = exception.message || 'An unexpected error occurred';
    const error_details = {
      correlation_id,
      status,
      message,
      path: request.url,
      method: request.method,
      query: this.has_keys(request.query) ? request.query : undefined,
      body: this.has_keys(request.body) ? request.body : undefined,
      params: this.has_keys(request.params) ? request.params : undefined,
      timestamp,
    };

    this.logger.error(
      `[${correlation_id}] HTTP ${status} ${message}`,
      JSON.stringify(error_details),
    );

    const redacted_message =
      status === HttpStatus.INTERNAL_SERVER_ERROR
        ? 'An unexpected error occurred. Please try again later.'
        : this.normalize_snake_case(exception.getResponse());

    response.status(status).json({
      correlation_id,
      status,
      message: redacted_message,
      path: request.url,
      timestamp,
    });
  }

  private has_keys(value: unknown): value is Record<string, unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      Object.keys(value).length > 0
    );
  }

  private to_snake_case_key(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[-\s]+/g, '_')
      .toLowerCase();
  }

  private normalize_snake_case(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => this.normalize_snake_case(entry));
    }

    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return Object.entries(value as Record<string, unknown>).reduce<
        Record<string, unknown>
      >((accumulator, [key, entry]) => {
        accumulator[this.to_snake_case_key(key)] =
          this.normalize_snake_case(entry);
        return accumulator;
      }, {});
    }

    return value;
  }
}
