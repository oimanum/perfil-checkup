# 🔍 Perfil Checkup

Seu perfil do GitHub visto por um recrutador. Digite um usuário e receba uma **nota de 0 a 100** e uma lista do **que corrigir primeiro**, ordenada por quantos pontos cada ajuste rende.

Nasceu de um problema real: recrutador gasta poucos segundos no seu perfil, e a maioria das pessoas nunca descobre o que está atrapalhando.

## Como funciona

A nota soma 10 critérios (total 100 pontos):

| Critério | Pontos |
| --- | :---: |
| README de perfil (repositório com o mesmo nome do usuário) | 20 |
| Repositórios com descrição | 14 |
| Atividade nos últimos 90 dias | 14 |
| Topics nos repositórios | 8 |
| Projetos com demo online | 8 |
| Projetos próprios publicados | 8 |
| Bio preenchida | 8 |
| Forma de contato visível | 8 |
| Variedade de linguagens | 6 |
| Código autoral (não só forks) | 6 |

Faixas: **85+** Pronto para recrutadores · **65+** Quase lá · **40+** Precisa de ajustes · abaixo disso, Começando.

## Usando

**No navegador:** abra o `index.html` por um servidor estático (por causa dos módulos ES), por exemplo:

```bash
npx serve .
```

Também aceita link direto: `index.html?u=seu-usuario`.

**No terminal** (Node 18+):

```bash
node cli.js seu-usuario
```

## Testes

```bash
npm test
```

Usam o `node:test` nativo, sem dependências. Cobrem a pontuação (perfil completo, vazio, forks, atividade antiga, ordenação das sugestões) e a camada de rede com `fetch` simulado (usuário inexistente, limite da API, falha de conexão, erro 500).

## Decisões de projeto

- **Sem dependências e sem build.** Tudo é JavaScript puro com módulos ES, rodando igual no navegador e no Node.
- **Lógica separada da interface.** `src/analyzer.js` é feito só de funções puras; `src/github.js` recebe o `fetch` por parâmetro. Por isso os testes não dependem de internet.
- **Seguro por padrão.** A interface usa `textContent` em vez de `innerHTML`, então nada que venha da API vira HTML. O nome de usuário é validado antes de montar a URL.
- **Erros que explicam.** "Usuário não encontrado", "limite da API atingido" e "sem conexão" são mensagens diferentes. Um 404 no README de perfil conta como "não tem", mas um erro 500 não é confundido com isso.

## Limitações conhecidas

- Analisa os 100 repositórios mais recentemente atualizados (uma página da API).
- Sem token, a API pública permite 60 requisições por hora por IP; cada análise usa 3.
- Os repositórios fixados do perfil não aparecem na API REST, então não entram na nota.

## Estrutura

```
src/analyzer.js   regras de pontuação (funções puras)
src/github.js     acesso à API pública do GitHub
src/app.js        interface (DOM)
cli.js            versão para terminal
test/             testes automatizados
```

## Licença

MIT
