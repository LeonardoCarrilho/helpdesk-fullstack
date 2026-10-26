import { ErroApi } from "./http.js";
import { ehEquipe, prazoPorPrioridade, transicoesDisponiveis } from "../lib/labels.js";

/**
 * API de demonstração: roda inteira no navegador, sem servidor.
 *
 * É o modo usado no GitHub Pages, onde não existe back-end. Reproduz os
 * mesmos contratos e as mesmas regras de autorização da API real para que a
 * interface seja exercitada de verdade (e não com dados fixos na tela).
 */

const HORA = 3_600_000;
const CHAVE_ESTADO = "helpdesk:demo:v1";
const CHAVE_SESSAO = "helpdesk:demo:sessao";

export const CONTAS_DEMO = [
  {
    role: "admin",
    nome: "Leonardo Carrilho",
    email: "admin@helpdesk.dev",
    senha: "admin12345",
    descricao: "Vê tudo, gerencia equipe e categorias.",
  },
  {
    role: "agent",
    nome: "Ana Souza",
    email: "ana@helpdesk.dev",
    senha: "agente12345",
    descricao: "Atende, atribui e acompanha indicadores.",
  },
  {
    role: "requester",
    nome: "Carla Mendes",
    email: "cliente@helpdesk.dev",
    senha: "cliente12345",
    descricao: "Abre chamados e vê apenas os próprios.",
  },
];

const CONTAS = [
  { id: 1, name: "Leonardo Carrilho", email: "admin@helpdesk.dev", senha: "admin12345", role: "admin" },
  { id: 2, name: "Ana Souza", email: "ana@helpdesk.dev", senha: "agente12345", role: "agent" },
  { id: 3, name: "Bruno Lima", email: "bruno@helpdesk.dev", senha: "agente12345", role: "agent" },
  { id: 4, name: "Carla Mendes", email: "cliente@helpdesk.dev", senha: "cliente12345", role: "requester" },
  { id: 5, name: "João Pereira", email: "joao@helpdesk.dev", senha: "cliente12345", role: "requester" },
  { id: 6, name: "Marina Alves", email: "marina@helpdesk.dev", senha: "cliente12345", role: "requester" },
];

const CATEGORIAS = [
  { id: 1, name: "Acesso", color: "#6366f1" },
  { id: 2, name: "Hardware", color: "#f59e0b" },
  { id: 3, name: "Software", color: "#0ea5e9" },
  { id: 4, name: "Rede", color: "#10b981" },
  { id: 5, name: "Financeiro", color: "#ef4444" },
];

