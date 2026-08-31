import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const forms = [
  "PumpingForm.jsx",
  "TummyTimeForm.jsx",
  "DiaperForm.jsx",
  "NoteForm.jsx",
];

for (const form of forms) {
  const source = await readFile(
    new URL(`../src/components/forms/${form}`, import.meta.url),
    "utf8"
  );
  assert.match(source, /function toApiDatetime\(value\)/, `${form} needs timezone-aware serialization`);
  assert.match(source, /return date\.toISOString\(\);/, `${form} must serialize ISO timestamps`);
  assert.doesNotMatch(source, /\$\{(?:start|end|time)\}:00/, `${form} must not submit timezone-free timestamps`);
  assert.match(source, /role="alert"/, `${form} must display API errors`);
  assert.match(source, /catch \(err\)/, `${form} must retain API errors`);
}

for (const form of ["TemperatureForm.jsx", "WeightForm.jsx", "HeightForm.jsx"]) {
  const source = await readFile(
    new URL(`../src/components/forms/${form}`, import.meta.url),
    "utf8"
  );
  assert.match(source, /role="alert"/, `${form} must display API errors`);
  assert.match(source, /catch \(err\)/, `${form} must retain API errors`);
}

console.log("form save reliability checks passed");
