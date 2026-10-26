/**
 * Roteamento por hash.
 *
 * GitHub Pages não reescreve rotas, então `#/chamados/12` funciona sem
 * configuração de servidor e sem adicionar uma biblioteca de rotas.
 */

export const ROTAS = {
  chamados: "#/chamados",
  novo: "#/novo",
  painel: "#/painel",
  usuarios: "#/usuarios",
  categorias: "#/categorias",
};

export function rotaChamado(id) {
  return `#/chamados/${id}`;
}

export function lerRota(hash = "") {
  const limpo = String(hash ?? "").replace(/^#\/?/, "").split("?")[0];
  const partes = limpo.split("/").filter(Boolean);

  if (!partes.length) return { nome: "chamados" };

  const [primeira, segunda] = partes;

  if (primeira === "chamados") {
    if (!segunda) return { nome: "chamados" };

    const id = Number(segunda);
    return Number.isInteger(id) && id > 0 ? { nome: "chamado", id } : { nome: "chamados" };
  }

  if (primeira === "novo") return { nome: "novo" };
  if (primeira === "painel") return { nome: "painel" };
  if (primeira === "usuarios") return { nome: "usuarios" };
  if (primeira === "categorias") return { nome: "categorias" };

  return { nome: "chamados" };
}

/** Item ativo do menu principal, inclusive nas rotas filhas. */
export function rotaAtiva(rota) {
  if (rota?.nome === "chamado") return "chamados";
  return rota?.nome ?? "chamados";
}
