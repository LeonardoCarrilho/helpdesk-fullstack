import { criarRepositoriosMysql } from "../repositories/mysql.js";
import { gerarHashSenha } from "../utils/password.js";
import { pool } from "./pool.js";
import { adicionarHoras } from "../utils/datas.js";

const PESSOAS = [
  { name: "Leonardo Carrilho", email: "admin@helpdesk.dev", senha: "admin12345", role: "admin" },
  { name: "Ana Souza", email: "ana@helpdesk.dev", senha: "agente12345", role: "agent" },
  { name: "Bruno Lima", email: "bruno@helpdesk.dev", senha: "agente12345", role: "agent" },
  { name: "Carla Mendes", email: "cliente@helpdesk.dev", senha: "cliente12345", role: "requester" },
];

const CATEGORIAS = [
  { name: "Acesso", color: "#6366f1" },
  { name: "Hardware", color: "#f59e0b" },
  { name: "Software", color: "#0ea5e9" },
  { name: "Rede", color: "#10b981" },
  { name: "Financeiro", color: "#ef4444" },
];

async function semear() {
  const repos = criarRepositoriosMysql();
  const usuarios = {};

  for (const pessoa of PESSOAS) {
    const existente = await repos.users.findByEmailComSenha(pessoa.email);

    if (existente) {
      usuarios[pessoa.email] = existente;
      continue;
    }

    const passwordHash = await gerarHashSenha(pessoa.senha);
    usuarios[pessoa.email] = await repos.users.criar({
      name: pessoa.name,
      email: pessoa.email,
      passwordHash,
      role: pessoa.role,
    });
    console.log(`Usuário criado: ${pessoa.email}`);
  }

  for (const categoria of CATEGORIAS) {
    const existentes = await repos.categories.listar();
    if (!existentes.some((item) => item.name === categoria.name)) {
      await repos.categories.criar(categoria);
    }
  }

  const { total } = await repos.tickets.listar({ page: 1, limit: 1 });
  if (total > 0) {
    console.log("Chamados já existem: seed de chamados ignorado.");
    await pool.end();
    return;
  }

  const categorias = await repos.categories.listar();
  const porNome = (nome) => categorias.find((item) => item.name === nome)?.id ?? null;
  const admin = usuarios["admin@helpdesk.dev"];
  const ana = usuarios["ana@helpdesk.dev"];
  const bruno = usuarios["bruno@helpdesk.dev"];
  const carla = usuarios["cliente@helpdesk.dev"];

  const chamados = [
    {
      title: "Não consigo acessar o e-mail corporativo",
      description:
        "Desde a troca de senha na segunda-feira o webmail retorna erro de credenciais. Já tentei em dois navegadores.",
      priority: "high",
      categoryId: porNome("Acesso"),
      requesterId: carla.id,
      assigneeId: ana.id,
      status: "in_progress",
      horasAtras: 26,
    },
    {
      title: "Notebook reiniciando sozinho",
      description:
        "O notebook reinicia sem aviso durante o uso, principalmente quando está na bateria.",
      priority: "critical",
      categoryId: porNome("Hardware"),
      requesterId: carla.id,
      assigneeId: bruno.id,
      status: "open",
      horasAtras: 5,
    },
    {
      title: "Erro ao gerar relatório no ERP",
      description:
        "O botão Exportar retorna página em branco desde a atualização de ontem. Afeta o fechamento do mês.",
      priority: "high",
      categoryId: porNome("Software"),
      requesterId: carla.id,
      assigneeId: null,
      status: "open",
      horasAtras: 10,
    },
    {
      title: "Wi-Fi do 3º andar instável",
      description:
        "A conexão cai a cada poucos minutos no lado esquerdo do andar. Testei em dois computadores.",
      priority: "medium",
      categoryId: porNome("Rede"),
      requesterId: carla.id,
      assigneeId: bruno.id,
      status: "resolved",
      horasAtras: 48,
      horasParaResolver: 20,
    },
    {
      title: "Dúvida sobre reembolso de deslocamento",
      description:
        "Preciso enviar a nota de táxi da visita ao cliente. Qual é o prazo e o formulário correto?",
      priority: "low",
      categoryId: porNome("Financeiro"),
      requesterId: carla.id,
      assigneeId: admin.id,
      status: "closed",
      horasAtras: 96,
      horasParaResolver: 30,
    },
    {
      title: "Solicitação de acesso ao dashboard de vendas",
      description:
        "Novo analista precisa de leitura no dashboard de vendas. O gestor já aprovou pelo chat.",
      priority: "medium",
      categoryId: porNome("Acesso"),
      requesterId: carla.id,
      assigneeId: ana.id,
      status: "resolved",
      horasAtras: 30,
      horasParaResolver: 6,
    },
  ];

  for (const item of chamados) {
    const criadoEm = adicionarHoras(new Date().toISOString(), -item.horasAtras);
    const chamado = await repos.tickets.criar({
      title: item.title,
      description: item.description,
      priority: item.priority,
      categoryId: item.categoryId,
      requesterId: item.requesterId,
      assigneeId: item.assigneeId,
    });

    // O repositório grava com o relógio atual; ajustamos datas e status para o
    // cenário de demonstração ficar coerente (SLA, tempo médio, atrasos).
    await pool.query(
      `UPDATE tickets
       SET status = ?, created_at = ?, updated_at = ?, due_at = ?
       WHERE id = ?`,
      [
        item.status,
        criadoEm.slice(0, 19).replace("T", " "),
        criadoEm.slice(0, 19).replace("T", " "),
        adicionarHoras(criadoEm, { low: 72, medium: 24, high: 8, critical: 4 }[item.priority])
          .slice(0, 19)
          .replace("T", " "),
        chamado.id,
      ]
    );

    if (item.horasParaResolver) {
      const resolvidoEm = adicionarHoras(criadoEm, item.horasParaResolver);
      await pool.query("UPDATE tickets SET resolved_at = ?, closed_at = ? WHERE id = ?", [
        resolvidoEm.slice(0, 19).replace("T", " "),
        item.status === "closed" ? resolvidoEm.slice(0, 19).replace("T", " ") : null,
        chamado.id,
      ]);
    }

    await repos.comments.criar({
      ticketId: chamado.id,
      authorId: carla.id,
      body: "Obrigado pelo retorno. Fico no aguardo.",
      internal: false,
    });

    if (item.assigneeId) {
      await repos.comments.criar({
        ticketId: chamado.id,
        authorId: item.assigneeId,
        body: "Chamado recebido. Vou verificar e retorno com uma previsão.",
        internal: false,
      });
    }

    await repos.comments.criar({
      ticketId: chamado.id,
      authorId: ana.id,
      body: "Checklist interno: validar versão do equipamento antes do próximo contato.",
      internal: true,
    });
  }

  console.log(`${chamados.length} chamados de demonstração criados.`);
  console.log("Login de administrador: admin@helpdesk.dev / admin12345");
  await pool.end();
}

semear().catch(async (erro) => {
  console.error("Falha no seed:", erro.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
