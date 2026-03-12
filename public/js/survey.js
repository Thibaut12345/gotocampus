const form = document.getElementById("surveyForm");
const questionContainer = document.getElementById("questionContainer");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const submitBtn = document.getElementById("submitBtn");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const answers = {};
const history = [];
let currentQuestionId = "role";

const iconMap = {
    "Student": "🎓",
    "Personeel": "💼",
    "Overig":"👤",
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
    "Nooit": "🚫",
    "Heel belangrijk": "⭐",
    "Belangrijk": "✨",
    "Beetje belangrijk": "🔹",
    "Niet belangrijk": "▫️",
    "Enkel met studenten":"🧑‍🎓", 
    "Maakt mij niet uit":"🤷"
};

const questions = {
    role: {
        label: "Ben je student, personeel of overig?",
        help: "Zo kunnen we later beter analyseren welke groepen het vaakst naar de campus komen.",
        type: "choice",
        options: ["Student", "Personeel"],
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
        options: ["Auto", "Openbaar vervoer", "Fiets", "Te voet", "Anders"],
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
        options: ["Ja", "Nee"],
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
        label: "Met hoeveel personen zit je in de auto?",
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
            return "sustainabilityOpinion";
        }
    },

    carpoolReason: {
        label: "Wat zou voor jou de grootste motivatie zijn om te carpoolen?",
        help: "Kies de reden die voor jou het zwaarst doorweegt.",
        type: "choice",
        options: ["Lagere kost", "Minder uitstoot", "Gezelliger", "Makkelijker parkeren", "Tijdswinst", "Andere reden"],
        next: () => "ovToCarpoolStudent"
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
        label: "Met wie zou je willen carpolen",
        help: "Dit gaat vooral over de invloed op het willen carpolen",
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
        help: "Dit helpt ons om te begrijpen of ecologische motivatie meespeelt.",
        type: "choice",
        options: ["Heel belangrijk", "Belangrijk", "Beetje belangrijk", "Niet belangrijk"],
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
        required:false,
        next: () => "existingPlatform"
    },

    existingPlatform: {
    label: "Wist je dat er al een initiatief is?",
    help: "Voor wie nu al wil starten: op carpool.be kun je vandaag al ritten zoeken of aanbieden.",
    type: "info",
    content: "Ontdek het bestaande platform op <a href='https://www.carpool.be' target='_blank'>carpool.be</a>.",
    next: () => "email"
},

    email: {
        label: "Wil je je e-mailadres achterlaten voor verdere opvolging of resultaten?",
        help: "Dit is handig als we je later willen contacteren over het onderzoek of de testfase van het platform.",
        type: "input",
        inputType: "email",
        placeholder: "jouwmail@voorbeeld.be",
        required:false,
        next: () => "summary"
    },

    summary: {
        label: "Klaar! Kijk nog even je antwoorden na.",
        help: "Klik op verzenden om alles in de browserconsole te loggen.",
        type: "summary",
        next: () => "done"
    }
};

