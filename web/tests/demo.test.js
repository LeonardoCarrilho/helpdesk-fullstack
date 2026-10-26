import { describe, expect, it } from "vitest";

import { criarApiDemo } from "../src/api/demo.js";

const AGORA = Date.parse("2026-10-26T12:00:00.000Z");

const CONTAS = {
  admin: { email: "admin@helpdesk.dev", password: "admin12345" },
  ana: { email: "ana@helpdesk.dev", password: "agente12345" },
  carla: { email: "cliente@helpdesk.dev", password: "cliente12345" },
};

function criarArmazenamento() {
  const dados = new Map();

  return {
    getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
    setItem: (chave, valor) => dados.set(chave, String(valor)),
    removeItem: (chave) => dados.delete(chave),
    limpar: () => dados.clear(),
    tamanho: () => dados.size,
  };
}

function criarApi(armazenamento = criarArmazenamento()) {
  return criarApiDemo({ armazenamento, atraso: 0, clock: () => AGORA });
}

async function entrar(api, conta) {
  const { usuario } = await api.login(conta);
  return usuario;
}

describe("autenticação na demonstração", () => {
  it("começa sem sessão", async () => {
    const api = criarApi();
    expect(api.modo).toBe("demo");
    expect(api.temSessao()).toBe(false);
    expect(await api.me()).toBeNull();
  });

  it("entra com a conta semeada e nunca devolve a senha", async () => {
    const api = criarApi();
    const usuario = await entrar(api, CONTAS.admin);

    expect(usuario).toMatchObject({ name: "Leonardo Carrilho", role: "admin" });
    expect(usuario.senha).toBeUndefined();
    expect(api.temSessao()).toBe(true);
    expect((await api.me()).email).toBe("admin@helpdesk.dev");
  });

  it("rejeita senha errada e e-mail desconhecido com a mesma mensagem", async () => {
    const api = criarApi();

    await expect(api.login({ email: CONTAS.ana.email, password: "errada" })).rejects.toMatchObject({
      status: 401,
      message: "E-mail ou senha incorretos.",
    });

    await expect(
      api.login({ email: "ninguem@helpdesk.dev", password: "agente12345" })
    ).rejects.toMatchObject({ status: 401, message: "E-mail ou senha incorretos." });
  });

  it("cria conta nova como solicitante e recusa duplicada", async () => {
    const api = criarApi();
    const { usuario } = await api.registrar({
      name: "Novo Cliente",
      email: "NOVO@teste.dev",
      password: "senha-segura",
    });

    expect(usuario).toMatchObject({ email: "novo@teste.dev", role: "requester" });

    await expect(
      api.registrar({ name: "Outro", email: "novo@teste.dev", password: "senha-segura" })
    ).rejects.toMatchObject({ status: 409 });

    await expect(
      api.registrar({ name: "Curto", email: "curto@teste.dev", password: "123" })
    ).rejects.toMatchObject({ status: 422 });
  });

  it("encerra a sessão no logout", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.carla);
    await api.logout();

    expect(await api.me()).toBeNull();
    await expect(api.listarChamados()).rejects.toMatchObject({ status: 401 });
  });
});

describe("fila de chamados", () => {
  it("mostra todos os chamados para a equipe", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.ana);

    const lista = await api.listarChamados();

    expect(lista.total).toBe(8);
    expect(lista.items).toHaveLength(8);
    expect(lista.items[0].requesterName).toBeTruthy();
    expect(lista.items[0].categoryName).toBeTruthy();
  });

  it("restringe o solicitante aos próprios chamados", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.carla);

    const lista = await api.listarChamados();

    expect(lista.total).toBe(4);
    expect(lista.items.every((item) => item.requesterId === 4)).toBe(true);
  });

  it("filtra por status, prioridade, categoria, texto e responsável", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.ana);

    expect((await api.listarChamados({ status: "resolved" })).total).toBe(2);
    expect((await api.listarChamados({ priority: "critical" })).total).toBe(1);
    expect((await api.listarChamados({ categoryId: 2 })).total).toBe(2);
    expect((await api.listarChamados({ q: "Wi-Fi" })).total).toBe(1);
    expect((await api.listarChamados({ assigneeId: "unassigned" })).total).toBe(2);
    expect((await api.listarChamados({ assigneeId: "me" })).total).toBe(3);
    expect((await api.listarChamados({ q: "nada disso" })).total).toBe(0);
  });

  it("pagina mantendo o total completo", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.ana);

    const primeira = await api.listarChamados({ page: 1, limit: 3 });
    const ultima = await api.listarChamados({ page: 3, limit: 3 });

    expect(primeira.items).toHaveLength(3);
    expect(primeira.total).toBe(8);
    expect(ultima.items).toHaveLength(2);
    expect(primeira.items[0].id).not.toBe(ultima.items[0].id);
  });

  it("impede ver chamado de outro solicitante", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.carla);

    await expect(api.obterChamado(4)).rejects.toMatchObject({ status: 403 });
    await expect(api.obterChamado(999)).rejects.toMatchObject({ status: 404 });
  });
});

