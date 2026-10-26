import { useState } from "react";
import { CONTAS_DEMO } from "../api/demo.js";
import { mensagemDeErro } from "../lib/erros.js";
import { BadgePapel } from "./Badge.jsx";
import { Marca } from "./Marca.jsx";
import { Alerta } from "./ui.jsx";

const VAZIO = { name: "", email: "", password: "" };

function validar(modo, campos) {
  if (modo === "criar" && campos.name.trim().length < 2) {
    return "Informe seu nome completo.";
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(campos.email.trim())) {
    return "Informe um e-mail válido.";
  }
  if (modo === "criar" && campos.password.length < 8) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }
  if (!campos.password) {
    return "Informe a senha.";
  }
  return null;
}

export default function Login({ api, aoEntrar, demo }) {
  const [modo, setModo] = useState("entrar");
  const [campos, setCampos] = useState(VAZIO);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  function alterar(campo, valor) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  function trocarModo(novo) {
    setModo(novo);
    setErro(null);
  }

  async function autenticar(credenciais) {
    const dados = credenciais ?? campos;
    const problema = validar(modo, dados);

    if (problema) {
      setErro(problema);
      return;
    }

    setErro(null);
    setEnviando(true);

    try {
      const resultado =
        modo === "entrar"
          ? await api.login({ email: dados.email.trim(), password: dados.password })
          : await api.registrar({
              name: dados.name.trim(),
              email: dados.email.trim(),
              password: dados.password,
            });

      aoEntrar(resultado.usuario);
    } catch (excecao) {
      setErro(mensagemDeErro(excecao, "Não foi possível entrar."));
    } finally {
      setEnviando(false);
    }
  }

  function entrarComo(conta) {
    const credenciais = { name: conta.nome, email: conta.email, password: conta.senha };
    setCampos(credenciais);
    setModo("entrar");
    autenticar(credenciais);
  }

  return (
    <div className="login">
      <aside className="login__marca">
        <Marca href="#/chamados" />

        <div className="login__pitch">
          <p className="login__selo">Central de atendimento</p>
          <h1>Chamado, prazo e histórico no mesmo lugar.</h1>
          <p>
            Abertura com SLA automático, fila por prioridade, comentários internos e
            indicadores de atendimento — com permissões diferentes para solicitante,
            agente e administrador.
          </p>

          <ul className="login__lista">
            <li>
              <strong>SLA por prioridade</strong>
              <span>Crítico vence em 4 h; baixa, em 72 h.</span>
            </li>
            <li>
              <strong>Visibilidade controlada</strong>
              <span>Solicitante vê só os próprios chamados.</span>
            </li>
            <li>
              <strong>Notas internas</strong>
              <span>Conversa da equipe separada da conversa com o cliente.</span>
            </li>
          </ul>
        </div>

        <p className="login__rodape">React · Node/Express · MySQL · JWT</p>
      </aside>

      <main className="login__painel">
        <div className="login__cartao">
          <h2>{modo === "entrar" ? "Entrar na central" : "Criar conta"}</h2>
          <p className="login__sub">
            {modo === "entrar"
              ? "Use sua conta para abrir e acompanhar chamados."
              : "Novas contas entram como solicitante; a promoção é feita por um administrador."}
          </p>

          <div className="abas" role="tablist" aria-label="Entrar ou criar conta">
            <button
              type="button"
              role="tab"
              aria-selected={modo === "entrar"}
              className={modo === "entrar" ? "aba aba--ativa" : "aba"}
              onClick={() => trocarModo("entrar")}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modo === "criar"}
              className={modo === "criar" ? "aba aba--ativa" : "aba"}
              onClick={() => trocarModo("criar")}
            >
              Criar conta
            </button>
          </div>

          <form
            className="formulario"
            onSubmit={(evento) => {
              evento.preventDefault();
              autenticar();
            }}
            noValidate
          >
            {modo === "criar" ? (
              <label className="campo">
                <span>Nome</span>
                <input
                  type="text"
                  name="name"
                  value={campos.name}
                  onChange={(evento) => alterar("name", evento.target.value)}
                  autoComplete="name"
                  placeholder="Como devemos chamar você"
                  required
                />
              </label>
            ) : null}

            <label className="campo">
              <span>E-mail</span>
              <input
                type="email"
                name="email"
                value={campos.email}
                onChange={(evento) => alterar("email", evento.target.value)}
                autoComplete="email"
                placeholder="voce@empresa.com"
                required
              />
            </label>

            <label className="campo">
              <span>Senha</span>
              <input
                type="password"
                name="password"
                value={campos.password}
                onChange={(evento) => alterar("password", evento.target.value)}
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                placeholder={modo === "entrar" ? "Sua senha" : "Pelo menos 8 caracteres"}
                required
              />
            </label>

            <Alerta>{erro}</Alerta>

            <button className="botao botao--primario botao--largo" type="submit" disabled={enviando}>
              {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          {demo ? (
            <section className="login__demo" aria-labelledby="titulo-contas-demo">
              <h3 id="titulo-contas-demo">Contas de demonstração</h3>
              <p>
                Este build roda sem servidor. Clique em uma conta para entrar e testar
                as permissões de cada perfil.
              </p>

              <ul>
                {CONTAS_DEMO.map((conta) => (
                  <li key={conta.email}>
                    <button type="button" onClick={() => entrarComo(conta)} disabled={enviando}>
                      <span className="login__demo-nome">
                        {conta.nome}
                        <BadgePapel papel={conta.role} />
                      </span>
                      <span className="login__demo-email">{conta.email}</span>
                      <span className="login__demo-desc">{conta.descricao}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <p className="login__demo-nota">
                As alterações ficam no seu navegador e são descartadas ao fechar a aba.
              </p>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
