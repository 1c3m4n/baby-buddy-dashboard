import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/components/forms/FeedingForm.jsx", import.meta.url),
  "utf8"
);

assert.match(source, /function toApiDatetime\(value\)/);
assert.match(source, /return date\.toISOString\(\);/);
assert.match(source, /data\.start = toApiDatetime\(start\);/);
assert.match(source, /data\.end = toApiDatetime\(end\);/);
assert.match(source, /await api\.updateFeeding\(entry\.id, data\);/);
assert.match(source, /End time must be after the start time\./);
assert.match(source, /role="alert"/);

console.log("feeding form update checks passed");
