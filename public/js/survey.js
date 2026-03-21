const form = document.getElementById("surveyForm");
const questionContainer = document.getElementById("questionContainer");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const skipBtn = document.getElementById("skipBtn");
const submitBtn = document.getElementById("submitBtn");
const submitBtnTop = document.getElementById("submitBtnTop");
const topSubmitWrap = document.getElementById("topSubmitWrap");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const progressSubtext = document.getElementById("progressSubtext");
const heroInsightTitle = document.getElementById("heroInsightTitle");
const heroInsightText = document.getElementById("heroInsightText");

const STORAGE_KEY = "campus_mobility_survey_v3";

const savedState = loadSavedState();
const answers = savedState.answers || {};
let history = savedState.history || [];
let currentQuestionId = savedState.currentQuestionId || "role";
let isSubmitting = false;

const iconMap = {
    "Student": "🎓",
    "Personeel": "💼",
    "Overig": "👤",
    "1": "1️⃣",
    "2": "2️⃣",
    "3": "3️⃣",
    "4": "4️⃣",
    "5+": "5️⃣",
    "Auto": "🚗",
    "Openbaar vervoer": "🚌",
    "Fiets": "🚲",
    "Te voet": "🚶",
    "Anders": "✨",
    "Ja": "👍",
    "Nee": "👎",
    "Misschien": "🤔",
    "Altijd": "🔥",
    "Vaak": "✅",
    "Soms": "🔁",
    "Zelden": "🌙",
    "Nooit": "🚫",
    "Zeer tevreden": "😄",
    "Tevreden": "🙂",
    "Neutraal": "😐",
    "Ontevreden": "🙁",
    "Zeer ontevreden": "😣",
    "Lagere kost": "💶",
    "Minder uitstoot": "🌱",
    "Gezelliger": "👥",
    "Makkelijker parkeren": "🅿️",
    "Tijdswinst": "⏱️",
    "Andere reden": "✍️",
    "Enkel met studenten": "🧑‍🎓",
    "Maakt mij niet uit": "🤷",
    "Betrouwbaarheid": "🕒",
    "Veiligheid": "🛡️",
    "Flexibiliteit": "🧭",
    "Zeker zijn van rit terug": "🔁",
    "Moeilijk te combineren met planning": "📅",
    "Liever onafhankelijk": "🧍",
    "Onvoldoende vertrouwen": "🔒",
    "Te weinig mensen uit mijn buurt": "📍"
};

