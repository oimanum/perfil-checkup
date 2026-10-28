// Regras de pontuação do perfil. Funções puras: sem rede, sem DOM, fáceis de testar.

export const DIAS_ATIVIDADE = 90;
const MS_DIA = 24 * 60 * 60 * 1000;

const razao = (parte, total) => (total === 0 ? 0 : parte / total);
const limitar = (valor, min = 0, max = 1) => Math.min(max, Math.max(min, valor));
const preenchido = (texto) => typeof texto === "string" && texto.trim().length > 0;

/**
 * Cada critério devolve { id, titulo, max, pontos, detalhe, dica }.
 * A soma dos `max` é 100, então a nota final já é uma porcentagem.
 */
const criterios = [
  {
    id: "readme-perfil",
    titulo: "README de perfil",
    max: 20,
    avaliar: ({ temReadmePerfil, login }) => ({
      fracao: temReadmePerfil ? 1 : 0,
      detalhe: temReadmePerfil ? "Encontrei o repositório de perfil." : "Não encontrei o repositório de perfil.",
      dica: `Crie um repositório público chamado "${login}" com um README.md. Ele aparece no topo do seu perfil.`,
    }),
  },
  {
    id: "descricoes",
    titulo: "Repositórios com descrição",
    max: 14,
    avaliar: ({ proprios }) => {
      const comDescricao = proprios.filter((r) => preenchido(r.description)).length;
      const fracao = razao(comDescricao, proprios.length);
      return {
        fracao: limitar(fracao / 0.8),
        detalhe: `${comDescricao} de ${proprios.length} repositórios têm descrição.`,
        dica: "Escreva uma frase em cada repositório dizendo o que ele faz e com quais tecnologias.",
      };
    },
  },
  {
    id: "atividade",
    titulo: `Atividade nos últimos ${DIAS_ATIVIDADE} dias`,
    max: 14,
    avaliar: ({ proprios, agora }) => {
      const recentes = proprios.filter((r) => {
        const dias = (agora - new Date(r.pushed_at)) / MS_DIA;
        return Number.isFinite(dias) && dias <= DIAS_ATIVIDADE;
      }).length;
      return {
        fracao: limitar(recentes / 3),
        detalhe: `${recentes} repositório(s) com push recente.`,
        dica: "Recrutador olha se o perfil está vivo. Faça commits pequenos e frequentes em pelo menos 3 projetos.",
      };
    },
  },
  {
    id: "topics",
    titulo: "Topics nos repositórios",
    max: 8,
    avaliar: ({ proprios }) => {
      const comTopics = proprios.filter((r) => Array.isArray(r.topics) && r.topics.length > 0).length;
      return {
        fracao: limitar(razao(comTopics, proprios.length) / 0.6),
        detalhe: `${comTopics} de ${proprios.length} repositórios têm topics.`,
        dica: "Adicione topics (java, javascript, docker...) na engrenagem ao lado de 'About'. Eles ajudam nas buscas.",
      };
    },
  },
  {
    id: "demo",
    titulo: "Projetos com demo online",
    max: 8,
    avaliar: ({ proprios }) => {
      const comDemo = proprios.filter((r) => preenchido(r.homepage)).length;
      return {
        fracao: limitar(comDemo / 2),
        detalhe: `${comDemo} repositório(s) com link de demonstração.`,
        dica: "Publique pelo menos 2 projetos no GitHub Pages e coloque o link no campo 'Website' do repositório.",
      };
    },
  },
  {
    id: "quantidade",
    titulo: "Projetos próprios publicados",
    max: 8,
    avaliar: ({ proprios }) => ({
      fracao: limitar(proprios.length / 4),
      detalhe: `${proprios.length} repositório(s) próprio(s) público(s).`,
      dica: "Deixe público pelo menos 4 projetos que você tem orgulho de mostrar.",
    }),
  },
  {
    id: "bio",
    titulo: "Bio preenchida",
    max: 8,
    avaliar: ({ usuario }) => {
      const tamanho = (usuario.bio || "").trim().length;
      return {
        fracao: tamanho >= 20 ? 1 : tamanho > 0 ? 0.5 : 0,
        detalhe: tamanho ? `Bio com ${tamanho} caracteres.` : "Bio vazia.",
        dica: "Use a bio para dizer quem você é e o que procura. Ex.: 'Estudante de Ciência da Computação | Java e JavaScript | Buscando estágio'.",
      };
    },
  },
  {
    id: "contato",
    titulo: "Forma de contato visível",
    max: 8,
    avaliar: ({ usuario, contasSociais }) => {
      const tem = preenchido(usuario.blog) || preenchido(usuario.email) || contasSociais.length > 0;
      return {
        fracao: tem ? 1 : 0,
        detalhe: tem ? "Há site, e-mail ou rede social no perfil." : "Nenhum site, e-mail ou rede social público.",
        dica: "Adicione seu LinkedIn em 'Social accounts', preencha o 'Website' ou deixe um e-mail público.",
      };
    },
  },
  {
    id: "linguagens",
    titulo: "Variedade de linguagens",
    max: 6,
    avaliar: ({ proprios }) => {
      const linguagens = new Set(proprios.map((r) => r.language).filter(Boolean));
      return {
        fracao: limitar(linguagens.size / 3),
        detalhe: linguagens.size ? `Linguagens: ${[...linguagens].join(", ")}.` : "Nenhuma linguagem detectada.",
        dica: "Mostre pelo menos 3 linguagens ou tecnologias diferentes nos seus repositórios.",
      };
    },
  },
  {
    id: "originais",
    titulo: "Código autoral (não só forks)",
    max: 6,
    avaliar: ({ repos, proprios }) => ({
      fracao: limitar(razao(proprios.length, repos.length) / 0.6),
      detalhe: `${proprios.length} de ${repos.length} repositórios não são forks.`,
      dica: "Forks são úteis, mas o que pesa é o que você mesma escreveu. Priorize projetos próprios.",
    }),
  },
];

