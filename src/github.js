// Acesso à API pública do GitHub. Recebe `fetchFn` para poder ser testado sem rede.

const API = "https://api.github.com";
const LOGIN_VALIDO = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

export class ErroGitHub extends Error {
  constructor(mensagem, codigo) {
    super(mensagem);
    this.name = "ErroGitHub";
    this.codigo = codigo;
  }
}

export function validarLogin(login) {
  const limpo = String(login ?? "").trim().replace(/^@/, "");
  if (!LOGIN_VALIDO.test(limpo)) {
    throw new ErroGitHub("Digite um usuário válido do GitHub (letras, números e hífen).", "login-invalido");
  }
  return limpo;
}

async function pedir(url, fetchFn) {
  let resposta;
  try {
    resposta = await fetchFn(url, { headers: { Accept: "application/vnd.github+json" } });
  } catch {
    throw new ErroGitHub("Não consegui falar com o GitHub. Verifique sua conexão.", "rede");
  }
  return resposta;
}

function erroDeResposta(resposta) {
  if (resposta.status === 404) return new ErroGitHub("Usuário não encontrado.", "nao-encontrado");
  if (resposta.status === 403 || resposta.status === 429) {
    return new ErroGitHub("Limite de requisições da API do GitHub atingido. Tente de novo em alguns minutos.", "limite");
  }
  return new ErroGitHub(`O GitHub respondeu com erro ${resposta.status}.`, "http");
}

export async function buscarDadosGitHub(entrada, fetchFn = globalThis.fetch) {
  const login = validarLogin(entrada);
  const base = encodeURIComponent(login);

  const [resUsuario, resRepos, resReadme, resSociais] = await Promise.all([
    pedir(`${API}/users/${base}`, fetchFn),
    pedir(`${API}/users/${base}/repos?per_page=100&sort=pushed`, fetchFn),
    pedir(`${API}/repos/${base}/${base}/readme`, fetchFn),
    pedir(`${API}/users/${base}/social_accounts`, fetchFn),
  ]);

  if (!resUsuario.ok) throw erroDeResposta(resUsuario);
  if (!resRepos.ok) throw erroDeResposta(resRepos);
  // 404 aqui só significa "não tem README de perfil"; outros erros não devem virar falso negativo.
  if (!resReadme.ok && resReadme.status !== 404) throw erroDeResposta(resReadme);

  // Redes sociais (ex.: LinkedIn) ficam num endpoint à parte. Se falhar, só deixamos de contá-las.
  let contasSociais = [];
  if (resSociais.ok) {
    const lista = await resSociais.json();
    if (Array.isArray(lista)) contasSociais = lista;
  }

  return {
    usuario: await resUsuario.json(),
    repos: await resRepos.json(),
    temReadmePerfil: resReadme.ok,
    contasSociais,
  };
}
