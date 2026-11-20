import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@pulsewatch/shared';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((res) => {
        // If handler returned pre-structured response with data/message/meta
        if (res && typeof res === 'object' && 'data' in res && 'message' in res) {
          return {
            success: true,
            message: res.message,
            data: res.data,
            meta: res.meta ?? null,
          };
        }

        return {
          success: true,
          message: 'Operation successful',
          data: res,
          meta: null,
        };
      }),
    );
  }
}
