const statNumbers = document.querySelectorAll(".stat-number");
const interactiveCards = document.querySelectorAll(".interactive-card");
const cardMessage = document.getElementById("cardMessage");

function animateValue(element, target) {
    let current = 0;
    const increment = Math.max(1, Math.ceil(target / 30));

    const timer = setInterval(() => {
        current += increment;

        if (current >= target) {
            current = target;
            clearInterval(timer);
        }

        element.textContent = current;
    }, 35);
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            const element = entry.target;
            const target = parseInt(element.dataset.target, 10);

            if (!element.dataset.animated) {
                animateValue(element, target);
                element.dataset.animated = "true";
            }
        }
    });
}, { threshold: 0.6 });

statNumbers.forEach((number) => {
    observer.observe(number);
});

interactiveCards.forEach((card) => {
    card.addEventListener("click", () => {
        const message = card.dataset.message;
        cardMessage.textContent = message;
    });
});

const impactChoices = document.querySelectorAll(".impact-choice");

const impactData = {
    auto: {
        title: "Alleen met de auto",
        description: "Eén persoon rijdt alleen met de auto naar de campus. Dat is vaak comfortabel, maar per persoon meestal de minst efficiënte keuze qua uitstoot en kost.",
        cost: "± €4,00",
        co2: "± 3,6 kg CO₂",
        compare: "Vergelijkbaar met 18 km extra autorijden",
        highlight: "Als meerdere mensen apart rijden, stapelen brandstofverbruik, parkeerdruk en uitstoot zich snel op.",
        label:"ongeveer €16 per week • €192 per semester"
    },
    carpool: {
        title: "Carpoolen met 3",
        description: "Drie mensen delen één auto. Daardoor daalt de uitstoot en kost per persoon sterk, terwijl iedereen nog steeds relatief flexibel blijft.",
        cost: "± €1,33 per persoon",
        co2: "± 1,2 kg CO₂ per persoon",
        compare: "Tot ongeveer 66% minder impact per persoon",
        highlight: "Carpoolen kan dus tegelijk goedkoper, duurzamer en efficiënter zijn, vooral als meerdere mensen een gelijkaardig traject hebben.",
        label:"Ongeveer €1,33 per week"
    },
    bus: {
        title: "Openbaar vervoer",
        description: "Het openbaar vervoer verdeelt de impact over veel reizigers. De exacte uitstoot hangt af van het voertuig en de bezetting, maar per persoon is dit vaak gunstiger dan alleen rijden.",
        cost: "Afhankelijk van abonnement of ticket",
        co2: "Meestal lager per persoon dan solo-auto",
        compare: "Vergelijkbaar met het delen van de impact over tientallen reizigers",
        highlight: "Als de verbinding goed is, kan openbaar vervoer een sterke duurzame optie zijn, al blijft flexibiliteit soms een nadeel.",
        label:"Ongeveer €5 per week"
    },
    fiets: {
        title: "Met de fiets",
        description: "De fiets heeft in gebruik bijna geen directe uitstoot en is voor kortere afstanden vaak de efficiëntste en goedkoopste keuze.",
        cost: "Bijna nihil per rit",
        co2: "Verwaarloosbaar in gebruik",
        compare: "Je bespaart tegelijk uitstoot, brandstof en parkeerdruk",
        highlight: "Voor wie dicht genoeg woont, is fietsen vaak de meest duurzame keuze. Maar voor grotere afstanden kan carpoolen een realistischer alternatief zijn.",
        label:"Ongeveer €0 per week"
    }
};

const impactTitle = document.getElementById("impactTitle");
const impactDescription = document.getElementById("impactDescription");
const impactCost = document.getElementById("impactCost");
const impactCO2 = document.getElementById("impactCO2");
const impactCompare = document.getElementById("impactCompare");
const impactHighlight = document.getElementById("impactHighlight");
const impactLabel = document.getElementById("impactLabel");

impactChoices.forEach((button) => {
    button.addEventListener("click", () => {
        impactChoices.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        const mode = button.dataset.mode;
        const data = impactData[mode];

        impactTitle.textContent = data.title;
        impactDescription.textContent = data.description;
        impactCost.textContent = data.cost;
        impactCO2.textContent = data.co2;
        impactCompare.textContent = data.compare;
        impactHighlight.textContent = data.highlight;
        impactLabel.textContent = data.label;
    });
});