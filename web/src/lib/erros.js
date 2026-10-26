/** Extrai uma mensagem legível de um erro da API ou de validação local. */
export function mensagemDeErro(erro, padrao = "Não foi possível concluir a ação.") {
  if (!erro) return padrao;

  const detalhes = erro.detalhes ?? erro.details;

  if (Array.isArray(detalhes) && detalhes.length) {
    return detalhes
      .map((item) => (typeof item === "string" ? item : item?.mensagem ?? item?.message))
      .filter(Boolean)
      .join(" ");
  }

  if (typeof erro === "string") return erro;

  return erro.message || padrao;
}
