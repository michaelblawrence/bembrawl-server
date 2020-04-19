import * as Joi from 'joi';
import { JoiValidationPipe } from '../../common';

export class PlayerPipe extends JoiValidationPipe {

    public buildSchema(): object {

        return Joi.object({
            deviceId: Joi.string().required(),//.max(Passenger.NAME_LENGTH),
            sessionId: Joi.string().required(),//.max(Passenger.NAME_LENGTH)
        });

    }
}
