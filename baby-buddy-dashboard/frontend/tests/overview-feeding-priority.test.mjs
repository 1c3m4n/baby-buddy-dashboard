import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as feedingInsights from "../src/utils/feedingInsights.js";

const overviewSource = await readFile(
  new URL("../src/tabs/OverviewTab.jsx", import.meta.url),
  "utf8"
);

assert.equal(
  typeof feedingInsights.getHoursSinceLastFeeding,
  "function",
  "feeding insights should provide the elapsed hours from a feeding start"
);

const fixedNow = new Date("2026-07-10T12:30:00Z");
assert.equal(
  feedingInsights.getHoursSinceLastFeeding(
    [
      { start: "2026-07-10T09:00:00Z", method: "bottle" },
      { start: "2026-07-10T08:00:00Z", method: "bottle" },
    ],
    fixedNow
  ),
  3.5,
  "elapsed time should be calculated from the latest feeding start"
);
assert.equal(
  feedingInsights.getHoursSinceLastFeeding([], fixedNow),
  null,
  "no feeding should have no elapsed-hours value"
);

assert.match(
  overviewSource,
  /value=\{feedingMethods\.breast[\s\S]*hoursSinceLastFeeding\.toFixed\(1\)\}h since last feeding/,
  "the top feeding card should replace a zero-breast count with hours since the latest feeding began"
);

const recentPumpingsIndex = overviewSource.indexOf('title="Recent Pumpings"');
const breastFeedingIndex = overviewSource.indexOf('title="Breast Feeding"');
assert.ok(
  recentPumpingsIndex >= 0 && breastFeedingIndex > recentPumpingsIndex,
  "Breast Feeding should appear after Recent Pumpings"
);

console.log("overview feeding priority checks passed");