const questions = {
    role: {
        label: "Ben je student, personeel of overig?",
        help: "Zo kunnen we later beter analyseren welke groepen het vaakst naar de campus komen.",
        type: "choice",
        options: [
            { value: "Student", subtext: "Je volgt les of studeert op de campus." },
            { value: "Personeel", subtext: "Je werkt op of voor de campus." },
            { value: "Overig", subtext: "Bezoeker, extern, stagiair of andere situatie." }
        ],
        next: () => "campusDays"
    },

    campusDays: {
        label: "Hoeveel dagen per week kom je meestal naar de campus?",
        help: "Kies wat het dichtst bij jouw gemiddelde ligt.",
        type: "choice",
        options: ["1", "2", "3", "4", "5+"],
        next: () => "transport"
    },

    transport: {
        label: "Met welk vervoersmiddel kom je meestal naar de campus?",
        help: "We tonen daarna enkel vragen die voor jouw situatie relevant zijn.",
        type: "choice",
        options: [
            { value: "Auto", subtext: "Je rijdt meestal met de wagen naar de campus." },
            { value: "Openbaar vervoer", subtext: "Bus, trein, tram of combinatie." },
            { value: "Fiets", subtext: "Gewone fiets of elektrische fiets." },
            { value: "Te voet", subtext: "Je woont op wandelafstand." },
            { value: "Anders", subtext: "Bijvoorbeeld brommer, step of andere mix." }
        ],
        next: (value) => {
            if (value === "Auto") return "distance";
            if (value === "Openbaar vervoer") return "ovSatisfaction";
            if (value === "Fiets") return "bikeDistance";
            if (value === "Te voet") return "walkTime";
            return "otherTransport";
        }
    },

    distance: {
        label: "Van hoe ver kom je ongeveer naar de campus?",
        help: "Geef een schatting in kilometer.",
        type: "input",
        inputType: "number",
        placeholder: "Bijvoorbeeld 18",
        next: () => "drivesAlone"
    },

    drivesAlone: {
        label: "Rijd je meestal alleen met de auto?",
        help: "Dit helpt ons om het potentieel voor carpoolen in te schatten.",
        type: "choice",
        options: [
            { value: "Ja", subtext: "Meestal alleen in de wagen." },
            { value: "Nee", subtext: "Ik rij vaak al samen met iemand." }
        ],
        next: (value) => value === "Ja" ? "parkingStress" : "carpoolFrequency"
    },

    parkingStress: {
        label: "Is parkeren op of rond de campus soms lastig voor jou?",
        help: "Ook parkeerdruk kan een reden zijn waarom carpoolen aantrekkelijker wordt.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: () => "openToCarpool"
    },

    carpoolFrequency: {
        label: "Hoe vaak carpool je momenteel al?",
        help: "Zelfs occasioneel carpoolen is voor ons interessante data.",
        type: "choice",
        options: ["Altijd", "Vaak", "Soms", "Zelden"],
        next: () => "freeSeats"
    },

    freeSeats: {
        label: "Met hoeveel personen zit je meestal in de auto?",
        help: "Een schatting is voldoende.",
        type: "input",
        inputType: "number",
        placeholder: "Bijvoorbeeld 2",
        next: () => "openToCarpool"
    },

    openToCarpool: {
        label: "Zou je openstaan om vaker te carpoolen?",
        help: "We willen vooral weten of er bereidheid is, ook als dat vandaag nog niet gebeurt.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: (value) => {
            if (value === "Ja" || value === "Misschien") return "carpoolReason";
            return "carpoolBarrier";
        }
    },

    carpoolReason: {
        label: "Wat zou voor jou de grootste motivatie zijn om te carpoolen?",
        help: "Kies de reden die voor jou het zwaarst doorweegt.",
        type: "choice",
        options: ["Lagere kost", "Minder uitstoot", "Gezelliger", "Makkelijker parkeren", "Tijdswinst", "Andere reden"],
        next: () => "matchingPreference"
    },

    matchingPreference: {
        label: "Wat is voor jou het belangrijkst bij een goed carpoolplatform?",
        help: "Zo begrijpen we welke functies het meeste vertrouwen en gebruik kunnen creëren.",
        type: "choice",
        options: ["Betrouwbaarheid", "Veiligheid", "Flexibiliteit", "Zeker zijn van rit terug"],
        next: () => "ovToCarpoolStudent"
    },

    carpoolBarrier: {
        label: "Wat houdt je het meest tegen om te carpoolen?",
        help: "Kies wat voor jou de grootste drempel is.",
        type: "choice",
        options: [
            "Moeilijk te combineren met planning",
            "Liever onafhankelijk",
            "Onvoldoende vertrouwen",
            "Te weinig mensen uit mijn buurt"
        ],
        next: () => "sustainabilityPriority"
    },

    ovSatisfaction: {
        label: "Hoe tevreden ben je over het openbaar vervoer naar de campus?",
        help: "Denk aan betrouwbaarheid, reistijd en comfort.",
        type: "choice",
        options: ["Zeer tevreden", "Tevreden", "Neutraal", "Ontevreden", "Zeer ontevreden"],
        next: () => "ovToCarpool"
    },

    ovToCarpool: {
        label: "Zou je carpool overwegen als het praktisch en veilig geregeld is?",
        help: "Bijvoorbeeld als routes en tijdstippen makkelijk op elkaar afgestemd worden.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: (value) => {
            if (value === "Ja" || value === "Misschien") return "ovToCarpoolStudent";
            return "sustainabilityPriority";
        }
    },

    ovToCarpoolStudent: {
        label: "Met wie zou je liefst carpoolen?",
        help: "Dit helpt om te begrijpen hoe belangrijk herkenbaarheid of doelgroep is.",
        type: "choice",
        options: ["Enkel met studenten", "Maakt mij niet uit"],
        next: () => "sustainabilityPriority"
    },

    bikeDistance: {
        label: "Hoeveel kilometer fiets je ongeveer naar de campus?",
        help: "Een ruwe schatting is genoeg.",
        type: "input",
        inputType: "number",
        placeholder: "Bijvoorbeeld 6",
        next: () => "bikeSwitch"
    },

    bikeSwitch: {
        label: "Zou je bij slecht weer of een langere afstand soms carpool overwegen?",
        help: "Zelfs een occasionele overstap is nuttige info voor ons onderzoek.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: (value) => {
            if (value === "Ja" || value === "Misschien") return "ovToCarpoolStudent";
            return "sustainabilityPriority";
        }
    },

    walkTime: {
        label: "Hoe lang wandel je ongeveer naar de campus?",
        help: "Vul het aantal minuten in.",
        type: "input",
        inputType: "number",
        placeholder: "Bijvoorbeeld 12",
        next: () => "walkSwitch"
    },

    walkSwitch: {
        label: "Zou je voor een verdere campuslocatie ooit carpool overwegen?",
        help: "Voor korte afstanden is dat vaak niet relevant, maar voor andere locaties misschien wel.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: (value) => {
            if (value === "Ja" || value === "Misschien") return "ovToCarpoolStudent";
            return "sustainabilityPriority";
        }
    },

    otherTransport: {
        label: "Welk ander vervoersmiddel gebruik je meestal?",
        help: "Bijvoorbeeld brommer, step, trein + fiets, ...",
        type: "input",
        inputType: "text",
        placeholder: "Typ hier je vervoersmiddel",
        next: () => "sustainabilityPriority"
    },

    sustainabilityPriority: {
        label: "Hoe belangrijk vind jij duurzaamheid bij je keuze van vervoer?",
        help: "Sleep de knop of klik op een niveau dat het best past bij jouw gevoel.",
        type: "range",
        min: 1,
        max: 4,
        valueLabels: {
            1: "Niet belangrijk",
            2: "Beetje belangrijk",
            3: "Belangrijk",
            4: "Heel belangrijk"
        },
        next: () => "sustainabilityOpinion"
    },

    sustainabilityOpinion: {
        label: "Denk je dat een carpoolplatform nuttig zou zijn voor deze campus?",
        help: "Je mag hier puur je eigen gevoel volgen.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: () => "motivation"
    },

    motivation: {
        label: "Waarom denk je dat dit wel of niet nuttig zou zijn?",
        help: "Hier kan je kort je mening of ervaring delen.",
        type: "textarea",
        placeholder: "Bijvoorbeeld: veel studenten komen uit dezelfde regio, parking is lastig, OV sluit niet goed aan, ...",
        required: false,
        next: () => "existingPlatform"
    },

    existingPlatform: {
        label: "Wist je dat er vandaag al een initiatief bestaat?",
        help: "Deze info geven we hier pas op het einde mee zodat je antwoorden niet beïnvloed worden.",
        type: "info",
        content: "Voor wie nu al wil starten: op <a href='https://www.carpool.be' target='_blank' rel='noopener noreferrer'>carpool.be</a> kun je vandaag al ritten zoeken of aanbieden.",
        next: () => "email"
    },

    email: {
        label: "Wil je je e-mailadres achterlaten voor verdere opvolging of resultaten?",
        help: "Dit is volledig optioneel. We gebruiken dit enkel om je eventueel te contacteren over de resultaten of een testfase.",
        type: "input",
        inputType: "email",
        placeholder: "jouwmail@voorbeeld.be",
        required: false,
        next: () => "summary"
    },

    summary: {
        label: "Klaar! Kijk nog even je antwoorden na.",
        help: "Je kan hieronder onmiddellijk verzenden of nog iets aanpassen.",
        type: "summary",
        next: () => "done"
    }
};

