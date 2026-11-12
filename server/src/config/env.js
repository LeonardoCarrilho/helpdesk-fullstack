import { z } from "zod";

const ambiente = process.env.NODE_ENV ?? "development";
const producao = ambiente === "production";

const segredoPadrao = "dev-secret-do-helpdesk-nao-use-em-producao";

export const env = {
  ambiente,
  producao,
  porta: Number(process.env.PORT ?? 3000),
  corsOrigem: process.env.CORS_ORIGIN ?? "*",
  jwtSecret: process.env.JWT_SECRET ?? segredoPadrao,
  jwtExpiraEm: process.env.JWT_EXPIRES_IN ?? "8h",
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "helpdesk",
    password: process.env.DB_PASSWORD ?? "helpdesk",
    database: process.env.DB_NAME ?? "helpdesk",
    poolLimit: Number(process.env.DB_POOL_LIMIT ?? 10),
  },
};

const esquemaAmbiente = z.object({
  porta: z.number().int().positive().max(65535),
  jwtSecret: z.string().min(32, "JWT_SECRET precisa ter pelo menos 32 caracteres."),
  jwtExpiraEm: z.string().min(2),
  corsOrigem: z.string().min(1),
  db: z.object({
    host: z.string().min(1),
    port: z.number().int().positive(),
    user: z.string().min(1),
    password: z.string().min(1),
    database: z.string().min(1),
    poolLimit: z.number().int().positive().max(100),
  }),
});

/** Falha cedo (e com mensagem clara) se o ambiente estiver inconsistente. */
export function validarAmbiente() {
  if (producao && env.jwtSecret === segredoPadrao) {
    throw new Error("JWT_SECRET obrigatório em produção (mínimo de 32 caracteres).");
  }

  const resultado = esquemaAmbiente.safeParse(env);

  if (!resultado.success) {
    const detalhes = resultado.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Configuração inválida: ${detalhes}`);
  }

  return env;
}

export const ehProducao = producao;

if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith("dev-")) throw new Error("Configure JWT_SECRET forte (mínimo 32 caracteres).");
  if (!process.env.DB_PASSWORD || ["financas", "helpdesk"].includes(process.env.DB_PASSWORD)) throw new Error("Configure DB_PASSWORD próprio em produção.");
}
