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

        const startTime = new Date().getMilliseconds();
        const request = context.switchToHttp().getRequest();

        return next.handle().pipe(
            map(data => {
                const reqUrl = this.getUrl(request);
                if (reqUrl.endsWith('/keepalive')) return data;
                const responseStatus = (request.method === 'POST') ? HttpStatus.CREATED : HttpStatus.OK;
                const timeJsonStr = new Date().toJSON();
                this.logger.info(`${timeJsonStr} ${this.getTimeDelta(startTime)} ${request.ip} ${responseStatus} ${request.method} ${reqUrl}`);
                return data;
            }),
            catchError(err => {
                // Log fomat inspired by the Squid docs
                // See https://docs.trafficserver.apache.org/en/6.1.x/admin-guide/monitoring/logging/log-formats.en.html
                this.logger.error(`${this.getTimeDelta(startTime)} ${request.ip} ${err.status} ${request.method} ${this.getUrl(request)}`);
                return throwError(err);
            })
        );
    }

    private getTimeDelta(startTime: number): number {
        return new Date().getMilliseconds() - startTime;
    }

    private getUrl(request: any): string {
        return `${request.protocol}://${request.get('host')}${request.originalUrl}`;
    }

}
