import { AppError, conflito } from "../utils/errors.js";
import { criarToken } from "../utils/jwt.js";
import { conferirSenha, gerarHashSenha, hashFicticio } from "../utils/password.js";

export function criarAuthService({ repos }) {
  return {
    /** Cadastro público sempre cria solicitante; papéis são promovidos por um admin. */
    async registrar({ name, email, password }) {
      const existente = await repos.users.findByEmailComSenha(email);

      if (existente) {
        throw conflito("Já existe uma conta com este e-mail.");
      }

      const passwordHash = await gerarHashSenha(password);
      const usuario = await repos.users.criar({ name, email, passwordHash, role: "requester" });

      return { usuario, token: criarToken(usuario) };
    },

    async login({ email, password }) {
      const conta = await repos.users.findByEmailComSenha(email);

      if (!conta) {
        // Gasta o mesmo tempo de um hash real para não revelar e-mails cadastrados.
        await hashFicticio();
        throw new AppError("E-mail ou senha incorretos.", 401);
      }

      const confere = await conferirSenha(password, conta.passwordHash);

      if (!confere) {
        throw new AppError("E-mail ou senha incorretos.", 401);
      }

      const { passwordHash, ...usuario } = conta;
      return { usuario, token: criarToken(usuario) };
    },
  };
}
