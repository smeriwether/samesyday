import {
  CAT_CONVERSION,
  addDays,
  ageYearsFromDays,
  calculateSamesyDay,
  comparisonForDate,
  daysBetween,
  formatDateInput,
  inferDogSize,
  parseDateInput,
  petCurve,
  todayUtc
} from "./calculator.js?v=20260808-deploy-cache-fix";

(function () {
  const form = document.getElementById("samesy-form");
  const petTypeInput = document.getElementById("pet-type");
  const petBirthdayInput = document.getElementById("pet-birthday");
  const humanBirthdayInput = document.getElementById("human-birthday");
  const dogBreedInput = document.getElementById("dog-breed");
  const dogDetails = document.getElementById("dog-details");
  const errorText = document.getElementById("form-error");
  const answerPanel = document.getElementById("answer-panel");
  const answerLabel = document.getElementById("answer-label");
  const answerDate = document.getElementById("answer-date");
  const answerCopy = document.getElementById("answer-copy");
  const humanAgeStat = document.getElementById("human-age-stat");
  const petAgeStat = document.getElementById("pet-age-stat");
  const calculationDetails = document.getElementById("calculation-details");
  const calculationBreakdown = document.getElementById("calculation-breakdown");
  const chartCanvas = document.getElementById("age-chart");
  const chartSummary = document.getElementById("chart-summary");
  const fieldControls = {
    petType: petTypeInput,
    dogBreed: dogBreedInput,
    petBirthday: petBirthdayInput,
    humanBirthday: humanBirthdayInput
  };
  let lastChartArgs = null;

  function formatDate(date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  function plural(value, noun) {
    return `${value.toLocaleString()} ${noun}${value === 1 ? "" : "s"}`;
  }

  function formatDecimal(value, maximumFractionDigits = 1) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits
    });
  }

  function formatRoundedDays(value) {
    return Math.round(value).toLocaleString("en-US");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function validationError(field, message) {
    const error = new Error(message);
    error.field = field;
    return error;
  }

  function formatAgeYears(days) {
    const years = ageYearsFromDays(days);
    if (years < 1) {
      return `${Math.max(0, Math.round(days)).toLocaleString()}d`;
    }
    if (years < 10) {
      return `${years.toFixed(1)}y`;
    }
    return `${Math.round(years).toLocaleString()}y`;
  }

  function sizeLabel(size) {
    return {
      small: "small-dog",
      medium: "medium-dog",
      large: "large-dog",
      giant: "giant-dog"
    }[size] || "medium-dog";
  }

  function describeCurve(species, dogSizeInfo, breed) {
    if (species === "cat") {
      return "Using the common cat conversion: 1 cat year is about 15 human years, 2 cat years is about 24, then each additional cat year adds about 4.";
    }

    const label = sizeLabel(dogSizeInfo.size);
    if (!dogSizeInfo.recognized && dogSizeInfo.inferred) {
      return `${breed || "That breed"} is not in the size list, so this uses the ${label} curve near the 7-to-1 shortcut.`;
    }
    if (dogSizeInfo.inferred && breed) {
      return `Based on ${breed}, this uses the ${label} curve near the 7-to-1 shortcut.`;
    }
    return `Using the ${label} curve near the 7-to-1 shortcut.`;
  }

  function validateInputs() {
    const species = petTypeInput.value;
    const humanBirthday = parseDateInput(humanBirthdayInput.value);
    const petBirthday = parseDateInput(petBirthdayInput.value);
    const today = todayUtc();

    if (species !== "cat" && species !== "dog") {
      throw validationError("petType", "Choose cat or dog.");
    }

    const breed = dogBreedInput.value.trim();
    if (species === "dog" && !breed) {
      throw validationError("dogBreed", "Enter your dog's breed so the calculator can choose an aging curve.");
    }

    if (!petBirthday) {
      throw validationError("petBirthday", "Add your pet's birthday.");
    }

    if (!humanBirthday) {
      throw validationError("humanBirthday", "Add your birthday.");
    }

    if (petBirthday > today) {
      throw validationError("petBirthday", "Use a pet birthday that is today or earlier.");
    }

    if (humanBirthday > today) {
      throw validationError("humanBirthday", "Use your birthday or an earlier date.");
    }

    const dogSizeInfo = species === "dog"
      ? inferDogSize(breed)
      : { size: "cat", inferred: false, recognized: true };

    return {
      species,
      humanBirthday,
      petBirthday,
      breed,
      dogSizeInfo
    };
  }

  function clearFieldError(field) {
    const control = fieldControls[field];
    if (control) {
      control.removeAttribute("aria-invalid");
      if (control.getAttribute("aria-describedby") === "form-error") {
        control.removeAttribute("aria-describedby");
      }
    }
  }

  function showFieldError(field) {
    const control = fieldControls[field];
    if (control) {
      control.setAttribute("aria-invalid", "true");
      control.setAttribute("aria-describedby", "form-error");
      control.focus();
    }
  }

  function showError(message, field) {
    errorText.textContent = message;
    errorText.classList.add("is-visible");
    hideAnswer();
    if (field) {
      showFieldError(field);
    }
  }

  function clearError() {
    errorText.textContent = "";
    errorText.classList.remove("is-visible");
    Object.keys(fieldControls).forEach(clearFieldError);
  }

  function hideAnswer() {
    answerPanel.classList.add("is-hidden");
    lastChartArgs = null;
  }

  function handleInputChange() {
    clearError();
    hideAnswer();
  }

  function updateSpeciesFields() {
    const isDog = petTypeInput.value === "dog";
    dogDetails.hidden = !isDog;
    dogBreedInput.disabled = !isDog;
    dogBreedInput.required = isDog;
    if (!isDog) {
      clearFieldError("dogBreed");
    }
  }

  function setDateLimits() {
    const maxDate = formatDateInput(todayUtc());
    petBirthdayInput.max = maxDate;
    humanBirthdayInput.max = maxDate;
  }

  function revealAnswerPanel() {
    answerPanel.classList.remove("is-hidden");
    requestAnimationFrame(() => {
      answerPanel.focus();
    });
  }

  function buildAnswerCopy(result, inputs) {
    const speciesName = inputs.species === "cat" ? "cat" : "dog";
    const curveCopy = describeCurve(inputs.species, inputs.dogSizeInfo, inputs.breed);

    if (result.status === "future") {
      const daysAway = daysBetween(todayUtc(), result.target.date);
      return `That is ${plural(daysAway, "day")} from today. On that date, your ${speciesName}'s pet-human age catches your actual lived days. ${curveCopy}`;
    }

    if (result.status === "today") {
      return `It is today. Your actual lived days and your ${speciesName}'s pet-human days are within one day of each other. ${curveCopy}`;
    }

    if (result.status === "passed" && result.target) {
      const daysAgo = daysBetween(result.target.date, todayUtc());
      return `Your Samesy Day was ${plural(daysAgo, "day")} ago. Your ${speciesName}'s pet-human age is already ahead now, so there is not another future crossing on this curve. ${curveCopy}`;
    }

    return `Your ${speciesName}'s pet-human age is already ahead, and there is not a future crossing on this curve. ${curveCopy}`;
  }

  function renderCalculationBreakdown(comparison, inputs) {
    const petLabel = inputs.species === "cat" ? "Cat" : "Dog";
    const actualPetYears = ageYearsFromDays(comparison.petDays);
    const modeledPetYears = ageYearsFromDays(comparison.petEquivalentDays);
    const curveCopy = inputs.species === "cat"
      ? `Cat conversion: 1 cat year is about ${CAT_CONVERSION.firstYear} human years, 2 cat years is about ${CAT_CONVERSION.secondYearTotal}, then each later cat year adds about ${CAT_CONVERSION.laterYear}.`
      : (() => {
          const curve = petCurve(inputs.species, inputs.dogSizeInfo.size);
          const secondYear = (curve.firstYear + curve.adultYear) / 2;
          return `${sizeLabel(inputs.dogSizeInfo.size)} curve: first year ${formatDecimal(curve.firstYear, 1)}x, second year ${formatDecimal(secondYear, 1)}x, later years ${formatDecimal(curve.adultYear, 1)}x.`;
        })();
    const rows = [
      ["Days lived", `You: ${plural(comparison.humanDays, "day")}. ${petLabel}: ${plural(comparison.petDays, "day")}.`],
      ["Pet actual age", `${formatDecimal(actualPetYears, 2)} years old.`],
      ["Curve used", curveCopy],
      ["Modeled pet age", `${formatDecimal(modeledPetYears, 2)} human years, or ${formatRoundedDays(comparison.petEquivalentDays)} pet-human days.`]
    ];

    calculationBreakdown.innerHTML = `<dl>${rows.map(([term, description]) => `
      <div>
        <dt>${escapeHtml(term)}</dt>
        <dd>${escapeHtml(description)}</dd>
      </div>
    `).join("")}</dl>`;
    calculationDetails.open = false;
  }

  function renderAnswer(result, inputs) {
    if (result.status === "none" || (result.status === "passed" && !result.target)) {
      answerLabel.textContent = "No future Samesy Day";
      answerDate.textContent = "Already ahead";
      const today = comparisonForDate(todayUtc(), inputs.humanBirthday, inputs.petBirthday, inputs.species, inputs.dogSizeInfo.size);
      answerCopy.textContent = buildAnswerCopy(result, inputs);
      humanAgeStat.textContent = formatAgeYears(today.humanDays);
      petAgeStat.textContent = formatAgeYears(today.petEquivalentDays);
      renderCalculationBreakdown(today, inputs);
      drawChart({
        startDate: result.startDate,
        endDate: result.endDate,
        humanBirthday: inputs.humanBirthday,
        petBirthday: inputs.petBirthday,
        species: inputs.species,
        dogSize: inputs.dogSizeInfo.size,
        targetDate: null
      });
      revealAnswerPanel();
      return;
    }

    const target = result.target;
    answerLabel.textContent = result.status === "passed" ? "Your Samesy Day already passed" : "Your Samesy Day";
    answerDate.textContent = formatDate(target.date);
    answerCopy.textContent = buildAnswerCopy(result, inputs);
    humanAgeStat.textContent = formatAgeYears(target.humanDays);
    petAgeStat.textContent = formatAgeYears(target.petEquivalentDays);
    renderCalculationBreakdown(target, inputs);
    drawChart({
      startDate: result.startDate,
      endDate: result.endDate,
      humanBirthday: inputs.humanBirthday,
      petBirthday: inputs.petBirthday,
      species: inputs.species,
      dogSize: inputs.dogSizeInfo.size,
      targetDate: target.date
    });
    revealAnswerPanel();
  }

  function updateChartSummary({ startDate, endDate, species, targetDate }) {
    const speciesName = species === "cat" ? "cat" : "dog";
    const dateRange = `${formatDate(startDate)} through ${formatDate(endDate)}`;
    chartSummary.textContent = targetDate
      ? `The chart compares your lived days with your ${speciesName}'s pet-human age from ${dateRange}. The person and pet-human lines meet on ${formatDate(targetDate)}.`
      : `The chart compares your lived days with your ${speciesName}'s pet-human age from ${dateRange}. The lines do not meet in the displayed range.`;
  }

  function drawChart({ startDate, endDate, humanBirthday, petBirthday, species, dogSize, targetDate }) {
    lastChartArgs = { startDate, endDate, humanBirthday, petBirthday, species, dogSize, targetDate };
    const canvas = chartCanvas;
    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(240, Math.floor(rect.height));
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const padding = { top: 24, right: 20, bottom: 42, left: 44 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const totalDays = Math.max(1, daysBetween(startDate, endDate));
    const samples = 80;
    const humanPoints = [];
    const petPoints = [];
    let maxDays = 1;

    for (let index = 0; index <= samples; index += 1) {
      const offset = Math.round((totalDays * index) / samples);
      const date = addDays(startDate, offset);
      const comparison = comparisonForDate(date, humanBirthday, petBirthday, species, dogSize);
      maxDays = Math.max(maxDays, comparison.humanDays, comparison.petEquivalentDays);
      humanPoints.push({ date, value: comparison.humanDays });
      petPoints.push({ date, value: comparison.petEquivalentDays });
    }

    const xForDate = (date) => {
      const offset = daysBetween(startDate, date);
      return padding.left + (offset / totalDays) * plotWidth;
    };

    const yForValue = (value) => {
      return padding.top + plotHeight - (value / maxDays) * plotHeight;
    };

    context.fillStyle = "#fffffa";
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(23, 33, 31, 0.1)";
    context.lineWidth = 1;
    for (let tick = 0; tick <= 4; tick += 1) {
      const y = padding.top + (plotHeight * tick) / 4;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
    }

    function drawLine(points, color) {
      context.strokeStyle = color;
      context.lineWidth = 4;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.beginPath();
      points.forEach((point, index) => {
        const x = xForDate(point.date);
        const y = yForValue(point.value);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    }

    drawLine(humanPoints, "#3157b7");
    drawLine(petPoints, "#df6948");

    if (targetDate) {
      const x = xForDate(targetDate);
      context.strokeStyle = "rgba(10, 79, 75, 0.55)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, padding.top - 4);
      context.lineTo(x, padding.top + plotHeight + 6);
      context.stroke();

      context.fillStyle = "#0a4f4b";
      context.beginPath();
      context.arc(x, yForValue(comparisonForDate(targetDate, humanBirthday, petBirthday, species, dogSize).humanDays), 5, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = "#63706b";
    context.font = "650 12px Inter, system-ui, sans-serif";
    context.fillText(formatShortDate(startDate), padding.left, height - 14);
    const endLabel = formatShortDate(endDate);
    context.fillText(endLabel, width - padding.right - context.measureText(endLabel).width, height - 14);

    context.fillStyle = "#3157b7";
    context.fillText("Person", padding.left, 18);
    context.fillStyle = "#df6948";
    context.fillText("Pet-human", padding.left + 70, 18);
    updateChartSummary({ startDate, endDate, species, targetDate });
  }

  petTypeInput.addEventListener("change", () => {
    handleInputChange();
    updateSpeciesFields();
  });
  dogBreedInput.addEventListener("input", handleInputChange);
  petBirthdayInput.addEventListener("input", handleInputChange);
  humanBirthdayInput.addEventListener("input", handleInputChange);

  let resizeFrame = null;
  window.addEventListener("resize", () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      if (!answerPanel.classList.contains("is-hidden") && lastChartArgs) {
        drawChart(lastChartArgs);
      }
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      clearError();
      const inputs = validateInputs();
      const result = calculateSamesyDay({
        humanBirthday: inputs.humanBirthday,
        petBirthday: inputs.petBirthday,
        species: inputs.species,
        dogSize: inputs.dogSizeInfo.size
      });
      renderAnswer(result, inputs);
    } catch (error) {
      showError(error.message, error.field);
    }
  });

  setDateLimits();
  updateSpeciesFields();
})();
