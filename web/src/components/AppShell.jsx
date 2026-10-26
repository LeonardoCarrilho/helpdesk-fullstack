import { ehEquipe, rotuloPapel } from "../lib/labels.js";
import { ROTAS, rotaAtiva } from "../lib/rotas.js";
import {
  IconeChamados,
  IconeEquipe,
  IconeEtiquetas,
  IconeNovo,
  IconePainel,
  IconeSair,
} from "./Icones.jsx";
import { Marca } from "./Marca.jsx";
import { Avatar } from "./ui.jsx";

export default function AppShell({ usuario, demo, rota, aoSair, aoReiniciar, children }) {
  const ativa = rotaAtiva(rota);
  const equipe = ehEquipe(usuario);
  const admin = usuario?.role === "admin";

  const itens = [
    { chave: "chamados", href: ROTAS.chamados, rotulo: "Chamados", Icone: IconeChamados },
    { chave: "novo", href: ROTAS.novo, rotulo: "Novo chamado", Icone: IconeNovo },
    ...(equipe
      ? [
          { chave: "painel", href: ROTAS.painel, rotulo: "Painel", Icone: IconePainel },
          { chave: "usuarios", href: ROTAS.usuarios, rotulo: "Equipe", Icone: IconeEquipe },
        ]
      : []),
    ...(admin
      ? [{ chave: "categorias", href: ROTAS.categorias, rotulo: "Categorias", Icone: IconeEtiquetas }]
      : []),
  ];

  return (
    <div className="app">
      <a
        className="pular"
        href="#conteudo"
        onClick={(evento) => {
          evento.preventDefault();
          document.getElementById("conteudo")?.focus();
        }}
      >
        Pular para o conteúdo
      </a>

      <header className="topo">
        <div className="topo__interno">
          <Marca />

          <nav className="menu" aria-label="Navegação principal">
            {itens.map(({ chave, href, rotulo, Icone }) => (
              <a
                key={chave}
                href={href}
                className={ativa === chave ? "menu__item menu__item--ativo" : "menu__item"}
                aria-current={ativa === chave ? "page" : undefined}
              >
                <Icone />
                <span>{rotulo}</span>
              </a>
            ))}
          </nav>

          <div className="sessao">
            <span className={`sessao__papel sessao__papel--${usuario?.role ?? "requester"}`}>
              {rotuloPapel(usuario?.role)}
            </span>

            <span className="sessao__pessoa">
              <Avatar nome={usuario?.name} />
              <span className="sessao__nome">{usuario?.name}</span>
            </span>

            <button type="button" className="botao botao--fantasma botao--icone" onClick={aoSair} title="Sair">
              <IconeSair />
              <span className="apenas-leitor">Sair</span>
            </button>
          </div>
        </div>

        {demo ? (
          <div className="faixa-demo">
            <span>
              <strong>Modo demonstração</strong> — sem servidor; os dados ficam apenas no seu navegador.
            </span>
            <button type="button" onClick={aoReiniciar}>
              Reiniciar dados
            </button>
          </div>
        ) : null}
      </header>

      <main id="conteudo" className="conteudo" tabIndex={-1}>
        {children}
      </main>

      <footer className="rodape">
        <span>Helpdesk · projeto de portfólio</span>
        <span>React · Node/Express · MySQL · JWT</span>
      </footer>
    </div>
  );
}
