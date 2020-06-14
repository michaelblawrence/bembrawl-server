import * as Joi from "joi";
import { JoiValidationPipe } from "../../../common";

export class GuessFirstPipe extends JoiValidationPipe {
    public buildSchema(): object {
        return Joi.object({});
    }
}