function getVisiblePath() {
    const path = [];
    let qid = "role";

    while (qid && qid !== "done") {
        path.push(qid);

        if (!(qid in answers)) {
            break;
        }

        const nextQ = questions[qid].next(answers[qid]);
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
            const selected = answers[questionId] === option ? "selected" : "";
            const icon = iconMap[option] || "•";
            html += `
                <div class="choice-card ${selected}" data-value="${option}">
                    <div class="choice-icon">${icon}</div>
                    <div class="choice-text">${option}</div>
                </div>
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
                    min="0"
                    value="${answers[questionId] || ""}"
                    placeholder="${question.placeholder || ""}"
                >
            </div>
        `;
    }

   if (question.type === "textarea") {
    html += `
        <div class="input-wrap">
            <textarea
                class="text-area"
                name="question"
                data-required="${question.required !== false}" 
                placeholder="${question.placeholder || ""}"
            >${answers[questionId] || ""}</textarea>
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
        html += `<div class="summary-box">`;

        Object.entries(answers).forEach(([key, value]) => {
            const q = questions[key];
            if (!q) return;

            html += `
                <div class="summary-item">
                    <strong>${q.label}</strong>
                    <span>${value || "-"}</span>
                </div>
            `;
        });

        html += `</div>`;
        html += `<p class="success-note">Alles ziet er goed uit? Dan mag je verzenden.</p>`;
    }

    html += `<div class="error-message" id="errorMessage"></div>`;
    html += `</div>`;

    questionContainer.innerHTML = html;

    bindChoiceCards();
    updateButtons();
    updateProgress();
}

function bindChoiceCards() {
    const cards = document.querySelectorAll(".choice-card");

    cards.forEach((card) => {
        card.addEventListener("click", () => {
            cards.forEach((c) => c.classList.remove("selected"));
            card.classList.add("selected");
        });

        card.addEventListener("dblclick", () => {
            cards.forEach((c) => c.classList.remove("selected"));
            card.classList.add("selected");
            nextBtn.click();
        });
    });
}

function getCurrentValue() {
    const question = questions[currentQuestionId];

    if (question.type === "choice") {
        const selected = document.querySelector(".choice-card.selected");
        return selected ? selected.dataset.value : "";
    }

    if (question.type === "summary") {
        return "ok";
    }

    const input = document.querySelector('[name="question"]');
    return input ? input.value.trim() : "";
}

function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateCurrentQuestion() {
    const question = questions[currentQuestionId];
    const value = getCurrentValue();
    const errorMessage = document.getElementById("errorMessage");
    const isRequired = question.required !== false;

    if (question.type !== "summary" && question.type !== "info" && isRequired && !value) {
        errorMessage.textContent = "Vul eerst een antwoord in.";
        return false;
    }
    
    if (question.inputType === "number" && parseFloat(value) < 0) {
        errorMessage.textContent = "Een negatieve afstand is niet mogelijk.";
        return false;
    }

    if (currentQuestionId === "email" && value && !validateEmail(value)) {
        errorMessage.textContent = "Vul een geldig e-mailadres in.";
        return false;
    }

    errorMessage.textContent = "";
    return true;
}

function updateButtons() {
    prevBtn.style.visibility = history.length === 0 ? "hidden" : "visible";

    const currentQuestion = questions[currentQuestionId];
    const nextQuestion = currentQuestion.next(answers[currentQuestionId]);

    if (currentQuestionId === "summary" || nextQuestion === "done") {
        nextBtn.classList.add("hidden");
        submitBtn.classList.remove("hidden");
    } else {
        nextBtn.classList.remove("hidden");
        submitBtn.classList.add("hidden");
    }
}

function updateProgress() {
    const path = getVisiblePath();
    const index = Math.max(path.indexOf(currentQuestionId), 0);
    const currentStep = index + 1;
    const totalSteps = Math.max(path.length, currentStep);
    const progress = (currentStep / totalSteps) * 100;

    progressBar.style.width = `${progress}%`;
    progressText.textContent = `Stap ${currentStep} van ${totalSteps}`;
}

nextBtn.addEventListener("click", () => {
    if (!validateCurrentQuestion()) return;

    const value = getCurrentValue();

    if (currentQuestionId !== "summary") {
        answers[currentQuestionId] = value;
    }

    const nextQuestionId = questions[currentQuestionId].next(value);

    if (nextQuestionId && nextQuestionId !== "done") {
        history.push(currentQuestionId);
        currentQuestionId = nextQuestionId;
        renderQuestion(currentQuestionId);
    }
});

prevBtn.addEventListener("click", () => {
    if (history.length === 0) return;

    currentQuestionId = history.pop();
    renderQuestion(currentQuestionId);
});

form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!validateCurrentQuestion()) return;

    console.clear();
    console.log("Resultaten mobiliteitsbevraging:");
    console.log(answers);

    alert("Verzonden! Open de browserconsole om alle antwoorden te zien.");
});

renderQuestion(currentQuestionId);