export const NIVEIS = [
  { minimo: 85, nome: "Pronto para recrutadores" },
  { minimo: 65, nome: "Quase lá" },
  { minimo: 40, nome: "Precisa de ajustes" },
  { minimo: 0, nome: "Começando" },
];

/**
 * @param {{ usuario: object, repos: object[], temReadmePerfil: boolean, contasSociais?: object[] }} dados
 * @param {Date} [agora] injetável para os testes serem determinísticos
 */
export function analisarPerfil({ usuario, repos, temReadmePerfil, contasSociais = [] }, agora = new Date()) {
  if (!usuario || !Array.isArray(repos)) {
    throw new TypeError("analisarPerfil precisa de { usuario, repos, temReadmePerfil }");
  }

  const contexto = {
    usuario,
    repos,
    proprios: repos.filter((r) => !r.fork),
    temReadmePerfil: Boolean(temReadmePerfil),
    contasSociais: Array.isArray(contasSociais) ? contasSociais : [],
    login: usuario.login,
    agora,
  };

  const resultados = criterios.map((c) => {
    const { fracao, detalhe, dica } = c.avaliar(contexto);
    const pontos = Math.round(limitar(fracao) * c.max);
    return { id: c.id, titulo: c.titulo, max: c.max, pontos, detalhe, dica, completo: pontos === c.max };
  });

  const nota = resultados.reduce((soma, r) => soma + r.pontos, 0);
  const nivel = NIVEIS.find((n) => nota >= n.minimo).nome;

  // O que mais vale a pena corrigir primeiro: maior diferença entre máximo e obtido.
  const proximosPassos = resultados
    .filter((r) => !r.completo)
    .sort((a, b) => b.max - b.pontos - (a.max - a.pontos))
    .map((r) => ({ id: r.id, titulo: r.titulo, ganho: r.max - r.pontos, dica: r.dica }));

  return { nota, nivel, criterios: resultados, proximosPassos };
}
