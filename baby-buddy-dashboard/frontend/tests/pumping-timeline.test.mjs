import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { toPumpingTimeline } from "../src/utils/formatters.js";

const hookSource = await readFile(new URL("../src/hooks/useBabyData.js", import.meta.url), "utf8");
const overviewSource = await readFile(new URL("../src/tabs/OverviewTab.jsx", import.meta.url), "utf8");
const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const mockSource = await readFile(new URL("../src/utils/mockData.js", import.meta.url), "utf8");

const timeline = toPumpingTimeline(
  [
    {
      id: 1,
      start: "2026-05-31T10:00:00Z",
      end: "2026-05-31T10:20:00Z",
      amount: 75,
      notes: "left side",
    },
  ],
  "mL"
);

assert.equal(timeline.length, 1);
assert.equal(timeline[0].label, "75 mL pumped");
assert.equal(timeline[0].detail.includes("20m"), true);
assert.equal(timeline[0].detail.includes("left side"), true);
assert.equal(timeline[0].entry.id, 1);

assert.match(
  hookSource,
  /const\s+\[pumpings,\s*setPumpings\]\s*=\s*useState\(\[\]\)/,
  "useBabyData should keep today's pumping entries in state"
);

assert.match(
  hookSource,
  /const\s+\[weeklyPumpings,\s*setWeeklyPumpings\]\s*=\s*useState\(\[\]\)/,
  "useBabyData should keep weekly pumping entries in state for daily totals"
);

assert.match(
  hookSource,
  /api\.getPumping\(\{\s*child:\s*c,\s*start_min:\s*todayMin,\s*start_max:\s*todayMax,\s*limit:\s*100,\s*ordering:\s*["']-start["']\s*\}\)/,
  "useBabyData should fetch today's pumping entries"
);

assert.match(
  hookSource,
  /api\.getPumping\(\{\s*child:\s*c,\s*start_min:\s*weekMin,\s*limit:\s*200,\s*ordering:\s*["']-start["']\s*\}\)/,
  "useBabyData should fetch weekly pumping entries for the daily pumping totals card"
);

assert.match(
  hookSource,
  /setPumpings\(pumpingRes\.results\s*\|\|\s*\[\]\)/,
  "useBabyData should store pumping results"
);

assert.match(
  hookSource,
  /setWeeklyPumpings\(weeklyPumpingRes\.results\s*\|\|\s*\[\]\)/,
  "useBabyData should store weekly pumping results"
);

assert.match(
  hookSource,
  /pumpings,/,
  "useBabyData should return pumpings"
);

assert.match(
  hookSource,
  /weeklyPumpings,/,
  "useBabyData should return weekly pumpings"
);

assert.match(
  mockSource,
  /pumpings:\s*emmaPumpings\(\)/,
  "demo data should include Emma pumping entries"
);

assert.match(
  mockSource,
  /weeklyPumpings:\s*emmaWeeklyPumpings\(\)/,
  "demo data should include Emma weekly pumping entries"
);

assert.match(
  mockSource,
  /pumpings:\s*liamPumpings\(\)/,
  "demo data should include Liam pumping entries"
);

assert.match(
  mockSource,
  /weeklyPumpings:\s*liamPumpings\(\)/,
  "demo data should include Liam weekly pumping entries"
);

assert.match(
  overviewSource,
  /toPumpingTimeline/,
  "OverviewTab should use a pumping timeline formatter"
);

assert.match(
  overviewSource,
  /const\s+pumpingByDay\s*=\s*aggregateByDayOfWeek\(weeklyPumpings,\s*["']amount["']\)/,
  "OverviewTab should aggregate weekly pumpings into daily pumping totals"
);

assert.match(
  overviewSource,
  /Recent Pumpings/,
  "OverviewTab should render a Recent Pumpings card"
);

assert.match(
  overviewSource,
  /Daily Pumping Amounts/,
  "OverviewTab should render a bottom Daily Pumping Amounts card"
);

assert.match(
  overviewSource,
  /onEditEntry\?\.\(["']pumping["'],\s*p\.entry\)/,
  "Pumping timeline rows should open the pumping edit modal"
);

assert.match(
  appSource,
  /pumpings=\{data\.pumpings\}/,
  "App should pass pumpings into OverviewTab"
);

assert.match(
  appSource,
  /weeklyPumpings=\{data\.weeklyPumpings\}/,
  "App should pass weekly pumpings into OverviewTab"
);

console.log("pumping timeline checks passed");
