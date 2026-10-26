import { AppError } from "../utils/errors.js";

/** Valida `body`, `query` ou `params` e substitui pelo valor tratado. */
export function validar(esquema, fonte = "body") {
  return (req, _res, next) => {
    const resultado = esquema.safeParse(req[fonte]);

    if (!resultado.success) {
      const detalhes = resultado.error.issues.map((issue) => ({
        campo: issue.path.join(".") || fonte,
        mensagem: issue.message,
      }));

      return next(new AppError("Dados inválidos na requisição.", 422, detalhes));
    }

    req[fonte] = resultado.data;
    return next();
  };
}
