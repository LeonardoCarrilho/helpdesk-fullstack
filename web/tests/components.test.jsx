import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import AppShell from "../src/components/AppShell.jsx";
import { BadgePapel, BadgePrioridade, BadgeStatus } from "../src/components/Badge.jsx";
import { ResumoIndicadores } from "../src/components/Dashboard.jsx";
import Login from "../src/components/Login.jsx";
import { TabelaChamados } from "../src/components/TicketList.jsx";
import { TabelaEquipe } from "../src/components/Users.jsx";
import { Alerta, Avatar, Carregando, Selo, Vazio } from "../src/components/ui.jsx";

const AGORA = Date.parse("2026-10-26T12:00:00.000Z");
const CRIADO = "2026-10-26T09:00:00.000Z";

const ADMIN = { id: 1, name: "Leonardo Carrilho", email: "admin@helpdesk.dev", role: "admin" };
const ANA = { id: 2, name: "Ana Souza", email: "ana@helpdesk.dev", role: "agent" };
const CARLA = { id: 4, name: "Carla Mendes", email: "cliente@helpdesk.dev", role: "requester" };

const CHAMADO = {
  id: 7,
  title: "Impressora fiscal não imprime cupom",
  description: "A impressora do caixa 2 não emite cupom desde a troca do rolo.",
  status: "open",
  priority: "high",
  categoryId: 2,
  categoryName: "Hardware",
  categoryColor: "#f59e0b",
  requesterId: 5,
  requesterName: "João Pereira",
  assigneeId: null,
  assigneeName: null,
  createdAt: CRIADO,
  updatedAt: CRIADO,
  dueAt: "2026-10-26T17:00:00.000Z",
  resolvedAt: null,
};

const RESUMO = {
  totals: { all: 8, open: 3, in_progress: 2, resolved: 2, closed: 1 },
  byPriority: { low: 1, medium: 3, high: 3, critical: 1 },
  overdue: 3,
  unassigned: 2,
  avgResolutionHours: 18.7,
  byAgent: [
    { id: 2, nome: "Ana Souza", abertos: 2, resolvidos: 1 },
    { id: 3, nome: "Bruno Lima", abertos: 1, resolvidos: 1 },
  ],
  recent: [CHAMADO],
  generatedAt: CRIADO,
};

function render(elemento) {
  return renderToStaticMarkup(elemento);
}

describe("selos", () => {
  it("traduz status e prioridade com o tom visual correto", () => {
    const status = render(<BadgeStatus status="in_progress" />);
    expect(status).toContain("Em andamento");
    expect(status).toContain("selo--warning");
    expect(status).toContain("Status: Em andamento");

    const prioridade = render(<BadgePrioridade prioridade="critical" />);
    expect(prioridade).toContain("Crítica");
    expect(prioridade).toContain("selo--danger");
  });

  it("usa tom neutro quando o código é desconhecido", () => {
    expect(render(<BadgeStatus status="arquivado" />)).toContain("selo--neutral");
    expect(render(<BadgePrioridade prioridade="urgente" />)).toContain("selo--neutral");
  });

  it("diferencia os papéis da central", () => {
    expect(render(<BadgePapel papel="admin" />)).toContain("selo--accent");
    expect(render(<BadgePapel papel="agent" />)).toContain("selo--info");
    expect(render(<BadgePapel papel="requester" />)).toContain("Solicitante");
  });
});

describe("TabelaChamados", () => {
  it("mostra colunas de solicitante e responsável para a equipe", () => {
    const html = render(
      <TabelaChamados itens={[CHAMADO]} usuario={ANA} agora={AGORA} />
    );

    expect(html).toContain("Solicitante");
    expect(html).toContain("Responsável");
    expect(html).toContain("João Pereira");
    expect(html).toContain("Não atribuído");
    expect(html).toContain("Hardware");
    expect(html).toContain("href=\"#/chamados/7\"");
    expect(html).toContain("Vence em 5h");
  });

  it("esconde dados internos do solicitante", () => {
    const html = render(
      <TabelaChamados itens={[CHAMADO]} usuario={CARLA} agora={AGORA} />
    );

    expect(html).not.toContain("Solicitante");
    expect(html).not.toContain("Responsável");
    expect(html).not.toContain("João Pereira");
    expect(html).toContain("Impressora fiscal");
  });

  it("marca o chamado atrasado", () => {
    const atrasado = { ...CHAMADO, dueAt: "2026-10-26T07:00:00.000Z" };
    const html = render(<TabelaChamados itens={[atrasado]} usuario={ANA} agora={AGORA} />);

    expect(html).toContain("Atrasado há 5h");
    expect(html).toContain("sla--danger");
  });
});

describe("TabelaEquipe", () => {
  const pessoas = [ADMIN, ANA, CARLA];

  it("permite ao administrador ver e-mail e alterar papéis", () => {
    const html = render(
      <TabelaEquipe usuarios={pessoas} admin salvandoId={null} aoMudarPapel={() => {}} />
    );

    expect(html).toContain("E-mail");
    expect(html).toContain("admin@helpdesk.dev");
    expect(html).toContain("Alterar papel");
    expect(html).toContain("Papel de Ana Souza");
    expect(html).toContain("option value=\"agent\" selected");
  });

  it("para o agente, esconde e-mail e não oferece edição", () => {
    const html = render(
      <TabelaEquipe usuarios={[ANA, ADMIN]} admin={false} salvandoId={null} aoMudarPapel={() => {}} />
    );

    expect(html).toContain("Ana Souza");
    expect(html).not.toContain("admin@helpdesk.dev");
    expect(html).not.toContain("Alterar papel");
    expect(html).not.toContain("<select");
  });

  it("desabilita o seletor da pessoa em salvamento", () => {
    const html = render(
      <TabelaEquipe usuarios={[ANA]} admin salvandoId={ANA.id} aoMudarPapel={() => {}} />
    );

    expect(html).toContain("disabled");
  });
});

