import mysql from "mysql2/promise";
import { env } from "../config/env.js";

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: env.db.poolLimit,
  queueLimit: 0,
  charset: "utf8mb4",
  dateStrings: true,
  timezone: "Z",
});

/** Executa `fn` dentro de uma transação e garante rollback em caso de erro. */
export async function comTransacao(fn) {
  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();
    const resultado = await fn(conexao);
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

/** Converte um ISO em `AAAA-MM-DD HH:MM:SS` (DATETIME em UTC). */
export function paraMysql(iso) {
  if (!iso) return null;
  return new Date(iso).toISOString().slice(0, 19).replace("T", " ");
}

/** Converte DATETIME UTC vindo do banco em ISO com `Z`. */
export function doMysql(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString();
  return `${String(valor).replace(" ", "T")}.000Z`;
}
