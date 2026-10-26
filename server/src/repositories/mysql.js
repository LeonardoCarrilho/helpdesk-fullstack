import { pool, paraMysql, doMysql } from "../../db/pool.js";
import { prazoPorPrioridade } from "../../domain/tickets.js";

const CAMPOS_USUARIO = "id, name, email, role, DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt";

const CAMPOS_CHAMADO = `
  t.id, t.title, t.description, t.status, t.priority,
  t.category_id AS categoryId, t.requester_id AS requesterId, t.assignee_id AS assigneeId,
  c.name AS categoryName, c.color AS categoryColor,
  req.name AS requesterName, resp.name AS assigneeName,
  DATE_FORMAT(t.created_at, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt,
  DATE_FORMAT(t.updated_at, '%Y-%m-%dT%H:%i:%s.000Z') AS updatedAt,
  DATE_FORMAT(t.due_at, '%Y-%m-%dT%H:%i:%s.000Z') AS dueAt,
  DATE_FORMAT(t.resolved_at, '%Y-%m-%dT%H:%i:%s.000Z') AS resolvedAt,
  DATE_FORMAT(t.closed_at, '%Y-%m-%dT%H:%i:%s.000Z') AS closedAt
`;

const JUNCOES_CHAMADO = `
  FROM tickets t
  LEFT JOIN categories c ON c.id = t.category_id
  LEFT JOIN users req ON req.id = t.requester_id
  LEFT JOIN users resp ON resp.id = t.assignee_id
`;

function normalizarChamado(linha) {
  if (!linha) return null;
  return {
    id: Number(linha.id),
    title: linha.title,
    description: linha.description,
    status: linha.status,
    priority: linha.priority,
    categoryId: linha.categoryId === null ? null : Number(linha.categoryId),
    categoryName: linha.categoryName ?? null,
    categoryColor: linha.categoryColor ?? null,
    requesterId: Number(linha.requesterId),
    requesterName: linha.requesterName ?? null,
    assigneeId: linha.assigneeId === null ? null : Number(linha.assigneeId),
    assigneeName: linha.assigneeName ?? null,
    createdAt: doMysql(linha.createdAt ?? null),
    updatedAt: doMysql(linha.updatedAt ?? null),
    dueAt: doMysql(linha.dueAt ?? null),
    resolvedAt: doMysql(linha.resolvedAt ?? null),
    closedAt: doMysql(linha.closedAt ?? null),
  };
}

