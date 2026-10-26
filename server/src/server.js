import { validarAmbiente, env } from "./config/env.js";
import { criarApp } from "./app.js";
import { criarRepositoriosMysql } from "./repositories/mysql.js";
import { pool } from "./db/pool.js";

validarAmbiente();

const app = criarApp({ repos: criarRepositoriosMysql() });

const servidor = app.listen(env.porta, () => {
  console.log(`Helpdesk API em http://localhost:${env.porta}/api`);
});

async function encerrar(sinal) {
  console.log(`\n${sinal} recebido: encerrando...`);
  servidor.close(async () => {
    await pool.end();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => encerrar("SIGINT"));
process.on("SIGTERM", () => encerrar("SIGTERM"));
