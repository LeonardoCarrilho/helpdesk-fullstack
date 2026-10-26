import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

export function criarRotasPainel(service, guardas) {
  const router = Router();
  const { equipe } = guardas;

  router.get(
    "/",
    equipe,
    asyncHandler(async (req, res) => {
      res.json({ data: await service.resumo(req.usuario) });
    })
  );

  return router;
}
