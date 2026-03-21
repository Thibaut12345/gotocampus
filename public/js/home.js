const body = document.body;
const themeToggles = document.querySelectorAll("#themeToggle, #themeToggleMobile");
const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const mobileMenuLinks = document.querySelectorAll(".mobile-nav-links a");

const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
    body.classList.add("dark-mode");
}

themeToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
        body.classList.toggle("dark-mode");
        localStorage.setItem("theme", body.classList.contains("dark-mode") ? "dark" : "light");
    });
});

menuToggle?.addEventListener("click", () => {
    const isOpen = mobileMenu?.classList.toggle("open");
    menuToggle.classList.toggle("active", isOpen);
    menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
});

mobileMenuLinks.forEach((link) => {
    link.addEventListener("click", () => {
        mobileMenu?.classList.remove("open");
        menuToggle?.classList.remove("active");
        menuToggle?.setAttribute("aria-expanded", "false");
    });
});

const distanceRange = document.getElementById("distanceRange");
const daysRange = document.getElementById("daysRange");
const weeksRange = document.getElementById("weeksRange");
const transportMode = document.getElementById("transportMode");

const distanceValue = document.getElementById("distanceValue");
const daysValue = document.getElementById("daysValue");
const weeksValue = document.getElementById("weeksValue");

const resultTitle = document.getElementById("resultTitle");
const resultDistance = document.getElementById("resultDistance");
const resultCost = document.getElementById("resultCost");
const resultCO2 = document.getElementById("resultCO2");
const resultInsight = document.getElementById("resultInsight");
const comparisonText = document.getElementById("comparisonText");

const transportData = {
    auto: {
        title: "Alleen met de auto",
        costPerKm: 0.20,
        co2PerKm: 0.18
    },
    carpool: {
        title: "Carpoolen met 3",
        costPerKm: 0.20 / 3,
        co2PerKm: 0.18 / 3
    },
    bus: {
        title: "Openbaar vervoer",
        costPerKm: 0.10,
        co2PerKm: 0.08
    },
    fiets: {
        title: "Met de fiets",
        costPerKm: 0.02,
        co2PerKm: 0.005
    }
};

function formatEuro(value) {
    return "€" + value.toFixed(0);
}

function formatKg(value) {
    return value.toFixed(1) + " kg CO₂";
}

function updateSimulator() {
    if (
        !distanceRange || !daysRange || !weeksRange || !transportMode ||
        !distanceValue || !daysValue || !weeksValue ||
        !resultTitle || !resultDistance || !resultCost || !resultCO2 ||
        !resultInsight || !comparisonText
    ) {
        return;
    }

    const distance = Number(distanceRange.value);
    const days = Number(daysRange.value);
    const weeks = Number(weeksRange.value);
    const mode = transportMode.value;

    distanceValue.textContent = distance;
    daysValue.textContent = days;
    weeksValue.textContent = weeks;

    const totalKm = distance * 2 * days * weeks;

    const current = transportData[mode];
    const auto = transportData.auto;
    const carpool = transportData.carpool;

    const totalCost = totalKm * current.costPerKm;
    const totalCO2 = totalKm * current.co2PerKm;

    const autoCost = totalKm * auto.costPerKm;
    const autoCO2 = totalKm * auto.co2PerKm;
    const carpoolCost = totalKm * carpool.costPerKm;
    const carpoolCO2 = totalKm * carpool.co2PerKm;

    resultTitle.textContent = current.title;
    resultDistance.textContent = `${totalKm} km`;
    resultCost.textContent = formatEuro(totalCost);
    resultCO2.textContent = formatKg(totalCO2);

    if (mode === "auto") {
        resultInsight.textContent = `Als drie mensen dit traject elk apart met de auto doen, loopt de gezamenlijke uitstoot op tot ${formatKg(totalCO2 * 3)}.`;
        comparisonText.textContent = `Met carpoolen zou de kost per persoon dalen van ${formatEuro(autoCost)} naar ongeveer ${formatEuro(carpoolCost)}, en de uitstoot per persoon van ${formatKg(autoCO2)} naar ${formatKg(carpoolCO2)}.`;
    } else if (mode === "carpool") {
        resultInsight.textContent = `Door deze rit te delen, daalt de impact per persoon sterk terwijl het traject hetzelfde blijft.`;
        comparisonText.textContent = `Vergeleken met alleen rijden bespaar je ongeveer ${formatEuro(autoCost - carpoolCost)} en ${formatKg(autoCO2 - carpoolCO2)} per persoon over deze periode.`;
    } else if (mode === "bus") {
        resultInsight.textContent = `Openbaar vervoer spreidt de impact over veel reizigers, waardoor de uitstoot per persoon vaak lager ligt dan bij solo rijden.`;
        comparisonText.textContent = `Vergeleken met alleen rijden bespaar je ongeveer ${formatEuro(autoCost - totalCost)} en ${formatKg(autoCO2 - totalCO2)} over deze periode.`;
    } else if (mode === "fiets") {
        resultInsight.textContent = `Voor dit traject is fietsen bijna de lichtste optie: nauwelijks directe uitstoot en een zeer lage kost.`;
        comparisonText.textContent = `Vergeleken met alleen rijden bespaar je ongeveer ${formatEuro(autoCost - totalCost)} en ${formatKg(autoCO2 - totalCO2)} over deze periode.`;
    }
}

[distanceRange, daysRange, weeksRange, transportMode].forEach((element) => {
    element?.addEventListener("input", updateSimulator);
});

updateSimulator();