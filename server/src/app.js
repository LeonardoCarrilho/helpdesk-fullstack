import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { criarRotas } from "./routes/index.js";
import { rotaNaoEncontrada, tratarErros } from "./middlewares/errorHandler.js";

export function criarApp({ repos, clock = () => new Date() }) {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  const origens = env.corsOrigem === "*" ? true : env.corsOrigem.split(",").map((item) => item.trim());

  app.use(
    cors({
      origin: origens,
      credentials: true,
      exposedHeaders: ["X-Total-Count", "X-Page", "X-Page-Size"],
    })
  );

  app.use(express.json({ limit: "200kb" }));

  app.use("/api", criarRotas({ repos, clock }));

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);

  return app;
}
