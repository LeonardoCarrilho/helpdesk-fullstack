import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import request from "supertest";

import { criarApp } from "../src/app.js";
import { criarRepositoriosMemoria } from "../src/repositories/memory.js";

const AGORA = "2026-10-26T12:00:00.000Z";
const SENHA = "senha-segura-1";

let app;
let repos;

beforeEach(() => {
  repos = criarRepositoriosMemoria({ clock: () => new Date(AGORA) });
  app = criarApp({ repos, clock: () => new Date(AGORA) });
});

async function criarUsuario(papel = "requester", email = `${papel}@teste.dev`, nome = papel) {
  const registro = await request(app)
    .post("/api/auth/register")
    .send({ name: nome, email, password: SENHA });

  assert.equal(registro.status, 201, JSON.stringify(registro.body));

  const id = registro.body.data.usuario.id;

  if (papel !== "requester") {
    await repos.users.atualizarPapel(id, papel);
  }

  const login = await request(app).post("/api/auth/login").send({ email, password: SENHA });
  assert.equal(login.status, 200, JSON.stringify(login.body));

  return { id, token: login.body.data.token, usuario: login.body.data.usuario };
}

function autorizado(token) {
  return { Authorization: `Bearer ${token}` };
}

async function abrirChamado(token, dados = {}) {
  return request(app)
    .post("/api/tickets")
    .set(autorizado(token))
    .send({
      title: "Erro ao acessar o sistema",
      description: "Ao entrar com a senha correta o sistema retorna erro 500.",
      priority: "high",
      ...dados,
    });
}

describe("autenticação", () => {
  it("registra, devolve token e nunca expõe o hash", async () => {
    const resposta = await request(app)
      .post("/api/auth/register")
      .send({ name: "Carla Mendes", email: "CARLA@Teste.dev", password: SENHA });

    assert.equal(resposta.status, 201);
    assert.equal(resposta.body.data.usuario.role, "requester");
    assert.equal(resposta.body.data.usuario.email, "carla@teste.dev");
    assert.ok(resposta.body.data.token);
    assert.equal(resposta.body.data.usuario.passwordHash, undefined);
  });

  it("recusa e-mail duplicado", async () => {
    await criarUsuario("requester", "carla@teste.dev");

    const resposta = await request(app)
      .post("/api/auth/register")
      .send({ name: "Outra Carla", email: "carla@teste.dev", password: SENHA });

    assert.equal(resposta.status, 409);
  });

  it("detalha campos inválidos no cadastro", async () => {
    const resposta = await request(app)
      .post("/api/auth/register")
      .send({ name: "A", email: "sem-arroba", password: "123" });

    assert.equal(resposta.status, 422);
    assert.equal(resposta.body.details.length >= 3, true);
  });

  it("faz login e rejeita senha errada com a mesma mensagem", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");

    const errada = await request(app)
      .post("/api/auth/login")
      .send({ email: "carla@teste.dev", password: "senha-errada" });

    assert.equal(errada.status, 401);
    assert.match(errada.body.error, /E-mail ou senha incorretos/);

    const inexistente = await request(app)
      .post("/api/auth/login")
      .send({ email: "ninguem@teste.dev", password: SENHA });

    assert.equal(inexistente.status, 401);
    assert.equal(inexistente.body.error, errada.body.error);

    assert.ok(carla.token);
  });

  it("protege /me e rejeita token inválido", async () => {
    const semToken = await request(app).get("/api/me");
    assert.equal(semToken.status, 401);

    const invalido = await request(app).get("/api/me").set(autorizado("token-falso"));
    assert.equal(invalido.status, 401);

    const carla = await criarUsuario("requester", "carla@teste.dev", "Carla");
    const proprio = await request(app).get("/api/me").set(autorizado(carla.token));

    assert.equal(proprio.status, 200);
    assert.equal(proprio.body.data.id, carla.id);
    assert.equal(proprio.body.data.name, "Carla");
  });
});

