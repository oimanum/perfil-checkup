import { buscarDadosGitHub, ErroGitHub } from "./github.js";
import { analisarPerfil } from "./analyzer.js";

const $ = (id) => document.getElementById(id);
const form = $("form");
const campo = $("login");
const botao = $("enviar");
const status = $("status");
const resultado = $("resultado");

function corDaNota(nota) {
  if (nota >= 65) return "var(--ok)";
  if (nota >= 40) return "var(--meio)";
  return "var(--ruim)";
}

function criar(tag, texto, classe) {
  const el = document.createElement(tag);
  if (texto !== undefined) el.textContent = texto; // textContent: dados da API nunca viram HTML
  if (classe) el.className = classe;
  return el;
}

function mostrar(dados, analise) {
  const nota = $("nota");
  nota.textContent = analise.nota;
  nota.style.setProperty("--pct", analise.nota);
  nota.style.setProperty("--cor", corDaNota(analise.nota));

  $("nivel").textContent = analise.nivel;
  $("quem").textContent = `@${dados.usuario.login} · ${dados.repos.length} repositório(s) público(s) analisado(s)`;

  const passos = $("passos");
  passos.replaceChildren();
  if (analise.proximosPassos.length === 0) {
    passos.append(criar("li", "Nada pendente. Seu perfil está redondo."));
  }
  for (const p of analise.proximosPassos.slice(0, 4)) {
    const li = criar("li");
    const titulo = criar("strong", p.titulo + " ");
    titulo.append(criar("small", `+${p.ganho} pts`));
    li.append(titulo, criar("p", p.dica));
    passos.append(li);
  }

  const lista = $("criterios");
  lista.replaceChildren();
  for (const c of analise.criterios) {
    const classe = c.completo ? "completo" : c.pontos === 0 ? "zerado" : "parcial";
    const li = criar("li", undefined, classe);
    li.append(criar("span", c.titulo), criar("span", `${c.pontos}/${c.max}`, "pontos"), criar("span", c.detalhe, "detalhe"));
    lista.append(li);
  }

  resultado.hidden = false;
}

async function analisar(login) {
  botao.disabled = true;
  status.className = "";
  status.textContent = "Buscando dados no GitHub...";
  resultado.hidden = true;

  try {
    const dados = await buscarDadosGitHub(login);
    mostrar(dados, analisarPerfil(dados));
    status.textContent = "";
    history.replaceState(null, "", `?u=${encodeURIComponent(dados.usuario.login)}`);
  } catch (erro) {
    status.className = "erro";
    status.textContent = erro instanceof ErroGitHub ? erro.message : "Algo deu errado. Tente novamente.";
  } finally {
    botao.disabled = false;
  }
}

form.addEventListener("submit", (evento) => {
  evento.preventDefault();
  analisar(campo.value);
});

// Link compartilhável: ?u=usuario
const inicial = new URLSearchParams(location.search).get("u");
if (inicial) {
  campo.value = inicial;
  analisar(inicial);
}
