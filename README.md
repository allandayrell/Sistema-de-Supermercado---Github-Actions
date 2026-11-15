# Sistema de Supermercado — Demonstração de GitHub Actions

[![CI - Sistema de Supermercado](https://github.com/allandayrell/Sistema-de-Supermercado---Github-Actions/actions/workflows/ci.yml/badge.svg)](https://github.com/allandayrell/Sistema-de-Supermercado---Github-Actions/actions/workflows/ci.yml)

Projeto desenvolvido em **Node.js + TypeScript** para demonstrar na prática os recursos, a anatomia de workflows e o ecossistema do **GitHub Actions** (CI/CD), incluindo testes unitários, testes de integração, linter, build matricial, publicação de relatórios e artefatos.

---

## 1. Funcionalidades do Sistema

O sistema simula as operações essenciais de um supermercado em memória, dividido em três serviços desacoplados:

### 1.1 Controle de Estoque (`EstoqueService`)
- **Cadastrar produto (`cadastrarProduto`)**: registra `nome`, `preco` e `quantidade`.
  - Bloqueia nome vazio, produto duplicado, preço negativo (`< 0`) e quantidade menor ou igual a zero (`<= 0`).
- **Consultar e listar (`consultarProduto`, `listarProdutos`)**: busca case-insensitive retornando cópias imutáveis dos dados.
- **Verificar disponibilidade (`verificarDisponibilidade`)**: valida se o produto existe e se há saldo suficiente.
- **Baixar estoque (`baixarEstoque`)**: reduz a quantidade após uma venda. Lança `EstoqueInsuficienteError` (`"Estoque insuficiente..."`) caso a quantidade solicitada supere o saldo disponível.
- **Repor estoque (`reporEstoque`)**: adiciona unidades a um produto já cadastrado.

### 1.2 Carrinho e Caixa (`CaixaService`)
- **Adicionar / remover itens (`adicionarItem`, `removerItem`, `listarItens`)**: acumula quantidades de um mesmo produto e impede preço negativo ou quantidade menor ou igual a zero.
- **Cálculo de subtotal (`calcularSubtotal`)**: soma `precoUnitario * quantidade` com arredondamento monetário.
- **Cupons de desconto (`aplicarCupom`, `removerCupom`)**: aceita `DESC10` (10% de desconto) e lança `CupomInvalidoError` para códigos desconhecidos.
- **Desconto extra progressivo (`calcularResumo`)**: compras com subtotal **acima de R\$ 200,00** recebem **5% de desconto adicional** sobre o subtotal (somado ao cupom, chegando a 15% quando combinado com `DESC10`).
- **Limpar carrinho (`limparCarrinho`)**: zera itens e cupom ativo.

### 1.3 Fechamento de Pedido (`CheckoutService`)
- **Adicionar direto do catálogo (`adicionarProdutoAoCarrinho`)**: consulta o preço oficial no `EstoqueService` e insere no `CaixaService`.
- **Finalizar compra com atomicidade (`finalizarCompra`)**:
  1. Valida que o carrinho não está vazio.
  2. Verifica a disponibilidade de **todos** os itens antes de alterar qualquer saldo.
  3. Calcula o resumo financeiro com descontos.
  4. Realiza a baixa de estoque de todos os itens.
  5. Emite um `ReciboVenda` (com `id` UUID e data ISO) e limpa o carrinho.
  - **Garantia de Rollback**: se qualquer item (mesmo em um carrinho com vários produtos) não tiver estoque suficiente, nenhum produto tem o estoque reduzido.

---

## 2. Estrutura do Projeto

```text
.
├── .github/
│   ├── workflows/
│   │   └── ci.yml                 # Pipeline completo de CI/CD
│   ├── dependabot.yml             # Atualização automática de dependências npm e Actions
│   └── pull_request_template.md   # Checklist padrão para Pull Requests
├── src/
│   ├── models/
│   │   └── types.ts               # Interfaces de domínio e erros customizados
│   ├── services/
│   │   ├── EstoqueService.ts      # Controle de catálogo e saldo
│   │   ├── CaixaService.ts        # Carrinho, cupons e cálculos
│   │   └── CheckoutService.ts     # Orquestração atômica de vendas
│   ├── cli.ts                     # Demonstração executável no terminal
│   └── index.ts                   # Exportações públicas do módulo
├── tests/
│   ├── unit/
│   │   ├── EstoqueService.test.ts # Testes unitários do estoque
│   │   └── CaixaService.test.ts   # Testes unitários do caixa
│   └── integration/
│       └── CheckoutService.test.ts# Fluxo completo e cenários de rollback
├── eslint.config.mjs              # Configuração ESLint v9 (Flat Config)
├── tsconfig.json                  # Configuração TypeScript strict
├── vitest.config.ts               # Configuração Vitest + cobertura V8
└── package.json
```

---

## 3. Como Executar Localmente

Pré-requisito: **Node.js >= 20**.

```bash
# 1. Instalar dependências (use npm ci em ambientes reproduzíveis)
npm install

# 2. Executar demonstração da CLI em TypeScript
npm run demo

# 3. Compilar para JavaScript (dist/) e executar a versão compilada
npm start
```

### Scripts disponíveis

| Comando | O que faz |
| --- | --- |
| `npm run demo` | Executa `src/cli.ts` via `tsx` simulando compra com desconto e rollback |
| `npm test` | Roda todos os 16 testes (unidade e integração) com Vitest |
| `npm run test:watch` | Roda o Vitest em modo interativo (*watch*) |
| `npm run test:coverage` | Executa testes e gera cobertura V8 (terminal + HTML em `coverage/`) |
| `npm run test:ci` | Executa testes com cobertura e gera XML JUnit em `reports/junit.xml` |
| `npm run lint` | Verifica padronização de código com ESLint |
| `npm run lint:fix` | Corrige automaticamente problemas simples de lint |
| `npm run typecheck` | Valida a tipagem TypeScript sem gerar arquivos (`tsc --noEmit`) |
| `npm run build` | Compila o projeto TypeScript para a pasta `dist/` |
| `npm start` | Compila e executa `node dist/cli.js` |

---

## 4. Pipeline GitHub Actions (`.github/workflows/ci.yml`)

O workflow foi desenhado para cobrir diretamente os três pilares da referência oficial:

### 4.1 Conexão com as 3 Referências
1. **GitHub Features (`/features/actions`)**:
   - **Matrix Builds**: o job `testes` executa em paralelo nas versões **Node.js 20 e 22** (`strategy.matrix.node-version`), com `fail-fast: false`.
   - **Live Logs**: cada step exibe saída em tempo real (incluindo a execução da CLI compilada no job `build`).
   - **Execução baseada em eventos e concorrência**: dispara em `push` (`main`), `pull_request` (`main`) e manualmente via `workflow_dispatch`, cancelando execuções obsoletas da mesma branch com `concurrency`.
2. **GitHub Docs (`/en/actions`)**:
   - Anatomia explícita no `.github/workflows/ci.yml`:
     - **Events (`on`)** → **Permissions (`permissions`)** → **Jobs (`qualidade` → `testes` → `build` via `needs`)** → **Runners (`ubuntu-latest`)** → **Steps**.
   - Uso de **`$GITHUB_STEP_SUMMARY`** para renderizar uma tabela Markdown de cobertura direto na página de resumo da execução.
3. **GitHub Marketplace (`/marketplace`)**:
   - `actions/checkout@v7`: faz o checkout seguro do código do repositório.
   - `actions/setup-node@v7`: configura a versão da matriz e habilita cache automático de pacotes (`cache: 'npm'`).
   - `dorny/test-reporter@v3`: lê `reports/junit.xml` (`reporter: jest-junit`) e publica o relatório visual de testes na aba **Checks** do GitHub.
   - `actions/upload-artifact@v7`: armazena os relatórios HTML de cobertura (`coverage-node-20`, `coverage-node-22`) e o build compilado (`supermercado-dist`) para download.

### 4.2 Grafo de Execução do Pipeline

```text
  [qualidade: ESLint + tsc]
             │
             ▼
   ┌─────────┴─────────┐
   ▼                   ▼
[testes: Node 20]  [testes: Node 22]   (Matrix Build em paralelo)
   └─────────┬─────────┘
             ▼
  [build: tsc + node dist/cli.js + Artifact]
```

---

## 5. Roteiro Sugerido para Demonstração (10–15 min)

### Passo 1: Visão Geral do Workflow (3 min)
- Abrir `.github/workflows/ci.yml` no GitHub e apontar `on`, `permissions`, `concurrency`, `jobs`, `needs`, `runs-on: ubuntu-latest`, `strategy.matrix` e as 4 Actions do Marketplace.

### Passo 2: Execução Manual ou via Push + Live Logs (3 min)
- Na aba **Actions** do repositório, clicar em **CI - Sistema de Supermercado** → **Run workflow** (`workflow_dispatch`) — você pode marcar ou desmarcar a opção `executar_demo_cli`.
- Mostrar o grafo de jobs evoluindo em tempo real e abrir os **Live Logs** para mostrar o cache do `npm` (`actions/setup-node@v7`) e os testes rodando em paralelo no Node 20 e 22.

### Passo 3: Relatórios e Artefatos na Interface (2 min)
- Na página da execução concluída:
  - Mostrar a seção **Summary** com a tabela de cobertura gerada via `$GITHUB_STEP_SUMMARY`.
  - Mostrar os **Artifacts** disponíveis para download (`coverage-node-20`, `coverage-node-22`, `supermercado-dist`).
  - Clicar no Check **Vitest Report (Node 22)** gerado pelo `dorny/test-reporter@v3` mostrando os 16 testes aprovados.

### Passo 4: Demonstração de Falha e Correção em Pull Request (4 min)
Para mostrar o valor real de CI impedindo regressões antes do merge:

```bash
# 1. Criar branch de demonstração
git checkout -b demo/teste-falha

# 2. Introduzir um erro proposital (ex: mudar o desconto de 0.1 para 0.2 em src/services/CaixaService.ts)
# 3. Fazer commit e push
git add src/services/CaixaService.ts
git commit -m "fix: alter discount calculation for demo"
git push -u origin demo/teste-falha
```

- Abrir o **Pull Request** para `main` no GitHub:
  - Mostrar o checklist do `.github/pull_request_template.md`.
  - Aguardar o workflow falhar (❌) e mostrar a anotação do erro direto no PR pela action `dorny/test-reporter@v3`.
- Corrigir o valor para `0.1`, fazer `git commit` e `git push` na mesma branch:
  - Mostrar o workflow rodando automaticamente de novo e passando (✅), liberando o PR com segurança.
