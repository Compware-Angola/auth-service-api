// src/auth/types/jwt-payload.interface.ts

export interface JwtPayload {
  /**
   * Nome de usuário do utilizador autenticado
   * Exemplo: "manasses.gomes"
   */
  username: string;

  /**
   * ID único do utilizador (subject claim padrão do JWT)
   * Geralmente corresponde ao pk_utilizador na base de dados
   */
  sub: number;

  /**
   * Issued At - timestamp (em segundos) de quando o token foi gerado
   */
  iat: number;

  /**
   * Expiration - timestamp (em segundos) de quando o token expira
   */
  exp: number;

  /**
   * Lista de permissões (siglas) que o utilizador possui
   * Exemplo: ["mgea_atp", "mga_a_lan", "full.access", "mgh_vhpd"]
   *
   * Esta propriedade é opcional para permitir flexibilidade
   * (ex: tokens de refresh ou de serviços que não usam permissões)
   */
  permissions?: string[];
}