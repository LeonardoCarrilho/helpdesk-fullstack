import { useEffect, useState } from "react";
import { criarApi } from "./api/index.js";
import AppShell from "./components/AppShell.jsx";
import Categories from "./components/Categories.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Login from "./components/Login.jsx";
import NewTicket from "./components/NewTicket.jsx";
import TicketDetail from "./components/TicketDetail.jsx";
import TicketList from "./components/TicketList.jsx";
import Users from "./components/Users.jsx";
import { Carregando, Vazio } from "./components/ui.jsx";
import { ehAdmin, ehEquipe } from "./lib/labels.js";
import { ROTAS, lerRota } from "./lib/rotas.js";

const TITULOS = {
  chamados: "Chamados",
  chamado: "Chamado",
  novo: "Novo chamado",
  painel: "Painel",
  usuarios: "Equipe",
  categorias: "Categorias",
};

function navegar(hash) {
  if (window.location.hash === hash) return;
  window.location.hash = hash;
}

function SemAcesso() {
  return (
    <div className="pagina pagina--estreita">
      <Vazio
        titulo="Área restrita"
        descricao="Seu perfil não tem permissão para esta tela. Fale com um administrador se precisar de acesso."
      >
        <a className="botao botao--primario" href={ROTAS.chamados}>
          Voltar para os chamados
        </a>
      </Vazio>
    </div>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [api] = useState(() => criarApi({ aoExpirar: () => setUsuario(null) }));
  const [rota, setRota] = useState(() => lerRota(window.location.hash));
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = ROTAS.chamados;
    }

    const aoMudar = () => setRota(lerRota(window.location.hash));

    window.addEventListener("hashchange", aoMudar);
    return () => window.removeEventListener("hashchange", aoMudar);
  }, []);

  useEffect(() => {
    let ativo = true;

    api
      .me()
      .then((sessao) => {
        if (ativo && sessao) setUsuario(sessao);
      })
      .catch(() => {
        /* sem sessão válida: a tela de entrada aparece */
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [api]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${TITULOS[rota.nome] ?? "Chamados"} · Helpdesk`;
  }, [rota.nome, rota.id]);

  async function sair() {
    try {
      await api.logout();
    } finally {
      setUsuario(null);
      navegar(ROTAS.chamados);
    }
  }

  async function reiniciarDemo() {
    const confirmado = window.confirm(
      "Reiniciar os dados de demonstração? O que você criou será descartado e a sessão será encerrada."
    );

    if (!confirmado) return;

    await api.reiniciar?.();
    setUsuario(null);
    navegar(ROTAS.chamados);
  }

  if (carregando) {
    return (
      <div className="tela-carregando">
        <Carregando rotulo="Preparando a central…" />
      </div>
    );
  }

  if (!usuario) {
    return (
      <Login
        api={api}
        demo={api.modo === "demo"}
        aoEntrar={(novoUsuario) => {
          setUsuario(novoUsuario);
          navegar(ROTAS.chamados);
        }}
      />
    );
  }

  const equipe = ehEquipe(usuario);
  const admin = ehAdmin(usuario);

  let conteudo;

  switch (rota.nome) {
    case "chamado":
      conteudo = (
        <TicketDetail
          key={rota.id}
          api={api}
          usuario={usuario}
          id={rota.id}
          navegar={navegar}
        />
      );
      break;
    case "novo":
      conteudo = <NewTicket api={api} navegar={navegar} />;
      break;
    case "painel":
      conteudo = equipe ? <Dashboard api={api} /> : <SemAcesso />;
      break;
    case "usuarios":
      conteudo = equipe ? <Users api={api} usuario={usuario} /> : <SemAcesso />;
      break;
    case "categorias":
      conteudo = admin ? <Categories api={api} /> : <SemAcesso />;
      break;
    default:
      conteudo = <TicketList api={api} usuario={usuario} />;
  }

  return (
    <AppShell
      usuario={usuario}
      demo={api.modo === "demo"}
      rota={rota}
      aoSair={sair}
      aoReiniciar={reiniciarDemo}
    >
      {conteudo}
    </AppShell>
  );
}
