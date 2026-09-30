import type { Role } from "./types";

export interface JwtPayload {
  sub: string; // email, set by JwtService.generateToken(email, role)
  role: Role;
  iat: number;
  exp: number;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payloadBase64Url = token.split(".")[1];
    const payloadBase64 = payloadBase64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(payloadBase64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isExpired(payload: JwtPayload): boolean {
  return Date.now() >= payload.exp * 1000;
}
