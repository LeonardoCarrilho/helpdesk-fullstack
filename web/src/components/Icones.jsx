const BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
};

export function IconeChamados({ size = 18 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-4 3v-3.4A2.5 2.5 0 0 1 4 14.5z" />
      <path d="M8 9h8M8 12.5h5" />
    </svg>
  );
}

export function IconeNovo({ size = 18 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconePainel({ size = 18 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.6" />
      <rect x="13.5" y="11" width="7" height="9.5" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    </svg>
  );
}

export function IconeEquipe({ size = 18 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.4a3 3 0 0 1 0 5.8M17.5 14.7c2 .6 3.2 2.2 3.2 4.3" />
    </svg>
  );
}

export function IconeEtiquetas({ size = 18 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11l8.5 8.5a1.6 1.6 0 0 1 0 2.3l-4.7 4.7a1.6 1.6 0 0 1-2.3 0L4 11z" />
      <circle cx="8" cy="8" r="1.4" />
    </svg>
  );
}

export function IconeSair({ size = 17 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </svg>
  );
}

export function IconeBusca({ size = 17 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <circle cx="11" cy="11" r="6.2" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export function IconeAlerta({ size = 16 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M12 4.5 3 20h18z" />
      <path d="M12 10v4.5M12 17.4v.2" />
    </svg>
  );
}

export function IconeSeta({ size = 16 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconeVoltar({ size = 16 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

export function IconeLixeira({ size = 16 }) {
  return (
    <svg {...BASE} width={size} height={size}>
      <path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12.2h9.4L17.5 7" />
      <path d="M10.5 10.5v5M13.5 10.5v5" />
    </svg>
  );
}
