import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile(
  new URL("../src/App.jsx", import.meta.url),
  "utf8"
);
const formSource = await readFile(
  new URL("../src/components/forms/FeedingForm.jsx", import.meta.url),
  "utf8"
);

assert.match(
  appSource,
  /defaultFeeding=\{modal\.timerId\s*\?\s*data\.recentFeedings\?\.\[0\]\s*:\s*null\}/,
  "only a feeding completed from a timer should receive the latest feeding defaults"
);
assert.match(formSource, /function FeedingForm\(\{[\s\S]*defaultFeeding/);
assert.match(formSource, /entry\?\.type\s*\|\|\s*defaultFeeding\?\.type\s*\|\|\s*["']breast milk["']/);
assert.match(formSource, /entry\?\.method\s*\|\|\s*defaultFeeding\?\.method\s*\|\|\s*["']bottle["']/);
assert.match(
  formSource,
  /entry\?\.amount\s*!=\s*null[\s\S]*defaultFeeding\?\.amount\s*!=\s*null[\s\S]*String\(defaultFeeding\.amount\)/,
  "the previous feeding amount should be prefilled when finishing a feeding timer"
);

console.log("feeding timer default checks passed");