const SEMENTE = [
  {
    id: 1,
    title: "Não consigo acessar o e-mail corporativo",
    description:
      "Desde a troca de senha na segunda-feira o webmail retorna erro de credenciais. Já tentei em dois navegadores e no celular.",
    status: "in_progress",
    priority: "high",
    categoryId: 1,
    requesterId: 4,
    assigneeId: 2,
    horasAtras: 26,
    comentarios: [
      { autorId: 4, corpo: "O erro aparece logo depois do login, na tela de caixa de entrada.", horasApos: 1 },
      { autorId: 2, corpo: "Chamado recebido. Vou validar a sincronização da conta no diretório.", horasApos: 2 },
      {
        autorId: 2,
        corpo: "Checklist interno: usuário tem 2 contas com o mesmo alias. Confirmar qual manter antes de resetar.",
        interno: true,
        horasApos: 3,
      },
    ],
  },
  {
    id: 2,
    title: "Notebook reiniciando sozinho",
    description:
      "O notebook reinicia sem aviso durante o uso, principalmente quando está na bateria. Perco o que estava fazendo.",
    status: "open",
    priority: "critical",
    categoryId: 2,
    requesterId: 4,
    assigneeId: 3,
    horasAtras: 5,
    comentarios: [
      { autorId: 4, corpo: "Aconteceu três vezes hoje, sempre por volta das 10h.", horasApos: 1 },
    ],
  },
  {
    id: 3,
    title: "Erro ao gerar relatório no ERP",
    description:
      "O botão Exportar retorna página em branco desde a atualização de ontem. Isso trava o fechamento do mês.",
    status: "open",
    priority: "high",
    categoryId: 3,
    requesterId: 4,
    assigneeId: null,
    horasAtras: 10,
    comentarios: [
      { autorId: 4, corpo: "Tentei em dois navegadores e o comportamento é o mesmo.", horasApos: 2 },
    ],
  },
  {
    id: 4,
    title: "Wi-Fi do 3º andar instável",
    description:
      "A conexão cai a cada poucos minutos no lado esquerdo do andar. Testei em dois computadores diferentes.",
    status: "resolved",
    priority: "medium",
    categoryId: 4,
    requesterId: 5,
    assigneeId: 3,
    horasAtras: 48,
    horasParaResolver: 20,
    comentarios: [
      { autorId: 5, corpo: "A queda acontece principalmente no período da tarde.", horasApos: 3 },
      { autorId: 3, corpo: "Troquei o canal do access point e refiz o cabeamento do rack. Monitorando.", horasApos: 18 },
      { autorId: 5, corpo: "Estável desde ontem à noite, obrigado!", horasApos: 22 },
    ],
  },
  {
    id: 5,
    title: "Dúvida sobre reembolso de deslocamento",
    description:
      "Preciso enviar a nota de táxi da visita ao cliente. Qual é o prazo e o formulário correto para solicitar?",
    status: "closed",
    priority: "low",
    categoryId: 5,
    requesterId: 6,
    assigneeId: 1,
    horasAtras: 96,
    horasParaResolver: 30,
    comentarios: [
      { autorId: 1, corpo: "Use o formulário de reembolso no portal financeiro e anexe a nota em PDF.", horasApos: 6 },
      { autorId: 6, corpo: "Enviado pelo portal. Obrigada!", horasApos: 28 },
    ],
  },
  {
    id: 6,
    title: "Solicitação de acesso ao dashboard de vendas",
    description:
      "Novo analista precisa de leitura no dashboard de vendas. O gestor já aprovou pelo chat da equipe.",
    status: "resolved",
    priority: "medium",
    categoryId: 1,
    requesterId: 6,
    assigneeId: 2,
    horasAtras: 30,
    horasParaResolver: 6,
    comentarios: [
      { autorId: 2, corpo: "Acesso concedido em modo leitura. Pedir para validar o primeiro login.", horasApos: 5 },
    ],
  },
  {
    id: 7,
    title: "Impressora fiscal não imprime cupom",
    description:
      "A impressora do caixa 2 não emite cupom desde a troca do rolo. A luz vermelha fica piscando.",
    status: "open",
    priority: "high",
    categoryId: 2,
    requesterId: 5,
    assigneeId: null,
    horasAtras: 3,
    comentarios: [],
  },
  {
    id: 8,
    title: "Lentidão no sistema de ponto",
    description:
      "O registro de ponto leva mais de um minuto para responder no início do turno. Afeta todos os colaboradores do setor.",
    status: "in_progress",
    priority: "medium",
    categoryId: 3,
    requesterId: 4,
    assigneeId: 2,
    horasAtras: 14,
    comentarios: [
      { autorId: 2, corpo: "Identifiquei pico de consultas às 8h. Vou avaliar o índice da tabela de registros.", horasApos: 4 },
    ],
  },
];

function armazenamentoSeguro() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function lerSessao(armazenamento) {
  try {
    const bruto = armazenamento?.getItem(CHAVE_SESSAO);
    return bruto ? Number(bruto) : null;
  } catch {
    return null;
  }
}

function gravarSessao(armazenamento, id) {
  try {
    if (id) armazenamento?.setItem(CHAVE_SESSAO, String(id));
    else armazenamento?.removeItem(CHAVE_SESSAO);
  } catch {
    /* sessão só nesta aba */
  }
}