function loadSavedState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        answers,
        history,
        currentQuestionId
    }));
}

function clearState() {
    localStorage.removeItem(STORAGE_KEY);
}

function normalizeAnswerForDisplay(questionId, value) {
    const question = questions[questionId];
    if (!question) return value;

    if (question.type === "range") {
        return question.valueLabels?.[value] || value;
    }

    return value;
}

function getOptionValue(option) {
    return typeof option === "string" ? option : option.value;
}

function getOptionSubtext(option) {
    return typeof option === "string" ? "" : (option.subtext || "");
}

function getPredictedTotalSteps() {
    const simulatedAnswers = { ...answers };
    const currentLiveValue = getCurrentValue(false);

    if (currentLiveValue !== "") {
        simulatedAnswers[currentQuestionId] = currentLiveValue;
    }

    let qid = "role";
    let count = 0;
    let guard = 0;

    while (qid && qid !== "done" && guard < 100) {
        guard++;
        count++;

        const question = questions[qid];
        const answer = simulatedAnswers[qid];

        if (!question || typeof question.next !== "function") break;
        if (answer === undefined) break;

        const nextQ = question.next(answer);
        if (!nextQ || nextQ === "done") break;

        qid = nextQ;
    }

    return Math.max(count, history.length + 1);
}

function buildFinalPath() {
    const path = [];
    let qid = "role";
    let guard = 0;

    while (qid && qid !== "done" && guard < 100) {
        guard++;
        path.push(qid);

        const answer = answers[qid];
        if (answer === undefined) break;

        const nextQ = questions[qid].next(answer);
        if (!nextQ || nextQ === "done") break;
        qid = nextQ;
    }

    return path;
}

