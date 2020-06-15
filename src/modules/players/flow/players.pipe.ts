import * as Joi from "joi";
import { JoiValidationPipe } from "../../common";

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
