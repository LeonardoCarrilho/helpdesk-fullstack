import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mysql from "mysql2/promise";
import { env } from "../config/env.js";
import { pool } from "./pool.js";

/**
 * Cria o banco (se necessário) e aplica o schema. O schema usa
 * `CREATE TABLE IF NOT EXISTS`, então rodar de novo é seguro.
 */
async function migrar() {
  const raiz = path.dirname(fileURLToPath(import.meta.url));
  const schema = await readFile(path.join(raiz, "..", "..", "sql", "schema.sql"), "utf8");

  const conexao = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  await conexao.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.database}\`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conexao.end();

  const comandos = schema
    .replace(/CREATE DATABASE[\s\S]*?;/i, "")
    .replace(/USE\s+\w+\s*;/i, "")
    .split(";")
    .map((comando) => comando.trim())
    .filter(Boolean);

  for (const comando of comandos) {
    await pool.query(comando);
  }

  console.log(`Schema aplicado em ${env.db.database}.`);
  await pool.end();
}

migrar().catch((erro) => {
  console.error("Falha ao migrar:", erro.message);
  process.exit(1);
});
