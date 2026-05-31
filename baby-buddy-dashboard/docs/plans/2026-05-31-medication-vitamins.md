# Medication-backed Vitamin Tracking Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add dashboard support for Baby Buddy 2.9.2 medication records so vitamins can be logged and shown alongside the existing milk/vitamin guidance.

**Architecture:** Baby Buddy 2.9.2 exposes a new `/api/medication/` resource. The dashboard should treat vitamins as a medication use-case: fetch medication records, expose create/update helpers, add a vitamin-focused form/action, and display vitamin status in the existing “Milk & Vitamins” area without inventing a separate backend model.

**Tech Stack:** React 18, Vite, lightweight Node ESM tests, Baby Buddy REST API 2.9.2.

---

## Baby Buddy 2.9.2 API findings

Source checked: `https://raw.githubusercontent.com/babybuddy/babybuddy/v2.9.2/openapi-schema.yml`

Medication endpoints in Baby Buddy 2.9.2:

- `GET /api/medication/`
- `POST /api/medication/`
- `GET /api/medication/{id}/`
- `PUT /api/medication/{id}/`
- `PATCH /api/medication/{id}/`
- `DELETE /api/medication/{id}/`

Medication query filters/order fields:

- `child`
- `date`, `date_min`, `date_max`
- `dosage_unit`
- `name`
- `tags`
- `ordering`
- ordering supports `time`, `name`, `dosage`; default is `-time`

Medication schema:

```json
{
  "id": "integer, read-only",
  "child": "integer, required",
  "name": "string, required, maxLength 255",
  "dosage": "number, nullable",
  "dosage_unit": "mg | ml | tablets | drops",
  "time": "date-time",
  "next_dose_interval": "duration string, nullable",
  "notes": "string, nullable",
  "tags": ["string"]
}
```

Migration details from Baby Buddy 2.9.2 confirm:

- medication `time` defaults to current local time in Baby Buddy if omitted
- `dosage` is optional/nullable
- `dosage_unit` can be blank in the DB, but the OpenAPI enum lists `mg`, `ml`, `tablets`, and `drops`
- `child` related name is `medication`

## Product decision for this fork

Use Baby Buddy’s medication feature to record vitamins, not notes. This lets the records live in Baby Buddy’s native medication history.

Initial vitamin model in the dashboard:

- quick action label: `Vitamins`
- modal title: `Log Vitamins`
- default name should come from the current guidance:
  - if formula intake is above 500 mL in the last 24h: `Vitamin D`
  - otherwise: `Vitamin K + D`
- default dosage unit: `drops`
- default dosage: blank, because brands and dosing differ
- notes: optional
- tags: include `vitamins` so records can be filtered/grouped later

Avoid hard-coding a medical dose. The dashboard should remind/log, not prescribe.

## Acceptance criteria

- The dashboard can create a Baby Buddy medication record for vitamins.
- Vitamin records are fetched for the selected child.
- The “Milk & Vitamins” card shows whether vitamins were logged today and the last logged vitamin time.
- Existing milk/formula/vitamin guidance remains visible.
- Demo mode has realistic vitamin medication records.
- Existing tests and build pass.
- Implementation follows TDD: write failing tests first for API wiring and vitamin summary helpers.

---

### Task 1: Add medication API client methods

**Objective:** Add Baby Buddy 2.9.2 medication endpoints to the frontend API wrapper.

**Files:**
- Modify: `frontend/src/api.js`
- Test: `frontend/tests/api-wiring.test.mjs` or extend an existing static wiring test
- Modify: `frontend/package.json` if a new test file is added

**Step 1: Write failing test**

Add a source-level test that reads `frontend/src/api.js` and asserts it contains:

```js
getMedication: (params) => request(`medication/${qs(params)}`)
createMedication: (data) => request("medication/", { method: "POST", body: JSON.stringify(data) })
updateMedication: (id, data) => request(`medication/${id}/`, { method: "PATCH", body: JSON.stringify(data) })
```

Run:

```bash
cd frontend
node tests/api-wiring.test.mjs
```

Expected: FAIL because medication methods do not exist yet.

**Step 2: Implement minimal API methods**

Add to `frontend/src/api.js` near Notes/Temperature helpers:

