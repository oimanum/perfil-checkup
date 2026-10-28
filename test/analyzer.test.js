import { test } from "node:test";
import assert from "node:assert/strict";
import { analisarPerfil } from "../src/analyzer.js";

const AGORA = new Date("2026-10-28T12:00:00Z");
const diasAtras = (n) => new Date(AGORA - n * 24 * 60 * 60 * 1000).toISOString();

const repoBom = (i, extra = {}) => ({
  name: `projeto-${i}`,
  fork: false,
  description: "Um projeto com descrição clara",
  topics: ["javascript"],
  homepage: "https://exemplo.dev",
  language: ["JavaScript", "Java", "Python", "CSS"][i % 4],
  pushed_at: diasAtras(5),
  ...extra,
});

test("perfil completo chega a 100 e não sugere nada", () => {
  const resultado = analisarPerfil(
    {
      usuario: { login: "ana", bio: "Estudante de Computação buscando estágio", blog: "https://linkedin.com/in/ana" },
      repos: [0, 1, 2, 3, 4].map((i) => repoBom(i)),
      temReadmePerfil: true,
    },
    AGORA,
  );
  assert.equal(resultado.nota, 100);
  assert.equal(resultado.nivel, "Pronto para recrutadores");
  assert.deepEqual(resultado.proximosPassos, []);
});

test("perfil vazio fica em 0 e prioriza o README de perfil", () => {
  const resultado = analisarPerfil({ usuario: { login: "zero" }, repos: [], temReadmePerfil: false }, AGORA);
  assert.equal(resultado.nota, 0);
  assert.equal(resultado.nivel, "Começando");
  assert.equal(resultado.proximosPassos[0].id, "readme-perfil");
  assert.match(resultado.proximosPassos[0].dica, /"zero"/);
});

test("a soma dos máximos dos critérios é 100", () => {
  const { criterios } = analisarPerfil({ usuario: { login: "x" }, repos: [], temReadmePerfil: false }, AGORA);
  assert.equal(criterios.reduce((soma, c) => soma + c.max, 0), 100);
});

test("forks não contam como projeto próprio", () => {
  const resultado = analisarPerfil(
    {
      usuario: { login: "bia", bio: "x".repeat(25), blog: "https://bia.dev" },
      repos: [repoBom(0, { fork: true }), repoBom(1, { fork: true }), repoBom(2, { fork: true })],
      temReadmePerfil: true,
    },
    AGORA,
  );
  const por = Object.fromEntries(resultado.criterios.map((c) => [c.id, c]));
  assert.equal(por.quantidade.pontos, 0);
  assert.equal(por.originais.pontos, 0);
  assert.equal(por.atividade.pontos, 0);
});

test("atividade antiga não pontua; recente pontua proporcionalmente", () => {
  const antigos = [0, 1, 2].map((i) => repoBom(i, { pushed_at: diasAtras(200) }));
  const umRecente = [repoBom(0), repoBom(1, { pushed_at: diasAtras(200) }), repoBom(2, { pushed_at: diasAtras(300) })];
  const base = { usuario: { login: "c" }, temReadmePerfil: false };

  const a = analisarPerfil({ ...base, repos: antigos }, AGORA).criterios.find((c) => c.id === "atividade");
  const b = analisarPerfil({ ...base, repos: umRecente }, AGORA).criterios.find((c) => c.id === "atividade");
  assert.equal(a.pontos, 0);
  assert.equal(b.pontos, 5); // 1/3 de 14, arredondado
});

test("bio curta vale metade e contato aceita e-mail", () => {
  const resultado = analisarPerfil(
    { usuario: { login: "d", bio: "dev", email: "d@exemplo.com" }, repos: [], temReadmePerfil: false },
    AGORA,
  );
  const por = Object.fromEntries(resultado.criterios.map((c) => [c.id, c]));
  assert.equal(por.bio.pontos, 4);
  assert.equal(por.contato.pontos, 8);
});

test("próximos passos vêm ordenados pelo maior ganho possível", () => {
  const resultado = analisarPerfil({ usuario: { login: "e" }, repos: [], temReadmePerfil: false }, AGORA);
  const ganhos = resultado.proximosPassos.map((p) => p.ganho);
  assert.deepEqual(ganhos, [...ganhos].sort((x, y) => y - x));
});

test("dados inválidos geram erro claro", () => {
  assert.throws(() => analisarPerfil({ usuario: null, repos: [] }), TypeError);
  assert.throws(() => analisarPerfil({ usuario: {}, repos: "não é lista" }), TypeError);
});
