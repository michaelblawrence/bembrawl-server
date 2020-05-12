
import { ArgumentMetadata, HttpException, HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import * as Joi from 'joi';

/* tslint:disable:no-any */

@Injectable()
export abstract class JoiValidationPipe implements PipeTransform<any> {

    public transform(value: any, metadata: ArgumentMetadata) {

        const result = Joi.validate(value, this.buildSchema());

        if (result.error !== null) {
            throw new HttpException({
                message: 'Validation failed',
                detail: result.error.message.replace(/"/g, `'`),
                statusCode: HttpStatus.BAD_REQUEST
            }, HttpStatus.BAD_REQUEST);
        }

        return result.value;
    }

    public abstract buildSchema(): object;

}

export class ClientRegPipe extends JoiValidationPipe {
    public buildSchema(): object {
        return Joi.object({
            deviceId: Joi.string().required().uuid({ version: "uuidv4" }),
        });
    }
}

export class RoomIdPipe extends JoiValidationPipe {
    public buildSchema(): object {
        return Joi.object({
            roomId: Joi.string().required().length(4).regex(/\d{4}/),
        });
    }
}
