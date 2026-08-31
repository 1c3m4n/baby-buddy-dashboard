import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/components/forms/SleepForm.jsx", import.meta.url),
  "utf8"
);

assert.match(source, /function toApiDatetime\(value\)/);
assert.match(source, /return date\.toISOString\(\);/);
assert.doesNotMatch(source, /start:\s*`\$\{start\}:00`/);
assert.doesNotMatch(source, /end:\s*`\$\{end\}:00`/);
assert.match(source, /start:\s*toApiDatetime\(start\)/);
assert.match(source, /end:\s*toApiDatetime\(end\)/);
assert.match(source, /role="alert"/);
assert.match(source, /End time must be after the start time\./);

console.log("sleep form timezone and error handling checks passed");
