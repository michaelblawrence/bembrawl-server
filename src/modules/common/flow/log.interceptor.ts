import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { LoggerService } from '../provider';

@Injectable()
export class LogInterceptor implements NestInterceptor {

    public constructor(
        private readonly logger: LoggerService
    ) { }

    public intercept(context: ExecutionContext, next: CallHandler): Observable<Response> {

        const startTime = new Date().getTime();
        const request = context.switchToHttp().getRequest();

        return next.handle().pipe(
            map(data => {
                const url = this.getUrl(request);
                if (url.endsWith('/keepalive')) return data;

                const latency = this.getTimeDelta(startTime);
                this.logger.info(`HTTP_OK ${request.method} ${request.ip} ${url} in ${latency}ms`);
                return data;
            }),
            catchError(err => {
                const url = this.getUrl(request);
                const latency = this.getTimeDelta(startTime);

                this.logger.error(`HTTP${err.status} ${request.method} ${request.ip} ${url} in ${latency}ms`);
                return throwError(err);
            })
        );
    }

    private getTimeDelta(startTime: number): number {
        return new Date().getTime() - startTime;
    }

    private getUrl(request: any): string {
        return `${request.protocol}://${request.get('host')}${request.originalUrl}`;
    }

}
