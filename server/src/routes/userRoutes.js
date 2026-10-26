import { Router } from "express";
import { validar } from "../middlewares/validar.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError, naoEncontrado } from "../utils/errors.js";
import { esquemaPapel } from "../http/schemas.js";
import { ehEquipe } from "../domain/tickets.js";

export function criarRotasUsuarios(repos, guardas, idDaRota) {
  const router = Router();
  const { equipe, admin } = guardas;

  // Agentes precisam da lista para atribuir chamados; solicitantes não.
  router.get(
    "/",
    equipe,
    asyncHandler(async (req, res) => {
      const usuarios = (await repos.users.listar()).map(({ email, ...resto }) => ({
        ...resto,
        email: req.usuario.role === "admin" ? email : undefined,
      }));

      res.json({
        data: usuarios.filter((usuario) => req.usuario.role === "admin" || ehEquipe(usuario)),
      });
    })
  );

  router.patch(
    "/:id/role",
    admin,
    validar(esquemaPapel),
    asyncHandler(async (req, res) => {
      const id = idDaRota(req.params.id);
      if (!id) throw naoEncontrado("Usuário");

      const usuario = await repos.users.findById(id);
      if (!usuario) throw naoEncontrado("Usuário");

      if (usuario.role === "admin" && req.body.role !== "admin") {
        const admins = await repos.users.contarAdmins();
        if (admins <= 1) {
          throw new AppError("O sistema precisa manter pelo menos um administrador.", 422);
        }
      }

      res.json({ data: await repos.users.atualizarPapel(id, req.body.role) });
    })
  );

  return router;
}
