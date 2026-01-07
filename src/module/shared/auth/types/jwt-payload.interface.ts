// src/auth/types/jwt-payload.interface.ts

export interface JwtPayload {
  /** Nome de usuário (ex: manasses.gomes) */
  username: string;

  /** ID do usuário (subject) - geralmente o pk_utilizador */
  sub: number;

  /** Issued At - timestamp de quando o token foi gerado */
  iat: number;

  /** Expiration - timestamp de quando o token expira */
  exp: number;
}