describe("abertura e edição", () => {
  it("abre chamado com status aberto e SLA da prioridade", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.carla);

    const chamado = await api.criarChamado({
      title: "Teclado com teclas falhando",
      description: "As teclas F e G não respondem desde ontem.",
      priority: "medium",
      categoryId: 2,
    });

    expect(chamado).toMatchObject({
      status: "open",
      priority: "medium",
      requesterId: 4,
      assigneeId: null,
      dueAt: "2026-10-27T12:00:00.000Z",
    });
  });

  it("valida título, descrição, prioridade e categoria", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.carla);

    const base = { title: "Título válido", description: "Descrição com tamanho suficiente." };

    await expect(api.criarChamado({ ...base, title: "Oi" })).rejects.toMatchObject({ status: 422 });
    await expect(api.criarChamado({ ...base, description: "curta" })).rejects.toMatchObject({
      status: 422,
    });
    await expect(api.criarChamado({ ...base, priority: "urgente" })).rejects.toMatchObject({
      status: 422,
    });
    await expect(api.criarChamado({ ...base, categoryId: 999 })).rejects.toMatchObject({
      status: 422,
    });
  });

  it("deixa o solicitante editar o texto, mas não prioridade ou responsável", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.carla);

    const alterado = await api.atualizarChamado(3, {
      title: "Erro ao exportar relatório do ERP",
    });

    expect(alterado.title).toBe("Erro ao exportar relatório do ERP");

    await expect(api.atualizarChamado(3, { priority: "low" })).rejects.toMatchObject({
      status: 403,
    });
    await expect(api.atualizarChamado(3, { assigneeId: 2 })).rejects.toMatchObject({
      status: 403,
    });
  });

  it("aplica as transições de status por papel", async () => {
    const armazenamento = criarArmazenamento();
    const api = criarApi(armazenamento);
    await entrar(api, CONTAS.carla);

    await expect(api.atualizarChamado(3, { status: "closed" })).rejects.toMatchObject({
      status: 422,
    });

    const ana = criarApi(armazenamento);
    await entrar(ana, CONTAS.ana);

    const emAndamento = await ana.atualizarChamado(3, { status: "in_progress" });
    expect(emAndamento.status).toBe("in_progress");

    const resolvido = await ana.atualizarChamado(3, { status: "resolved" });
    expect(resolvido.resolvedAt).toBe("2026-10-26T12:00:00.000Z");

    const cliente = criarApi(armazenamento);
    await entrar(cliente, CONTAS.carla);

    const encerrado = await cliente.atualizarChamado(3, { status: "closed" });
    expect(encerrado.status).toBe("closed");
  });

  it("só aceita agente como responsável", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.ana);

    const atribuido = await api.atualizarChamado(3, { assigneeId: 2 });
    expect(atribuido.assigneeName).toBe("Ana Souza");

    await expect(api.atualizarChamado(3, { assigneeId: 4 })).rejects.toMatchObject({
      status: 422,
    });
  });

  it("recalcula o SLA ao mudar a prioridade", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.ana);

    const chamado = await api.atualizarChamado(3, { priority: "critical" });

    expect(chamado.priority).toBe("critical");
    expect(chamado.dueAt).toBe("2026-10-26T06:00:00.000Z");
  });

  it("só permite exclusão por administrador", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.carla);
    await expect(api.removerChamado(7)).rejects.toMatchObject({ status: 403 });

    const ana = criarApi();
    await entrar(ana, CONTAS.ana);
    await expect(ana.removerChamado(7)).rejects.toMatchObject({ status: 403 });

    const admin = criarApi();
    await entrar(admin, CONTAS.admin);
    await admin.removerChamado(7);

    await expect(admin.obterChamado(7)).rejects.toMatchObject({ status: 404 });
  });
});

describe("comentários", () => {
  it("bloqueia nota interna do solicitante", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.carla);

    await expect(
      api.criarComentario(3, { body: "Nota interna indevida", internal: true })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("aceita nota interna da equipe e a esconde do solicitante", async () => {
    const armazenamento = criarArmazenamento();
    const equipe = criarApi(armazenamento);
    await entrar(equipe, CONTAS.ana);

    const nota = await equipe.criarComentario(3, {
      body: "Validar o certificado antes de responder.",
      internal: true,
    });

    expect(nota.internal).toBe(true);

    const daEquipe = await equipe.listarComentarios(3);
    expect(daEquipe.some((item) => item.internal)).toBe(true);

    const cliente = criarApi(armazenamento);
    await entrar(cliente, CONTAS.carla);

    const doCliente = await cliente.listarComentarios(3);
    expect(doCliente.length).toBeGreaterThan(0);
    expect(doCliente.every((item) => item.internal === false)).toBe(true);
    expect(
      doCliente.some((item) => item.body === "Validar o certificado antes de responder.")
    ).toBe(false);
  });

  it("compartilha o estado entre instâncias do mesmo armazenamento", async () => {
    const armazenamento = criarArmazenamento();
    const api = criarApi(armazenamento);
    await entrar(api, CONTAS.carla);

    await api.criarComentario(3, { body: "Informação adicional do solicitante." });

    const outra = criarApi(armazenamento);
    await entrar(outra, CONTAS.carla);

    const lista = await outra.listarComentarios(3);

    expect(lista.some((item) => item.body === "Informação adicional do solicitante.")).toBe(true);
  });

  it("valida o tamanho do comentário", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.carla);

    await expect(api.criarComentario(3, { body: "a" })).rejects.toMatchObject({ status: 422 });
  });
});

