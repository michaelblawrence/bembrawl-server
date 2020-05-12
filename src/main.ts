import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as helmet from "helmet";

import { INestApplication } from "@nestjs/common";
import { ApplicationModule } from "./modules/app.module";
import { CommonModule, LogInterceptor } from "./modules/common";
import { SecuritySchemeObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

const API_DEFAULT_PORT = 4000;
const API_DEFAULT_PREFIX = "/api/v1/";

const SWAGGER_TITLE = "Bembrawl API";
const SWAGGER_DESCRIPTION = "API used for game management";
const SWAGGER_PREFIX = "/docs";

declare const module: any;

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(ApplicationModule);

    if (!process.env.SWAGGER_ENABLE || process.env.SWAGGER_ENABLE === "1") {
        createSwagger(app);
    }

    app.use(bodyParser.json());
    app.use(helmet());
    app.use(
        cors({
            origin: process.env.API_CORS || "*",
        })
    );

    app.setGlobalPrefix(process.env.API_PREFIX || API_DEFAULT_PREFIX);

    const logInterceptor = app.select(CommonModule).get(LogInterceptor);
    app.useGlobalInterceptors(logInterceptor);

    await app.listen(process.env.API_PORT || API_DEFAULT_PORT);

    if (module.hot) {
        module.hot.accept();
        module.hot.dispose(() => app.close());
    }
}

function createSwagger(app: INestApplication) {
    const version = require("../package.json").version || "";

    const bearerAuthOptions: SecuritySchemeObject = {
        bearerFormat: "JWT",
        description: "sessionId",
        type: "http",
    };
    const options = new DocumentBuilder()
        .setTitle(SWAGGER_TITLE)
        .setDescription(SWAGGER_DESCRIPTION)
        .setVersion(version)
        .addServer(process.env.API_PREFIX || API_DEFAULT_PREFIX)
        .addBearerAuth(bearerAuthOptions, "bearer")
        .build();

    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup(SWAGGER_PREFIX, app, document);
}

// tslint:disable-next-line:no-console
bootstrap().catch((err) => console.error(err));
