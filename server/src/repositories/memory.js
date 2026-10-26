import { prazoPorPrioridade } from "../domain/tickets.js";

/**
 * Repositórios em memória com a mesma interface dos repositórios MySQL.
 * É o que roda nos testes: rápidos, sem Docker e sem estado compartilhado.
 */
export function criarRepositoriosMemoria({ clock = () => new Date() } = {}) {
  const usuarios = [];
  const categorias = [];
  const chamados = [];
  const comentarios = [];

  let proximoUsuario = 1;
  let proximaCategoria = 1;
  let proximoChamado = 1;
  let proximoComentario = 1;

  const agora = () => clock().toISOString();

  const publico = (usuario) => {
    if (!usuario) return null;
    const { passwordHash, ...resto } = usuario;
    return { ...resto };
  };

  const detalhar = (chamado) => {
    const categoria = categorias.find((item) => item.id === chamado.categoryId);
    const solicitante = usuarios.find((item) => item.id === chamado.requesterId);
    const responsavel = usuarios.find((item) => item.id === chamado.assigneeId);

    return {
      ...chamado,
      categoryName: categoria?.name ?? null,
      categoryColor: categoria?.color ?? null,
      requesterName: solicitante?.name ?? null,
      assigneeName: responsavel?.name ?? null,
    };
  };

  const users = {
    async criar({ name, email, passwordHash, role = "requester" }) {
      const usuario = {
        id: proximoUsuario++,
        name,
        email,
        passwordHash,
        role,
        createdAt: agora(),
      };
      usuarios.push(usuario);
      return publico(usuario);
    },

    async findByEmailComSenha(email) {
      return usuarios.find((item) => item.email === email) ?? null;
    },

    async findById(id) {
      return publico(usuarios.find((item) => item.id === Number(id)));
    },

    async listar() {
      return usuarios.map(publico);
    },

    async atualizarPapel(id, role) {
      const usuario = usuarios.find((item) => item.id === Number(id));
      if (!usuario) return null;
      usuario.role = role;
      return publico(usuario);
    },

    async contarAdmins() {
      return usuarios.filter((item) => item.role === "admin").length;
    },
  };

  const categories = {
    async criar({ name, color }) {
      const categoria = { id: proximaCategoria++, name, color, createdAt: agora() };
      categorias.push(categoria);
      return { ...categoria };
    },

    async listar() {
      return categorias.map((item) => ({ ...item }));
    },

    async findById(id) {
      return categorias.find((item) => item.id === Number(id)) ?? null;
    },

    async atualizar(id, dados) {
      const categoria = categorias.find((item) => item.id === Number(id));
      if (!categoria) return null;
      Object.assign(categoria, dados);
      return { ...categoria };
    },

    async remover(id) {
      const indice = categorias.findIndex((item) => item.id === Number(id));
      if (indice < 0) return false;
      categorias.splice(indice, 1);
      chamados.forEach((chamado) => {
        if (chamado.categoryId === Number(id)) chamado.categoryId = null;
      });
      return true;
    },
  };

  const tickets = {
    async criar(dados) {
      const criadoEm = agora();
      const chamado = {
        id: proximoChamado++,
        title: dados.title,
        description: dados.description,
        status: dados.status ?? "open",
        priority: dados.priority ?? "medium",
        categoryId: dados.categoryId ?? null,
        requesterId: dados.requesterId,
        assigneeId: dados.assigneeId ?? null,
        createdAt: criadoEm,
        updatedAt: criadoEm,
        dueAt: prazoPorPrioridade(dados.priority ?? "medium", criadoEm),
        resolvedAt: null,
        closedAt: null,
      };
      chamados.push(chamado);
      return detalhar(chamado);
    },

    async listar({ filtros = {}, page = 1, limit = 20 } = {}) {
      let lista = [...chamados];

      if (filtros.requesterId) {
        lista = lista.filter((item) => item.requesterId === Number(filtros.requesterId));
      }
      if (filtros.status) {
        lista = lista.filter((item) => item.status === filtros.status);
      }
      if (filtros.priority) {
        lista = lista.filter((item) => item.priority === filtros.priority);
      }
      if (filtros.categoryId) {
        lista = lista.filter((item) => item.categoryId === Number(filtros.categoryId));
      }
      if (filtros.assigneeId === "unassigned") {
        lista = lista.filter((item) => item.assigneeId === null);
      } else if (filtros.assigneeId === "me") {
        lista = lista.filter((item) => item.assigneeId === Number(filtros.usuarioId));
      } else if (filtros.assigneeId) {
        lista = lista.filter((item) => item.assigneeId === Number(filtros.assigneeId));
      }
      if (filtros.q) {
        const termo = filtros.q.toLowerCase();
        lista = lista.filter(
          (item) =>
            item.title.toLowerCase().includes(termo) ||
            item.description.toLowerCase().includes(termo)
        );
      }

      lista.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id - a.id));

      const total = lista.length;
      const inicio = (page - 1) * limit;

      return {
        items: lista.slice(inicio, inicio + limit).map(detalhar),
        total,
      };
    },

    async todos() {
      return chamados.map(detalhar);
    },

    async findById(id) {
      const chamado = chamados.find((item) => item.id === Number(id));
      return chamado ? detalhar(chamado) : null;
    },

    async atualizar(id, dados) {
      const chamado = chamados.find((item) => item.id === Number(id));
      if (!chamado) return null;

      const alteradoEm = agora();

      if (dados.status && dados.status !== chamado.status) {
        chamado.status = dados.status;
        chamado.resolvedAt = dados.status === "resolved" ? alteradoEm : null;
        chamado.closedAt = dados.status === "closed" ? alteradoEm : null;

        if (dados.status === "open") {
          chamado.resolvedAt = null;
          chamado.closedAt = null;
        }
      }

      if (dados.priority && dados.priority !== chamado.priority) {
        chamado.priority = dados.priority;
        chamado.dueAt = prazoPorPrioridade(dados.priority, chamado.createdAt);
      }

      ["title", "description", "categoryId", "assigneeId"].forEach((campo) => {
        if (campo in dados) chamado[campo] = dados[campo];
      });

      chamado.updatedAt = alteradoEm;
      return detalhar(chamado);
    },

    async remover(id) {
      const indice = chamados.findIndex((item) => item.id === Number(id));
      if (indice < 0) return false;
      chamados.splice(indice, 1);
      for (let i = comentarios.length - 1; i >= 0; i -= 1) {
        if (comentarios[i].ticketId === Number(id)) comentarios.splice(i, 1);
      }
      return true;
    },
  };

  const comments = {
    async criar({ ticketId, authorId, body, internal = false }) {
      const autor = usuarios.find((item) => item.id === Number(authorId));
      const comentario = {
        id: proximoComentario++,
        ticketId: Number(ticketId),
        authorId: Number(authorId),
        authorName: autor?.name ?? null,
        authorRole: autor?.role ?? null,
        body,
        internal,
        createdAt: agora(),
      };
      comentarios.push(comentario);
      return { ...comentario };
    },

    async listar(ticketId, { incluirInternos = true } = {}) {
      return comentarios
        .filter((item) => item.ticketId === Number(ticketId))
        .filter((item) => incluirInternos || !item.internal)
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id - b.id))
        .map((item) => ({ ...item }));
    },
  };

  return { users, categories, tickets, comments, _memoria: { usuarios, categorias, chamados, comentarios } };
}