describe("infraestrutura", () => {
  it("responde ao health check", async () => {
    const resposta = await request(app).get("/api/health");
    assert.equal(resposta.status, 200);
    assert.deepEqual(resposta.body, { status: "ok", service: "helpdesk-api" });
  });

  it("devolve 404 para rota desconhecida e 400 para JSON malformado", async () => {
    const rota = await request(app).get("/api/nao-existe");
    assert.equal(rota.status, 404);

    const json = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{quebrado");

    assert.equal(json.status, 400);
  });
});

describe("chamados", () => {
  it("abre chamado com status open e SLA da prioridade", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const resposta = await abrirChamado(carla.token);

    assert.equal(resposta.status, 201);
    assert.equal(resposta.body.data.status, "open");
    assert.equal(resposta.body.data.priority, "high");
    assert.equal(resposta.body.data.requesterId, carla.id);
    assert.equal(resposta.body.data.dueAt, "2026-10-26T20:00:00.000Z");
    assert.equal(resposta.body.data.assigneeId, null);
  });

  it("valida os dados de abertura", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");

    const curto = await abrirChamado(carla.token, { title: "Oi", description: "curta" });
    assert.equal(curto.status, 422);

    const prioridade = await abrirChamado(carla.token, { priority: "urgentíssima" });
    assert.equal(prioridade.status, 422);

    const categoria = await abrirChamado(carla.token, { categoryId: 999 });
    assert.equal(categoria.status, 422);
  });

  it("solicitante só vê os próprios chamados; a equipe vê todos", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const joao = await criarUsuario("requester", "joao@teste.dev");
    const ana = await criarUsuario("agent", "ana@teste.dev");

    await abrirChamado(carla.token, { title: "Chamado da Carla" });
    await abrirChamado(joao.token, { title: "Chamado do João" });

    const listaCarla = await request(app).get("/api/tickets").set(autorizado(carla.token));
    assert.equal(listaCarla.status, 200);
    assert.equal(listaCarla.body.meta.total, 1);
    assert.equal(listaCarla.body.data[0].title, "Chamado da Carla");

    const listaAna = await request(app).get("/api/tickets").set(autorizado(ana.token));
    assert.equal(listaAna.body.meta.total, 2);
  });

  it("filtra por status, prioridade, texto e pagina", async () => {
    const ana = await criarUsuario("agent", "ana@teste.dev");
    const carla = await criarUsuario("requester", "carla@teste.dev");

    await abrirChamado(carla.token, { title: "Impressora sem papel", priority: "low" });
    await abrirChamado(carla.token, { title: "VPN não conecta", priority: "critical" });
    await abrirChamado(carla.token, { title: "VPN lenta à tarde", priority: "high" });

    const porPrioridade = await request(app)
      .get("/api/tickets?priority=critical")
      .set(autorizado(ana.token));

    assert.equal(porPrioridade.body.data.length, 1);
    assert.equal(porPrioridade.body.data[0].title, "VPN não conecta");

    const porTexto = await request(app)
      .get("/api/tickets?q=VPN")
      .set(autorizado(ana.token));

    assert.equal(porTexto.body.data.length, 2);

    const aberto = await request(app)
      .get("/api/tickets?status=open")
      .set(autorizado(ana.token));

    assert.equal(aberto.body.meta.total, 3);

    const pagina = await request(app)
      .get("/api/tickets?page=2&limit=2")
      .set(autorizado(ana.token));

    assert.equal(pagina.body.data.length, 1);
    assert.equal(pagina.body.meta.page, 2);
    assert.equal(pagina.headers["x-total-count"], "3");
  });

  it("impede ver chamado de outro solicitante", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const joao = await criarUsuario("requester", "joao@teste.dev");
    const criado = await abrirChamado(carla.token);

    const tentativa = await request(app)
      .get(`/api/tickets/${criado.body.data.id}`)
      .set(autorizado(joao.token));

    assert.equal(tentativa.status, 403);

    const inexistente = await request(app)
      .get("/api/tickets/9999")
      .set(autorizado(joao.token));

    assert.equal(inexistente.status, 404);
  });

  it("solicitante edita o texto, mas não prioridade ou responsável", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const criado = await abrirChamado(carla.token);
    const id = criado.body.data.id;

    const texto = await request(app)
      .patch(`/api/tickets/${id}`)
      .set(autorizado(carla.token))
      .send({ title: "Erro ao entrar no painel" });

    assert.equal(texto.status, 200);
    assert.equal(texto.body.data.title, "Erro ao entrar no painel");

    const prioridade = await request(app)
      .patch(`/api/tickets/${id}`)
      .set(autorizado(carla.token))
      .send({ priority: "low" });

    assert.equal(prioridade.status, 403);
  });

  it("valida as transições de status por papel", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const ana = await criarUsuario("agent", "ana@teste.dev");
    const criado = await abrirChamado(carla.token);
    const id = criado.body.data.id;

    const invalida = await request(app)
      .patch(`/api/tickets/${id}`)
      .set(autorizado(carla.token))
      .send({ status: "closed" });

    assert.equal(invalida.status, 422);

    const emAndamento = await request(app)
      .patch(`/api/tickets/${id}`)
      .set(autorizado(ana.token))
      .send({ status: "in_progress" });

    assert.equal(emAndamento.status, 200);
    assert.equal(emAndamento.body.data.status, "in_progress");

    const resolvido = await request(app)
      .patch(`/api/tickets/${id}`)
      .set(autorizado(ana.token))
      .send({ status: "resolved" });

    assert.equal(resolvido.body.data.resolvedAt, AGORA);

    const fechadoPeloSolicitante = await request(app)
      .patch(`/api/tickets/${id}`)
      .set(autorizado(carla.token))
      .send({ status: "closed" });

    assert.equal(fechadoPeloSolicitante.status, 200);
    assert.equal(fechadoPeloSolicitante.body.data.status, "closed");
  });

  it("atribui a um agente e recusa responsável sem perfil de equipe", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const joao = await criarUsuario("requester", "joao@teste.dev");
    const ana = await criarUsuario("agent", "ana@teste.dev");
    const criado = await abrirChamado(carla.token);

    const atribuido = await request(app)
      .patch(`/api/tickets/${criado.body.data.id}`)
      .set(autorizado(ana.token))
      .send({ assigneeId: ana.id });

    assert.equal(atribuido.status, 200);
    assert.equal(atribuido.body.data.assigneeId, ana.id);
    assert.equal(atribuido.body.data.assigneeName, "agent");

    const invalido = await request(app)
      .patch(`/api/tickets/${criado.body.data.id}`)
      .set(autorizado(ana.token))
      .send({ assigneeId: joao.id });

    assert.equal(invalido.status, 422);
  });

  it("somente admin exclui chamados", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const ana = await criarUsuario("agent", "ana@teste.dev");
    const admin = await criarUsuario("admin", "admin@teste.dev");
    const criado = await abrirChamado(carla.token);
    const id = criado.body.data.id;

    const agente = await request(app)
      .delete(`/api/tickets/${id}`)
      .set(autorizado(ana.token));

    assert.equal(agente.status, 403);

    const excluido = await request(app)
      .delete(`/api/tickets/${id}`)
      .set(autorizado(admin.token));

    assert.equal(excluido.status, 204);

    const depois = await request(app)
      .get(`/api/tickets/${id}`)
      .set(autorizado(admin.token));

    assert.equal(depois.status, 404);
  });
});

