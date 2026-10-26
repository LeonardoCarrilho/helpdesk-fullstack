export const PAPEIS = ["admin", "agent", "requester"];

export const STATUS = ["open", "in_progress", "resolved", "closed"];

export const PRIORIDADES = ["low", "medium", "high", "critical"];

/** Prazo (SLA) em horas para cada prioridade. */
export const SLA_HORAS = {
  critical: 4,
  high: 8,
  medium: 24,
  low: 72,
};

/**
 * Transições permitidas para a equipe (admin/agent).
 * O solicitante tem regras próprias, mais restritas.
 */
export const TRANSICOES_EQUIPE = {
  open: ["in_progress", "resolved", "closed"],
  in_progress: ["open", "resolved", "closed"],
  resolved: ["open", "closed"],
  closed: ["open"],
};

/** O solicitante só encerra/retoma o próprio chamado. */
export const TRANSICOES_SOLICITANTE = {
  resolved: ["closed", "open"],
  closed: ["open"],
};

export function ehEquipe(usuario) {
  return usuario?.role === "admin" || usuario?.role === "agent";
}

export function ehAdmin(usuario) {
  return usuario?.role === "admin";
}

export function podeTransitar(usuario, de, para) {
  if (!STATUS.includes(para)) return false;

  if (ehEquipe(usuario)) {
    return (TRANSICOES_EQUIPE[de] ?? []).includes(para);
  }

  return (TRANSICOES_SOLICITANTE[de] ?? []).includes(para);
}

export function prazoPorPrioridade(prioridade, criadoEm) {
  const horas = SLA_HORAS[prioridade] ?? SLA_HORAS.medium;
  const data = new Date(criadoEm);
  data.setUTCMinutes(data.getUTCMinutes() + horas * 60);
  return data.toISOString();
}

export function estaAtrasado(chamado, agoraIso) {
  if (!chamado?.dueAt || chamado.status === "resolved" || chamado.status === "closed") {
    return false;
  }
  return chamado.dueAt < agoraIso;
}
