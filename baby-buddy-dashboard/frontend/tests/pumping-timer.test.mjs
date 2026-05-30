import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const pumpingFormSource = await readFile(new URL('../src/components/forms/PumpingForm.jsx', import.meta.url), 'utf8');

assert.match(
  appSource,
  /import\s+PumpingForm\s+from\s+["']\.\/components\/forms\/PumpingForm["'];/,
  'App should import PumpingForm'
);

assert.match(
  appSource,
  /const\s+TIMER_TYPES\s*=\s*\[[\s\S]*id:\s*["']pumping["'][\s\S]*label:\s*["']Pumping["']/,
  'Timer picker should include a Pumping timer option'
);

assert.match(
  appSource,
  /if\s*\(n\.includes\(["']pump["']\)\)\s+return\s+["']pumping["'];/,
  'Timer names containing pump should map to the pumping modal'
);

assert.match(
  appSource,
  /modal\?\.type\s*===\s*["']pumping["'][\s\S]*<PumpingForm[\s\S]*timerId=\{modal\.timerId\}/,
  'App should render PumpingForm for pumping timers and pass timerId'
);

assert.match(
  pumpingFormSource,
  /api\.createPumping\(data\)/,
  'PumpingForm should save new pumping entries with api.createPumping'
);

assert.match(
  pumpingFormSource,
  /data\.timer\s*=\s*timerId/,
  'PumpingForm should submit timerId as timer when saving a stopped timer'
);

console.log('pumping timer wiring checks passed');
