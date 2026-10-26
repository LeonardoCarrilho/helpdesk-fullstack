import { criarApiDemo } from "./demo.js";
import { criarApiHttp } from "./http.js";

const ambiente = import.meta.env ?? {};
const MODO_DEMO = String(ambiente.VITE_DEMO ?? "").toLowerCase() === "true";

/**
 * Escolhe o cliente da API.
 *
 * - `VITE_DEMO=true` gera um build sem back-end (usado no GitHub Pages).
 * - Caso contrário fala com `/api`, que o Vite encaminha para o servidor local.
 */
export function criarApi(opcoes = {}) {
  const demo = opcoes.demo ?? MODO_DEMO;

  if (demo) {
    return criarApiDemo({
      armazenamento: opcoes.armazenamento,
      atraso: opcoes.atraso,
      clock: opcoes.clock,
    });
  }

  return criarApiHttp({
    baseUrl: opcoes.baseUrl ?? ambiente.VITE_API_URL ?? "",
    fetchImpl: opcoes.fetchImpl,
    armazenamento: opcoes.armazenamento,
    aoExpirar: opcoes.aoExpirar,
  });
}

export { MODO_DEMO };
