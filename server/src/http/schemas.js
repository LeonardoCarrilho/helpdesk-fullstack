import { z } from "zod";
import { PAPEIS, PRIORIDADES, STATUS } from "../domain/tickets.js";

const id = z.coerce.number().int().positive({ message: "Informe um identificador válido." });

const texto = (minimo, maximo, campo) =>
  z
    .string({ required_error: `${campo} é obrigatório.` })
    .trim()
    .min(minimo, `${campo} deve ter pelo menos ${minimo} caracteres.`)
    .max(maximo, `${campo} deve ter no máximo ${maximo} caracteres.`);

export const esquemaRegistro = z.object({
  name: texto(2, 80, "Nome"),
  email: z
    .string({ required_error: "E-mail é obrigatório." })
    .trim()
    .toLowerCase()
    .email("Informe um e-mail válido.").max(160),
  password: z
    .string({ required_error: "Senha é obrigatória." })
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .max(72, "A senha pode ter no máximo 72 caracteres."),
});

export const esquemaLogin = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha.").max(72),
});

const corpoChamado = {
  title: texto(5, 120, "Título"),
  description: texto(10, 5000, "Descrição"),
  priority: z.enum(PRIORIDADES).default("medium"),
  categoryId: id.nullable().optional(),
  assigneeId: id.nullable().optional(),
};

export const esquemaCriarChamado = z.object(corpoChamado);

export const esquemaAtualizarChamado = z
  .object({
    title: corpoChamado.title.optional(),
    description: corpoChamado.description.optional(),
    priority: z.enum(PRIORIDADES).optional(),
    status: z.enum(STATUS).optional(),
    categoryId: id.nullable().optional(),
    assigneeId: id.nullable().optional(),
  })
  .refine((valor) => Object.keys(valor).length > 0, {
    message: "Envie pelo menos um campo para atualizar.",
  });

export const esquemaComentario = z.object({
  body: texto(2, 2000, "Comentário"),
  internal: z.boolean().default(false),
});

export const esquemaCategoria = z.object({
  name: texto(2, 40, "Nome"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato hexadecimal, como #2563eb.")
    .default("#6366f1"),
});

export const esquemaPapel = z.object({
  role: z.enum(PAPEIS),
});

export const esquemaFiltros = z.object({
  status: z.enum(STATUS).optional(),
  priority: z.enum(PRIORIDADES).optional(),
  categoryId: id.optional(),
  assigneeId: z.union([id, z.literal("me"), z.literal("unassigned")]).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const esquemaComentarioFiltro = z.object({
  incluirInternos: z
    .enum(["true", "false"])
    .optional()
    .transform((valor) => valor !== "false"),
});
