import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarDadosGitHub, validarLogin, ErroGitHub } from "../src/github.js";

const resposta = (status, corpo = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => corpo });

// Cria um fetch falso que responde conforme o final da URL.
const fetchFalso = (rotas) => async (url) => {
  const rota = Object.keys(rotas).find((sufixo) => url.includes(sufixo));
  if (!rota) throw new Error(`URL inesperada no teste: ${url}`);
  const r = rotas[rota];
  if (r instanceof Error) throw r;
  return r;
};

test("validarLogin aceita @ e espaços, e rejeita nomes inválidos", () => {
  assert.equal(validarLogin("  @oimanum "), "oimanum");
  assert.throws(() => validarLogin(""), ErroGitHub);
  assert.throws(() => validarLogin("com espaço"), ErroGitHub);
  assert.throws(() => validarLogin("../etc/passwd"), ErroGitHub);
  assert.throws(() => validarLogin("a".repeat(40)), ErroGitHub);
});

test("junta usuário, repositórios e README de perfil", async () => {
  const fetchFn = fetchFalso({
    "/readme": resposta(200),
    "/repos?": resposta(200, [{ name: "a" }]),
    "/users/ana": resposta(200, { login: "ana" }),
  });
  const dados = await buscarDadosGitHub("ana", fetchFn);
  assert.equal(dados.usuario.login, "ana");
  assert.equal(dados.repos.length, 1);
  assert.equal(dados.temReadmePerfil, true);
});

test("sem README de perfil (404) não é erro", async () => {
  const fetchFn = fetchFalso({
    "/readme": resposta(404),
    "/repos?": resposta(200, []),
    "/users/ana": resposta(200, { login: "ana" }),
  });
  assert.equal((await buscarDadosGitHub("ana", fetchFn)).temReadmePerfil, false);
});

test("usuário inexistente vira erro amigável", async () => {
  const fetchFn = fetchFalso({ "/readme": resposta(404), "/repos?": resposta(404), "/users/fantasma": resposta(404) });
  await assert.rejects(buscarDadosGitHub("fantasma", fetchFn), { codigo: "nao-encontrado" });
});

test("limite da API (403) é identificado", async () => {
  const fetchFn = fetchFalso({ "/readme": resposta(403), "/repos?": resposta(403), "/users/ana": resposta(403) });
  await assert.rejects(buscarDadosGitHub("ana", fetchFn), { codigo: "limite" });
});

test("falha de rede vira erro amigável", async () => {
  const fetchFn = fetchFalso({ "/readme": new Error("offline"), "/repos?": new Error("offline"), "/users/ana": new Error("offline") });
  await assert.rejects(buscarDadosGitHub("ana", fetchFn), { codigo: "rede" });
});

test("erro 500 no README não é confundido com 'sem README'", async () => {
  const fetchFn = fetchFalso({
    "/readme": resposta(500),
    "/repos?": resposta(200, []),
    "/users/ana": resposta(200, { login: "ana" }),
  });
  await assert.rejects(buscarDadosGitHub("ana", fetchFn), { codigo: "http" });
});
