import { describe, expect, it } from "vitest";

import { ROTAS, lerRota, rotaAtiva, rotaChamado } from "../src/lib/rotas.js";

describe("rotas por hash", () => {
  it("cai na lista de chamados por padrão", () => {
    expect(lerRota("")).toEqual({ nome: "chamados" });
    expect(lerRota("#/")).toEqual({ nome: "chamados" });
    expect(lerRota("#/chamados")).toEqual({ nome: "chamados" });
  });

  it("lê o identificador do chamado", () => {
    expect(lerRota("#/chamados/12")).toEqual({ nome: "chamado", id: 12 });
    expect(rotaChamado(12)).toBe("#/chamados/12");
  });

  it("recusa identificadores inválidos", () => {
    expect(lerRota("#/chamados/abc")).toEqual({ nome: "chamados" });
    expect(lerRota("#/chamados/0")).toEqual({ nome: "chamados" });
    expect(lerRota("#/chamados/-3")).toEqual({ nome: "chamados" });
  });

  it("reconhece as rotas fixas e ignora query string", () => {
    expect(lerRota("#/novo")).toEqual({ nome: "novo" });
    expect(lerRota("#/painel")).toEqual({ nome: "painel" });
    expect(lerRota("#/usuarios")).toEqual({ nome: "usuarios" });
    expect(lerRota("#/categorias?x=1")).toEqual({ nome: "categorias" });
  });

  it("volta para os chamados em rota desconhecida", () => {
    expect(lerRota("#/nao-existe")).toEqual({ nome: "chamados" });
    expect(lerRota(undefined)).toEqual({ nome: "chamados" });
  });

  it("marca o item de menu ativo, inclusive no detalhe", () => {
    expect(rotaAtiva({ nome: "chamado", id: 3 })).toBe("chamados");
    expect(rotaAtiva({ nome: "painel" })).toBe("painel");
    expect(rotaAtiva(null)).toBe("chamados");
  });

  it("expõe as rotas usadas nos links", () => {
    expect(ROTAS).toMatchObject({
      chamados: "#/chamados",
      novo: "#/novo",
      painel: "#/painel",
      usuarios: "#/usuarios",
      categorias: "#/categorias",
    });
  });
});