function renderQuestion(questionId) {
    const question = questions[questionId];
    if (!question) return;

    let html = `<div class="question-block">`;
    html += `<div class="question-kicker">Slimme bevraging</div>`;
    html += `<div class="question-label">${question.label}</div>`;

    if (question.help) {
        html += `<p class="question-help">${question.help}</p>`;
    }

    if (question.type === "choice") {
        html += `<div class="choice-grid">`;

        question.options.forEach((option) => {
            const optionValue = getOptionValue(option);
            const optionSubtext = getOptionSubtext(option);
            const selected = answers[questionId] === optionValue ? "selected" : "";
            const icon = iconMap[optionValue] || "•";

            html += `
                <button
                    type="button"
                    class="choice-card ${selected}"
                    data-value="${escapeHtml(optionValue)}"
                    aria-pressed="${answers[questionId] === optionValue ? "true" : "false"}"
                >
                    <div class="choice-icon">${icon}</div>
                    <div class="choice-text-wrap">
                        <div class="choice-text">${optionValue}</div>
                        ${optionSubtext ? `<div class="choice-subtext">${optionSubtext}</div>` : ""}
                    </div>
                </button>
            `;
        });

        html += `</div>`;
    }

    if (question.type === "input") {
        html += `
            <div class="input-wrap">
                <input
                    class="text-input"
                    type="${question.inputType || "text"}"
                    name="question"
                    min="${question.inputType === "number" ? "0" : ""}"
                    step="${question.inputType === "number" ? "any" : ""}"
                    value="${escapeHtml(answers[questionId] || "")}"
                    placeholder="${question.placeholder || ""}"
                    autocomplete="off"
                >
                ${question.inputType === "number" ? `<div class="input-hint">Gebruik enkel een positief getal.</div>` : ""}
            </div>
        `;
    }

    if (question.type === "textarea") {
        html += `
            <div class="input-wrap">
                <textarea
                    class="text-area"
                    name="question"
                    placeholder="${question.placeholder || ""}"
                >${escapeHtml(answers[questionId] || "")}</textarea>
            </div>
        `;
    }

    if (question.type === "range") {
        const currentValue = String(answers[questionId] || "3");

        html += `
            <div class="range-wrap">
                <div class="range-top">
                    <div class="range-live-badge" id="rangeValueBadge">${question.valueLabels[currentValue]}</div>
                </div>

                <div class="range-track-wrap">
                    <input
                        type="range"
                        class="range-input"
                        name="question"
                        min="${question.min}"
                        max="${question.max}"
                        step="1"
                        value="${currentValue}"
                    >
                </div>

                <div class="range-labels" id="rangeLabels">
                    ${Array.from({ length: question.max - question.min + 1 }, (_, i) => {
                        const value = String(question.min + i);
                        const active = value === currentValue ? "active" : "";
                        return `<button type="button" class="range-label ${active}" data-range-value="${value}">${question.valueLabels[value]}</button>`;
                    }).join("")}
                </div>
            </div>
        `;
    }

    if (question.type === "info") {
        html += `
            <div class="info-box">
                <p class="info-text">${question.content}</p>
            </div>
        `;
    }

    if (question.type === "summary") {
        const visiblePath = buildFinalPath();

        html += `<div class="summary-box">`;

        visiblePath.forEach((key) => {
            const q = questions[key];
            if (!q || q.type === "summary" || q.type === "info") return;

            const value = normalizeAnswerForDisplay(key, answers[key] ?? "-");

            html += `
                <div class="summary-item">
                    <strong>${q.label}</strong>
                    <span>${value || "-"}</span>
                </div>
            `;
        });

        html += `</div>`;
        html += `<p class="success-note">Alles ziet er goed uit? Je kan bovenaan of onderaan meteen verzenden.</p>`;
    }

    html += `<div class="error-message" id="errorMessage"></div>`;
    html += `</div>`;

    questionContainer.innerHTML = html;

    bindChoiceCards();
    bindLiveInputs();
    bindRangeButtons();
    updateButtons();
    updateProgress();
    updateHeroInsight();
    saveState();

    const firstField = questionContainer.querySelector("input, textarea, button.choice-card, button.range-label");
    if (firstField) {
        firstField.focus({ preventScroll: true });
    }
}