describe("comentários", () => {
  it("aceita comentário público e bloqueia interno do solicitante", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const ana = await criarUsuario("agent", "ana@teste.dev");
    const criado = await abrirChamado(carla.token);
    const id = criado.body.data.id;

    const publico = await request(app)
      .post(`/api/tickets/${id}/comments`)
      .set(autorizado(carla.token))
      .send({ body: "Consegui reproduzir o erro novamente." });

    assert.equal(publico.status, 201);
    assert.equal(publico.body.data.authorName, "requester");
    assert.equal(publico.body.data.internal, false);

    const interno = await request(app)
      .post(`/api/tickets/${id}/comments`)
      .set(autorizado(carla.token))
      .send({ body: "Tentativa de nota interna.", internal: true });

    assert.equal(interno.status, 403);

    const daEquipe = await request(app)
      .post(`/api/tickets/${id}/comments`)
      .set(autorizado(ana.token))
      .send({ body: "Usuário precisa trocar a senha no AD.", internal: true });

    assert.equal(daEquipe.status, 201);
    assert.equal(daEquipe.body.data.internal, true);
  });

  it("oculta comentários internos do solicitante", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const ana = await criarUsuario("agent", "ana@teste.dev");
    const criado = await abrirChamado(carla.token);
    const id = criado.body.data.id;

    await request(app)
      .post(`/api/tickets/${id}/comments`)
      .set(autorizado(ana.token))
      .send({ body: "Nota interna da equipe.", internal: true });

    await request(app)
      .post(`/api/tickets/${id}/comments`)
      .set(autorizado(carla.token))
      .send({ body: "Comentário visível." });

    const doSolicitante = await request(app)
      .get(`/api/tickets/${id}/comments`)
      .set(autorizado(carla.token));

    assert.equal(doSolicitante.body.data.length, 1);
    assert.equal(doSolicitante.body.data[0].body, "Comentário visível.");

    const daEquipe = await request(app)
      .get(`/api/tickets/${id}/comments`)
      .set(autorizado(ana.token));

    assert.equal(daEquipe.body.data.length, 2);
  });

  it("não permite comentar em chamado de terceiros", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const joao = await criarUsuario("requester", "joao@teste.dev");
    const criado = await abrirChamado(carla.token);

    const resposta = await request(app)
      .post(`/api/tickets/${criado.body.data.id}/comments`)
      .set(autorizado(joao.token))
      .send({ body: "Tentando comentar." });

    assert.equal(resposta.status, 403);
  });
});

