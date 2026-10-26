import { useEffect, useState } from "react";
import { mensagemDeErro } from "../lib/erros.js";
import { ehAdmin, rotuloPapel } from "../lib/labels.js";
import { BadgePapel } from "./Badge.jsx";
import { Alerta, Avatar, Carregando, PaginaCabecalho } from "./ui.jsx";

const PAPEIS_EDITAVEIS = ["admin", "agent", "requester"];

export function TabelaEquipe({ usuarios, admin, salvandoId, aoMudarPapel }) {
  return (
    <div className="tabela-wrap">
      <table className="tabela tabela--equipe">
        <caption className="apenas-leitor">
          Pessoas da central com papel e e-mail. Administradores podem alterar o papel.
        </caption>
        <thead>
          <tr>
            <th scope="col">Pessoa</th>
            {admin ? <th scope="col">E-mail</th> : null}
            <th scope="col">Papel</th>
            {admin ? <th scope="col">Alterar papel</th> : null}
          </tr>
        </thead>
        <tbody>
          {usuarios.map((pessoa) => (
            <tr key={pessoa.id}>
              <td data-rotulo="Pessoa">
                <span className="pessoa">
                  <Avatar nome={pessoa.name} />
                  <span>
                    <strong>{pessoa.name}</strong>
                    <small className="texto-fraco">#{pessoa.id}</small>
                  </span>
                </span>
              </td>

              {admin ? <td data-rotulo="E-mail">{pessoa.email ?? "—"}</td> : null}

              <td data-rotulo="Papel">
                <BadgePapel papel={pessoa.role} />
              </td>

              {admin ? (
                <td data-rotulo="Alterar papel">
                  <select
                    className="select--compacto"
                    value={pessoa.role}
                    onChange={(evento) => aoMudarPapel(pessoa, evento.target.value)}
                    disabled={salvandoId === pessoa.id}
                    aria-label={`Papel de ${pessoa.name}`}
                  >
                    {PAPEIS_EDITAVEIS.map((papel) => (
                      <option key={papel} value={papel}>
                        {rotuloPapel(papel)}
                      </option>
                    ))}
                  </select>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Users({ api, usuario }) {
  const admin = ehAdmin(usuario);
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [erroAcao, setErroAcao] = useState(null);
  const [salvandoId, setSalvandoId] = useState(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);

    api
      .listarUsuarios()
      .then((lista) => {
        if (!ativo) return;
        setUsuarios(lista);
        setErro(null);
      })
      .catch((excecao) => {
        if (ativo) setErro(mensagemDeErro(excecao, "Não foi possível carregar a equipe."));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [api, versao]);

  async function mudarPapel(pessoa, papel) {
    if (papel === pessoa.role) return;

    setSalvandoId(pessoa.id);
    setErroAcao(null);

    try {
      await api.atualizarPapel(pessoa.id, papel);
      setVersao((valor) => valor + 1);
    } catch (excecao) {
      setErroAcao(mensagemDeErro(excecao, "Não foi possível alterar o papel."));
    } finally {
      setSalvandoId(null);
    }
  }

  const contagem = PAPEIS_EDITAVEIS.reduce((acumulado, papel) => {
    acumulado[papel] = usuarios.filter((pessoa) => pessoa.role === papel).length;
    return acumulado;
  }, {});

  return (
    <div className="pagina">
      <PaginaCabecalho
        titulo={admin ? "Equipe e permissões" : "Equipe"}
        descricao={
          admin
            ? "Promova ou rebaixe contas. O sistema nunca permite ficar sem administrador."
            : "Agentes e administradores disponíveis para atendimento."
        }
      />

      <Alerta>{erro}</Alerta>
      <Alerta>{erroAcao}</Alerta>

      {!carregando && usuarios.length > 0 ? (
        <ul className="resumo-papeis" aria-label="Distribuição por papel">
          {PAPEIS_EDITAVEIS.map((papel) => (
            <li key={papel}>
              <BadgePapel papel={papel} />
              <strong>{contagem[papel] ?? 0}</strong>
            </li>
          ))}
        </ul>
      ) : null}

      {carregando ? (
        <Carregando rotulo="Carregando equipe…" />
      ) : (
        <section className="card card--tabela">
          <TabelaEquipe
            usuarios={usuarios}
            admin={admin}
            salvandoId={salvandoId}
            aoMudarPapel={mudarPapel}
          />
        </section>
      )}

      <p className="texto-fraco nota-rodape">
        {admin
          ? "Novas contas criadas pela tela de entrada sempre nascem como solicitante — a promoção é feita aqui."
          : "Somente administradores podem alterar papéis."}
      </p>
    </div>
  );
}
