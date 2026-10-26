import { describe, expect, it } from "vitest";

import {
  PRIORIDADES,
  SLA_HORAS,
  STATUS,
  descricaoPapel,
  ehAdmin,
  ehEquipe,
  formatarDataHora,
  iniciais,
  montarQuery,
  podeEditarTexto,
  podeExcluir,
  prazoPorPrioridade,
  rotuloAcaoStatus,
  rotuloPapel,
  rotuloPrioridade,
  rotuloStatus,
  situacaoSla,
  tempoRelativo,
  transicoesDisponiveis,
} from "../src/lib/labels.js";

const AGORA = Date.parse("2026-10-26T12:00:00.000Z");
const CARLA = { id: 4, role: "requester" };
const ANA = { id: 2, role: "agent" };

describe("rótulos", () => {
  it("traduz status, prioridades e papéis", () => {
    expect(rotuloStatus("in_progress")).toBe("Em andamento");
    expect(rotuloPrioridade("critical")).toBe("Crítica");
    expect(rotuloPapel("agent")).toBe("Agente");
  });

  it("mantém o valor original quando o código é desconhecido", () => {
    expect(rotuloStatus("arquivado")).toBe("arquivado");
    expect(rotuloPrioridade("urgente")).toBe("urgente");
    expect(rotuloPapel("owner")).toBe("owner");
  });

  it("descreve cada papel para a interface", () => {
    expect(descricaoPapel("admin")).toMatch(/Acesso total/);
    expect(descricaoPapel("agent")).toMatch(/Atende/);
    expect(descricaoPapel("requester")).toMatch(/próprios/);
    expect(descricaoPapel("x")).toBe("");
  });

  it("identifica equipe e administração", () => {
    expect(ehEquipe(ANA)).toBe(true);
    expect(ehEquipe({ role: "admin" })).toBe(true);
    expect(ehEquipe(CARLA)).toBe(false);
    expect(ehEquipe(null)).toBe(false);
    expect(ehAdmin({ role: "admin" })).toBe(true);
    expect(ehAdmin(ANA)).toBe(false);
  });

  it("gera iniciais com no máximo duas partes", () => {
    expect(iniciais("Leonardo Fernandes Carrilho")).toBe("LF");
    expect(iniciais("  ana   souza ")).toBe("AS");
    expect(iniciais("")).toBe("");
    expect(iniciais(undefined)).toBe("");
  });

  it("formata datas e tolera valores inválidos", () => {
    expect(formatarDataHora("2026-10-26T12:00:00.000Z")).toMatch(/26\/10\/2026/);
    expect(formatarDataHora("sem data")).toBe("—");
    expect(formatarDataHora(null)).toBe("—");
  });

  it("define os rótulos das ações de status", () => {
    expect(rotuloAcaoStatus("open")).toBe("Reabrir");
    expect(rotuloAcaoStatus("in_progress")).toBe("Iniciar atendimento");
    expect(rotuloAcaoStatus("resolved")).toBe("Marcar como resolvido");
    expect(rotuloAcaoStatus("closed")).toBe("Encerrar");
    expect(rotuloAcaoStatus("outro")).toBe("outro");
  });
});

describe("SLA", () => {
  it("calcula o prazo a partir da prioridade", () => {
    expect(prazoPorPrioridade("critical", "2026-10-26T12:00:00.000Z")).toBe(
      "2026-10-26T16:00:00.000Z"
    );
    expect(prazoPorPrioridade("low", "2026-10-26T12:00:00.000Z")).toBe(
      "2026-10-29T12:00:00.000Z"
    );
  });

  it("usa a prioridade média como padrão e recusa data inválida", () => {
    expect(prazoPorPrioridade("desconhecida", "2026-10-26T12:00:00.000Z")).toBe(
      "2026-10-27T12:00:00.000Z"
    );
    expect(prazoPorPrioridade("medium", "não é data")).toBeNull();
  });

  it("expõe as horas de SLA das quatro prioridades", () => {
    expect(SLA_HORAS).toEqual({ critical: 4, high: 8, medium: 24, low: 72 });
    expect(Object.keys(PRIORIDADES)).toEqual(Object.keys(SLA_HORAS));
  });

  it("descreve atraso, vencimento e conclusão", () => {
    expect(situacaoSla({ status: "open", dueAt: "2026-10-26T07:00:00.000Z" }, AGORA)).toEqual({
      rotulo: "Atrasado há 5h",
      tom: "danger",
      atrasado: true,
    });

    expect(situacaoSla({ status: "open", dueAt: "2026-10-26T14:00:00.000Z" }, AGORA)).toEqual({
      rotulo: "Vence em 2h",
      tom: "warning",
      atrasado: false,
    });

    expect(situacaoSla({ status: "open", dueAt: "2026-10-27T12:00:00.000Z" }, AGORA).tom).toBe(
      "neutral"
    );
  });

  it("não cobra SLA de chamado concluído", () => {
    const sla = situacaoSla(
      { status: "resolved", dueAt: "2026-10-26T07:00:00.000Z", resolvedAt: "2026-10-26T10:00:00.000Z" },
      AGORA
    );

    expect(sla).toMatchObject({ tom: "success", atrasado: false });
    expect(sla.rotulo).toContain("Resolvido em");
  });

  it("trata prazo ausente e chamado inexistente", () => {
    expect(situacaoSla({ status: "open", dueAt: null }, AGORA)).toEqual({
      rotulo: "Sem prazo",
      tom: "neutral",
      atrasado: false,
    });
    expect(situacaoSla(null, AGORA).rotulo).toBe("—");
  });
});