```js
// Medication
getMedication: (params) => request(`medication/${qs(params)}`),
createMedication: (data) =>
  request("medication/", { method: "POST", body: JSON.stringify(data) }),
updateMedication: (id, data) =>
  request(`medication/${id}/`, { method: "PATCH", body: JSON.stringify(data) }),
```

**Step 3: Verify**

Run:

```bash
cd frontend
node tests/api-wiring.test.mjs
npm test
```

Expected: PASS.

**Step 4: Commit**

```bash
git add frontend/src/api.js frontend/tests/api-wiring.test.mjs frontend/package.json
git commit -m "feat: add medication api client"
```

---

### Task 2: Add vitamin medication summary helpers

**Objective:** Add pure functions for identifying vitamin medication records and summarising today’s vitamin status.

**Files:**
- Create: `frontend/src/utils/medicationInsights.js`
- Create: `frontend/tests/medication-insights.test.mjs`
- Modify: `frontend/package.json`

**Step 1: Write failing tests**

Test behaviours:

```js
import assert from "node:assert/strict";
import {
  isVitaminMedication,
  summarizeVitaminMedication,
  getDefaultVitaminMedicationName,
} from "../src/utils/medicationInsights.js";

const fixedNow = new Date("2026-05-31T12:00:00Z");

assert.equal(isVitaminMedication({ name: "Vitamin D" }), true);
assert.equal(isVitaminMedication({ name: "Vitamine K + D" }), true);
assert.equal(isVitaminMedication({ tags: ["vitamins"] }), true);
assert.equal(isVitaminMedication({ name: "Paracetamol" }), false);

assert.deepEqual(
  summarizeVitaminMedication(
    [
      { name: "Vitamin D", time: "2026-05-31T08:00:00Z", dosage: 1, dosage_unit: "drops" },
      { name: "Paracetamol", time: "2026-05-31T09:00:00Z" },
      { name: "Vitamin K + D", time: "2026-05-30T08:00:00Z" }
    ],
    fixedNow
  ),
  {
    takenToday: true,
    countToday: 1,
    last: { name: "Vitamin D", time: "2026-05-31T08:00:00Z", dosage: 1, dosage_unit: "drops" }
  }
);

assert.equal(getDefaultVitaminMedicationName({ formula: 501 }), "Vitamin D");
assert.equal(getDefaultVitaminMedicationName({ formula: 500 }), "Vitamin K + D");
```

Run:

```bash
cd frontend
node tests/medication-insights.test.mjs
```

Expected: FAIL because the file/functions do not exist.

**Step 2: Implement helpers**

Implement small pure functions:

- `isVitaminMedication(entry)` returns true when:
  - name contains `vitamin` or `vitamine`, or
  - tags include `vitamin` or `vitamins`
- `summarizeVitaminMedication(entries, now)`:
  - filters vitamin records
  - sorts by `time` descending
  - counts records between local day start and local day end
  - returns `{ takenToday, countToday, last }`
- `getDefaultVitaminMedicationName(milkTotals)` mirrors current guidance:
  - formula > 500 => `Vitamin D`
  - otherwise => `Vitamin K + D`

**Step 3: Verify**

Run:

```bash
cd frontend
node tests/medication-insights.test.mjs
npm test
```

Expected: PASS.

**Step 4: Commit**

```bash
git add frontend/src/utils/medicationInsights.js frontend/tests/medication-insights.test.mjs frontend/package.json
git commit -m "feat: add vitamin medication insights"
```

---

### Task 3: Fetch medication records in `useBabyData`

**Objective:** Load today and recent medication records for the selected child.

**Files:**
- Modify: `frontend/src/hooks/useBabyData.js`
- Modify: `frontend/src/utils/mockData.js`
- Test: source-level wiring test from Task 1 or a new `frontend/tests/use-baby-data-medication.test.mjs`

**Step 1: Write failing test**

Assert `useBabyData.js` includes:

- `const [medication, setMedication] = useState([]);`
- `api.getMedication({ child: c, date_min: todayMin, date_max: todayMax, limit: 100, ordering: "-time" })`
- `setMedication(medicationRes.results || [])`
- returned `medication`
- mock mode sets medication from `mock.medication`

Run the new test and confirm it fails.

**Step 2: Implement data loading**

Add medication state and add `api.getMedication(...)` to the existing `Promise.all` list.

