import * as Joi from "joi";
import { JoiValidationPipe } from "../../common";

export class JoinRoomPipe extends JoiValidationPipe {
    public buildSchema(): object {
        return Joi.object({
            roomId: Joi.string().required().length(4).regex(/\d{4}/),
            createIfNone: Joi.boolean().required(),
        });
    }
}
