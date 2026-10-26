import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const N = 16384;
const R = 8;
const P = 1;
const TAMANHO_CHAVE = 64;

/** Hash no formato `scrypt$N$r$p$sal$hash`, com sal aleatório por senha. */
export async function gerarHashSenha(senha) {
  if (typeof senha !== "string" || senha.length < 8) {
    throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  }

  const sal = randomBytes(16);
  const derivada = await scrypt(senha, sal, TAMANHO_CHAVE, { N, r: R, p: P });

  return `scrypt$${N}$${R}$${P}$${sal.toString("hex")}$${derivada.toString("hex")}`;
}

/** Compara em tempo constante e nunca lança para hash corrompido. */
export async function conferirSenha(senha, hash) {
  try {
    const [algoritmo, n, r, p, salHex, hashHex] = String(hash).split("$");

    if (algoritmo !== "scrypt" || !salHex || !hashHex) return false;

    const sal = Buffer.from(salHex, "hex");
    const esperado = Buffer.from(hashHex, "hex");
    const derivada = await scrypt(senha, sal, esperado.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });

    return derivada.length === esperado.length && timingSafeEqual(derivada, esperado);
  } catch {
    return false;
  }
}

/** Hash descartável para igualar o tempo de resposta quando o e-mail não existe. */
export async function hashFicticio() {
  return scrypt("senha-ficticia-para-tempo", randomBytes(16), TAMANHO_CHAVE, { N, r: R, p: P });
}
