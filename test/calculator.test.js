import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_SEARCH_DAYS,
  addDays,
  calculateSamesyDay,
  comparisonForDate,
  daysBetween,
  inferDogSize,
  parseDateInput
} from "../public/assets/calculator.20260808.js";

const TODAY = parseDateInput("2026-08-08");

test("parses real calendar dates and rejects rolled-over dates", () => {
  assert.equal(parseDateInput("2024-02-29").toISOString(), "2024-02-29T00:00:00.000Z");
  assert.equal(parseDateInput("2023-02-29"), null);
  assert.equal(parseDateInput("2024-13-01"), null);
  assert.equal(parseDateInput("not-a-date"), null);
});

test("finds the known future crossing for a person and cat", () => {
  const result = calculateSamesyDay({
    humanBirthday: parseDateInput("1990-01-01"),
    petBirthday: parseDateInput("2024-08-08"),
    species: "cat",
    dogSize: "cat",
    today: TODAY
  });

  assert.equal(result.status, "future");
  assert.equal(result.target.date.toISOString().slice(0, 10), "2030-10-21");
  assert.ok(result.target.diff >= 0);
});

test("searches the full 80-year window, including after the final doubling probe", () => {
  const humanBirthday = addDays(TODAY, -65_844);
  const result = calculateSamesyDay({
    humanBirthday,
    petBirthday: TODAY,
    species: "cat",
    dogSize: "cat",
    today: TODAY
  });

  const daysUntilCrossing = daysBetween(TODAY, result.target.date);
  const previousDay = comparisonForDate(
    addDays(result.target.date, -1),
    humanBirthday,
    TODAY,
    "cat",
    "cat"
  );

  assert.equal(result.status, "future");
  assert.ok(daysUntilCrossing > 16_384);
  assert.ok(daysUntilCrossing <= MAX_SEARCH_DAYS);
  assert.ok(previousDay.diff < 0);
  assert.ok(result.target.diff >= 0);
});

test("reports no crossing when it falls beyond the search window", () => {
  const result = calculateSamesyDay({
    humanBirthday: addDays(TODAY, -150_000),
    petBirthday: TODAY,
    species: "cat",
    dogSize: "cat",
    today: TODAY
  });

  assert.equal(result.status, "none");
  assert.equal(result.target, null);
  assert.equal(daysBetween(TODAY, result.endDate), MAX_SEARCH_DAYS);
});

test("reports today's crossing and a crossing that already passed", () => {
  const todayResult = calculateSamesyDay({
    humanBirthday: TODAY,
    petBirthday: TODAY,
    species: "dog",
    dogSize: "medium",
    today: TODAY
  });
  const passedResult = calculateSamesyDay({
    humanBirthday: parseDateInput("2020-01-01"),
    petBirthday: parseDateInput("2022-01-01"),
    species: "cat",
    dogSize: "cat",
    today: TODAY
  });

  assert.equal(todayResult.status, "today");
  assert.equal(passedResult.status, "passed");
  assert.ok(passedResult.target.date < TODAY);
});

test("maps known breeds and safely falls back for unlisted breeds", () => {
  assert.deepEqual(inferDogSize("  Golden   Retriever "), {
    size: "large",
    inferred: true,
    recognized: true
  });
  assert.deepEqual(inferDogSize("Very Good Mystery Dog"), {
    size: "medium",
    inferred: true,
    recognized: false
  });
  assert.deepEqual(inferDogSize("Wolfhound mix"), {
    size: "giant",
    inferred: true,
    recognized: true
  });
});
