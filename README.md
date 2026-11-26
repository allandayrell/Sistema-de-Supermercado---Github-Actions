# Mercado Horizonte

[![CI - Mercado Horizonte](https://github.com/allandayrell/Sistema-de-Supermercado---Github-Actions/actions/workflows/ci.yml/badge.svg)](https://github.com/allandayrell/Sistema-de-Supermercado---Github-Actions/actions/workflows/ci.yml)

Sistema web de supermercado com **frente de caixa (PDV)**, **gestão de estoque** e **histórico de vendas com painel gerencial**. Trabalho prático da disciplina de Engenharia de Software 2.

- **Sistema em produção:** _link do Render (preencher após o deploy)_
- **Vídeo de apresentação:** _link do YouTube (preencher após publicar)_

---

## Integrantes

- Allan Dayrell
- Raquel Xavier
- Warley

---

## Sobre o sistema

O Mercado Horizonte é dividido em três módulos, acessados por abas na mesma página:

### PDV / Caixa
- Catálogo pesquisável por nome ou SKU, com preço e saldo em estoque. Produtos zerados não podem ser adicionados.
- Carrinho com botões `+` / `−`, remoção de item e aviso quando a quantidade passa do estoque.
- Cupons `DESC10` (10%) e `HORIZONTE15` (R$ 15 em compras a partir de R$ 100), mais **5% de bônus** em compras acima de R$ 200.
- Prévia financeira em tempo real: subtotal, descontos e total.
- Pagamento em **Dinheiro** (com cálculo de troco em tempo real), **PIX** ou **Cartão**.
- Recibo da venda com ID, itens, descontos, pagamento e troco.
- O fechamento é **atômico**: se um item do carrinho não tiver saldo, nenhum estoque é alterado.

### Estoque
- Tabela com SKU, nome, categoria, preço, saldo, estoque mínimo e selo de **Estoque baixo**.
- Filtros por texto, categoria e "apenas estoque baixo".
- Cadastro de produtos com validação no navegador e no servidor.
- Reposição de unidades, alteração de preço e remoção com confirmação.

### Vendas & Painel
- Indicadores: faturamento líquido, vendas concluídas, ticket médio e alertas de estoque.
- Histórico das vendas, da mais recente para a mais antiga.
- **Estorno** de venda: devolve os itens ao estoque, marca a venda como `ESTORNADA` e impede um segundo estorno. Vendas estornadas não entram no faturamento.

### API REST

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/health` | Status do serviço |
| `GET` | `/api/produtos?busca=&categoria=&estoqueBaixo=true` | Lista produtos |
| `POST` | `/api/produtos` | Cadastra produto (`201`) |
| `PATCH` | `/api/produtos/:sku` | Atualiza preço |
| `POST` | `/api/produtos/:sku/repor` | Repõe estoque |
| `DELETE` | `/api/produtos/:sku` | Remove produto (`204`) |
| `POST` | `/api/caixa/simular` | Calcula o resumo do carrinho sem baixar estoque |
| `POST` | `/api/checkout` | Fecha a venda (`201`), `409` se faltar estoque |
| `GET` | `/api/vendas` | Histórico de vendas |
| `POST` | `/api/vendas/:id/estorno` | Estorna a venda (`404` inexistente, `409` já estornada) |
| `GET` | `/api/dashboard` | Indicadores do painel |

Erros seguem sempre o formato `{ "erro": "mensagem", "codigo": "CODIGO" }`.

---

## Tecnologias

| Camada | Tecnologia | Uso no projeto |
| --- | --- | --- |
| Linguagem | **TypeScript** | Backend e frontend tipados; os contratos da API ficam em `src/shared/contracts.ts` e são usados pelos dois lados. |
| Backend | **Node.js + Express 5** | API REST em `src/api`, com serviços de domínio em `src/services` e repositórios em `src/repositories` (em memória ou arquivo JSON via `DATA_DIR`). |
| Frontend | **React 19 + Vite** | Interface em `client/src`, servida pelo próprio Express após o build. |
| Testes de unidade e integração | **Vitest** + **Supertest** | Regras de negócio testadas pela API pública dos serviços e rotas HTTP testadas com Supertest. |
| Cobertura | **@vitest/coverage-v8** (Istanbul/V8) | Meta mínima de 80% em linhas, funções, branches e statements, aplicada no CI. |
| Testes E2E | **Playwright** | Jornadas completas no navegador contra o servidor de produção compilado. |
| Qualidade | **ESLint** + `tsc --noEmit` | Lint e verificação de tipos antes dos testes. |
| CI/CD | **GitHub Actions** | Testes, cobertura e E2E em **Linux, macOS e Windows** a cada commit. |
| Deploy | **Render** (plano gratuito) | Configurado em `render.yaml`. |

### Pipeline (`.github/workflows/ci.yml`)

```text
              [qualidade: ESLint + TypeScript]
                            │
          ┌─────────────────┴─────────────────┐
          ▼                                   ▼
[testes + cobertura]                   [E2E Playwright]
 ubuntu / macos / windows (Node 22)     ubuntu / macos / windows
 ubuntu (Node 20)
          └─────────────────┬─────────────────┘
                            ▼
                 [build + demo da CLI]
```

Cada execução publica o relatório de testes na aba **Checks**, a tabela de cobertura no **Job Summary** e os relatórios de cobertura e do Playwright como artefatos.

---

## Uso de IA

| Ferramenta | Como contribuiu |
| --- | --- |
| **Google Gemini** | Planejamento inicial do projeto e da divisão de tarefas, e preparação dos slides e do roteiro do seminário de GitHub Actions que deu origem a este repositório. |
| **ChatGPT** | Auditoria do estado do repositório em relação ao enunciado do TP: contagem de commits e testes, cobertura, pontos de atenção no CI e sugestão de divisão do trabalho restante. |
| **Claude Code (Anthropic)** | Implementação, a partir das issues do repositório, do frontend React (#16–#19), dos endpoints REST e das regras de histórico, estorno e dashboard (#12–#15), dos testes de API, das 5 jornadas E2E (#21), da matriz multi-OS do E2E e deste README. |

Como usamos a IA:
- As issues do GitHub foram o ponto de partida: cada uma descrevia escopo e critérios de aceitação, e a IA implementava em cima delas.
- Todo código gerado passou por lint, verificação de tipos, testes automatizados e pelo pipeline do GitHub Actions antes do merge. As telas também foram testadas manualmente no navegador.
- Cada entrega foi feita em uma branch própria e entrou na `main` por pull request, com o CI verde nos três sistemas operacionais.

---

## Execução dos testes

Pré-requisito: **Node.js 20 ou superior**.

```bash
# Instalar dependências
npm ci

# Testes de unidade (tests/unit)
npm run test:unit

# Testes de integração da API (tests/integration)
npm run test:integration

# Todos os testes Vitest com relatório de cobertura (falha se < 80%)
npm run test:coverage
# Relatório HTML: coverage/index.html

# Testes E2E com Playwright
npx playwright install chromium   # apenas na primeira vez
npm run build
npm run test:e2e
# Relatório HTML: npx playwright show-report
```

| Suíte | Local | Quantidade |
| --- | --- | --- |
| Unidade | `tests/unit` | 43 testes |
| Integração (API) | `tests/integration` | 20 testes |
| E2E (Playwright) | `tests/e2e` | 5 jornadas + 1 smoke test |

Jornadas E2E:
1. Compra no PDV com cupom `DESC10` via PIX e baixa no estoque.
2. Bloqueio de venda acima do estoque, com saldo preservado.
3. Cadastro de produto com estoque baixo e reposição.
4. Pagamento em dinheiro com cálculo de troco.
5. Estorno de venda no histórico com devolução ao estoque.

Cada jornada cria seus próprios produtos com SKU único, então os testes não dependem de dados deixados por outro.

### Rodar o sistema localmente

```bash
npm run dev      # API em http://localhost:3000 e frontend em http://localhost:5173
# ou, como em produção:
npm run build
npm start        # http://localhost:3000
```
