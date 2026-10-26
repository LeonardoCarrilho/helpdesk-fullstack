import { Router } from "express";
import { criarRotasAuth } from "./authRoutes.js";
import { criarRotasCategorias } from "./categoryRoutes.js";
import { criarRotasChamados } from "./ticketRoutes.js";
import { criarRotasUsuarios } from "./userRoutes.js";
import { criarRotasPainel } from "./dashboardRoutes.js";
import { criarAuthService } from "../services/authService.js";
import { criarTicketService } from "../services/ticketService.js";
import { autenticar, exigirPapel } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function idDaRota(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function criarRotas({ repos, clock }) {
  const router = Router();
  const authService = criarAuthService({ repos });
  const ticketService = criarTicketService({ repos, clock });

  const exigirAutenticacao = autenticar(repos);
  const equipe = [exigirAutenticacao, exigirPapel("admin", "agent")];
  const admin = [exigirAutenticacao, exigirPapel("admin")];

  router.get(
    "/health",
    asyncHandler(async (_req, res) => {
      res.json({ status: "ok", service: "helpdesk-api" });
    })
  );

  router.use("/auth", criarRotasAuth(authService));

  router.get(
    "/me",
    exigirAutenticacao,
    asyncHandler(async (req, res) => {
      res.json({ data: req.usuario });
    })
  );

  router.use("/tickets", criarRotasChamados(ticketService, { exigirAutenticacao, equipe, admin }, idDaRota));
  router.use("/categories", criarRotasCategorias(repos, { exigirAutenticacao, admin }, idDaRota));
  router.use("/users", criarRotasUsuarios(repos, { exigirAutenticacao, equipe, admin }, idDaRota));
  router.use("/dashboard", criarRotasPainel(ticketService, { equipe }, idDaRota));

  return router;
}
