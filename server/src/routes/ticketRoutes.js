import { Router } from "express";
import { validar } from "../middlewares/validar.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError, naoEncontrado } from "../utils/errors.js";
import {
  esquemaAtualizarChamado,
  esquemaComentario,
  esquemaCriarChamado,
  esquemaFiltros,
} from "../http/schemas.js";

export function criarRotasChamados(service, guardas, idDaRota) {
  const router = Router();
  const { exigirAutenticacao, admin } = guardas;

  router.get(
    "/",
    exigirAutenticacao,
    validar(esquemaFiltros, "query"),
    asyncHandler(async (req, res) => {
      const { items, total } = await service.listar(req.usuario, req.query);
      const { page, limit } = req.query;

      res.set("X-Total-Count", String(total));
      res.set("X-Page", String(page));
      res.set("X-Page-Size", String(limit));
      res.json({ data: items, meta: { page, limit, total } });
    })
  );

  router.post(
    "/",
    exigirAutenticacao,
    validar(esquemaCriarChamado),
    asyncHandler(async (req, res) => {
      const chamado = await service.criar(req.usuario, req.body);
      res.status(201).json({ data: chamado });
    })
  );

  router.get(
    "/:id",
    exigirAutenticacao,
    asyncHandler(async (req, res) => {
      const id = idDaRota(req.params.id);
      if (!id) throw naoEncontrado("Chamado");
      res.json({ data: await service.obter(req.usuario, id) });
    })
  );

  router.patch(
    "/:id",
    exigirAutenticacao,
    validar(esquemaAtualizarChamado),
    asyncHandler(async (req, res) => {
      const id = idDaRota(req.params.id);
      if (!id) throw naoEncontrado("Chamado");
      res.json({ data: await service.atualizar(req.usuario, id, req.body) });
    })
  );

  router.delete(
    "/:id",
    exigirAutenticacao,
    asyncHandler(async (req, res) => {
      const id = idDaRota(req.params.id);
      if (!id) throw naoEncontrado("Chamado");
      await service.remover(req.usuario, id);
      res.status(204).end();
    })
  );

  router.get(
    "/:id/comments",
    exigirAutenticacao,
    asyncHandler(async (req, res) => {
      const id = idDaRota(req.params.id);
      if (!id) throw naoEncontrado("Chamado");
      res.json({ data: await service.comentarios(req.usuario, id) });
    })
  );

  router.post(
    "/:id/comments",
    exigirAutenticacao,
    validar(esquemaComentario),
    asyncHandler(async (req, res) => {
      const id = idDaRota(req.params.id);
      if (!id) throw naoEncontrado("Chamado");

      if (req.body.internal && req.usuario.role === "requester") {
        throw new AppError("Comentários internos são restritos à equipe.", 403);
      }

      const comentario = await service.comentar(req.usuario, id, req.body);
      res.status(201).json({ data: comentario });
    })
  );

  // Mantém `admin` referenciado para deixar explícita a regra de exclusão no serviço.
  void admin;

  return router;
}
