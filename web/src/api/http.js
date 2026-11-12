const CHAVE_TOKEN = "helpdesk:token";

export class ErroApi extends Error {
  constructor(mensagem, { status = 0, detalhes = null } = {}) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
    this.detalhes = detalhes;
  }
}

// Tokens de desenvolvimento vivem apenas na memória da aba.
let tokenEmMemoria = null;
const memoria = { getItem: () => tokenEmMemoria, setItem: (_key, value) => { tokenEmMemoria = value; }, removeItem: () => { tokenEmMemoria = null; } };
function armazenamentoSeguro() {
  try { globalThis.localStorage?.removeItem(CHAVE_TOKEN); } catch { /* storage indisponível */ }
  return memoria;
}

export function lerToken(armazenamento = armazenamentoSeguro()) {
  try {
    return armazenamento?.getItem(CHAVE_TOKEN) ?? null;
  } catch {
    return null;
  }
}

export function gravarToken(armazenamento, token) {
  try {
    if (token) armazenamento?.setItem(CHAVE_TOKEN, token);
  } catch {
    /* armazenamento cheio ou bloqueado: a sessão vale só para esta aba */
  }
}

export function limparToken(armazenamento = armazenamentoSeguro()) {
  try {
    armazenamento?.removeItem(CHAVE_TOKEN);
  } catch {
    /* nada a fazer */
  }
}

/**
 * Cliente HTTP da API. O token vai em `Authorization: Bearer` e toda resposta
 * segue o envelope `{ data, meta }` / `{ error, details }` do servidor.
 */
export function criarApiHttp({
  baseUrl = "",
  fetchImpl,
  armazenamento = armazenamentoSeguro(),
  aoExpirar,
} = {}) {
  const base = String(baseUrl ?? "").replace(/\/+$/, "");
  const buscar = fetchImpl ?? ((...args) => globalThis.fetch(...args));

  async function requisitar(caminho, { metodo = "GET", corpo, parametros, autenticado = true } = {}) {
    const query = new URLSearchParams();

    Object.entries(parametros ?? {}).forEach(([chave, valor]) => {
      if (valor !== "" && valor !== null && valor !== undefined) {
        query.set(chave, String(valor));
      }
    });

    const sufixo = query.toString() ? `?${query}` : "";
    const cabecalhos = { Accept: "application/json" };
    const token = lerToken(armazenamento);

    if (corpo !== undefined) cabecalhos["Content-Type"] = "application/json";
    if (autenticado && token) cabecalhos.Authorization = `Bearer ${token}`;

    let resposta;

    try {
      resposta = await buscar(`${base}/api${caminho}${sufixo}`, {
        method: metodo,
        headers: cabecalhos,
        credentials: "include",
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
    } catch {
      throw new ErroApi("Não foi possível falar com o servidor. Verifique se a API está no ar.");
    }

    const texto = await resposta.text();
    let envelope = null;

    if (texto) {
      try {
        envelope = JSON.parse(texto);
      } catch {
        envelope = null;
      }
    }

    if (!resposta.ok) {
      if (resposta.status === 401 && autenticado) {
        limparToken(armazenamento);
        aoExpirar?.();
      }

      throw new ErroApi(envelope?.error ?? `Falha na requisição (${resposta.status}).`, {
        status: resposta.status,
        detalhes: envelope?.details ?? null,
      });
    }

    return envelope;
  }

  return {
    modo: "http",

    temSessao: () => true, // A validade do cookie é verificada por /me.

    async login({ email, password }) {
      const { data } = await requisitar("/auth/login", {
        metodo: "POST",
        corpo: { email, password },
        autenticado: false,
      });
      gravarToken(armazenamento, data.token);
      return data;
    },

    async registrar({ name, email, password }) {
      const { data } = await requisitar("/auth/register", {
        metodo: "POST",
        corpo: { name, email, password },
        autenticado: false,
      });
      gravarToken(armazenamento, data.token);
      return data;
    },

    async me() {
      try {
        const { data } = await requisitar("/me");
        return data;
      } catch (error) {
        if (error.status === 401) return null;
        throw error;
      }
    },

    async logout() {
      try {
        await requisitar("/auth/logout", { metodo: "POST" });
      } catch {
        /* sair localmente é suficiente */
      } finally {
        limparToken(armazenamento);
      }
    },

    async listarChamados(filtros = {}) {
      const { data, meta } = await requisitar("/tickets", { parametros: filtros });
      return {
        items: data ?? [],
        total: meta?.total ?? data?.length ?? 0,
        page: meta?.page ?? 1,
        limit: meta?.limit ?? 20,
      };
    },

    async obterChamado(id) {
      const { data } = await requisitar(`/tickets/${id}`);
      return data;
    },

    async criarChamado(dados) {
      const { data } = await requisitar("/tickets", { metodo: "POST", corpo: dados });
      return data;
    },

    async atualizarChamado(id, dados) {
      const { data } = await requisitar(`/tickets/${id}`, { metodo: "PATCH", corpo: dados });
      return data;
    },

    async removerChamado(id) {
      await requisitar(`/tickets/${id}`, { metodo: "DELETE" });
    },

    async listarComentarios(id) {
      const { data } = await requisitar(`/tickets/${id}/comments`);
      return data ?? [];
    },

    async criarComentario(id, { body, internal = false }) {
      const { data } = await requisitar(`/tickets/${id}/comments`, {
        metodo: "POST",
        corpo: { body, internal },
      });
      return data;
    },

    async listarCategorias() {
      const { data } = await requisitar("/categories");
      return data ?? [];
    },

    async criarCategoria(dados) {
      const { data } = await requisitar("/categories", { metodo: "POST", corpo: dados });
      return data;
    },

    async atualizarCategoria(id, dados) {
      const { data } = await requisitar(`/categories/${id}`, { metodo: "PATCH", corpo: dados });
      return data;
    },

    async removerCategoria(id) {
      await requisitar(`/categories/${id}`, { metodo: "DELETE" });
    },

    async listarUsuarios() {
      const { data } = await requisitar("/users");
      return data ?? [];
    },

    async atualizarPapel(id, role) {
      const { data } = await requisitar(`/users/${id}/role`, {
        metodo: "PATCH",
        corpo: { role },
      });
      return data;
    },

    async painel() {
      const { data } = await requisitar("/dashboard");
      return data;
    },
  };
}