describe("ResumoIndicadores", () => {
  it("não renderiza sem dados", () => {
    expect(render(<ResumoIndicadores resumo={null} />)).toBe("");
  });

  it("mostra cartões, distribuições, equipe e recentes", () => {
    const html = render(<ResumoIndicadores resumo={RESUMO} agora={AGORA} />);

    expect(html).toContain("Total de chamados");
    expect(html).toContain("Atrasados");
    expect(html).toContain("Sem responsável");
    expect(html).toContain("18.7 h");
    expect(html).toContain("Por status");
    expect(html).toContain("Por prioridade");
    expect(html).toContain("Ana Souza");
    expect(html).toContain("Bruno Lima");
    expect(html).toContain("Impressora fiscal não imprime cupom");
    expect(html).toContain("3");
  });

  it("explica quando não há chamados", () => {
    const vazio = {
      ...RESUMO,
      totals: { all: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 },
      byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
      byAgent: [],
      recent: [],
    };

    const html = render(<ResumoIndicadores resumo={vazio} />);

    expect(html).toContain("Sem chamados para distribuir.");
    expect(html).toContain("Nenhum chamado atribuído");
    expect(html).toContain("Nenhum chamado registrado");
  });
});

describe("AppShell", () => {
  const base = {
    rota: { nome: "chamados" },
    aoSair: () => {},
    aoReiniciar: () => {},
  };

  it("mostra o menu completo do administrador", () => {
    const html = render(
      <AppShell {...base} usuario={ADMIN} demo>
        <p>conteúdo</p>
      </AppShell>
    );

    expect(html).toContain("Chamados");
    expect(html).toContain("Novo chamado");
    expect(html).toContain("Painel");
    expect(html).toContain("Equipe");
    expect(html).toContain("Categorias");
    expect(html).toContain("Administrador");
    expect(html).toContain("Modo demonstração");
    expect(html).toContain("Reiniciar dados");
    expect(html).toContain("conteúdo");
  });

  it("esconde painel, equipe e categorias do solicitante", () => {
    const html = render(
      <AppShell {...base} usuario={CARLA}>
        <p>conteúdo</p>
      </AppShell>
    );

    expect(html).toContain("Novo chamado");
    expect(html).toContain("Solicitante");
    expect(html).not.toContain("Painel");
    expect(html).not.toContain("Categorias");
    expect(html).not.toContain("Modo demonstração");
  });

  it("marca o item ativo também no detalhe do chamado", () => {
    const html = render(
      <AppShell {...base} rota={{ nome: "chamado", id: 7 }} usuario={ANA}>
        <p>conteúdo</p>
      </AppShell>
    );

    expect(html).toContain("menu__item--ativo");
    expect(html).toContain("aria-current=\"page\"");
    expect(html).not.toContain("Categorias");
  });
});

describe("Login", () => {
  it("renderiza o formulário de entrada sem atalhos de demonstração", () => {
    const html = render(<Login api={{}} aoEntrar={() => {}} />);

    expect(html).toContain("Entrar na central");
    expect(html).toContain("Criar conta");
    expect(html).toContain("E-mail");
    expect(html).not.toContain("Contas de demonstração");
    expect(html).not.toContain("admin@helpdesk.dev");
  });

  it("lista as três contas quando o modo demo está ativo", () => {
    const html = render(<Login api={{}} aoEntrar={() => {}} demo />);

    expect(html).toContain("Contas de demonstração");
    expect(html).toContain("admin@helpdesk.dev");
    expect(html).toContain("ana@helpdesk.dev");
    expect(html).toContain("cliente@helpdesk.dev");
    expect(html).toContain("Administrador");
    expect(html).toContain("Agente");
    expect(html).toContain("Solicitante");
  });
});

describe("estados de interface", () => {
  it("mostra alerta apenas com conteúdo", () => {
    expect(render(<Alerta>{null}</Alerta>)).toBe("");
    expect(render(<Alerta>Falha ao salvar</Alerta>)).toContain("role=\"alert\"");
    expect(render(<Alerta tom="info">Tudo certo</Alerta>)).toContain("alerta--info");
  });

  it("orienta o estado vazio com ações", () => {
    const html = render(
      <Vazio titulo="Nenhum chamado" descricao="Abra o primeiro.">
        <button type="button">Abrir</button>
      </Vazio>
    );

    expect(html).toContain("Nenhum chamado");
    expect(html).toContain("Abra o primeiro.");
    expect(html).toContain("Abrir");
  });

  it("anuncia o carregamento com role de status", () => {
    const html = render(<Carregando rotulo="Carregando chamados…" />);

    expect(html).toContain("role=\"status\"");
    expect(html).toContain("Carregando chamados…");
    expect(html).toContain("carregando__anel");
  });

  it("usa iniciais e matiz estável no avatar", () => {
    const html = render(<Avatar nome="Leonardo Fernandes Carrilho" />);

    expect(html).toContain("LF");
    expect(html).toContain("--avatar-hue");
  });

  it("renderiza um selo genérico com o tom pedido", () => {
    expect(render(<Selo tom="success">Resolvido</Selo>)).toContain("selo--success");
  });
});
