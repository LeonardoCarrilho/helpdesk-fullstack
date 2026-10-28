import { Router } from "express";
import { validar } from "../middlewares/validar.js";
import { ehProducao } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { esquemaLogin, esquemaRegistro } from "../http/schemas.js";

const COOKIE_SESSAO = "helpdesk_sessao";

function opcoesCookie() {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: ehProducao,
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  };
}

export function criarRotasAuth(authService) {
  const router = Router();

  router.post(
    "/register",
    validar(esquemaRegistro),
    asyncHandler(async (req, res) => {
      const resultado = await authService.registrar(req.body);

      // Em produção somente o cookie HttpOnly transporta a sessão.
      res.cookie(COOKIE_SESSAO, resultado.token, opcoesCookie());
      res.status(201).json({ data: ehProducao ? { usuario: resultado.usuario } : resultado });
    })
  );

  router.post(
    "/login",
    validar(esquemaLogin),
    asyncHandler(async (req, res) => {
      const resultado = await authService.login(req.body);

      res.cookie(COOKIE_SESSAO, resultado.token, opcoesCookie());
      res.json({ data: ehProducao ? { usuario: resultado.usuario } : resultado });
    })
  );

  router.post("/logout", (_req, res) => {
    res.clearCookie(COOKIE_SESSAO, { ...opcoesCookie(), maxAge: undefined });
    res.status(204).end();
  });

  return router;
}
