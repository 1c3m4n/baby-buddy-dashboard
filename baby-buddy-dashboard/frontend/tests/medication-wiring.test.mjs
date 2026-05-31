import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const apiSource = await readFile(new URL("../src/api.js", import.meta.url), "utf8");
const hookSource = await readFile(new URL("../src/hooks/useBabyData.js", import.meta.url), "utf8");
const mockSource = await readFile(new URL("../src/utils/mockData.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const overviewSource = await readFile(new URL("../src/tabs/OverviewTab.jsx", import.meta.url), "utf8");
const formSource = await readFile(new URL("../src/components/forms/MedicationForm.jsx", import.meta.url), "utf8");

assert.match(apiSource, /getMedication:\s*\(params\)\s*=>\s*request\(`medication\/\$\{qs\(params\)\}`\)/, "api should fetch medication");
assert.match(apiSource, /createMedication:\s*\(data\)\s*=>[\s\S]*request\(["']medication\/["'],\s*\{\s*method:\s*["']POST["'],\s*body:\s*JSON\.stringify\(data\)\s*\}\)/, "api should create medication");
assert.match(apiSource, /updateMedication:\s*\(id,\s*data\)\s*=>[\s\S]*request\(`medication\/\$\{id\}\/`,\s*\{\s*method:\s*["']PATCH["'],\s*body:\s*JSON\.stringify\(data\)\s*\}\)/, "api should update medication");

assert.match(hookSource, /const\s+\[medication,\s*setMedication\]\s*=\s*useState\(\[\]\)/, "useBabyData should keep medication state");
assert.match(hookSource, /api\.getMedication\(\{\s*child:\s*c,\s*date_min:\s*todayMin,\s*date_max:\s*todayMax,\s*limit:\s*100,\s*ordering:\s*["']-time["']\s*\}\)/, "useBabyData should fetch today's medication");
assert.match(hookSource, /setMedication\(medicationRes\.results\s*\|\|\s*\[\]\)/, "useBabyData should store medication results");
assert.match(hookSource, /medication,/, "useBabyData should return medication");
assert.match(mockSource, /medication:\s*emmaMedication\(\)/, "demo data should include Emma medication records");
assert.match(mockSource, /medication:\s*liamMedication\(\)/, "demo data should include Liam medication records");

assert.match(formSource, /api\.createMedication\(data\)/, "MedicationForm should create medication");
assert.match(formSource, /api\.updateMedication\(entry\.id,\s*data\)/, "MedicationForm should update medication");
assert.match(formSource, /dosage_unit:\s*dosageUnit/, "MedicationForm payload should include dosage_unit");
assert.match(formSource, /tags:\s*\[["']vitamins["']\]/, "MedicationForm should tag vitamin medication records");
assert.match(formSource, /useState\(entry\?\.dosage_unit\s*\|\|\s*["']drops["']\)/, "MedicationForm should default unit to drops");

assert.match(appSource, /import\s+MedicationForm\s+from\s+["']\.\/components\/forms\/MedicationForm["'];/, "App should import MedicationForm");
assert.match(appSource, /id:\s*["']vitamins["'][\s\S]*label:\s*["']Vitamins["']/, "App should expose a Vitamins quick action");
assert.match(appSource, /modal\?\.type\s*===\s*["']vitamins["'][\s\S]*<MedicationForm[\s\S]*defaultName=\{modal\.defaultName\}/, "App should render MedicationForm for vitamins");
assert.match(appSource, /medication=\{data\.medication\}/, "App should pass medication to OverviewTab");
assert.match(appSource, /onLogVitamins=\{\(defaultName\)\s*=>\s*setModal\(\{\s*type:\s*["']vitamins["'],\s*defaultName\s*\}\)\}/, "App should open vitamin form from overview default");

assert.match(overviewSource, /medication\s*=\s*\[\]/, "OverviewTab should accept medication");
assert.match(overviewSource, /summarizeVitaminMedication/, "OverviewTab should summarize vitamin medication");
assert.match(overviewSource, /getDefaultVitaminMedicationName/, "OverviewTab should compute guidance-aware default vitamin name");
assert.match(overviewSource, /Logged today/, "OverviewTab should display logged status");
assert.match(overviewSource, /Not logged today/, "OverviewTab should display missing status");
assert.match(overviewSource, /onEditEntry\?\.\(["']vitamins["'],\s*vitaminMedication\.last\)/, "Latest vitamin status should be editable");
assert.match(overviewSource, /onLogVitamins\?\.\(defaultVitaminName\)/, "OverviewTab should offer one-tap vitamin logging");

console.log("medication wiring checks passed");
