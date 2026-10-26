import {
  PRIORIDADES,
  STATUS,
  rotuloPapel,
  rotuloPrioridade,
  rotuloStatus,
} from "../lib/labels.js";

export function BadgeStatus({ status }) {
  const meta = STATUS[status];
  return (
    <span className={`selo selo--${meta?.tom ?? "neutral"}`} title={`Status: ${rotuloStatus(status)}`}>
      <span className="selo__ponto" aria-hidden="true" />
      {rotuloStatus(status)}
    </span>
  );
}

export function BadgePrioridade({ prioridade }) {
  const meta = PRIORIDADES[prioridade];
  return (
    <span className={`selo selo--${meta?.tom ?? "neutral"}`} title={`Prioridade: ${rotuloPrioridade(prioridade)}`}>
      {rotuloPrioridade(prioridade)}
    </span>
  );
}

export function BadgePapel({ papel }) {
  const tom = papel === "admin" ? "accent" : papel === "agent" ? "info" : "neutral";
  return <span className={`selo selo--${tom}`}>{rotuloPapel(papel)}</span>;
}
