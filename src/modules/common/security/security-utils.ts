import { Request } from "express";
import * as jwt from "jsonwebtoken";
import { Role } from "src/modules/tokens";

const PAYLOAD_COMPONENTS = 2;

export function extractTokenPayload<T extends { role?: Role | null }>(
    request: Request
): T | null {
    const header = safeGetAuthHeader(request);
    const chunks = header?.split(" ");

    if (!chunks || chunks.length !== PAYLOAD_COMPONENTS || chunks[0] !== "Bearer")
        return null;

    return extractAuthPayload(chunks[1]);
}

export function extractAuthPayload<T>(token: string): T | null {
    try {
        const env = process.env;
        return jwt.verify(token, `${env.JWT_SECRET}`, {
            algorithms: ["HS256"],
            issuer: "DEFAULT_ISSUER",
        }) as any;
    } catch (err) {
        return null;
    }
}

export function toTokenValue(
    role: Role,
    client?: { sessionId: string; deviceId: string }
): any | null {
    try {
        const env = process.env;
        const token = jwt.sign({ ...client, role }, `${env.JWT_SECRET}`, {
            algorithm: "HS256",
            issuer: "DEFAULT_ISSUER",
        });
        return token;
    } catch (err) {
        return null;
    }
}

function safeGetAuthHeader(request: Request): string | null {
    try {
        return request.header("Authorization") || null;
    } catch {
        return null;
    }
}
