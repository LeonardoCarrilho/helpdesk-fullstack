import { useEffect, useState } from "react";
import { mensagemDeErro } from "../lib/erros.js";
import {
  formatarDataCurta,
  rotuloPrioridade,
  rotuloStatus,
  situacaoSla,
} from "../lib/labels.js";
import { rotaChamado } from "../lib/rotas.js";
import { BadgePrioridade, BadgeStatus } from "./Badge.jsx";
import { Alerta, Carregando, PaginaCabecalho } from "./ui.jsx";

function Distribuicao({ titulo, valores, rotulos, total }) {
  return (
    <section className="card">
      <h2>{titulo}</h2>

      {total === 0 ? (
        <p className="texto-fraco">Sem chamados para distribuir.</p>
      ) : (
        <ul className="distribuicao">
          {Object.keys(valores).map((chave) => {
            const valor = valores[chave];
            const porcentagem = total ? Math.round((valor / total) * 100) : 0;

            return (
              <li key={chave}>
                <div className="distribuicao__linha">
                  <span>{rotulos(chave)}</span>
                  <strong>
                    {valor} <span className="texto-fraco">({porcentagem}%)</span>
                  </strong>
                </div>
                <div className="barra" aria-hidden="true">
                  <span style={{ width: `${porcentagem}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ResumoIndicadores({ resumo, agora = Date.now() }) {
  if (!resumo) return null;

  const cartoes = [
    { rotulo: "Total de chamados", valor: resumo.totals.all, tom: "neutro" },
    { rotulo: "Em aberto", valor: resumo.totals.open, tom: "info" },
    { rotulo: "Em andamento", valor: resumo.totals.in_progress, tom: "aviso" },
    { rotulo: "Atrasados", valor: resumo.overdue, tom: resumo.overdue > 0 ? "perigo" : "neutro" },
    { rotulo: "Sem responsável", valor: resumo.unassigned, tom: resumo.unassigned > 0 ? "aviso" : "neutro" },
    { rotulo: "Tempo médio", valor: `${resumo.avgResolutionHours} h`, tom: "sucesso" },
  ];

  return (
    <div className="painel">
      <section className="indicadores" aria-label="Indicadores gerais">
        {cartoes.map((cartao) => (
          <article key={cartao.rotulo} className={`indicador indicador--${cartao.tom}`}>
            <span>{cartao.rotulo}</span>
            <strong>{cartao.valor}</strong>
          </article>
        ))}
      </section>

      <div className="painel__grade">
        <Distribuicao
          titulo="Por status"
          valores={{
            open: resumo.totals.open,
            in_progress: resumo.totals.in_progress,
            resolved: resumo.totals.resolved,
            closed: resumo.totals.closed,
          }}
          total={resumo.totals.all}
          rotulos={rotuloStatus}
        />

        <Distribuicao
          titulo="Por prioridade"
          valores={resumo.byPriority}
          total={resumo.totals.all}
          rotulos={rotuloPrioridade}
        />
      </div>

      <div className="painel__grade">
        <section className="card">
          <h2>Carga da equipe</h2>

          {resumo.byAgent.length === 0 ? (
            <p className="texto-fraco">Nenhum chamado atribuído até agora.</p>
          ) : (
            <div className="tabela-wrap">
              <table className="tabela">
                <thead>
                  <tr>
                    <th scope="col">Agente</th>
                    <th scope="col">Em aberto</th>
                    <th scope="col">Concluídos</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.byAgent.map((agente) => (
                    <tr key={agente.id}>
                      <td>{agente.nome ?? `Agente #${agente.id}`}</td>
                      <td>{agente.abertos}</td>
                      <td>{agente.resolvidos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Últimos chamados</h2>

          {resumo.recent.length === 0 ? (
            <p className="texto-fraco">Nenhum chamado registrado.</p>
          ) : (
            <ul className="recentes">
              {resumo.recent.map((chamado) => {
                const sla = situacaoSla(chamado, agora);

                return (
                  <li key={chamado.id}>
                    <a href={rotaChamado(chamado.id)}>{chamado.title}</a>
                    <div className="recentes__meta">
                      <BadgeStatus status={chamado.status} />
                      <BadgePrioridade prioridade={chamado.priority} />
                      <span className={`sla sla--${sla.tom}`}>{sla.rotulo}</span>
                      <span className="texto-fraco">{formatarDataCurta(chamado.createdAt)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <p className="texto-fraco painel__rodape">
        Indicadores calculados em {formatarDataCurta(resumo.generatedAt)}.
      </p>
    </div>
  );
}

export default function Dashboard({ api }) {
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);

    api
      .painel()
      .then((dados) => {
        if (!ativo) return;
        setResumo(dados);
        setErro(null);
      })
      .catch((excecao) => {
        if (ativo) setErro(mensagemDeErro(excecao, "Não foi possível carregar os indicadores."));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [api, versao]);

  return (
    <div className="pagina">
      <PaginaCabecalho
        titulo="Painel"
        descricao="Volume, prazo e distribuição da fila de atendimento."
        acoes={
          <button
            type="button"
            className="botao botao--secundario"
            onClick={() => setVersao((valor) => valor + 1)}
            disabled={carregando}
          >
            Atualizar
          </button>
        }
      />

      <Alerta>{erro}</Alerta>

      {carregando && !resumo ? (
        <Carregando rotulo="Calculando indicadores…" />
      ) : (
        <ResumoIndicadores resumo={resumo} />
      )}
    </div>
  );
}
