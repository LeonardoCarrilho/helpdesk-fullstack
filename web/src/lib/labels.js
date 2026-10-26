/** Rótulos, prazos e permissões de interface — tudo puro e testável no Node. */

export const STATUS = {
  open: { rotulo: "Aberto", tom: "info", ordem: 1 },
  in_progress: { rotulo: "Em andamento", tom: "warning", ordem: 2 },
  resolved: { rotulo: "Resolvido", tom: "success", ordem: 3 },
  closed: { rotulo: "Encerrado", tom: "neutral", ordem: 4 },
};

export const PRIORIDADES = {
  low: { rotulo: "Baixa", tom: "neutral", ordem: 1 },
  medium: { rotulo: "Média", tom: "info", ordem: 2 },
  high: { rotulo: "Alta", tom: "warning", ordem: 3 },
  critical: { rotulo: "Crítica", tom: "danger", ordem: 4 },
};

export const PAPEIS = {
  admin: "Administrador",
  agent: "Agente",
  requester: "Solicitante",
};

export function rotuloStatus(status) {
  return STATUS[status]?.rotulo ?? status;
}

export function rotuloPrioridade(prioridade) {
  return PRIORIDADES[prioridade]?.rotulo ?? prioridade;
}

export function rotuloPapel(papel) {
  return PAPEIS[papel] ?? papel;
}

export function ehEquipe(usuario) {
  return usuario?.role === "admin" || usuario?.role === "agent";
}

export function ehAdmin(usuario) {
  return usuario?.role === "admin";
}

const dataValida = (iso) => {
  if (!iso) return null;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data;
};

export function formatarDataHora(iso) {
  const data = dataValida(iso);
  if (!data) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

export function formatarDataCurta(iso) {
  const data = dataValida(iso);
  if (!data) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(data)
    .replace(".", "");
}

export function iniciais(nome) {
  return String(nome ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

/** Prazo do chamado em texto, considerando o status atual. */
export function situacaoSla(chamado, agora = Date.now()) {
  if (!chamado) return { rotulo: "—", tom: "neutral", atrasado: false };

  if (chamado.status === "resolved" || chamado.status === "closed") {
    return {
      rotulo: chamado.resolvedAt ? `Resolvido em ${formatarDataCurta(chamado.resolvedAt)}` : "Concluído",
      tom: "success",
      atrasado: false,
    };
  }

  const prazo = dataValida(chamado.dueAt);
  if (!prazo) return { rotulo: "Sem prazo", tom: "neutral", atrasado: false };

  const diferenca = prazo.getTime() - agora;
  const horas = Math.round(Math.abs(diferenca) / 3_600_000);

  if (diferenca < 0) {
    return {
      rotulo: horas < 1 ? "Atrasado há menos de 1h" : `Atrasado há ${horas}h`,
      tom: "danger",
      atrasado: true,
    };
  }

  return {
    rotulo: horas < 1 ? "Vence em menos de 1h" : `Vence em ${horas}h`,
    tom: horas <= 4 ? "warning" : "neutral",
    atrasado: false,
  };
}

/** Transições de status que o usuário logado pode executar neste chamado. */
export function transicoesDisponiveis(usuario, chamado) {
  if (!usuario || !chamado) return [];

  const equipe = ehEquipe(usuario);
  const dono = chamado.requesterId === usuario.id;

  if (!equipe && !dono) return [];

  const mapa = equipe
    ? {
        open: ["in_progress", "resolved", "closed"],
        in_progress: ["open", "resolved", "closed"],
        resolved: ["open", "closed"],
        closed: ["open"],
      }
    : {
        resolved: ["closed", "open"],
        closed: ["open"],
      };

  return (mapa[chamado.status] ?? []).map((status) => ({
    status,
    rotulo: rotuloStatus(status),
  }));
}

export function podeEditarTexto(usuario, chamado) {
  if (!usuario || !chamado) return false;
  return ehEquipe(usuario) || chamado.requesterId === usuario.id;
}

export function podeExcluir(usuario) {
  return ehAdmin(usuario);
}

/** Monta a query string da listagem ignorando filtros vazios. */
export function montarQuery(filtros) {
  const parametros = new URLSearchParams();

  Object.entries(filtros ?? {}).forEach(([chave, valor]) => {
    if (valor !== "" && valor !== null && valor !== undefined) {
      parametros.set(chave, String(valor));
    }
  });

  return parametros.toString();
}

/** Prazo (SLA) em horas por prioridade — mesma regra do servidor. */
export const SLA_HORAS = {
  low: 72,
  medium: 24,
  high: 8,
  critical: 4,
};

export function prazoPorPrioridade(prioridade, criadoEm) {
  const horas = SLA_HORAS[prioridade] ?? SLA_HORAS.medium;
  const data = new Date(criadoEm);

  if (Number.isNaN(data.getTime())) return null;

  data.setUTCMinutes(data.getUTCMinutes() + horas * 60);
  return data.toISOString();
}

/** "há 5 min", "há 3 h", "há 2 dias" — usado nos comentários. */
export function tempoRelativo(iso, agora = Date.now()) {
  const data = dataValida(iso);
  if (!data) return "—";

  const segundos = Math.round((agora - data.getTime()) / 1000);

  if (segundos < 0) return "agora";
  if (segundos < 60) return "agora";

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias < 7) return dias === 1 ? "há 1 dia" : `há ${dias} dias`;

  return formatarDataCurta(iso);
}

/** Texto curto para o resumo de um papel. */
export function descricaoPapel(papel) {
  return {
    admin: "Acesso total, configura categorias e gerencia a equipe.",
    agent: "Atende e atribui chamados, vê os indicadores.",
    requester: "Abre chamados e acompanha apenas os próprios pedidos.",
  }[papel] ?? "";
}

/** Rótulo do botão que leva o chamado para `status`. */
export function rotuloAcaoStatus(status) {
  return {
    open: "Reabrir",
    in_progress: "Iniciar atendimento",
    resolved: "Marcar como resolvido",
    closed: "Encerrar",
  }[status] ?? rotuloStatus(status);
}
