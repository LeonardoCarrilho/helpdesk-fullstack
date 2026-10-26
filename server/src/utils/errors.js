export class AppError extends Error {
  constructor(mensagem, status = 400, detalhes = null) {
    super(mensagem);
    this.name = "AppError";
    this.status = status;
    this.detalhes = detalhes;
  }
}

export function naoEncontrado(recurso) {
  return new AppError(`${recurso} não encontrado.`, 404);
}

export function semPermissao(mensagem = "Você não tem permissão para esta ação.") {
  return new AppError(mensagem, 403);
}

export function conflito(mensagem) {
  return new AppError(mensagem, 409);
}
