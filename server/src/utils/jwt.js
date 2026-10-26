import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./errors.js";

const EMISSOR = "helpdesk-fullstack";

export function criarToken(usuario) {
  return jwt.sign(
    {
      sub: String(usuario.id),
      papel: usuario.role,
      nome: usuario.name,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiraEm, issuer: EMISSOR }
  );
}

/** Lança 401 em token ausente, inválido, expirado ou de outro emissor. */
export function verificarToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret, { issuer: EMISSOR });
  } catch {
    throw new AppError("Sessão inválida ou expirada. Entre novamente.", 401);
  }
}
