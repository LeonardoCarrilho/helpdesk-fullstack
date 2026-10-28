import { AppError } from "../utils/errors.js";
import { verificarToken } from "../utils/jwt.js";

/** Aceita cookie HttpOnly ou `Authorization: Bearer <token>` e carrega o usuário atualizado. */
export function autenticar(repos) {
  return async (req, _res, next) => {
    try {
      const cabecalho = req.headers.authorization ?? "";
      const [tipo, bearer] = cabecalho.split(" ");
      const cookie = (req.headers.cookie ?? "").split(";").map(value => value.trim()).find(value => value.startsWith("helpdesk_sessao="));
      const token = tipo === "Bearer" ? bearer : cookie?.slice("helpdesk_sessao=".length);

      if (!token) {
        throw new AppError("Envie o token de acesso no cabeçalho Authorization.", 401);
      }

      const payload = verificarToken(token);
      const usuario = await repos.users.findById(Number(payload.sub));

      if (!usuario) {
        throw new AppError("Usuário do token não existe mais.", 401);
      }

      req.usuario = usuario;
      return next();
    } catch (erro) {
      return next(erro);
    }
  };
}

/** Restringe a rota a determinados papéis. */
export function exigirPapel(...papeis) {
  return (req, _res, next) => {
    if (!req.usuario || !papeis.includes(req.usuario.role)) {
      return next(new AppError("Acesso restrito a outro perfil de usuário.", 403));
    }
    return next();
  };
}
