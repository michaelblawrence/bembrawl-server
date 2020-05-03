import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { AuthToken } from "./auth-token.pipe";

export function Token() {
    return createParamDecorator((data: string, ctx: ExecutionContext) => {
        return ctx.switchToHttp().getRequest();
    })(AuthToken);
}
