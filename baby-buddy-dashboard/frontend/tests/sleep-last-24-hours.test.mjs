import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const hookSource = await readFile(
  new URL("../src/hooks/useBabyData.js", import.meta.url),
  "utf8"
);

assert.match(
  hookSource,
  /api\.getSleep\(\{\s*child:\s*c,\s*end_min:\s*sleepMin,\s*limit:\s*100,\s*ordering:\s*["']-end["']\s*\}\)/,
  "the top sleep card should use sleeps that ended during the rolling last 24 hours"
);
assert.doesNotMatch(
  hookSource,
  /api\.getSleep\(\{\s*child:\s*c,\s*start_min:\s*sleepMin,\s*limit:\s*100/,
  "the rolling sleep total must not be filtered by when sleep started"
);

console.log("last-24-hours sleep query checks passed");
