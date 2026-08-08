export const YEAR_DAYS = 365.2425;
export const MAX_SEARCH_DAYS = Math.round(YEAR_DAYS * 80);

const DAY_MS = 24 * 60 * 60 * 1000;

const DOG_CURVES = {
  small: { firstYear: 7.2, adultYear: 6.4 },
  medium: { firstYear: 8, adultYear: 7 },
  large: { firstYear: 8.4, adultYear: 7.6 },
  giant: { firstYear: 8.8, adultYear: 8.2 }
};

export const CAT_CONVERSION = {
  firstYear: 15,
  secondYearTotal: 24,
  laterYear: 4
};

const BREED_SIZES = new Map([
  ["australian shepherd", "medium"],
  ["beagle", "medium"],
  ["bernese mountain dog", "giant"],
  ["border collie", "medium"],
  ["boxer", "large"],
  ["bulldog", "medium"],
  ["chihuahua", "small"],
  ["cocker spaniel", "medium"],
  ["dachshund", "small"],
  ["french bulldog", "small"],
  ["german shepherd", "large"],
  ["golden retriever", "large"],
  ["great dane", "giant"],
  ["irish wolfhound", "giant"],
  ["labrador retriever", "large"],
  ["mastiff", "giant"],
  ["mixed breed", "medium"],
  ["newfoundland", "giant"],
  ["pomeranian", "small"],
  ["poodle", "medium"],
  ["shih tzu", "small"],
  ["yorkshire terrier", "small"]
]);

export function parseDateInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function todayUtc(now = new Date()) {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

export function daysBetween(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS);
}

function normalizeBreed(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function inferDogSize(breed) {
  const normalized = normalizeBreed(breed);
  if (BREED_SIZES.has(normalized)) {
    return {
      size: BREED_SIZES.get(normalized),
      inferred: true,
      recognized: true
    };
  }

  const keywordChecks = [
    [/dane|mastiff|wolfhound|newfoundland|bernese|saint bernard|pyrenees/, "giant"],
    [/chihuahua|pomeranian|shih|yorkie|terrier|dachshund|maltese|havanese|papillon|toy/, "small"],
    [/beagle|collie|spaniel|bulldog|corgi|aussie|schnauzer|whippet/, "medium"],
    [/retriever|labrador|shepherd|boxer|pointer|setter|doberman|rottweiler|hound/, "large"]
  ];

  for (const [pattern, size] of keywordChecks) {
    if (pattern.test(normalized)) {
      return { size, inferred: true, recognized: true };
    }
  }

  return { size: "medium", inferred: true, recognized: false };
}

function curvedShortcutYears(actualPetYears, curve) {
  if (actualPetYears <= 0) return 0;
  const secondYear = (curve.firstYear + curve.adultYear) / 2;
  if (actualPetYears <= 1) return actualPetYears * curve.firstYear;
  if (actualPetYears <= 2) return curve.firstYear + (actualPetYears - 1) * secondYear;
  return curve.firstYear + secondYear + (actualPetYears - 2) * curve.adultYear;
}

function catConversionYears(actualPetYears) {
  if (actualPetYears <= 0) return 0;
  if (actualPetYears <= 1) return actualPetYears * CAT_CONVERSION.firstYear;
  if (actualPetYears <= 2) {
    return CAT_CONVERSION.firstYear + (actualPetYears - 1) * (CAT_CONVERSION.secondYearTotal - CAT_CONVERSION.firstYear);
  }
  return CAT_CONVERSION.secondYearTotal + (actualPetYears - 2) * CAT_CONVERSION.laterYear;
}

export function petCurve(species, dogSize) {
  return DOG_CURVES[dogSize] || DOG_CURVES.medium;
}

export function petHumanEquivalentDays(petDays, species, dogSize) {
  const actualPetYears = Math.max(0, petDays) / YEAR_DAYS;
  if (species === "cat") {
    return catConversionYears(actualPetYears) * YEAR_DAYS;
  }
  const curve = petCurve(species, dogSize);
  return curvedShortcutYears(actualPetYears, curve) * YEAR_DAYS;
}

export function comparisonForDate(date, humanBirthday, petBirthday, species, dogSize) {
  const humanDays = Math.max(0, daysBetween(humanBirthday, date));
  const petDays = Math.max(0, daysBetween(petBirthday, date));
  const petEquivalentDays = petHumanEquivalentDays(petDays, species, dogSize);
  return {
    date,
    humanDays,
    petDays,
    petEquivalentDays,
    diff: petEquivalentDays - humanDays
  };
}

function firstCrossingBetween(startDate, endDate, humanBirthday, petBirthday, species, dogSize) {
  let low = 0;
  let high = daysBetween(startDate, endDate);
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const date = addDays(startDate, mid);
    const comparison = comparisonForDate(date, humanBirthday, petBirthday, species, dogSize);
    if (comparison.diff >= 0) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return comparisonForDate(addDays(startDate, low), humanBirthday, petBirthday, species, dogSize);
}

export function calculateSamesyDay({ humanBirthday, petBirthday, species, dogSize, today = todayUtc() }) {
  const firstSharedDate = humanBirthday > petBirthday ? humanBirthday : petBirthday;
  const todayComparison = comparisonForDate(today, humanBirthday, petBirthday, species, dogSize);

  if (Math.abs(todayComparison.diff) < 1) {
    return {
      status: "today",
      target: todayComparison,
      startDate: addDays(today, -30),
      endDate: addDays(today, 30)
    };
  }

  if (todayComparison.diff > 0) {
    const firstSharedComparison = comparisonForDate(firstSharedDate, humanBirthday, petBirthday, species, dogSize);
    const pastTarget = firstSharedComparison.diff <= 0
      ? firstCrossingBetween(firstSharedDate, today, humanBirthday, petBirthday, species, dogSize)
      : null;
    return {
      status: "passed",
      target: pastTarget,
      startDate: pastTarget ? addDays(pastTarget.date, -30) : firstSharedDate,
      endDate: today
    };
  }

  let high = 1;
  while (high <= MAX_SEARCH_DAYS) {
    const candidate = comparisonForDate(addDays(today, high), humanBirthday, petBirthday, species, dogSize);
    if (candidate.diff >= 0) {
      const target = firstCrossingBetween(today, candidate.date, humanBirthday, petBirthday, species, dogSize);
      return {
        status: "future",
        target,
        startDate: today,
        endDate: target.date
      };
    }

    if (high === MAX_SEARCH_DAYS) break;
    high = Math.min(high * 2, MAX_SEARCH_DAYS);
  }

  return {
    status: "none",
    target: null,
    startDate: today,
    endDate: addDays(today, MAX_SEARCH_DAYS)
  };
}

export function ageYearsFromDays(days) {
  return days / YEAR_DAYS;
}
