export function MarcaIcone({ size = 34 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="marca-helpdesk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill="url(#marca-helpdesk)" />
      <path d="M18 34v-3a14 14 0 0 1 28 0v3" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <rect x="13" y="31" width="9" height="14" rx="4" fill="#fff" />
      <rect x="42" y="31" width="9" height="14" rx="4" fill="#fff" />
      <path d="M46 45c0 4-4 6-9 6" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Marca({ href = "#/chamados" }) {
  return (
    <a className="marca" href={href} aria-label="Helpdesk — ir para os chamados">
      <MarcaIcone />
      <span className="marca__texto">
        <strong>Helpdesk</strong>
        <small>suporte sem ruído</small>
      </span>
    </a>
  );
}
