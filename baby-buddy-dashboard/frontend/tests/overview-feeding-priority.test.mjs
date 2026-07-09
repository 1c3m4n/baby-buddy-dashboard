import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as feedingInsights from "../src/utils/feedingInsights.js";

const overviewSource = await readFile(
  new URL("../src/tabs/OverviewTab.jsx", import.meta.url),
  "utf8"
);
const hookSource = await readFile(
  new URL("../src/hooks/useBabyData.js", import.meta.url),
  "utf8"
);
const appSource = await readFile(
  new URL("../src/App.jsx", import.meta.url),
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

assert.match(
  hookSource,
  /const\s+\[recentFeedings,\s*setRecentFeedings\]\s*=\s*useState\(\[\]\)/,
  "useBabyData should keep recent feedings separate from today's feeding totals"
);
assert.match(
  hookSource,
  /api\.getFeedings\(\{\s*child:\s*c,\s*limit:\s*100,\s*ordering:\s*["']-start["']\s*\}\)/,
  "useBabyData should request recent feedings without a date range"
);
assert.match(hookSource, /setRecentFeedings\(recentFeedingsRes\.results\s*\|\|\s*\[\]\)/);
assert.match(hookSource, /recentFeedings,/);
assert.match(appSource, /recentFeedings=\{data\.recentFeedings\}/);
assert.match(overviewSource, /recentFeedings\s*=\s*\[\]/);
assert.match(overviewSource, /toFeedingTimeline\(recentFeedings,\s*units\.volume\)/);
assert.match(overviewSource, /getHoursSinceLastFeeding\(recentFeedings\)/);

console.log("overview feeding priority checks passed");
