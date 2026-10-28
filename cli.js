#!/usr/bin/env node
// Uso: node cli.js <usuario-github>
import { buscarDadosGitHub, ErroGitHub } from "./src/github.js";
import { analisarPerfil } from "./src/analyzer.js";

const login = process.argv[2];
if (!login) {
  console.error("Uso: node cli.js <usuario-github>");
  process.exit(1);
}

try {
  const dados = await buscarDadosGitHub(login);
  const analise = analisarPerfil(dados);

  console.log(`\nPerfil de @${dados.usuario.login}: ${analise.nota}/100 (${analise.nivel})\n`);
  for (const c of analise.criterios) {
    const marca = c.completo ? "✔" : "✘";
    console.log(`${marca} ${c.titulo.padEnd(38)} ${String(c.pontos).padStart(2)}/${c.max}  ${c.detalhe}`);
  }

  if (analise.proximosPassos.length) {
    console.log("\nO que fazer primeiro:");
    analise.proximosPassos.slice(0, 3).forEach((p, i) => console.log(`${i + 1}. (+${p.ganho}) ${p.titulo}: ${p.dica}`));
  }
  console.log();
} catch (erro) {
  console.error(erro instanceof ErroGitHub ? `Erro: ${erro.message}` : erro);
  process.exit(1);
}
