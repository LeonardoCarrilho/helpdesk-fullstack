import { useEffect, useState } from "react";
import { mensagemDeErro } from "../lib/erros.js";
import {
  PRIORIDADES,
  STATUS,
  ehEquipe,
  formatarDataCurta,
  rotuloPrioridade,
  rotuloStatus,
  situacaoSla,
} from "../lib/labels.js";
import { ROTAS, rotaChamado } from "../lib/rotas.js";
import { BadgePrioridade, BadgeStatus } from "./Badge.jsx";
import { IconeBusca } from "./Icones.jsx";
import { Alerta, Carregando, PaginaCabecalho, Vazio } from "./ui.jsx";

const POR_PAGINA = 10;

const FILTROS_INICIAIS = {
  status: "",
  priority: "",
  categoryId: "",
  assigneeId: "",
  q: "",
  page: 1,
};

export function TabelaChamados({ itens, usuario, agora = Date.now() }) {
  const equipe = ehEquipe(usuario);

  return (
    <div className="tabela-wrap">
      <table className="tabela tabela--chamados">
        <caption className="apenas-leitor">
          Lista de chamados com solicitante, prioridade, status, responsável e prazo.
        </caption>
        <thead>
          <tr>
            <th scope="col">Chamado</th>
            {equipe ? <th scope="col">Solicitante</th> : null}
            <th scope="col">Prioridade</th>
            <th scope="col">Status</th>
            {equipe ? <th scope="col">Responsável</th> : null}
            <th scope="col">SLA</th>
            <th scope="col">Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((chamado) => {
            const sla = situacaoSla(chamado, agora);

            return (
              <tr key={chamado.id}>
                <td data-rotulo="Chamado" className="celula-chamado">
                  <a className="chamado__titulo" href={rotaChamado(chamado.id)}>
                    {chamado.title}
                  </a>
                  <span className="chamado__meta">
                    #{chamado.id} · {chamado.categoryName ?? "Sem categoria"}
                  </span>
                </td>

                {equipe ? (
                  <td data-rotulo="Solicitante">{chamado.requesterName ?? "—"}</td>
                ) : null}

                <td data-rotulo="Prioridade">
                  <BadgePrioridade prioridade={chamado.priority} />
                </td>
                <td data-rotulo="Status">
                  <BadgeStatus status={chamado.status} />
                </td>

                {equipe ? (
                  <td data-rotulo="Responsável">
                    {chamado.assigneeName ?? <span className="texto-fraco">Não atribuído</span>}
                  </td>
                ) : null}

                <td data-rotulo="SLA">
                  <span className={`sla sla--${sla.tom}`}>{sla.rotulo}</span>
                </td>

                <td data-rotulo="Atualizado" className="texto-fraco">
                  {formatarDataCurta(chamado.updatedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function TicketList({ api, usuario }) {
  const equipe = ehEquipe(usuario);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [busca, setBusca] = useState("");
  const [dados, setDados] = useState({ items: [], total: 0 });
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;

    api
      .listarCategorias()
      .then((lista) => {
        if (ativo) setCategorias(lista);
      })
      .catch(() => {
        if (ativo) setCategorias([]);
      });

    return () => {
      ativo = false;
    };
  }, [api]);

  useEffect(() => {
    const termo = busca.trim();

    const temporizador = setTimeout(() => {
      setFiltros((atual) => (atual.q === termo ? atual : { ...atual, q: termo, page: 1 }));
    }, 320);

    return () => clearTimeout(temporizador);
  }, [busca]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);

    api
      .listarChamados({ ...filtros, limit: POR_PAGINA })
      .then((resultado) => {
        if (!ativo) return;
        setDados(resultado);
        setErro(null);
      })
      .catch((excecao) => {
        if (ativo) setErro(mensagemDeErro(excecao, "Não foi possível carregar os chamados."));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [api, filtros, versao]);

  function alterarFiltro(campo, valor) {
    setFiltros((atual) => ({ ...atual, [campo]: valor, page: 1 }));
  }

  function limpar() {
    setBusca("");
    setFiltros(FILTROS_INICIAIS);
  }

  const temFiltros =
    Boolean(filtros.status || filtros.priority || filtros.categoryId || filtros.assigneeId) ||
    Boolean(filtros.q);

  const totalPaginas = Math.max(1, Math.ceil(dados.total / POR_PAGINA));
  const pagina = Math.min(filtros.page, totalPaginas);

  function irPara(novaPagina) {
    setFiltros((atual) => ({ ...atual, page: Math.min(Math.max(novaPagina, 1), totalPaginas) }));
  }

  return (
    <div className="pagina">
      <PaginaCabecalho
        titulo={equipe ? "Chamados" : "Meus chamados"}
        descricao={
          equipe
            ? "Fila completa da central, com prazo de atendimento e responsável."
            : "Acompanhe o andamento dos pedidos que você abriu."
        }
        acoes={
          <a className="botao botao--primario" href={ROTAS.novo}>
            Novo chamado
          </a>
        }
      />

      <section className="filtros" aria-label="Filtros da lista">
        <form
          className="filtros__busca"
          onSubmit={(evento) => {
            evento.preventDefault();
            alterarFiltro("q", busca.trim());
          }}
          role="search"
        >
          <IconeBusca />
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por título ou descrição"
            aria-label="Buscar chamados"
          />
        </form>

        <label className="filtros__campo">
          <span>Status</span>
          <select value={filtros.status} onChange={(evento) => alterarFiltro("status", evento.target.value)}>
            <option value="">Todos</option>
            {Object.keys(STATUS).map((chave) => (
              <option key={chave} value={chave}>
                {rotuloStatus(chave)}
              </option>
            ))}
          </select>
        </label>

        <label className="filtros__campo">
          <span>Prioridade</span>
          <select
            value={filtros.priority}
            onChange={(evento) => alterarFiltro("priority", evento.target.value)}
          >
            <option value="">Todas</option>
            {Object.keys(PRIORIDADES).map((chave) => (
              <option key={chave} value={chave}>
                {rotuloPrioridade(chave)}
              </option>
            ))}
          </select>
        </label>

        <label className="filtros__campo">
          <span>Categoria</span>
          <select
            value={filtros.categoryId}
            onChange={(evento) => alterarFiltro("categoryId", evento.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.name}
              </option>
            ))}
          </select>
        </label>

        {equipe ? (
          <label className="filtros__campo">
            <span>Responsável</span>
            <select
              value={filtros.assigneeId}
              onChange={(evento) => alterarFiltro("assigneeId", evento.target.value)}
            >
              <option value="">Todos</option>
              <option value="me">Meus chamados</option>
              <option value="unassigned">Sem responsável</option>
            </select>
          </label>
        ) : null}

        {temFiltros ? (
          <button type="button" className="botao botao--texto" onClick={limpar}>
            Limpar filtros
          </button>
        ) : null}
      </section>

      <Alerta>{erro}</Alerta>

      {carregando ? (
        <Carregando rotulo="Carregando chamados…" />
      ) : dados.items.length === 0 ? (
        <Vazio
          titulo={temFiltros ? "Nenhum chamado com esses filtros" : "Nenhum chamado por aqui"}
          descricao={
            temFiltros
              ? "Ajuste a busca ou limpe os filtros para ver a fila completa."
              : "Abra o primeiro chamado para começar a acompanhar o atendimento."
          }
        >
          <div className="vazio__acoes">
            {temFiltros ? (
              <button type="button" className="botao botao--secundario" onClick={limpar}>
                Limpar filtros
              </button>
            ) : null}
            <a className="botao botao--primario" href={ROTAS.novo}>
              Abrir chamado
            </a>
          </div>
        </Vazio>
      ) : (
        <>
          <section className="card card--tabela">
            <TabelaChamados itens={dados.items} usuario={usuario} />
          </section>

          <div className="paginacao">
            <p className="paginacao__total" role="status">
              {dados.total} {dados.total === 1 ? "chamado" : "chamados"} · página {pagina} de{" "}
              {totalPaginas}
            </p>

            <div className="paginacao__botoes">
              <button
                type="button"
                className="botao botao--secundario"
                onClick={() => irPara(pagina - 1)}
                disabled={pagina <= 1 || carregando}
              >
                Anterior
              </button>
              <button
                type="button"
                className="botao botao--secundario"
                onClick={() => irPara(pagina + 1)}
                disabled={pagina >= totalPaginas || carregando}
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