describe("permissões da interface", () => {
  it("mostra as três transições da equipe a partir de aberto", () => {
    expect(transicoesDisponiveis(ANA, { status: "open", requesterId: 4 })).toEqual([
      { status: "in_progress", rotulo: "Em andamento" },
      { status: "resolved", rotulo: "Resolvido" },
      { status: "closed", rotulo: "Encerrado" },
    ]);
  });

  it("restringe o solicitante a encerrar ou reabrir o próprio chamado", () => {
    expect(transicoesDisponiveis(CARLA, { status: "resolved", requesterId: 4 })).toEqual([
      { status: "closed", rotulo: "Encerrado" },
      { status: "open", rotulo: "Aberto" },
    ]);

    expect(transicoesDisponiveis(CARLA, { status: "open", requesterId: 4 })).toEqual([]);
    expect(transicoesDisponiveis(CARLA, { status: "resolved", requesterId: 9 })).toEqual([]);
    expect(transicoesDisponiveis(null, { status: "open", requesterId: 4 })).toEqual([]);
  });

  it("permite editar texto para dono ou equipe, e excluir só para admin", () => {
    expect(podeEditarTexto(CARLA, { requesterId: 4 })).toBe(true);
    expect(podeEditarTexto(CARLA, { requesterId: 9 })).toBe(false);
    expect(podeEditarTexto(ANA, { requesterId: 9 })).toBe(true);
    expect(podeEditarTexto(null, { requesterId: 4 })).toBe(false);

    expect(podeExcluir({ role: "admin" })).toBe(true);
    expect(podeExcluir({ role: "agent" })).toBe(false);
  });
});

describe("tempo relativo", () => {
  it("escala de agora até dias", () => {
    expect(tempoRelativo("2026-10-26T11:59:40.000Z", AGORA)).toBe("agora");
    expect(tempoRelativo("2026-10-26T11:55:00.000Z", AGORA)).toBe("há 5 min");
    expect(tempoRelativo("2026-10-26T09:00:00.000Z", AGORA)).toBe("há 3 h");
    expect(tempoRelativo("2026-10-25T12:00:00.000Z", AGORA)).toBe("há 1 dia");
    expect(tempoRelativo("2026-10-24T12:00:00.000Z", AGORA)).toBe("há 2 dias");
  });

  it("mostra a data quando passa de uma semana e tolera valores inválidos", () => {
    const antigo = tempoRelativo("2026-10-01T12:00:00.000Z", AGORA);
    expect(antigo.startsWith("há")).toBe(false);
    expect(tempoRelativo(null, AGORA)).toBe("—");
  });
});

describe("filtros", () => {
  it("monta a query ignorando vazios e preservando zero", () => {
    expect(montarQuery({ status: "open", page: 2, q: "", limit: null, categoryId: 0 })).toBe(
      "status=open&page=2&categoryId=0"
    );
  });

  it("devolve string vazia sem filtros", () => {
    expect(montarQuery({})).toBe("");
    expect(montarQuery(null)).toBe("");
  });
});

describe("constantes", () => {
  it("mantém a ordem de status e prioridades do servidor", () => {
    expect(Object.keys(STATUS)).toEqual(["open", "in_progress", "resolved", "closed"]);
    expect(Object.keys(PRIORIDADES)).toEqual(["low", "medium", "high", "critical"]);
  });
});
