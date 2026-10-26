import { useEffect, useState } from "react";
import { mensagemDeErro } from "../lib/erros.js";
import { PRIORIDADES, SLA_HORAS, rotuloPrioridade } from "../lib/labels.js";
import { ROTAS, rotaChamado } from "../lib/rotas.js";
import { IconeVoltar } from "./Icones.jsx";
import { Alerta, PaginaCabecalho } from "./ui.jsx";

const INICIAL = {
  title: "",
  description: "",
  priority: "medium",
  categoryId: "",
};

export default function NewTicket({ api, navegar }) {
  const [campos, setCampos] = useState(INICIAL);
  const [categorias, setCategorias] = useState([]);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

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

  function alterar(campo, valor) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    const titulo = campos.title.trim();
    const descricao = campos.description.trim();

    if (titulo.length < 5) {
      setErro("O título precisa ter pelo menos 5 caracteres.");
      return;
    }

    if (descricao.length < 10) {
      setErro("Descreva o problema com pelo menos 10 caracteres.");
      return;
    }

    setErro(null);
    setEnviando(true);

    try {
      const chamado = await api.criarChamado({
        title: titulo,
        description: descricao,
        priority: campos.priority,
        categoryId: campos.categoryId ? Number(campos.categoryId) : null,
      });

      navegar(rotaChamado(chamado.id));
    } catch (excecao) {
      setErro(mensagemDeErro(excecao, "Não foi possível abrir o chamado."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina pagina--estreita">
      <a className="voltar" href={ROTAS.chamados}>
        <IconeVoltar /> Chamados
      </a>

      <PaginaCabecalho
        titulo="Novo chamado"
        descricao="Quanto mais objetivo o relato, mais rápido o atendimento. O prazo (SLA) é definido pela prioridade."
      />

      <form className="card formulario" onSubmit={enviar}>
        <label className="campo">
          <span>Título</span>
          <input
            type="text"
            value={campos.title}
            onChange={(evento) => alterar("title", evento.target.value)}
            placeholder="Ex.: Erro ao gerar relatório no ERP"
            minLength={5}
            maxLength={120}
            required
          />
          <small className="campo__ajuda">Resuma o problema em uma frase.</small>
        </label>

        <label className="campo">
          <span>Descrição</span>
          <textarea
            rows={7}
            value={campos.description}
            onChange={(evento) => alterar("description", evento.target.value)}
            placeholder="O que aconteceu, desde quando, em qual sistema e o que você já tentou."
            minLength={10}
            maxLength={5000}
            required
          />
          <small className="campo__ajuda">
            {campos.description.trim().length}/5000 caracteres
          </small>
        </label>

        <fieldset className="campo">
          <legend>Prioridade</legend>

          <div className="prioridades">
            {Object.keys(PRIORIDADES).map((chave) => (
              <label
                key={chave}
                className={campos.priority === chave ? "prioridade prioridade--ativa" : "prioridade"}
              >
                <input
                  type="radio"
                  name="priority"
                  value={chave}
                  checked={campos.priority === chave}
                  onChange={() => alterar("priority", chave)}
                />
                <strong>{rotuloPrioridade(chave)}</strong>
                <span>SLA de {SLA_HORAS[chave]} h</span>
              </label>
            ))}
          </div>

          <small className="campo__ajuda">
            Use “Crítica” apenas quando o serviço estiver indisponível para várias pessoas.
          </small>
        </fieldset>

        <label className="campo">
          <span>Categoria</span>
          <select value={campos.categoryId} onChange={(evento) => alterar("categoryId", evento.target.value)}>
            <option value="">Sem categoria</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.name}
              </option>
            ))}
          </select>
        </label>

        <Alerta>{erro}</Alerta>

        <div className="formulario__acoes">
          <a className="botao botao--secundario" href={ROTAS.chamados}>
            Cancelar
          </a>
          <button type="submit" className="botao botao--primario" disabled={enviando}>
            {enviando ? "Abrindo…" : "Abrir chamado"}
          </button>
        </div>
      </form>
    </div>
  );
}
