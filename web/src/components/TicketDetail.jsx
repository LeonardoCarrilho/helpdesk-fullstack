import { useEffect, useState } from "react";
import { mensagemDeErro } from "../lib/erros.js";
import {
  PRIORIDADES,
  SLA_HORAS,
  ehEquipe,
  formatarDataHora,
  podeEditarTexto,
  podeExcluir,
  rotuloAcaoStatus,
  rotuloPrioridade,
  rotuloStatus,
  situacaoSla,
  tempoRelativo,
  transicoesDisponiveis,
} from "../lib/labels.js";
import { ROTAS } from "../lib/rotas.js";
import { BadgePapel, BadgePrioridade, BadgeStatus } from "./Badge.jsx";
import { IconeVoltar } from "./Icones.jsx";
import { Alerta, Avatar, Carregando } from "./ui.jsx";

export default function TicketDetail({ api, usuario, id, navegar }) {
  const [chamado, setChamado] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [acao, setAcao] = useState(null);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState({ title: "", description: "" });
  const [comentario, setComentario] = useState("");
  const [interno, setInterno] = useState(false);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [versao, setVersao] = useState(0);

  const equipe = ehEquipe(usuario);
  const admin = podeExcluir(usuario);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);

    Promise.all([api.obterChamado(id), api.listarComentarios(id)])
      .then(([dadosChamado, listaComentarios]) => {
        if (!ativo) return;
        setChamado(dadosChamado);
        setComentarios(listaComentarios);
      })
      .catch((excecao) => {
        if (ativo) setErro(mensagemDeErro(excecao, "Chamado não encontrado."));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [api, id, versao]);

  useEffect(() => {
    if (!equipe) return undefined;

    let ativo = true;

    Promise.all([
      api.listarUsuarios().catch(() => []),
      api.listarCategorias().catch(() => []),
    ]).then(([listaUsuarios, listaCategorias]) => {
      if (!ativo) return;
      setUsuarios(listaUsuarios);
      setCategorias(listaCategorias);
    });

    return () => {
      ativo = false;
    };
  }, [api, equipe]);

  async function aplicar(alteracoes, rotulo) {
    setAcao(rotulo);
    setErroAcao(null);

    try {
      const atualizado = await api.atualizarChamado(chamado.id, alteracoes);
      setChamado(atualizado);
      return true;
    } catch (excecao) {
      setErroAcao(mensagemDeErro(excecao));
      return false;
    } finally {
      setAcao(null);
    }
  }

  async function enviarComentario(evento) {
    evento.preventDefault();
    const texto = comentario.trim();

    if (texto.length < 2) {
      setErroAcao("Escreva um comentário com pelo menos 2 caracteres.");
      return;
    }

    setErroAcao(null);
    setEnviandoComentario(true);

    try {
      const novo = await api.criarComentario(chamado.id, {
        body: texto,
        internal: Boolean(interno && equipe),
      });

      setComentarios((atual) => [...atual, novo]);
      setComentario("");
      setInterno(false);
    } catch (excecao) {
      setErroAcao(mensagemDeErro(excecao, "Não foi possível enviar o comentário."));
    } finally {
      setEnviandoComentario(false);
    }
  }

  async function excluir() {
    const confirmado = window.confirm(
      `Excluir o chamado #${chamado.id}? Comentários e histórico serão removidos.`
    );

    if (!confirmado) return;

    setAcao("Excluindo…");
    setErroAcao(null);

    try {
      await api.removerChamado(chamado.id);
      navegar(ROTAS.chamados);
    } catch (excecao) {
      setErroAcao(mensagemDeErro(excecao, "Não foi possível excluir o chamado."));
      setAcao(null);
    }
  }

  function abrirEdicao() {
    setRascunho({ title: chamado.title, description: chamado.description });
    setEditando(true);
  }

  async function salvarEdicao(evento) {
    evento.preventDefault();
    const salvou = await aplicar(
      { title: rascunho.title.trim(), description: rascunho.description.trim() },
      "Salvando alterações…"
    );

    if (salvou) setEditando(false);
  }

  if (carregando) {
    return (
      <div className="pagina">
        <a className="voltar" href={ROTAS.chamados}>
          <IconeVoltar /> Chamados
        </a>
        <Carregando rotulo="Abrindo chamado…" />
      </div>
    );
  }

  if (erro || !chamado) {
    return (
      <div className="pagina">
        <a className="voltar" href={ROTAS.chamados}>
          <IconeVoltar /> Chamados
        </a>
        <Alerta>{erro ?? "Chamado não encontrado."}</Alerta>
        <button type="button" className="botao botao--secundario" onClick={() => setVersao((v) => v + 1)}>
          Tentar novamente
        </button>
      </div>
    );
  }

  const sla = situacaoSla(chamado);
  const transicoes = transicoesDisponiveis(usuario, chamado);
  const editavel = podeEditarTexto(usuario, chamado);

  return (
    <div className="pagina">
      <a className="voltar" href={ROTAS.chamados}>
        <IconeVoltar /> Chamados
      </a>

      <header className="detalhe__cabecalho card">
        <div className="detalhe__identidade">
          <p className="detalhe__numero">Chamado #{chamado.id}</p>
          <h1>{chamado.title}</h1>

          <div className="detalhe__selos">
            <BadgeStatus status={chamado.status} />
            <BadgePrioridade prioridade={chamado.priority} />
            <span className={`sla sla--${sla.tom}`}>{sla.rotulo}</span>
            {chamado.categoryName ? (
              <span className="etiqueta-categoria">
                <span
                  className="etiqueta-categoria__cor"
                  style={{ background: chamado.categoryColor ?? "#94a3b8" }}
                  aria-hidden="true"
                />
                {chamado.categoryName}
              </span>
            ) : null}
          </div>
        </div>

        <div className="detalhe__acoes">
          {transicoes.map((transicao) => (
            <button
              key={transicao.status}
              type="button"
              className={`botao ${transicao.status === "resolved" ? "botao--sucesso" : "botao--secundario"}`}
              onClick={() => aplicar({ status: transicao.status }, "Alterando status…")}
              disabled={Boolean(acao)}
            >
              {rotuloAcaoStatus(transicao.status)}
            </button>
          ))}
        </div>
      </header>

      {acao ? (
        <p className="aviso-acao" role="status">
          {acao}
        </p>
      ) : null}

      <Alerta>{erroAcao}</Alerta>

      <div className="detalhe__grade">
        <div className="detalhe__principal">
          <section className="card">
            <div className="card__cabecalho">
              <h2>Descrição</h2>
              {editavel && !editando ? (
                <button type="button" className="botao botao--texto" onClick={abrirEdicao}>
                  Editar
                </button>
              ) : null}
            </div>

            {editando ? (
              <form className="formulario" onSubmit={salvarEdicao}>
                <label className="campo">
                  <span>Título</span>
                  <input
                    type="text"
                    value={rascunho.title}
                    onChange={(evento) => setRascunho((atual) => ({ ...atual, title: evento.target.value }))}
                    minLength={5}
                    maxLength={120}
                    required
                  />
                </label>

                <label className="campo">
                  <span>Descrição</span>
                  <textarea
                    rows={6}
                    value={rascunho.description}
                    onChange={(evento) =>
                      setRascunho((atual) => ({ ...atual, description: evento.target.value }))
                    }
                    minLength={10}
                    maxLength={5000}
                    required
                  />
                </label>

                <div className="formulario__acoes">
                  <button type="button" className="botao botao--secundario" onClick={() => setEditando(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="botao botao--primario" disabled={Boolean(acao)}>
                    Salvar
                  </button>
                </div>
              </form>
            ) : (
              <p className="texto-longo">{chamado.description}</p>
            )}
          </section>

          <section className="card">
            <div className="card__cabecalho">
              <h2>Conversa</h2>
              <span className="texto-fraco">
                {comentarios.length} {comentarios.length === 1 ? "mensagem" : "mensagens"}
              </span>
            </div>

            {comentarios.length === 0 ? (
              <p className="texto-fraco">Nenhuma mensagem ainda. Comece a conversa abaixo.</p>
            ) : (
              <ol className="conversa">
                {comentarios.map((item) => (
                  <li key={item.id} className={item.internal ? "mensagem mensagem--interna" : "mensagem"}>
                    <Avatar nome={item.authorName} />

                    <div className="mensagem__corpo">
                      <div className="mensagem__cabecalho">
                        <strong>{item.authorName ?? "Usuário"}</strong>
                        <BadgePapel papel={item.authorRole} />
                        {item.internal ? <span className="selo selo--interna">Nota interna</span> : null}
                        <time dateTime={item.createdAt} title={formatarDataHora(item.createdAt)}>
                          {tempoRelativo(item.createdAt)}
                        </time>
                      </div>
                      <p>{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <form className="formulario conversa__form" onSubmit={enviarComentario}>
              <label className="campo">
                <span>{equipe ? "Responder ao solicitante" : "Adicionar informação"}</span>
                <textarea
                  rows={4}
                  value={comentario}
                  onChange={(evento) => setComentario(evento.target.value)}
                  placeholder="Escreva uma atualização objetiva sobre o atendimento"
                  maxLength={2000}
                />
              </label>

              <div className="formulario__rodape">
                {equipe ? (
                  <label className="caixa">
                    <input
                      type="checkbox"
                      checked={interno}
                      onChange={(evento) => setInterno(evento.target.checked)}
                    />
                    <span>Nota interna (não aparece para o solicitante)</span>
                  </label>
                ) : (
                  <span />
                )}

                <button
                  type="submit"
                  className="botao botao--primario"
                  disabled={enviandoComentario || comentario.trim().length < 2}
                >
                  {enviandoComentario ? "Enviando…" : "Enviar"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="detalhe__lateral">
          {equipe ? (
            <section className="card">
              <h2>Atendimento</h2>

              <label className="campo">
                <span>Prioridade</span>
                <select
                  value={chamado.priority}
                  onChange={(evento) => aplicar({ priority: evento.target.value }, "Alterando prioridade…")}
                  disabled={Boolean(acao)}
                >
                  {Object.keys(PRIORIDADES).map((chave) => (
                    <option key={chave} value={chave}>
                      {rotuloPrioridade(chave)} · SLA {SLA_HORAS[chave]} h
                    </option>
                  ))}
                </select>
              </label>

              <label className="campo">
                <span>Responsável</span>
                <select
                  value={chamado.assigneeId ?? ""}
                  onChange={(evento) =>
                    aplicar(
                      { assigneeId: evento.target.value ? Number(evento.target.value) : null },
                      "Alterando responsável…"
                    )
                  }
                  disabled={Boolean(acao)}
                >
                  <option value="">Não atribuído</option>
                  {usuarios.map((pessoa) => (
                    <option key={pessoa.id} value={pessoa.id}>
                      {pessoa.name}
                    </option>
                  ))}
                </select>
              </label>

              {!chamado.assigneeId ? (
                <button
                  type="button"
                  className="botao botao--secundario botao--largo"
                  onClick={() => aplicar({ assigneeId: usuario.id }, "Atribuindo a você…")}
                  disabled={Boolean(acao)}
                >
                  Assumir chamado
                </button>
              ) : null}

              <label className="campo">
                <span>Categoria</span>
                <select
                  value={chamado.categoryId ?? ""}
                  onChange={(evento) =>
                    aplicar(
                      { categoryId: evento.target.value ? Number(evento.target.value) : null },
                      "Alterando categoria…"
                    )
                  }
                  disabled={Boolean(acao)}
                >
                  <option value="">Sem categoria</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.name}
                    </option>
                  ))}
                </select>
              </label>
            </section>
          ) : null}

          <section className="card">
            <h2>Detalhes</h2>

            <dl className="detalhes">
              <div>
                <dt>Solicitante</dt>
                <dd>{chamado.requesterName ?? "—"}</dd>
              </div>
              <div>
                <dt>Responsável</dt>
                <dd>{chamado.assigneeName ?? "Não atribuído"}</dd>
              </div>
              <div>
                <dt>Categoria</dt>
                <dd>{chamado.categoryName ?? "Sem categoria"}</dd>
              </div>
              <div>
                <dt>Aberto em</dt>
                <dd>{formatarDataHora(chamado.createdAt)}</dd>
              </div>
              <div>
                <dt>Prazo (SLA)</dt>
                <dd>{formatarDataHora(chamado.dueAt)}</dd>
              </div>
              {chamado.resolvedAt ? (
                <div>
                  <dt>Resolvido em</dt>
                  <dd>{formatarDataHora(chamado.resolvedAt)}</dd>
                </div>
              ) : null}
              <div>
                <dt>Última atualização</dt>
                <dd>{formatarDataHora(chamado.updatedAt)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{rotuloStatus(chamado.status)}</dd>
              </div>
            </dl>
          </section>

          {admin ? (
            <section className="card card--perigo">
              <h2>Zona de risco</h2>
              <p className="texto-fraco">
                Excluir remove o chamado e todo o histórico de mensagens. Não há como desfazer.
              </p>
              <button type="button" className="botao botao--perigo botao--largo" onClick={excluir} disabled={Boolean(acao)}>
                Excluir chamado
              </button>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
