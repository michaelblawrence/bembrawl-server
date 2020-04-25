import { Injectable } from "@nestjs/common";

@Injectable()
export class DateTimeProvider {
    public getTime(): number {
        return Date.now();
    }
    public msSince(beforeTimeMs: number): number {
        return this.getTime() - beforeTimeMs;
    }
    public msAfter(afterTimeMs: number): number {
        return this.getTime() + afterTimeMs;
    }
}