function bindChoiceCards() {
    const cards = document.querySelectorAll(".choice-card");

    cards.forEach((card) => {
        card.addEventListener("click", () => {
            cards.forEach((c) => {
                c.classList.remove("selected");
                c.setAttribute("aria-pressed", "false");
            });

            card.classList.add("selected");
            card.setAttribute("aria-pressed", "true");

            updateProgress();
            updateHeroInsight();
        });

        card.addEventListener("dblclick", () => {
            card.click();
            nextBtn.click();
        });
    });
}

function bindLiveInputs() {
    const input = document.querySelector('[name="question"]');
    if (!input) return;

    input.addEventListener("input", () => {
        if (questions[currentQuestionId].type === "range") {
            updateRangeUI(input.value);
        }

        updateProgress();
        updateHeroInsight();
    });

    input.addEventListener("change", () => {
        if (questions[currentQuestionId].type === "range") {
            updateRangeUI(input.value);
        }

        updateProgress();
        updateHeroInsight();
    });
}

function bindRangeButtons() {
    const rangeInput = document.querySelector('.range-input');
    const rangeButtons = document.querySelectorAll('[data-range-value]');

    if (!rangeInput || !rangeButtons.length) return;

    rangeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            rangeInput.value = btn.dataset.rangeValue;
            updateRangeUI(btn.dataset.rangeValue);
            updateProgress();
            updateHeroInsight();
        });
    });
}

function updateRangeUI(value) {
    const question = questions[currentQuestionId];
    if (!question || question.type !== "range") return;

    const badge = document.getElementById("rangeValueBadge");
    const labels = document.querySelectorAll('[data-range-value]');

    if (badge) {
        badge.textContent = question.valueLabels[String(value)] || value;
    }

    labels.forEach((label) => {
        label.classList.toggle("active", label.dataset.rangeValue === String(value));
    });
}

function getCurrentValue(trim = true) {
    const question = questions[currentQuestionId];

    if (question.type === "choice") {
        const selected = document.querySelector(".choice-card.selected");
        return selected ? selected.dataset.value : "";
    }

    if (question.type === "summary" || question.type === "info") {
        return "ok";
    }

    const input = document.querySelector('[name="question"]');
    if (!input) return "";

    return trim ? input.value.trim() : input.value;
}

function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function showError(message) {
    const errorMessage = document.getElementById("errorMessage");
    if (errorMessage) {
        errorMessage.textContent = message || "";
    }
}

