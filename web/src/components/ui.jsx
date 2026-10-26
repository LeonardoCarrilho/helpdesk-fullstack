import { iniciais } from "../lib/labels.js";

export function PaginaCabecalho({ titulo, descricao, acoes }) {
  return (
    <div className="pagina__cabecalho">
      <div className="pagina__titulos">
        <h1>{titulo}</h1>
        {descricao ? <p>{descricao}</p> : null}
      </div>
      {acoes ? <div className="pagina__acoes">{acoes}</div> : null}
    </div>
  );
}

export function Alerta({ tom = "danger", children }) {
  if (!children) return null;

  return (
    <p className={`alerta alerta--${tom}`} role={tom === "danger" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export function Vazio({ titulo, descricao, children }) {
  return (
    <div className="vazio">
      <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.2a.6.6 0 0 1-1-.5V17A2.5 2.5 0 0 1 4 14.5z" />
        <path d="M9 9.5h6M9 12.5h4" />
      </svg>
      <strong>{titulo}</strong>
      {descricao ? <p>{descricao}</p> : null}
      {children}
    </div>
  );
}

export function Carregando({ rotulo = "Carregando…" }) {
  return (
    <div className="carregando" role="status">
      <span className="carregando__anel" aria-hidden="true" />
      <span>{rotulo}</span>
    </div>
  );
}

export function Selo({ tom = "neutral", children }) {
  return <span className={`selo selo--${tom}`}>{children}</span>;
}

function matizDoNome(nome) {
  return (
    String(nome ?? "")
      .split("")
      .reduce((soma, letra) => soma + letra.charCodeAt(0), 0) % 360
  );
}

export function Avatar({ nome, tamanho = "md" }) {
  const rotulo = String(nome ?? "").trim();

  return (
    <span
      className={`avatar avatar--${tamanho}`}
      style={{ "--avatar-hue": matizDoNome(rotulo) }}
      aria-hidden="true"
      title={rotulo}
    >
      {iniciais(rotulo) || "?"}
    </span>
  );
}
