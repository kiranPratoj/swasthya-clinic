import { execSync } from 'node:child_process';

const BUSINESS_LOGIC_PATH = 'docs/app/BUSINESS_LOGIC.md';

const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACMR', {
  encoding: 'utf8',
})
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const logicRelevant = stagedFiles.filter((file) => {
  if (file === BUSINESS_LOGIC_PATH) return false;
  if (file === 'src/app/globals.css') return false;
  if (file.startsWith('src/components/landing/')) return false;

  return (
    file === 'src/proxy.ts' ||
    file.startsWith('src/app/') ||
    file.startsWith('src/lib/') ||
    file.startsWith('src/components/') ||
    file.startsWith('supabase/migrations/')
  );
});

if (logicRelevant.length === 0) {
  process.exit(0);
}

if (stagedFiles.includes(BUSINESS_LOGIC_PATH)) {
  process.exit(0);
}

console.error('\nBusiness logic sync check failed.\n');
console.error(
  `You staged app logic changes but did not stage ${BUSINESS_LOGIC_PATH}.`
);
console.error('\nChanged files:\n');
for (const file of logicRelevant) {
  console.error(`- ${file}`);
}
console.error(
  '\nUpdate docs/app/BUSINESS_LOGIC.md when workflow, permissions, statuses, billing, portal, onboarding, intake, queue, consult, or communication behavior changes.'
);
console.error(
  '\nIf your change is purely presentational and does not affect business behavior, stage a short note in BUSINESS_LOGIC.md explaining that no workflow rules changed.'
);
process.exit(1);
