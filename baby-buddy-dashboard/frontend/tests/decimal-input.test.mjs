import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDecimalInput, parseDecimalInput } from '../src/utils/decimalInput.js';

assert.equal(normalizeDecimalInput('5,25'), '5.25');
assert.equal(normalizeDecimalInput('5.25'), '5.25');
assert.equal(normalizeDecimalInput(' 5,25 '), '5.25');
assert.equal(parseDecimalInput('5,25'), 5.25);
assert.equal(parseDecimalInput('5.25'), 5.25);
assert.equal(Number.isNaN(parseDecimalInput('')), true);
assert.equal(Number.isNaN(parseDecimalInput('abc')), true);

const weightFormSource = await readFile(new URL('../src/components/forms/WeightForm.jsx', import.meta.url), 'utf8');
assert.match(weightFormSource, /type=\"text\"/, 'Weight input should use text so iOS comma decimal keyboards are accepted');
assert.match(weightFormSource, /inputMode=\"decimal\"/, 'Weight input should request a decimal keyboard');
assert.match(weightFormSource, /parseDecimalInput\(weight\)/, 'WeightForm should parse comma decimal input before saving');
assert.match(weightFormSource, /pattern=\"\[0-9\]\+\(\[\.,\]\[0-9\]\+\)\?\"/, 'Weight input should allow either comma or dot decimal separators');
assert.doesNotMatch(weightFormSource, /parseFloat\(weight\)/, 'WeightForm should not parse weight with parseFloat directly');

console.log('decimal input checks passed');
