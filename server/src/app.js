import { configureSecurity } from "./security.js";
import { reportServerError } from "./observability.js";
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { criarRotas } from "./routes/index.js";
import { rotaNaoEncontrada, tratarErros } from "./middlewares/errorHandler.js";

export function criarApp({ repos, clock = () => new Date() }) {
  const app = express();
  configureSecurity(app);

  app.disable("x-powered-by");
  

  const origens = env.corsOrigem === "*" ? true : env.corsOrigem.split(",").map((item) => item.trim());

  app.use(
    cors({
      origin: origens,
      credentials: true,
      exposedHeaders: ["X-Total-Count", "X-Page", "X-Page-Size"],
    })
  );

  app.use((req, res, next) => {
    if (env.producao && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const allowed = env.corsOrigem.split(",").map(value => value.trim());
      if (!allowed.includes(req.get("origin"))) return res.status(403).json({ error: "Origem não permitida." });
    }
    next();
  });

  app.use(express.json({ limit: "200kb" }));

  app.use("/api", criarRotas({ repos, clock }));

  app.use(rotaNaoEncontrada);
  app.use(reportServerError);
  app.use(tratarErros);

  return app;
}
