import * as Joi from "joi";
import { JoiValidationPipe } from "../../common";

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

export class PlayerNamePipe extends JoiValidationPipe {
    public buildSchema(): object {
        return Joi.object({
            playerName: Joi.string()
                .required()
                .replace(/\s/g, "")
                .max(40)
                .min(1),
        });
    }
}
