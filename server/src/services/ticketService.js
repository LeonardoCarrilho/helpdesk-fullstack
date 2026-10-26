import { AppError, naoEncontrado, semPermissao } from "../utils/errors.js";
import { diferencaEmHoras } from "../utils/datas.js";
import { estaAtrasado, ehEquipe, podeTransitar } from "../domain/tickets.js";

const STATUS = ["open", "in_progress", "resolved", "closed"];
const PRIORIDADES = ["low", "medium", "high", "critical"];

export function criarTicketService({ repos, clock = () => new Date() }) {
  const agora = () => clock().toISOString();

  async function carregar(id) {
    const chamado = await repos.tickets.findById(id);
    if (!chamado) throw naoEncontrado("Chamado");
    return chamado;
  }

  function podeVer(usuario, chamado) {
    return ehEquipe(usuario) || chamado.requesterId === usuario.id;
  }

  async function exigirVisivel(usuario, id) {
    const chamado = await carregar(id);
    if (!podeVer(usuario, chamado)) {
      throw semPermissao("Este chamado pertence a outro solicitante.");
    }
    return chamado;
  }

  async function validarCategoria(categoryId) {
    if (categoryId === undefined || categoryId === null) return;
    const categoria = await repos.categories.findById(categoryId);
    if (!categoria) {
      throw new AppError("Categoria informada não existe.", 422, [
        { campo: "categoryId", mensagem: "Categoria inexistente." },
      ]);
    }
  }

  async function validarResponsavel(assigneeId) {
    if (assigneeId === undefined || assigneeId === null) return;
    const responsavel = await repos.users.findById(assigneeId);

    if (!responsavel || !ehEquipe(responsavel)) {
      throw new AppError("O responsável precisa ser um agente ou administrador.", 422, [
        { campo: "assigneeId", mensagem: "Responsável inválido." },
      ]);
    }
  }

  return {
    async listar(usuario, filtros) {
      const restrito = ehEquipe(usuario) ? {} : { requesterId: usuario.id };

      const { items, total } = await repos.tickets.listar({
        filtros: { ...filtros, ...restrito, usuarioId: usuario.id },
        page: filtros.page,
        limit: filtros.limit,
      });

      return { items, total };
    },

    async obter(usuario, id) {
      return exigirVisivel(usuario, id);
    },

    async criar(usuario, dados) {
      await validarCategoria(dados.categoryId);

      if (dados.assigneeId && !ehEquipe(usuario)) {
        throw semPermissao("Apenas a equipe pode definir o responsável na abertura.");
      }

      await validarResponsavel(dados.assigneeId);

      return repos.tickets.criar({
        ...dados,
        requesterId: usuario.id,
        status: "open",
        assigneeId: dados.assigneeId ?? null,
      });
    },

    async atualizar(usuario, id, dados) {
      const chamado = await exigirVisivel(usuario, id);
      const equipe = ehEquipe(usuario);
      const alteracoes = {};

      if (!equipe && chamado.requesterId !== usuario.id) {
        throw semPermissao();
      }

      if (!equipe) {
        const camposProibidos = ["priority", "assigneeId", "categoryId"].filter(
          (campo) => dados[campo] !== undefined
        );

        if (camposProibidos.length) {
          throw semPermissao(
            "Solicitantes podem editar o texto e o andamento do próprio chamado, mas não prioridade, responsável ou categoria."
          );
        }
      }

      ["title", "description"].forEach((campo) => {
        if (dados[campo] !== undefined) alteracoes[campo] = dados[campo];
      });

      if (equipe) {
        ["priority", "assigneeId", "categoryId"].forEach((campo) => {
          if (dados[campo] !== undefined) alteracoes[campo] = dados[campo];
        });
      }

      if (dados.status !== undefined && dados.status !== chamado.status) {
        if (!podeTransitar(usuario, chamado.status, dados.status)) {
          throw new AppError(
            `Transição de status inválida: ${chamado.status} → ${dados.status}.`,
            422
          );
        }
        alteracoes.status = dados.status;
      }

      await validarCategoria(alteracoes.categoryId);
      await validarResponsavel(alteracoes.assigneeId);

      return repos.tickets.atualizar(id, alteracoes);
    },

    async remover(usuario, id) {
      await carregar(id);

      if (usuario.role !== "admin") {
        throw semPermissao("Apenas administradores podem excluir chamados.");
      }

      await repos.tickets.remover(id);
      return true;
    },

    async comentar(usuario, id, { body, internal }) {
      const chamado = await exigirVisivel(usuario, id);
      const equipe = ehEquipe(usuario);

      if (internal && !equipe) {
        throw semPermissao("Comentários internos são restritos à equipe.");
      }

      if (!equipe && chamado.requesterId !== usuario.id) {
        throw semPermissao();
      }

      return repos.comments.criar({
        ticketId: chamado.id,
        authorId: usuario.id,
        body,
        internal: Boolean(internal && equipe),
      });
    },

    async comentarios(usuario, id) {
      const chamado = await exigirVisivel(usuario, id);
      const incluirInternos = ehEquipe(usuario) || chamado.assigneeId === usuario.id;
      return repos.comments.listar(chamado.id, { incluirInternos });
    },

    /** Indicadores para a equipe: status, prioridade, atraso e tempo médio de resolução. */
    async resumo(usuario) {
      if (!ehEquipe(usuario)) {
        throw semPermissao("O painel de indicadores é restrito à equipe.");
      }

      const chamados = await repos.tickets.todos();
      const instante = agora();

      const totais = Object.fromEntries(STATUS.map((status) => [status, 0]));
      const porPrioridade = Object.fromEntries(PRIORIDADES.map((prioridade) => [prioridade, 0]));
      const porResponsavel = new Map();

      let atrasados = 0;
      let semResponsavel = 0;
      const duracoes = [];

      chamados.forEach((chamado) => {
        totais[chamado.status] += 1;
        porPrioridade[chamado.priority] += 1;

        if (estaAtrasado(chamado, instante)) atrasados += 1;
        if (!chamado.assigneeId) semResponsavel += 1;

        if (chamado.resolvedAt) {
          const horas = diferencaEmHoras(chamado.createdAt, chamado.resolvedAt);
          if (horas !== null) duracoes.push(horas);
        }

        if (chamado.assigneeId) {
          const chave = chamado.assigneeId;
          const atual = porResponsavel.get(chave) ?? {
            id: chave,
            nome: chamado.assigneeName,
            abertos: 0,
            resolvidos: 0,
          };

          if (chamado.status === "resolved" || chamado.status === "closed") {
            atual.resolvidos += 1;
          } else {
            atual.abertos += 1;
          }

          porResponsavel.set(chave, atual);
        }
      });

      const media = duracoes.length
        ? Math.round((duracoes.reduce((soma, valor) => soma + valor, 0) / duracoes.length) * 10) / 10
        : 0;

      return {
        totals: { all: chamados.length, ...totais },
        byPriority: porPrioridade,
        overdue: atrasados,
        unassigned: semResponsavel,
        avgResolutionHours: media,
        byAgent: [...porResponsavel.values()].sort((a, b) => b.abertos - a.abertos),
        recent: chamados.slice(0, 5),
        generatedAt: instante,
      };
    },
  };
}