function criarEstado(agora = Date.now()) {
  const usuarios = CONTAS.map((item) => ({ ...item }));
  const categorias = CATEGORIAS.map((item) => ({ ...item }));
  const chamados = [];
  const comentarios = [];
  let proximoComentario = 1;

  SEMENTE.forEach((item) => {
    const criadoEm = new Date(agora - item.horasAtras * HORA).toISOString();
    const chamado = {
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status,
      priority: item.priority,
      categoryId: item.categoryId,
      requesterId: item.requesterId,
      assigneeId: item.assigneeId,
      createdAt: criadoEm,
      updatedAt: criadoEm,
      dueAt: prazoPorPrioridade(item.priority, criadoEm),
      resolvedAt: null,
      closedAt: null,
    };

    if (item.horasParaResolver) {
      const resolvidoEm = new Date(
        new Date(criadoEm).getTime() + item.horasParaResolver * HORA
      ).toISOString();

      chamado.resolvedAt = resolvidoEm;
      chamado.updatedAt = resolvidoEm;
      chamado.closedAt = item.status === "closed" ? resolvidoEm : null;
    }

    chamados.push(chamado);

    (item.comentarios ?? []).forEach((comentario) => {
      comentarios.push({
        id: proximoComentario++,
        ticketId: chamado.id,
        authorId: comentario.autorId,
        body: comentario.corpo,
        internal: Boolean(comentario.interno),
        createdAt: new Date(
          new Date(criadoEm).getTime() + comentario.horasApos * HORA
        ).toISOString(),
      });
    });
  });

  return {
    versao: 1,
    usuarios,
    categorias,
    chamados,
    comentarios,
    sequencias: {
      chamado: chamados.length + 1,
      categoria: categorias.length + 1,
      comentario: proximoComentario,
    },
  };
}

function carregarEstado(armazenamento, agora) {
  try {
    const bruto = armazenamento?.getItem(CHAVE_ESTADO);
    if (!bruto) return criarEstado(agora);

    const estado = JSON.parse(bruto);
    if (!Array.isArray(estado?.chamados) || !Array.isArray(estado?.usuarios)) {
      return criarEstado(agora);
    }

    return estado;
  } catch {
    return criarEstado(agora);
  }
}

function textoObrigatorio(valor, minimo, maximo, campo) {
  const texto = String(valor ?? "").trim();

  if (texto.length < minimo || texto.length > maximo) {
    throw new ErroApi(`${campo} deve ter entre ${minimo} e ${maximo} caracteres.`, { status: 422 });
  }

  return texto;
}

