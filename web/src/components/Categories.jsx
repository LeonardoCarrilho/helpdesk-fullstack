import { useEffect, useState } from "react";
import { mensagemDeErro } from "../lib/erros.js";
import { IconeLixeira } from "./Icones.jsx";
import { Alerta, Carregando, PaginaCabecalho } from "./ui.jsx";

const NOVA = { name: "", color: "#6366f1" };

export default function Categories({ api }) {
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState(NOVA);
  const [edicao, setEdicao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);

    api
      .listarCategorias()
      .then((lista) => {
        if (!ativo) return;
        setCategorias(lista);
        setErro(null);
      })
      .catch((excecao) => {
        if (ativo) setErro(mensagemDeErro(excecao, "Não foi possível carregar as categorias."));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [api, versao]);

  async function criar(evento) {
    evento.preventDefault();
    setErroAcao(null);
    setOcupado(true);

    try {
      await api.criarCategoria({ name: form.name.trim(), color: form.color });
      setForm(NOVA);
      setVersao((valor) => valor + 1);
    } catch (excecao) {
      setErroAcao(mensagemDeErro(excecao, "Não foi possível criar a categoria."));
    } finally {
      setOcupado(false);
    }
  }

  async function salvarEdicao(evento) {
    evento.preventDefault();
    if (!edicao) return;

    setErroAcao(null);
    setOcupado(true);

    try {
      await api.atualizarCategoria(edicao.id, {
        name: edicao.name.trim(),
        color: edicao.color,
      });
      setEdicao(null);
      setVersao((valor) => valor + 1);
    } catch (excecao) {
      setErroAcao(mensagemDeErro(excecao, "Não foi possível salvar a categoria."));
    } finally {
      setOcupado(false);
    }
  }

  async function remover(categoria) {
    const confirmado = window.confirm(
      `Excluir a categoria “${categoria.name}”? Os chamados ficam sem categoria.`
    );

    if (!confirmado) return;

    setErroAcao(null);
    setOcupado(true);

    try {
      await api.removerCategoria(categoria.id);
      setVersao((valor) => valor + 1);
    } catch (excecao) {
      setErroAcao(mensagemDeErro(excecao, "Não foi possível excluir a categoria."));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="pagina">
      <PaginaCabecalho
        titulo="Categorias"
        descricao="Agrupam chamados por assunto e alimentam os filtros da fila."
      />

      <Alerta>{erro}</Alerta>
      <Alerta>{erroAcao}</Alerta>

      <div className="categorias">
        <form className="card formulario" onSubmit={criar}>
          <h2>Nova categoria</h2>

          <label className="campo">
            <span>Nome</span>
            <input
              type="text"
              value={form.name}
              onChange={(evento) => setForm((atual) => ({ ...atual, name: evento.target.value }))}
              placeholder="Ex.: Telefonia"
              minLength={2}
              maxLength={40}
              required
            />
          </label>

          <label className="campo campo--cor">
            <span>Cor</span>
            <input
              type="color"
              value={form.color}
              onChange={(evento) => setForm((atual) => ({ ...atual, color: evento.target.value }))}
              aria-label="Cor da categoria"
            />
            <code>{form.color}</code>
          </label>

          <button type="submit" className="botao botao--primario" disabled={ocupado || form.name.trim().length < 2}>
            Criar categoria
          </button>
        </form>

        <section className="card">
          <div className="card__cabecalho">
            <h2>Cadastradas</h2>
            <span className="texto-fraco">{categorias.length}</span>
          </div>

          {carregando ? (
            <Carregando rotulo="Carregando categorias…" />
          ) : categorias.length === 0 ? (
            <p className="texto-fraco">Nenhuma categoria cadastrada. Crie a primeira ao lado.</p>
          ) : (
            <ul className="lista-categorias">
              {categorias.map((categoria) => (
                <li key={categoria.id}>
                  {edicao?.id === categoria.id ? (
                    <form className="categoria-edicao" onSubmit={salvarEdicao}>
                      <input
                        type="text"
                        value={edicao.name}
                        onChange={(evento) => setEdicao((atual) => ({ ...atual, name: evento.target.value }))}
                        minLength={2}
                        maxLength={40}
                        aria-label="Novo nome da categoria"
                        required
                      />
                      <input
                        type="color"
                        value={edicao.color}
                        onChange={(evento) => setEdicao((atual) => ({ ...atual, color: evento.target.value }))}
                        aria-label="Nova cor da categoria"
                      />
                      <button type="submit" className="botao botao--primario botao--pequeno" disabled={ocupado}>
                        Salvar
                      </button>
                      <button
                        type="button"
                        className="botao botao--texto"
                        onClick={() => setEdicao(null)}
                        disabled={ocupado}
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="categoria">
                        <span
                          className="categoria__cor"
                          style={{ background: categoria.color }}
                          aria-hidden="true"
                        />
                        <strong>{categoria.name}</strong>
                        <code>{categoria.color}</code>
                      </span>

                      <span className="categoria__acoes">
                        <button
                          type="button"
                          className="botao botao--texto"
                          onClick={() =>
                            setEdicao({ id: categoria.id, name: categoria.name, color: categoria.color })
                          }
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="botao botao--icone botao--perigo-texto"
                          onClick={() => remover(categoria)}
                          disabled={ocupado}
                          title={`Excluir ${categoria.name}`}
                        >
                          <IconeLixeira />
                          <span className="apenas-leitor">Excluir {categoria.name}</span>
                        </button>
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
