import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PRIORIDADES,
  STATUS,
  TRANSICOES_EQUIPE,
  ehAdmin,
  ehEquipe,
  estaAtrasado,
  podeTransitar,
  prazoPorPrioridade,
} from "../src/domain/tickets.js";
import { conferirSenha, gerarHashSenha } from "../src/utils/password.js";
import { adicionarHoras, diferencaEmHoras, formatarIso } from "../src/utils/datas.js";
import { criarToken, verificarToken } from "../src/utils/jwt.js";

describe("senhas", () => {
  it("gera hashes diferentes para a mesma senha", async () => {
    const primeiro = await gerarHashSenha("senha-segura-1");
    const segundo = await gerarHashSenha("senha-segura-1");

    assert.notEqual(primeiro, segundo);
    assert.match(primeiro, /^scrypt\$\d+\$\d+\$\d+\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  it("confere a senha correta e rejeita a errada", async () => {
    const hash = await gerarHashSenha("senha-segura-1");

    assert.equal(await conferirSenha("senha-segura-1", hash), true);
    assert.equal(await conferirSenha("outra-senha", hash), false);
  });

  it("não quebra com hash corrompido e recusa senha curta", async () => {
    assert.equal(await conferirSenha("qualquer", "hash-invalido"), false);
    assert.equal(await conferirSenha("qualquer", null), false);
    await assert.rejects(() => gerarHashSenha("123"), /pelo menos 8 caracteres/);
  });
});

describe("datas", () => {
  it("soma horas e calcula a diferença", () => {
    assert.equal(adicionarHoras("2026-10-26T12:00:00.000Z", 8), "2026-10-26T20:00:00.000Z");
    assert.equal(diferencaEmHoras("2026-10-26T12:00:00.000Z", "2026-10-26T18:30:00.000Z"), 6.5);
    assert.equal(diferencaEmHoras("inválida", "2026-10-26T18:30:00.000Z"), null);
    assert.equal(formatarIso("2026-10-26T12:00:00.000Z"), "2026-10-26T12:00:00.000Z");
    assert.equal(formatarIso(null), null);
    assert.equal(formatarIso("sem data"), null);
  });
});

describe("regras de chamado", () => {
  it("calcula o SLA por prioridade", () => {
    assert.equal(prazoPorPrioridade("critical", "2026-10-26T12:00:00.000Z"), "2026-10-26T16:00:00.000Z");
    assert.equal(prazoPorPrioridade("low", "2026-10-26T12:00:00.000Z"), "2026-10-29T12:00:00.000Z");
    assert.equal(
      prazoPorPrioridade("desconhecida", "2026-10-26T12:00:00.000Z"),
      "2026-10-27T12:00:00.000Z"
    );
  });

  it("conhece os papéis e as prioridades", () => {
    assert.deepEqual(PAPEIS_TESTE, ["admin", "agent", "requester"]);
    assert.deepEqual(STATUS, ["open", "in_progress", "resolved", "closed"]);
    assert.deepEqual(PRIORIDADES, ["low", "medium", "high", "critical"]);
    assert.equal(ehEquipe({ role: "agent" }), true);
    assert.equal(ehEquipe({ role: "requester" }), false);
    assert.equal(ehAdmin({ role: "admin" }), true);
    assert.equal(ehAdmin({ role: "agent" }), false);
  });

  it("aplica as transições de status da equipe", () => {
    assert.deepEqual(TRANSICOES_EQUIPE.open, ["in_progress", "resolved", "closed"]);
    assert.equal(podeTransitar({ role: "agent" }, "open", "in_progress"), true);
    assert.equal(podeTransitar({ role: "agent" }, "resolved", "in_progress"), false);
    assert.equal(podeTransitar({ role: "admin" }, "closed", "open"), true);
    assert.equal(podeTransitar({ role: "agent" }, "open", "inventado"), false);
  });

  it("restringe o solicitante a reabrir e encerrar", () => {
    assert.equal(podeTransitar({ role: "requester" }, "resolved", "closed"), true);
    assert.equal(podeTransitar({ role: "requester" }, "closed", "open"), true);
    assert.equal(podeTransitar({ role: "requester" }, "open", "closed"), false);
    assert.equal(podeTransitar({ role: "requester" }, "open", "in_progress"), false);
  });

  it("identifica atraso apenas em chamados abertos", () => {
    const agora = "2026-10-27T12:00:00.000Z";

    assert.equal(estaAtrasado({ status: "open", dueAt: "2026-10-27T11:00:00.000Z" }, agora), true);
    assert.equal(
      estaAtrasado({ status: "resolved", dueAt: "2026-10-27T11:00:00.000Z" }, agora),
      false
    );
    assert.equal(
      estaAtrasado({ status: "open", dueAt: "2026-10-28T11:00:00.000Z" }, agora),
      false
    );
    assert.equal(estaAtrasado({ status: "open", dueAt: null }, agora), false);
  });
});

describe("JWT", () => {
  it("assina e valida o token com o emissor correto", () => {
    const token = criarToken({ id: 7, role: "agent", name: "Ana" });
    const payload = verificarToken(token);

    assert.equal(payload.sub, "7");
    assert.equal(payload.papel, "agent");
    assert.equal(payload.iss, "helpdesk-fullstack");
  });

  it("rejeita token adulterado", () => {
    assert.throws(() => verificarToken("abc.def.ghi"), /Sessão inválida/);
  });
});

const PAPEIS_TESTE = ["admin", "agent", "requester"];
