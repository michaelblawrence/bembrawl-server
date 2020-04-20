
import * as Joi from 'joi';
import * as _ from 'lodash';

import { Service } from '../../tokens';
import { Config } from '../model';

export const configProvider = {

    provide: Service.CONFIG,
    useFactory: (): Config => {

        const env = process.env;

        const result = Joi.validate(env, Joi.object().unknown().keys({
            API_PORT: Joi.string().required(),
            API_PREFIX: Joi.string().required(),
            API_CORS: Joi.string().required(),
            SWAGGER_ENABLE: Joi.string().required(),
            JWT_SECRET: Joi.string().required()
        }));

        if (result.error) {
            throw new Error('Configuration not valid: ' + result.error.message);
        }

        return {
            API_PORT: _.toNumber(env.API_PORT),
            API_PREFIX: `${env.API_PREFIX}`,
            API_CORS: `${env.API_CORS}`,
            SWAGGER_ENABLE: _.toNumber(env.SWAGGER_ENABLE),
            JWT_SECRET: `${env.JWT_SECRET}`
        };
    }

};