Use `date_min/date_max` because Baby Buddy’s medication filter is time-based but exposes date/date_min/date_max query parameters in the OpenAPI schema, matching other time-based endpoints.

Return `medication` from the hook.

Update demo data to include examples:

```js
medication: [
  {
    id: 9001,
    child: 1,
    name: "Vitamin D",
    dosage: 1,
    dosage_unit: "drops",
    time: isoLocal(hoursAgo(2)),
    notes: "Demo vitamin record",
    tags: ["vitamins"]
  }
]
```

**Step 3: Verify**

Run:

```bash
cd frontend
node tests/use-baby-data-medication.test.mjs
npm test
```

Expected: PASS.

**Step 4: Commit**

```bash
git add frontend/src/hooks/useBabyData.js frontend/src/utils/mockData.js frontend/tests/use-baby-data-medication.test.mjs frontend/package.json
git commit -m "feat: load medication records"
```

---

### Task 4: Add vitamin medication form

**Objective:** Add a modal form for creating/updating vitamin medication records.

**Files:**
- Create: `frontend/src/components/forms/MedicationForm.jsx`
- Modify: `frontend/src/App.jsx`
- Test: `frontend/tests/medication-form-wiring.test.mjs`

**Step 1: Write failing wiring test**

Assert the form source contains:

- `api.createMedication(data)`
- `api.updateMedication(entry.id, data)`
- payload fields `name`, `dosage`, `dosage_unit`, `time`, `notes`, `tags`
- default `dosage_unit` of `drops`
- tag `vitamins`

Assert `App.jsx` imports `MedicationForm`, has a vitamin action, and renders it for `modal?.type === "vitamins"`.

Run the test and confirm failure.

**Step 2: Implement form**

Create `MedicationForm.jsx` modelled on existing forms.

Props:

```js
MedicationForm({ childId, entry, defaultName, onDone, onClose })
```

Fields:

- Time: `datetime-local`
- Name: text input, default from `defaultName || "Vitamin D"`
- Dosage: optional number input with decimal step
- Unit: select with `drops`, `ml`, `mg`, `tablets`
- Notes: optional textarea

Submit payload:

```js
const data = {
  name: name.trim(),
  dosage: dosage === "" ? null : Number(dosage),
  dosage_unit: dosageUnit,
  time: `${time}:00`,
  notes: notes.trim() || null,
  tags: ["vitamins"],
};
if (!isEdit) data.child = childId;
```

Do not require dosage.

**Step 3: Wire action and modal**

In `App.jsx`:

- import `MedicationForm`
- add `{ id: "vitamins", label: "Vitamins", icon: <Icons.Temp /> or a new pill icon, color: colors.temp }` to the `Measure` group
- pass `data.medication` to `OverviewTab` in a later task
- render `MedicationForm` when `modal?.type === "vitamins"`

For `defaultName`, either:

- compute in `App.jsx` using a helper exported from `medicationInsights.js`, or
- pass `defaultName` from `OverviewTab` only when opening from the card

Keep it simple for this task: default to `Vitamin D`; improve with guidance-aware default in Task 5.

**Step 4: Verify**

Run:

```bash
cd frontend
node tests/medication-form-wiring.test.mjs
npm test
npm run build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/forms/MedicationForm.jsx frontend/src/App.jsx frontend/tests/medication-form-wiring.test.mjs frontend/package.json
git commit -m "feat: add vitamin medication form"
```

---

### Task 5: Display vitamin medication status in Milk & Vitamins card

**Objective:** Show whether vitamins were logged today and provide a one-tap log action from the guidance card.

**Files:**
- Modify: `frontend/src/tabs/OverviewTab.jsx`
- Modify: `frontend/src/App.jsx`
- Test: `frontend/tests/overview-vitamin-wiring.test.mjs`

**Step 1: Write failing test**

Assert `OverviewTab.jsx`:

- accepts `medication`
- imports `summarizeVitaminMedication` and `getDefaultVitaminMedicationName`
- computes `vitaminMedication = summarizeVitaminMedication(medication)`
- displays `Logged today` / `Not logged today`
- opens `onEditEntry?.("vitamins", ...)` or `onLogVitamins` for logging

Run and confirm failure.

**Step 2: Implement card changes**

Extend `OverviewTab` props:

```js
export default function OverviewTab({ ..., medication, onEditEntry, onLogVitamins })
```

Compute:

```js
const vitaminMedication = summarizeVitaminMedication(medication);
const defaultVitaminName = getDefaultVitaminMedicationName(milkTotals);
```

In “Milk & Vitamins”, below current guidance:

- show `Vitamin log`
- if `takenToday`: `Logged today · {last name} · {time}`
- else: `Not logged today`
- add button `Log {defaultVitaminName}` that calls `onLogVitamins?.(defaultVitaminName)`

If the latest vitamin entry is clickable, call:

```js
onEditEntry?.("vitamins", vitaminMedication.last)
```

**Step 3: Wire App**

Pass medication into overview:

```jsx
<OverviewTab
  ...
  medication={data.medication}
  onLogVitamins={(defaultName) => setModal({ type: "vitamins", defaultName })}
/>
```

Pass `defaultName={modal.defaultName}` into `MedicationForm`.

**Step 4: Verify**

Run:

```bash
cd frontend
node tests/overview-vitamin-wiring.test.mjs
npm test
npm run build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/tabs/OverviewTab.jsx frontend/src/App.jsx frontend/tests/overview-vitamin-wiring.test.mjs frontend/package.json
git commit -m "feat: show vitamin medication status"
```

---

### Task 6: Add medication timeline/edit support where useful

**Objective:** Make vitamin medication records discoverable and editable after creation.

**Files:**
- Modify: `frontend/src/tabs/OverviewTab.jsx` or `frontend/src/tabs/NotesTab.jsx`
- Optional Modify: `frontend/src/components/DayActivitiesModal.jsx` if weekly medication charting is added later

**Step 1: Keep scope tight**

For the first release, do not add medication charts. Add only:

- latest vitamin status in “Milk & Vitamins”
- click latest vitamin status to edit
- floating action to create vitamins

This avoids a broad medication dashboard when the current need is vitamin tracking.

**Step 2: Verify edit path manually and with wiring tests**

Ensure clicking an existing vitamin entry opens `MedicationForm` with populated values and PATCHes the medication endpoint.

Run:

```bash
cd frontend
npm test
npm run build
```

**Step 3: Commit if separate changes were needed**

```bash
git add frontend/src/tabs/OverviewTab.jsx frontend/src/components/forms/MedicationForm.jsx
 git commit -m "feat: allow editing vitamin medication records"
```

---

### Task 7: Documentation and release

**Objective:** Document that vitamin logging uses Baby Buddy 2.9.2 medication records and release as a Home Assistant add-on update.

**Files:**
- Modify: `README.md`
- Modify: `config.yaml`

**Step 1: Update README**

Add a short section:

```md
## Vitamin logging

On Baby Buddy 2.9.2 and newer, this fork records vitamins using Baby Buddy's native medication API. The dashboard uses medication records tagged `vitamins` for the Milk & Vitamins card.
```

**Step 2: Bump add-on version**

Bump `config.yaml` from the current version to the next patch version.

**Step 3: Verify**

Run:

```bash
python - <<'PY'
import yaml
with open('config.yaml') as f:
    yaml.safe_load(f)
print('config.yaml ok')
PY
cd frontend
npm test
npm run build
```

Expected: PASS.

**Step 4: Commit and release**

```bash
git add README.md config.yaml
git commit -m "docs: document vitamin medication tracking"
git push origin main
git tag -a vNEXT -m "Release vNEXT"
git push origin vNEXT
gh release create vNEXT --title "vNEXT" --notes "..."
```

Follow the existing Home Assistant add-on release checklist.

---

## Open questions before implementation

1. Should the quick action live under `Measure` as requested, or should the group be renamed/expanded to `Health` later?
2. Should the default medication name be English (`Vitamin D`) or Dutch (`Vitamine D` / `Vitamine K + D`)? Baby Buddy stores free text, so either works.
3. Do you want a brand-specific default dosage, or should dosage stay blank by default? Recommendation: keep blank to avoid implying medical dosing.
4. Do you want the dashboard to warn if no vitamins have been logged today, or just display status neutrally?

## Suggested first implementation scope

Implement Tasks 1-5 only for the first release. That gives us native Baby Buddy medication storage, a vitamin action, and useful “logged today” visibility without building a full medication management UI.