export function criarRepositoriosMysql(conexao = pool) {
  const users = {
    async criar({ name, email, passwordHash, role = "requester" }) {
      const [resultado] = await conexao.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        [name, email, passwordHash, role]
      );
      return users.findById(resultado.insertId);
    },

    async findByEmailComSenha(email) {
      const [linhas] = await conexao.query(
        `SELECT ${CAMPOS_USUARIO}, password_hash AS passwordHash FROM users WHERE email = ? LIMIT 1`,
        [email]
      );
      return linhas[0] ?? null;
    },

    async findById(id) {
      const [linhas] = await conexao.query(
        `SELECT ${CAMPOS_USUARIO} FROM users WHERE id = ? LIMIT 1`,
        [id]
      );
      return linhas[0] ? { ...linhas[0], id: Number(linhas[0].id) } : null;
    },

    async listar() {
      const [linhas] = await conexao.query(`SELECT ${CAMPOS_USUARIO} FROM users ORDER BY name`);
      return linhas.map((linha) => ({ ...linha, id: Number(linha.id) }));
    },

    async atualizarPapel(id, role) {
      const [resultado] = await conexao.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
      return resultado.affectedRows ? users.findById(id) : null;
    },

    async contarAdmins() {
      const [linhas] = await conexao.query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'");
      return Number(linhas[0].total);
    },
  };

  const categories = {
    async criar({ name, color }) {
      const [resultado] = await conexao.query(
        "INSERT INTO categories (name, color) VALUES (?, ?)",
        [name, color]
      );
      return categories.findById(resultado.insertId);
    },

    async listar() {
      const [linhas] = await conexao.query(
        "SELECT id, name, color, DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt FROM categories ORDER BY name"
      );
      return linhas.map((linha) => ({ ...linha, id: Number(linha.id) }));
    },

    async findById(id) {
      const [linhas] = await conexao.query(
        "SELECT id, name, color, DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt FROM categories WHERE id = ? LIMIT 1",
        [id]
      );
      return linhas[0] ? { ...linhas[0], id: Number(linhas[0].id) } : null;
    },

    async atualizar(id, dados) {
      const campos = [];
      const valores = [];

      if (dados.name !== undefined) {
        campos.push("name = ?");
        valores.push(dados.name);
      }
      if (dados.color !== undefined) {
        campos.push("color = ?");
        valores.push(dados.color);
      }

      if (!campos.length) return categories.findById(id);

      valores.push(id);
      await conexao.query(`UPDATE categories SET ${campos.join(", ")} WHERE id = ?`, valores);
      return categories.findById(id);
    },

    async remover(id) {
      const [resultado] = await conexao.query("DELETE FROM categories WHERE id = ?", [id]);
      return resultado.affectedRows > 0;
    },
  };

  const tickets = {
    async criar(dados) {
      const criadoEm = new Date().toISOString();
      const prioridade = dados.priority ?? "medium";
      const prazo = prazoPorPrioridade(prioridade, criadoEm);

      const [resultado] = await conexao.query(
        `INSERT INTO tickets
          (title, description, status, priority, category_id, requester_id, assignee_id, due_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dados.title,
          dados.description,
          dados.status ?? "open",
          prioridade,
          dados.categoryId ?? null,
          dados.requesterId,
          dados.assigneeId ?? null,
          paraMysql(prazo),
        ]
      );

      return tickets.findById(resultado.insertId);
    },

    async listar({ filtros = {}, page = 1, limit = 20 } = {}) {
      const condicoes = [];
      const valores = [];

      if (filtros.requesterId) {
        condicoes.push("t.requester_id = ?");
        valores.push(filtros.requesterId);
      }
      if (filtros.status) {
        condicoes.push("t.status = ?");
        valores.push(filtros.status);
      }
      if (filtros.priority) {
        condicoes.push("t.priority = ?");
        valores.push(filtros.priority);
      }
      if (filtros.categoryId) {
        condicoes.push("t.category_id = ?");
        valores.push(filtros.categoryId);
      }
      if (filtros.assigneeId === "unassigned") {
        condicoes.push("t.assignee_id IS NULL");
      } else if (filtros.assigneeId === "me") {
        condicoes.push("t.assignee_id = ?");
        valores.push(filtros.usuarioId);
      } else if (filtros.assigneeId) {
        condicoes.push("t.assignee_id = ?");
        valores.push(filtros.assigneeId);
      }
      if (filtros.q) {
        condicoes.push("(t.title LIKE ? OR t.description LIKE ?)");
        valores.push(`%${filtros.q}%`, `%${filtros.q}%`);
      }

      const onde = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";
      const deslocamento = (page - 1) * limit;

      const [linhas] = await conexao.query(
        `SELECT ${CAMPOS_CHAMADO} ${JUNCOES_CHAMADO} ${onde}
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT ? OFFSET ?`,
        [...valores, limit, deslocamento]
      );

      const [contagem] = await conexao.query(
        `SELECT COUNT(*) AS total FROM tickets t ${onde}`,
        valores
      );

      return {
        items: linhas.map(normalizarChamado),
        total: Number(contagem[0].total),
      };
    },

    async todos() {
      const [linhas] = await conexao.query(
        `SELECT ${CAMPOS_CHAMADO} ${JUNCOES_CHAMADO} ORDER BY t.created_at DESC, t.id DESC`
      );
      return linhas.map(normalizarChamado);
    },

    async findById(id) {
      const [linhas] = await conexao.query(
        `SELECT ${CAMPOS_CHAMADO} ${JUNCOES_CHAMADO} WHERE t.id = ? LIMIT 1`,
        [id]
      );
      return normalizarChamado(linhas[0]);
    },

    async atualizar(id, dados) {
      const campos = [];
      const valores = [];
      const atual = await tickets.findById(id);

      if (!atual) return null;

      ["title", "description", "categoryId", "assigneeId", "status"].forEach((campo) => {
        if (campo in dados) {
          campos.push(`${campo === "categoryId" ? "category_id" : campo === "assigneeId" ? "assignee_id" : campo} = ?`);
          valores.push(dados[campo]);
        }
      });

      if (dados.priority !== undefined) {
        campos.push("priority = ?");
        valores.push(dados.priority);
        campos.push("due_at = ?");
        valores.push(paraMysql(prazoPorPrioridade(dados.priority, atual.createdAt)));
      }

      if (dados.status && dados.status !== atual.status) {
        campos.push("resolved_at = ?");
        valores.push(dados.status === "resolved" ? paraMysql(new Date().toISOString()) : null);

        campos.push("closed_at = ?");
        valores.push(dados.status === "closed" ? paraMysql(new Date().toISOString()) : null);
      }

      campos.push("updated_at = CURRENT_TIMESTAMP");
      valores.push(id);

      await conexao.query(`UPDATE tickets SET ${campos.join(", ")} WHERE id = ?`, valores);
      return tickets.findById(id);
    },

    async remover(id) {
      const [resultado] = await conexao.query("DELETE FROM tickets WHERE id = ?", [id]);
      return resultado.affectedRows > 0;
    },
  };

  const comments = {
    async criar({ ticketId, authorId, body, internal = false }) {
      const [resultado] = await conexao.query(
        "INSERT INTO comments (ticket_id, author_id, body, internal) VALUES (?, ?, ?, ?)",
        [ticketId, authorId, body, internal ? 1 : 0]
      );

      const [linhas] = await conexao.query(
        `SELECT cm.id, cm.ticket_id AS ticketId, cm.author_id AS authorId, cm.body, cm.internal,
                u.name AS authorName, u.role AS authorRole,
                DATE_FORMAT(cm.created_at, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt
         FROM comments cm JOIN users u ON u.id = cm.author_id
         WHERE cm.id = ?`,
        [resultado.insertId]
      );

      return { ...linhas[0], internal: Boolean(linhas[0].internal) };
    },

    async listar(ticketId, { incluirInternos = true } = {}) {
      const [linhas] = await conexao.query(
        `SELECT cm.id, cm.ticket_id AS ticketId, cm.author_id AS authorId, cm.body, cm.internal,
                u.name AS authorName, u.role AS authorRole,
                DATE_FORMAT(cm.created_at, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt
         FROM comments cm JOIN users u ON u.id = cm.author_id
         WHERE cm.ticket_id = ? ${incluirInternos ? "" : "AND cm.internal = 0"}
         ORDER BY cm.created_at, cm.id`,
        [ticketId]
      );

      return linhas.map((linha) => ({ ...linha, internal: Boolean(linha.internal) }));
    },
  };

  return { users, categories, tickets, comments };
}