function validateCurrentQuestion() {
    const question = questions[currentQuestionId];
    const value = getCurrentValue();
    const isRequired = question.required !== false;

    showError("");

    if (question.type !== "summary" && question.type !== "info" && isRequired && !value) {
        showError("Vul eerst een antwoord in.");
        return false;
    }

    if (question.inputType === "number" && value !== "") {
        const numericValue = parseFloat(value);

        if (Number.isNaN(numericValue)) {
            showError("Vul een geldig getal in.");
            return false;
        }

        if (numericValue < 0) {
            showError("Een negatieve waarde is hier niet mogelijk.");
            return false;
        }
    }

    if (currentQuestionId === "email" && value && !validateEmail(value)) {
        showError("Vul een geldig e-mailadres in.");
        return false;
    }

    return true;
}

function updateButtons() {
    prevBtn.style.visibility = history.length === 0 ? "hidden" : "visible";

    const currentQuestion = questions[currentQuestionId];
    const currentValue = answers[currentQuestionId] ?? getCurrentValue();
    const nextQuestion = currentQuestion.next ? currentQuestion.next(currentValue) : "done";
    const isSkippable = currentQuestion.required === false;

    skipBtn.classList.toggle("hidden", !isSkippable || currentQuestion.type === "summary");

    if (currentQuestionId === "summary" || nextQuestion === "done") {
        nextBtn.classList.add("hidden");
        submitBtn.classList.remove("hidden");
    } else {
        nextBtn.classList.remove("hidden");
        submitBtn.classList.add("hidden");
    }

    topSubmitWrap.classList.toggle("hidden", currentQuestionId !== "summary");
}

function updateProgress() {
    const currentStep = history.length + 1;
    const totalSteps = Math.max(getPredictedTotalSteps(), currentStep);
    const progress = Math.max(8, (currentStep / totalSteps) * 100);

    progressBar.style.width = `${progress}%`;
    progressText.textContent = `Stap ${currentStep} van ${totalSteps}`;

    if (currentStep === 1) {
        progressSubtext.textContent = "Je bent net gestart";
    } else if (currentQuestionId === "summary") {
        progressSubtext.textContent = "Laatste controle voor verzenden";
    } else {
        progressSubtext.textContent = `${currentStep - 1} vraag${currentStep - 1 === 1 ? "" : "en"} ingevuld`;
    }
}

function updateHeroInsight() {
    const transport = answers.transport || (currentQuestionId === "transport" ? getCurrentValue() : "");
    const openness = answers.openToCarpool || answers.ovToCarpool || answers.bikeSwitch || answers.walkSwitch || "";
    const sustainability = answers.sustainabilityPriority || (currentQuestionId === "sustainabilityPriority" ? getCurrentValue() : "");

    if (currentQuestionId === "summary") {
        heroInsightTitle.textContent = "Bedankt, jouw input maakt het verschil";
        heroInsightText.textContent = "Je antwoorden helpen ons om te begrijpen waar de grootste kansen en drempels voor slim carpoolen liggen.";
        return;
    }

    if (transport === "Auto") {
        heroInsightTitle.textContent = "Autoverplaatsingen tonen het grootste carpoolpotentieel";
        heroInsightText.textContent = "Vooral ritten met vrije zitplaatsen kunnen een groot verschil maken voor parkeerdruk, kost en uitstoot.";
        return;
    }

    if (transport === "Openbaar vervoer") {
        heroInsightTitle.textContent = "Openbaar vervoer en carpool kunnen elkaar aanvullen";
        heroInsightText.textContent = "Voor sommige trajecten kan een gedeelde rit een praktisch alternatief zijn wanneer timing of verbindingen moeilijk lopen.";
        return;
    }

    if (transport === "Fiets") {
        heroInsightTitle.textContent = "Fietsers zijn al sterk bezig met duurzame mobiliteit";
        heroInsightText.textContent = "Toch kan carpool op piekmomenten, bij slecht weer of voor langere afstanden interessant blijven.";
        return;
    }

    if (transport === "Te voet") {
        heroInsightTitle.textContent = "Wandelaars wonen vaak dicht bij de campus";
        heroInsightText.textContent = "Jullie antwoorden helpen ons begrijpen wanneer carpool wél relevant wordt, bijvoorbeeld voor andere campuslocaties.";
        return;
    }

    if (openness === "Ja") {
        heroInsightTitle.textContent = "Er is duidelijke bereidheid om te carpoolen";
        heroInsightText.textContent = "Dat is sterk onderzoekssignaal: de uitdaging ligt dan vooral in vertrouwen, matching en praktische organisatie.";
        return;
    }

    if (sustainability === "4") {
        heroInsightTitle.textContent = "Duurzaamheid speelt voor jou een grote rol";
        heroInsightText.textContent = "Dat helpt ons om te zien of ecologische motivatie echt meespeelt bij keuzes rond campusmobiliteit.";
        return;
    }

    heroInsightTitle.textContent = "Jouw antwoorden sturen de bevraging slim aan";
    heroInsightText.textContent = "Afhankelijk van jouw vervoerskeuze krijg je enkel de relevante vervolgvragen te zien.";
}

