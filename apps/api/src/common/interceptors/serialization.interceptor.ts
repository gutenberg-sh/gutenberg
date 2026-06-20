import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { SERIALIZE_WITH_KEY } from '../decorators/serialize-with.decorator';

@Injectable()
export class SerializationInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const handler = context.getHandler();
    const class_type = this.reflector.get<ClassConstructor<object>>(
      SERIALIZE_WITH_KEY,
      handler,
    );

    return next.handle().pipe(
      map((data: unknown) => {
        if (!class_type) {
          return data;
        }

        if (Array.isArray(data)) {
          return plainToInstance(class_type, data, {
            excludeExtraneousValues: true,
            enableCircularCheck: true,
          });
        }

        return plainToInstance(class_type, data, {
          excludeExtraneousValues: true,
          enableCircularCheck: true,
        });
      }),
    );
  }
}
