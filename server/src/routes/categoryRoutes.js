import { Router } from "express";
import { validar } from "../middlewares/validar.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { conflito, naoEncontrado } from "../utils/errors.js";
import { esquemaCategoria } from "../http/schemas.js";

export function criarRotasCategorias(repos, guardas, idDaRota) {
  const router = Router();
  const { exigirAutenticacao, admin } = guardas;

  router.get(
    "/",
    exigirAutenticacao,
    asyncHandler(async (_req, res) => {
      res.json({ data: await repos.categories.listar() });
    })
  );

  router.post(
    "/",
    admin,
    validar(esquemaCategoria),
    asyncHandler(async (req, res) => {
      const existentes = await repos.categories.listar();
      if (existentes.some((item) => item.name.toLowerCase() === req.body.name.toLowerCase())) {
        throw conflito("Já existe uma categoria com este nome.");
      }

      res.status(201).json({ data: await repos.categories.criar(req.body) });
    })
  );

  router.patch(
    "/:id",
    admin,
    validar(esquemaCategoria.partial()),
    asyncHandler(async (req, res) => {
      const id = idDaRota(req.params.id);
      if (!id) throw naoEncontrado("Categoria");

      const categoria = await repos.categories.findById(id);
      if (!categoria) throw naoEncontrado("Categoria");

      res.json({ data: await repos.categories.atualizar(id, req.body) });
    })
  );

  router.delete(
    "/:id",
    admin,
    asyncHandler(async (req, res) => {
      const id = idDaRota(req.params.id);
      if (!id) throw naoEncontrado("Categoria");

      const removeu = await repos.categories.remover(id);
      if (!removeu) throw naoEncontrado("Categoria");

      res.status(204).end();
    })
  );

  return router;
}
