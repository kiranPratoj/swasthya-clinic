import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (!existsSync('.git')) {
  process.exit(0);
}

try {
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
} catch (error) {
  console.warn('Unable to configure git hooks path automatically.');
  if (error instanceof Error) {
    console.warn(error.message);
  }
}
