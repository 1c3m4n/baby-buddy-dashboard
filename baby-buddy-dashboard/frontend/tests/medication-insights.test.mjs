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
assert.equal(isVitaminMedication({ tags: ["vitamin"] }), true);
assert.equal(isVitaminMedication({ name: "Paracetamol", tags: ["pain"] }), false);

assert.deepEqual(
  summarizeVitaminMedication(
    [
      { name: "Vitamin D", time: "2026-05-31T08:00:00Z", dosage: 1, dosage_unit: "drops" },
      { name: "Paracetamol", time: "2026-05-31T09:00:00Z" },
      { name: "Vitamin K + D", time: "2026-05-30T08:00:00Z" },
    ],
    fixedNow
  ),
  {
    takenToday: true,
    countToday: 1,
    last: { name: "Vitamin D", time: "2026-05-31T08:00:00Z", dosage: 1, dosage_unit: "drops" },
  }
);

assert.deepEqual(summarizeVitaminMedication([], fixedNow), {
  takenToday: false,
  countToday: 0,
  last: null,
});

assert.equal(getDefaultVitaminMedicationName({ formula: 501 }), "Vitamin D");
assert.equal(getDefaultVitaminMedicationName({ formula: 500 }), "Vitamin K + D");

console.log("medication insight checks passed");