export function criarApiDemo({
  armazenamento = armazenamentoSeguro(),
  atraso = 90,
  clock = () => Date.now(),
} = {}) {
  let estado = carregarEstado(armazenamento, clock());
  let sessao = lerSessao(armazenamento);

  const agora = () => new Date(clock()).toISOString();
  const esperar = () => (atraso > 0 ? new Promise((r) => setTimeout(r, atraso)) : Promise.resolve());

  const salvar = () => {
    try {
      armazenamento?.setItem(CHAVE_ESTADO, JSON.stringify(estado));
    } catch {
      /* modo demonstração segue em memória */
    }
  };

  const semSenha = (usuario) => {
    if (!usuario) return null;
    const { senha, ...resto } = usuario;
    return { ...resto };
  };

  const atual = () => estado.usuarios.find((item) => item.id === sessao) ?? null;

  const exigirUsuario = () => {
    const usuario = atual();
    if (!usuario) throw new ErroApi("Sessão expirada. Entre novamente.", { status: 401 });
    return usuario;
  };

  const exigirEquipe = () => {
    const usuario = exigirUsuario();
    if (!ehEquipe(usuario)) {
      throw new ErroApi("Acesso restrito à equipe de atendimento.", { status: 403 });
    }
    return usuario;
  };

  const exigirAdmin = () => {
    const usuario = exigirUsuario();
    if (usuario.role !== "admin") {
      throw new ErroApi("Apenas administradores podem fazer esta alteração.", { status: 403 });
    }
    return usuario;
  };

  const detalhar = (chamado) => {
    const categoria = estado.categorias.find((item) => item.id === chamado.categoryId);
    const solicitante = estado.usuarios.find((item) => item.id === chamado.requesterId);
    const responsavel = estado.usuarios.find((item) => item.id === chamado.assigneeId);

    return {
      ...chamado,
      categoryName: categoria?.name ?? null,
      categoryColor: categoria?.color ?? null,
      requesterName: solicitante?.name ?? null,
      assigneeName: responsavel?.name ?? null,
    };
  };

  const acharChamado = (id) => estado.chamados.find((item) => item.id === Number(id)) ?? null;

  const visivel = (usuario, chamado) => {
    if (!chamado) return false;
    return ehEquipe(usuario) || chamado.requesterId === usuario.id;
  };

  const exigirVisivel = (usuario, id) => {
    const chamado = acharChamado(id);
    if (!chamado) throw new ErroApi("Chamado não encontrado.", { status: 404 });
    if (!visivel(usuario, chamado)) {
      throw new ErroApi("Este chamado pertence a outro solicitante.", { status: 403 });
    }
    return chamado;
  };

  const comentarioDetalhado = (comentario) => {
    const autor = estado.usuarios.find((item) => item.id === comentario.authorId);
    return {
      ...comentario,
      authorName: autor?.name ?? null,
      authorRole: autor?.role ?? null,
    };
  };

  return {
    modo: "demo",

    temSessao: () => Boolean(atual()),

    async login({ email, password }) {
      await esperar();
      const conta = estado.usuarios.find(
        (item) => item.email === String(email ?? "").trim().toLowerCase()
      );

      if (!conta || conta.senha !== password) {
        throw new ErroApi("E-mail ou senha incorretos.", { status: 401 });
      }

      sessao = conta.id;
      gravarSessao(armazenamento, sessao);

      return { usuario: semSenha(conta), token: `demo:${conta.id}` };
    },

    async registrar({ name, email, password }) {
      await esperar();

      const nome = textoObrigatorio(name, 2, 80, "Nome");
      const correio = String(email ?? "").trim().toLowerCase();

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correio)) {
        throw new ErroApi("Informe um e-mail válido.", { status: 422 });
      }

      if (String(password ?? "").length < 8) {
        throw new ErroApi("A senha precisa ter pelo menos 8 caracteres.", { status: 422 });
      }

      if (estado.usuarios.some((item) => item.email === correio)) {
        throw new ErroApi("Já existe uma conta com este e-mail.", { status: 409 });
      }

      const conta = {
        id: Math.max(...estado.usuarios.map((item) => item.id)) + 1,
        name: nome,
        email: correio,
        senha: password,
        role: "requester",
      };

      estado.usuarios.push(conta);
      salvar();

      sessao = conta.id;
      gravarSessao(armazenamento, sessao);

      return { usuario: semSenha(conta), token: `demo:${conta.id}` };
    },

    async me() {
      await esperar();
      return semSenha(atual());
    },

    async logout() {
      await esperar();
      sessao = null;
      gravarSessao(armazenamento, null);
    },

    async listarChamados(filtros = {}) {
      await esperar();
      const usuario = exigirUsuario();

      let lista = [...estado.chamados];

      if (!ehEquipe(usuario)) {
        lista = lista.filter((item) => item.requesterId === usuario.id);
      }
      if (filtros.status) lista = lista.filter((item) => item.status === filtros.status);
      if (filtros.priority) lista = lista.filter((item) => item.priority === filtros.priority);
      if (filtros.categoryId) {
        lista = lista.filter((item) => item.categoryId === Number(filtros.categoryId));
      }
      if (filtros.assigneeId === "unassigned") {
        lista = lista.filter((item) => item.assigneeId === null);
      } else if (filtros.assigneeId === "me") {
        lista = lista.filter((item) => item.assigneeId === usuario.id);
      } else if (filtros.assigneeId) {
        lista = lista.filter((item) => item.assigneeId === Number(filtros.assigneeId));
      }
      if (filtros.q) {
        const termo = String(filtros.q).toLowerCase();
        lista = lista.filter(
          (item) =>
            item.title.toLowerCase().includes(termo) ||
            item.description.toLowerCase().includes(termo)
        );
      }

      lista.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id - a.id));

      const page = Math.max(1, Number(filtros.page) || 1);
      const limit = Math.max(1, Number(filtros.limit) || 20);
      const inicio = (page - 1) * limit;

      return {
        items: lista.slice(inicio, inicio + limit).map(detalhar),
        total: lista.length,
        page,
        limit,
      };
    },

    async obterChamado(id) {
      await esperar();
      return detalhar(exigirVisivel(exigirUsuario(), id));
    },

    async criarChamado(dados) {
      await esperar();
      const usuario = exigirUsuario();

      const title = textoObrigatorio(dados?.title, 5, 120, "Título");
      const description = textoObrigatorio(dados?.description, 10, 5000, "Descrição");
      const priority = dados?.priority ?? "medium";

      if (!["low", "medium", "high", "critical"].includes(priority)) {
        throw new ErroApi("Prioridade inválida.", { status: 422 });
      }

      const categoryId = dados?.categoryId ? Number(dados.categoryId) : null;

      if (categoryId && !estado.categorias.some((item) => item.id === categoryId)) {
        throw new ErroApi("Categoria informada não existe.", { status: 422 });
      }

      if (dados?.assigneeId && !ehEquipe(usuario)) {
        throw new ErroApi("Apenas a equipe pode definir o responsável na abertura.", { status: 403 });
      }

      const criadoEm = agora();
      const chamado = {
        id: estado.sequencias.chamado++,
        title,
        description,
        status: "open",
        priority,
        categoryId,
        requesterId: usuario.id,
        assigneeId: dados?.assigneeId ? Number(dados.assigneeId) : null,
        createdAt: criadoEm,
        updatedAt: criadoEm,
        dueAt: prazoPorPrioridade(priority, criadoEm),
        resolvedAt: null,
        closedAt: null,
      };

      estado.chamados.push(chamado);
      salvar();

      return detalhar(chamado);
    },

    async atualizarChamado(id, dados) {
      await esperar();
      const usuario = exigirUsuario();
      const chamado = exigirVisivel(usuario, id);
      const alteracoes = {};

      if (!ehEquipe(usuario)) {
        const proibidos = ["priority", "assigneeId", "categoryId"].filter(
          (campo) => dados?.[campo] !== undefined
        );

        if (proibidos.length) {
          throw new ErroApi(
            "Solicitantes podem editar o texto e o andamento do próprio chamado, mas não prioridade, responsável ou categoria.",
            { status: 403 }
          );
        }
      }

      if (dados?.title !== undefined) {
        alteracoes.title = textoObrigatorio(dados.title, 5, 120, "Título");
      }
      if (dados?.description !== undefined) {
        alteracoes.description = textoObrigatorio(dados.description, 10, 5000, "Descrição");
      }

      if (dados?.priority !== undefined) {
        if (!["low", "medium", "high", "critical"].includes(dados.priority)) {
          throw new ErroApi("Prioridade inválida.", { status: 422 });
        }
        alteracoes.priority = dados.priority;
      }

      if (dados?.categoryId !== undefined) {
        const categoryId = dados.categoryId ? Number(dados.categoryId) : null;
        if (categoryId && !estado.categorias.some((item) => item.id === categoryId)) {
          throw new ErroApi("Categoria informada não existe.", { status: 422 });
        }
        alteracoes.categoryId = categoryId;
      }

      if (dados?.assigneeId !== undefined) {
        const assigneeId = dados.assigneeId ? Number(dados.assigneeId) : null;
        if (assigneeId) {
          const responsavel = estado.usuarios.find((item) => item.id === assigneeId);
          if (!responsavel || !ehEquipe(responsavel)) {
            throw new ErroApi("O responsável precisa ser um agente ou administrador.", {
              status: 422,
            });
          }
        }
        alteracoes.assigneeId = assigneeId;
      }

      if (dados?.status !== undefined && dados.status !== chamado.status) {
        const permitida = transicoesDisponiveis(usuario, chamado).some(
          (item) => item.status === dados.status
        );

        if (!permitida) {
          throw new ErroApi(`Transição de status inválida: ${chamado.status} → ${dados.status}.`, {
            status: 422,
          });
        }

        alteracoes.status = dados.status;
      }

      const alteradoEm = agora();

      if (alteracoes.status) {
        chamado.status = alteracoes.status;
        chamado.resolvedAt = alteracoes.status === "resolved" ? alteradoEm : null;
        chamado.closedAt = alteracoes.status === "closed" ? alteradoEm : null;
        if (alteracoes.status === "open") chamado.resolvedAt = null;
      }

      if (alteracoes.priority && alteracoes.priority !== chamado.priority) {
        chamado.priority = alteracoes.priority;
        chamado.dueAt = prazoPorPrioridade(chamado.priority, chamado.createdAt);
      }

      ["title", "description", "categoryId", "assigneeId"].forEach((campo) => {
        if (campo in alteracoes) chamado[campo] = alteracoes[campo];
      });

      chamado.updatedAt = alteradoEm;
      salvar();

      return detalhar(chamado);
    },

    async removerChamado(id) {
      await esperar();
      const usuario = exigirAdmin();
      const chamado = acharChamado(id);

      if (!chamado) throw new ErroApi("Chamado não encontrado.", { status: 404 });

      if (!visivel(usuario, chamado)) {
        throw new ErroApi("Este chamado pertence a outro solicitante.", { status: 403 });
      }

      estado.chamados = estado.chamados.filter((item) => item.id !== chamado.id);
      estado.comentarios = estado.comentarios.filter((item) => item.ticketId !== chamado.id);
      salvar();
    },

    async listarComentarios(id) {
      await esperar();
      const usuario = exigirUsuario();
      const chamado = exigirVisivel(usuario, id);

      return estado.comentarios
        .filter((item) => item.ticketId === chamado.id)
        .filter((item) => ehEquipe(usuario) || !item.internal)
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id - b.id))
        .map(comentarioDetalhado);
    },

    async criarComentario(id, { body, internal = false } = {}) {
      await esperar();
      const usuario = exigirUsuario();
      const chamado = exigirVisivel(usuario, id);
      const equipe = ehEquipe(usuario);

      if (internal && !equipe) {
        throw new ErroApi("Comentários internos são restritos à equipe.", { status: 403 });
      }

      const comentario = {
        id: estado.sequencias.comentario++,
        ticketId: chamado.id,
        authorId: usuario.id,
        body: textoObrigatorio(body, 2, 2000, "Comentário"),
        internal: Boolean(internal && equipe),
        createdAt: agora(),
      };

      estado.comentarios.push(comentario);
      chamado.updatedAt = comentario.createdAt;
      salvar();

      return comentarioDetalhado(comentario);
    },

    async listarCategorias() {
      await esperar();
      exigirUsuario();
      return estado.categorias
        .map((item) => ({ ...item }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },

    async criarCategoria({ name, color } = {}) {
      await esperar();
      exigirAdmin();

      const nome = textoObrigatorio(name, 2, 40, "Nome");

      if (estado.categorias.some((item) => item.name.toLowerCase() === nome.toLowerCase())) {
        throw new ErroApi("Já existe uma categoria com este nome.", { status: 409 });
      }

      const cor = String(color ?? "#6366f1");

      if (!/^#[0-9a-fA-F]{6}$/.test(cor)) {
        throw new ErroApi("Use uma cor no formato hexadecimal, como #2563eb.", { status: 422 });
      }

      const categoria = { id: estado.sequencias.categoria++, name: nome, color: cor };
      estado.categorias.push(categoria);
      salvar();

      return { ...categoria };
    },

    async atualizarCategoria(id, dados = {}) {
      await esperar();
      exigirAdmin();

      const categoria = estado.categorias.find((item) => item.id === Number(id));
      if (!categoria) throw new ErroApi("Categoria não encontrada.", { status: 404 });

      if (dados.name !== undefined) {
        const nome = textoObrigatorio(dados.name, 2, 40, "Nome");
        const repetida = estado.categorias.some(
          (item) => item.id !== categoria.id && item.name.toLowerCase() === nome.toLowerCase()
        );

        if (repetida) throw new ErroApi("Já existe uma categoria com este nome.", { status: 409 });
        categoria.name = nome;
      }

      if (dados.color !== undefined) {
        if (!/^#[0-9a-fA-F]{6}$/.test(String(dados.color))) {
          throw new ErroApi("Use uma cor no formato hexadecimal, como #2563eb.", { status: 422 });
        }
        categoria.color = dados.color;
      }

      salvar();
      return { ...categoria };
    },

    async removerCategoria(id) {
      await esperar();
      exigirAdmin();

      const categoria = estado.categorias.find((item) => item.id === Number(id));
      if (!categoria) throw new ErroApi("Categoria não encontrada.", { status: 404 });

      estado.categorias = estado.categorias.filter((item) => item.id !== categoria.id);
      estado.chamados.forEach((chamado) => {
        if (chamado.categoryId === categoria.id) chamado.categoryId = null;
      });

      salvar();
    },

    async listarUsuarios() {
      await esperar();
      const usuario = exigirEquipe();
      const lista = [...estado.usuarios].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

      return lista
        .filter((item) => usuario.role === "admin" || ehEquipe(item))
        .map((item) => {
          const { senha, ...resto } = item;
          return usuario.role === "admin" ? { ...resto } : { ...resto, email: undefined };
        });
    },

    async atualizarPapel(id, role) {
      await esperar();
      exigirAdmin();

      if (!["admin", "agent", "requester"].includes(role)) {
        throw new ErroApi("Papel inválido.", { status: 422 });
      }

      const usuario = estado.usuarios.find((item) => item.id === Number(id));
      if (!usuario) throw new ErroApi("Usuário não encontrado.", { status: 404 });

      if (usuario.role === "admin" && role !== "admin") {
        const admins = estado.usuarios.filter((item) => item.role === "admin").length;
        if (admins <= 1) {
          throw new ErroApi("O sistema precisa manter pelo menos um administrador.", { status: 422 });
        }
      }

      usuario.role = role;
      salvar();

      return semSenha(usuario);
    },

    async painel() {
      await esperar();
      const usuario = exigirEquipe();
      const chamados = estado.chamados.map(detalhar);
      const instante = agora();

      const totals = { all: chamados.length, open: 0, in_progress: 0, resolved: 0, closed: 0 };
      const byPriority = { low: 0, medium: 0, high: 0, critical: 0 };
      const agentes = new Map();

      let overdue = 0;
      let unassigned = 0;
      const duracoes = [];

      chamados.forEach((chamado) => {
        totals[chamado.status] += 1;
        byPriority[chamado.priority] += 1;

        const concluido = chamado.status === "resolved" || chamado.status === "closed";
        if (!concluido && chamado.dueAt && chamado.dueAt < instante) overdue += 1;
        if (!chamado.assigneeId) unassigned += 1;

        if (chamado.resolvedAt) {
          const horas = (new Date(chamado.resolvedAt) - new Date(chamado.createdAt)) / HORA;
          if (Number.isFinite(horas)) duracoes.push(horas);
        }

        if (chamado.assigneeId) {
          const atualAgente = agentes.get(chamado.assigneeId) ?? {
            id: chamado.assigneeId,
            nome: chamado.assigneeName,
            abertos: 0,
            resolvidos: 0,
          };

          if (concluido) atualAgente.resolvidos += 1;
          else atualAgente.abertos += 1;

          agentes.set(chamado.assigneeId, atualAgente);
        }
      });

      const media = duracoes.length
        ? Math.round((duracoes.reduce((soma, valor) => soma + valor, 0) / duracoes.length) * 10) / 10
        : 0;

      void usuario;

      return {
        totals,
        byPriority,
        overdue,
        unassigned,
        avgResolutionHours: media,
        byAgent: [...agentes.values()].sort((a, b) => b.abertos - a.abertos),
        recent: chamados
          .slice()
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .slice(0, 5),
        generatedAt: instante,
      };
    },

    /** Volta ao cenário inicial: usado pelo botão "Reiniciar demo". */
    async reiniciar() {
      await esperar();
      estado = criarEstado(clock());
      sessao = null;
      gravarSessao(armazenamento, null);
      try {
        armazenamento?.removeItem(CHAVE_ESTADO);
      } catch {
        /* nada a fazer */
      }
    },
  };
}
