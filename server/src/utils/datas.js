/** Utilitários de data trabalhando com ISO em UTC (o banco guarda DATETIME UTC). */

export function agoraIso(relogio = () => new Date()) {
  return relogio().toISOString();
}

export function adicionarHoras(iso, horas) {
  const data = new Date(iso);
  data.setUTCMinutes(data.getUTCMinutes() + horas * 60);
  return data.toISOString();
}

export function diferencaEmHoras(inicioIso, fimIso) {
  const inicio = new Date(inicioIso).getTime();
  const fim = new Date(fimIso).getTime();

  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return null;

  return Math.round(((fim - inicio) / 3_600_000) * 10) / 10;
}

export function formatarIso(valor) {
  if (!valor) return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}