function removeAnswersFromOldBranch(questionId, oldValue, newValue) {
    const oldNext = questions[questionId].next(oldValue);
    const newNext = questions[questionId].next(newValue);

    if (oldNext === newNext) return;

    const oldBranch = new Set();
    let oldQid = oldNext;
    let guard = 0;

    while (oldQid && oldQid !== "done" && guard < 100) {
        guard++;
        oldBranch.add(oldQid);

        const oldAnswer = answers[oldQid];
        if (oldAnswer === undefined) break;

        oldQid = questions[oldQid].next(oldAnswer);
    }

    oldBranch.forEach((key) => {
        delete answers[key];
    });

    history = history.filter((id) => !oldBranch.has(id));
}

function goToNextQuestion() {
    if (!validateCurrentQuestion()) return;

    const value = getCurrentValue();

    if (currentQuestionId !== "summary" && currentQuestionId !== "info") {
        const previousValue = answers[currentQuestionId];
        answers[currentQuestionId] = value;

        if (previousValue !== undefined && previousValue !== value) {
            removeAnswersFromOldBranch(currentQuestionId, previousValue, value);
        }
    }

    const nextQuestionId = questions[currentQuestionId].next(value);

    if (nextQuestionId && nextQuestionId !== "done") {
        history.push(currentQuestionId);
        currentQuestionId = nextQuestionId;
        renderQuestion(currentQuestionId);
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

nextBtn.addEventListener("click", goToNextQuestion);

prevBtn.addEventListener("click", () => {
    if (history.length === 0) return;

    currentQuestionId = history.pop();
    renderQuestion(currentQuestionId);
});

skipBtn.addEventListener("click", () => {
    showError("");
    answers[currentQuestionId] = "";
    goToNextQuestion();
});

form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();

        if (!nextBtn.classList.contains("hidden")) {
            nextBtn.click();
        } else if (!submitBtn.classList.contains("hidden")) {
            submitBtn.click();
        }
    }
});

async function submitSurvey() {
    if (isSubmitting) return;
    if (!validateCurrentQuestion()) return;

    if (currentQuestionId !== "summary" && currentQuestionId !== "info") {
        answers[currentQuestionId] = getCurrentValue();
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtnTop.disabled = true;
    submitBtn.innerHTML = `<span class="loading-spinner"></span>Bezig met verzenden`;
    submitBtnTop.innerHTML = `<span class="loading-spinner"></span>Bezig`;

    try {
        const finalPath = buildFinalPath();

        const payload = {
            answers,
            visiblePath: finalPath,
            submittedAt: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        const response = await fetch(window.SURVEY_CONFIG.submitUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            clearState();
            window.location.href = data.redirectUrl || window.SURVEY_CONFIG.thankYouUrl;
            return;
        }

        showError(data.message || "Opslaan mislukt. Probeer opnieuw.");
    } catch (error) {
        console.error("Fout bij verzenden:", error);
        showError("Er is iets misgelopen bij het verzenden. Probeer opnieuw.");
    } finally {
        isSubmitting = false;
        submitBtn.disabled = false;
        submitBtnTop.disabled = false;
        submitBtn.innerHTML = "Verzenden";
        submitBtnTop.innerHTML = "Verzenden";
    }
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitSurvey();
});

if (submitBtnTop) {
    submitBtnTop.addEventListener("click", async (e) => {
        e.preventDefault();
        await submitSurvey();
    });
}

renderQuestion(currentQuestionId);