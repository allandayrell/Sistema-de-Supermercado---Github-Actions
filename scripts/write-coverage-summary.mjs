import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
const coverageFile = 'coverage/coverage-summary.json';

if (!summaryPath || !existsSync(coverageFile)) {
  process.exit(0);
}

const osLabel = process.argv[2] ?? process.platform;
const nodeLabel = process.argv[3] ?? process.version;
const { total } = JSON.parse(readFileSync(coverageFile, 'utf8'));

const markdown = [
  `### Cobertura de Testes (${osLabel} — Node ${nodeLabel})`,
  '',
  '| Métrica | Cobertos | Total | Percentual |',
  '| --- | ---: | ---: | ---: |',
  `| Statements | ${total.statements.covered} | ${total.statements.total} | **${total.statements.pct}%** |`,
  `| Branches | ${total.branches.covered} | ${total.branches.total} | **${total.branches.pct}%** |`,
  `| Functions | ${total.functions.covered} | ${total.functions.total} | **${total.functions.pct}%** |`,
  `| Lines | ${total.lines.covered} | ${total.lines.total} | **${total.lines.pct}%** |`,
  '',
].join('\n');

appendFileSync(summaryPath, markdown, 'utf8');