describe("indicadores", () => {
  it("resume status, atraso e tempo médio para a equipe", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const ana = await criarUsuario("agent", "ana@teste.dev");

    const critico = await abrirChamado(carla.token, {
      title: "Servidor fora do ar",
      description: "Nenhum usuário consegue acessar o sistema.",
      priority: "critical",
    });

    await abrirChamado(carla.token, { title: "Dúvida simples", priority: "low" });

    await request(app)
      .patch(`/api/tickets/${critico.body.data.id}`)
      .set(autorizado(ana.token))
      .send({ status: "resolved", assigneeId: ana.id });

    const resumo = await request(app).get("/api/dashboard").set(autorizado(ana.token));

    assert.equal(resumo.status, 200);
    assert.equal(resumo.body.data.totals.all, 2);
    assert.equal(resumo.body.data.totals.resolved, 1);
    assert.equal(resumo.body.data.totals.open, 1);
    assert.equal(resumo.body.data.byPriority.critical, 1);
    assert.equal(resumo.body.data.unassigned, 1);
    assert.equal(resumo.body.data.avgResolutionHours, 0);
    assert.equal(resumo.body.data.byAgent[0].nome, "agent");

    const solicitante = await request(app).get("/api/dashboard").set(autorizado(carla.token));
    assert.equal(solicitante.status, 403);
  });

  it("conta atraso quando o prazo passou", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const ana = await criarUsuario("agent", "ana@teste.dev");
    const criado = await abrirChamado(carla.token, { priority: "medium" });

    const depois = new Date("2026-10-28T12:00:00.000Z");
    const appAtrasado = criarApp({ repos, clock: () => depois });

    const resumo = await request(appAtrasado).get("/api/dashboard").set(autorizado(ana.token));

    assert.equal(resumo.status, 200);
    assert.equal(resumo.body.data.overdue, 1);
    assert.equal(resumo.body.data.totals.open, 1);
    assert.ok(criado.body.data.id);
  });
});

describe("categorias", () => {
  it("lista para qualquer usuário e exige admin para escrever", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const ana = await criarUsuario("agent", "ana@teste.dev");
    const admin = await criarUsuario("admin", "admin@teste.dev");

    const negado = await request(app)
      .post("/api/categories")
      .set(autorizado(ana.token))
      .send({ name: "Rede", color: "#10b981" });

    assert.equal(negado.status, 403);

    const criada = await request(app)
      .post("/api/categories")
      .set(autorizado(admin.token))
      .send({ name: "Rede", color: "#10b981" });

    assert.equal(criada.status, 201);

    const duplicada = await request(app)
      .post("/api/categories")
      .set(autorizado(admin.token))
      .send({ name: "rede", color: "#10b981" });

    assert.equal(duplicada.status, 409);

    const lista = await request(app).get("/api/categories").set(autorizado(carla.token));
    assert.equal(lista.body.data.length, 1);
  });
});

describe("usuários", () => {
  it("agente vê só a equipe; admin vê todos e promove papéis", async () => {
    const carla = await criarUsuario("requester", "carla@teste.dev");
    const ana = await criarUsuario("agent", "ana@teste.dev");
    const admin = await criarUsuario("admin", "admin@teste.dev");

    const doAgente = await request(app).get("/api/users").set(autorizado(ana.token));
    assert.equal(doAgente.status, 200);
    assert.equal(doAgente.body.data.length, 2);
    assert.ok(doAgente.body.data.every((item) => item.role !== "requester"));
    assert.equal(doAgente.body.data[0].email, undefined);

    const doAdmin = await request(app).get("/api/users").set(autorizado(admin.token));
    assert.equal(doAdmin.body.data.length, 3);
    assert.ok(doAdmin.body.data.some((item) => item.email === "carla@teste.dev"));

    const promovida = await request(app)
      .patch(`/api/users/${carla.id}/role`)
      .set(autorizado(admin.token))
      .send({ role: "agent" });

    assert.equal(promovida.status, 200);
    assert.equal(promovida.body.data.role, "agent");

    const negado = await request(app)
      .patch(`/api/users/${carla.id}/role`)
      .set(autorizado(ana.token))
      .send({ role: "admin" });

    assert.equal(negado.status, 403);
  });

  it("impede rebaixar o último administrador", async () => {
    const admin = await criarUsuario("admin", "admin@teste.dev");

    const resposta = await request(app)
      .patch(`/api/users/${admin.id}/role`)
      .set(autorizado(admin.token))
      .send({ role: "agent" });

    assert.equal(resposta.status, 422);
  });
});