describe("indicadores", () => {
  it("resume status, atraso, média e carga da equipe", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.ana);

    const resumo = await api.painel();

    expect(resumo.totals).toEqual({ all: 8, open: 3, in_progress: 2, resolved: 2, closed: 1 });
    expect(resumo.byPriority).toEqual({ low: 1, medium: 3, high: 3, critical: 1 });
    expect(resumo.overdue).toBe(3);
    expect(resumo.unassigned).toBe(2);
    expect(resumo.avgResolutionHours).toBe(18.7);
    expect(resumo.byAgent[0]).toMatchObject({ nome: "Ana Souza", abertos: 2, resolvidos: 1 });
    expect(resumo.recent).toHaveLength(5);
    expect(resumo.generatedAt).toBe("2026-10-26T12:00:00.000Z");
  });

  it("não entrega indicadores ao solicitante", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.carla);

    await expect(api.painel()).rejects.toMatchObject({ status: 403 });
  });
});

describe("usuários", () => {
  it("admin vê todos; agente vê apenas a equipe e sem e-mail", async () => {
    const admin = criarApi();
    await entrar(admin, CONTAS.admin);
    const todos = await admin.listarUsuarios();

    expect(todos).toHaveLength(6);
    expect(todos.every((item) => Boolean(item.email))).toBe(true);

    const ana = criarApi();
    await entrar(ana, CONTAS.ana);
    const equipe = await ana.listarUsuarios();

    expect(equipe).toHaveLength(3);
    expect(equipe.every((item) => item.role !== "requester")).toBe(true);
    expect(equipe.every((item) => item.email === undefined)).toBe(true);

    const carla = criarApi();
    await entrar(carla, CONTAS.carla);
    await expect(carla.listarUsuarios()).rejects.toMatchObject({ status: 403 });
  });

  it("admin promove papéis e não pode rebaixar o último administrador", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.admin);

    await expect(api.atualizarPapel(1, "agent")).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining("pelo menos um administrador"),
    });

    const promovida = await api.atualizarPapel(4, "agent");
    expect(promovida.role).toBe("agent");
  });

  it("agente não altera papéis", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.ana);

    await expect(api.atualizarPapel(4, "agent")).rejects.toMatchObject({ status: 403 });
  });
});

describe("categorias", () => {
  it("lista para todos e restringe a escrita ao administrador", async () => {
    const ana = criarApi();
    await entrar(ana, CONTAS.ana);

    expect(await ana.listarCategorias()).toHaveLength(5);
    await expect(ana.criarCategoria({ name: "Telefonia", color: "#10b981" })).rejects.toMatchObject(
      { status: 403 }
    );
  });

  it("cria, recusa duplicada, valida cor e edita", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.admin);

    const criada = await api.criarCategoria({ name: "Telefonia", color: "#10b981" });
    expect(criada).toMatchObject({ name: "Telefonia", color: "#10b981" });

    await expect(api.criarCategoria({ name: "telefonia" })).rejects.toMatchObject({ status: 409 });
    await expect(api.criarCategoria({ name: "Outra", color: "verde" })).rejects.toMatchObject({
      status: 422,
    });

    const editada = await api.atualizarCategoria(criada.id, { name: "VoIP" });
    expect(editada.name).toBe("VoIP");
  });

  it("exclui categoria e limpa a referência nos chamados", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.admin);

    await api.removerCategoria(1);

    expect(await api.listarCategorias()).toHaveLength(4);
    expect((await api.obterChamado(1)).categoryId).toBeNull();

    await expect(api.removerCategoria(999)).rejects.toMatchObject({ status: 404 });
  });
});

describe("persistência da demonstração", () => {
  it("recria o cenário inicial ao reiniciar", async () => {
    const api = criarApi();
    await entrar(api, CONTAS.carla);
    await api.criarChamado({
      title: "Chamado temporário",
      description: "Deve desaparecer ao reiniciar a demonstração.",
    });

    await api.reiniciar();

    expect(await api.me()).toBeNull();

    await entrar(api, CONTAS.ana);
    expect((await api.listarChamados()).total).toBe(8);
  });

  it("mantém a sessão e os dados em uma nova instância", async () => {
    const armazenamento = criarArmazenamento();
    const api = criarApi(armazenamento);

    await entrar(api, CONTAS.carla);
    const criado = await api.criarChamado({
      title: "Chamado persistido",
      description: "Precisa continuar existindo após recarregar a página.",
    });

    const recarregada = criarApi(armazenamento);
    const sessao = await recarregada.me();

    expect(sessao.email).toBe(CONTAS.carla.email);
    expect((await recarregada.obterChamado(criado.id)).title).toBe("Chamado persistido");
  });
});
