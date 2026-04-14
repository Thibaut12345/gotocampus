const QUESTION_LABELS = {
    role: "Ben je student, personeel of overig?",
    campusDays: "Hoeveel dagen per week kom je meestal naar de campus?",
    transport: "Met welk vervoersmiddel kom je meestal naar de campus?",
    distance: "Van hoe ver kom je ongeveer naar de campus?",
    drivesAlone: "Rijd je meestal alleen met de auto?",
    parkingStress: "Is parkeren op of rond de campus soms lastig voor jou?",
    carpoolFrequency: "Hoe vaak carpool je momenteel al?",
    freeSeats: "Met hoeveel personen zit je meestal in de auto?",
    openToCarpool: "Zou je openstaan om vaker te carpoolen?",
    carpoolReason: "Wat zou voor jou de grootste motivatie zijn om te carpoolen?",
    matchingPreference: "Wat is voor jou het belangrijkst bij een goed carpoolplatform?",
    carpoolBarrier: "Wat houdt je het meest tegen om te carpoolen?",
    ovSatisfaction: "Hoe tevreden ben je over het openbaar vervoer naar de campus?",
    ovToCarpool: "Zou je carpool overwegen als het praktisch en veilig geregeld is?",
    ovToCarpoolStudent: "Met wie zou je liefst carpoolen?",
    bikeDistance: "Hoeveel kilometer fiets je ongeveer naar de campus?",
    bikeSwitch: "Zou je bij slecht weer of een langere afstand soms carpool overwegen?",
    walkTime: "Hoe lang wandel je ongeveer naar de campus?",
    walkSwitch: "Zou je voor een verdere campuslocatie ooit carpool overwegen?",
    otherTransport: "Welk ander vervoersmiddel gebruik je meestal?",
    sustainabilityPriority: "Hoe belangrijk vind jij duurzaamheid bij je keuze van vervoer?",
    sustainabilityOpinion: "Denk je dat een carpoolplatform nuttig zou zijn voor deze campus?",
    motivation: "Waarom denk je dat dit wel of niet nuttig zou zijn?",
    email: "Wil je je e-mailadres achterlaten voor verdere opvolging of resultaten?"
};

const state = {
    rawResponses: [],
    filteredResponses: [],
    charts: {}
};

const roleFilter = document.getElementById("roleFilter");
const transportFilter = document.getElementById("transportFilter");
const opennessFilter = document.getElementById("opennessFilter");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const searchInput = document.getElementById("searchInput");
const textSearchInput = document.getElementById("textSearchInput");

const overviewTitle = document.getElementById("overviewTitle");
const overviewText = document.getElementById("overviewText");
const overviewKpis = document.getElementById("overviewKpis");
const conclusionGrid = document.getElementById("conclusionGrid");
const signalPanel = document.getElementById("signalPanel");

const openTextList = document.getElementById("openTextList");
const textCountBadge = document.getElementById("textCountBadge");
const responsesTableBody = document.getElementById("responsesTableBody");
const responsesCountBadge = document.getElementById("responsesCountBadge");

const responseModal = document.getElementById("responseModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalMeta = document.getElementById("modalMeta");
const modalAnswers = document.getElementById("modalAnswers");

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";

    return new Intl.DateTimeFormat("nl-BE", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(d);
}

function sustainabilityLabel(value) {
    const map = {
        1: "Niet belangrijk",
        2: "Beetje belangrijk",
        3: "Belangrijk",
        4: "Heel belangrijk"
    };
    return map[value] || "-";
}

function countBy(items, selector) {
    const counts = {};
    items.forEach((item) => {
        const key = selector(item);
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
}

function averageOf(items, selector) {
    const values = items
        .map(selector)
        .filter((v) => typeof v === "number" && !Number.isNaN(v));

    if (!values.length) return null;
    return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

function getTopEntry(obj) {
    const entries = Object.entries(obj || {});
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return { label: entries[0][0], value: entries[0][1] };
}

function fillSelect(select, values) {
    const current = select.value;
    const unique = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "nl"));

    select.innerHTML = `<option value="">Alles</option>` + unique
        .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
        .join("");

    if (unique.includes(current)) {
        select.value = current;
    }
}

function getFilteredResponses() {
    const role = roleFilter.value;
    const transport = transportFilter.value;
    const openness = opennessFilter.value;
    const search = searchInput.value.trim().toLowerCase();

    return state.rawResponses.filter((response) => {
        const matchesRole = !role || response.role === role;
        const matchesTransport = !transport || response.transport === transport;
        const matchesOpenness = !openness || response.carpoolOpenness === openness;

        const searchable = [
            response.role,
            response.transport,
            response.carpoolOpenness,
            response.carpoolReason,
            response.carpoolBarrier,
            response.motivation,
            response.otherTransport
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch = !search || searchable.includes(search);

        return matchesRole && matchesTransport && matchesOpenness && matchesSearch;
    });
}

function renderOverview(responses) {
    const total = responses.length;
    const transportCounts = countBy(responses, (r) => r.transport);
    const roleCounts = countBy(responses, (r) => r.role);
    const opennessCounts = countBy(responses, (r) => r.carpoolOpenness);

    const topTransport = getTopEntry(transportCounts);
    const topRole = getTopEntry(roleCounts);

    const openCount = (opennessCounts["Ja"] || 0) + (opennessCounts["Misschien"] || 0);
    const openShare = total ? Number(((openCount / total) * 100).toFixed(1)) : 0;
    const avgSustainability = averageOf(responses, (r) => r.sustainabilityPriority);

    if (!total) {
        overviewTitle.textContent = "Geen resultaten binnen deze filter";
        overviewText.textContent = "Pas je filters aan om opnieuw data te zien.";
        overviewKpis.innerHTML = "";
        return;
    }

    overviewTitle.textContent = "Van antwoorden naar duidelijke conclusies";
    overviewText.textContent =
        "Deze bovenste zone vertaalt je data naar een samenvatting die je snel kan interpreteren. Daarna kan je dieper gaan met grafieken, open antwoorden en individuele responses.";

    const kpis = [
        {
            label: "Totaal responses",
            value: total,
            note: "Aantal antwoorden in huidige selectie"
        },
        {
            label: "Open voor carpool",
            value: `${openShare}%`,
            note: "Ja + Misschien samen"
        },
        {
            label: "Top vervoersmiddel",
            value: topTransport ? topTransport.label : "-",
            note: topTransport ? `${topTransport.value} responses` : "Nog geen patroon"
        },
        {
            label: "Gem. duurzaamheid",
            value: avgSustainability !== null ? `${avgSustainability}/4` : "-",
            note: "Gemiddelde over alle ingevulde scores"
        },
        {
            label: "Grootste doelgroep",
            value: topRole ? topRole.label : "-",
            note: topRole ? `${topRole.value} responses` : "Nog geen patroon"
        }
    ];

    overviewKpis.innerHTML = kpis.map((item) => `
        <article class="kpi-card">
            <div class="kpi-label">${escapeHtml(item.label)}</div>
            <div class="kpi-value">${escapeHtml(item.value)}</div>
            <div class="kpi-note">${escapeHtml(item.note)}</div>
        </article>
    `).join("");
}

function renderConclusions(responses) {
    const total = responses.length;
    const transportCounts = countBy(responses, (r) => r.transport);
    const barrierCounts = countBy(responses, (r) => r.carpoolBarrier);
    const reasonCounts = countBy(responses, (r) => r.carpoolReason);
    const opinionCounts = countBy(responses, (r) => r.sustainabilityOpinion);
    const parkingCounts = countBy(responses, (r) => r.parkingStress);
    const matchingCounts = countBy(responses, (r) => r.matchingPreference);

    const topTransport = getTopEntry(transportCounts);
    const topBarrier = getTopEntry(barrierCounts);
    const topReason = getTopEntry(reasonCounts);
    const topOpinion = getTopEntry(opinionCounts);
    const topParking = getTopEntry(parkingCounts);
    const topMatching = getTopEntry(matchingCounts);

    const openCount = responses.filter(
        (r) => r.carpoolOpenness === "Ja" || r.carpoolOpenness === "Misschien"
    ).length;
    const openShare = total ? Number(((openCount / total) * 100).toFixed(1)) : 0;

    const autoUsers = responses.filter((r) => r.transport === "Auto");
    const autoOpen = autoUsers.filter(
        (r) => r.carpoolOpenness === "Ja" || r.carpoolOpenness === "Misschien"
    ).length;
    const autoPotential = autoUsers.length
        ? Number(((autoOpen / autoUsers.length) * 100).toFixed(1))
        : null;

    const conclusions = [
        {
            title: "Hoofdpatroon",
            text: topTransport
                ? `${topTransport.label} is het dominante vervoersmiddel in deze selectie.`
                : "Er is nog geen dominant vervoersmiddel zichtbaar."
        },
        {
            title: "Carpoolkans",
            text: `${openShare}% van de respondenten staat open voor carpool of sluit het niet uit.`
        },
        {
            title: "Grootste drempel",
            text: topBarrier
                ? `${topBarrier.label} is op dit moment de belangrijkste barrière.`
                : "Er zijn nog te weinig antwoorden om één duidelijke barrière aan te wijzen."
        },
        {
            title: "Sterkste motivator",
            text: topReason
                ? `${topReason.label} is de meest overtuigende reden om mensen richting carpool te bewegen.`
                : "Er zijn nog te weinig antwoorden om één duidelijke motivator aan te wijzen."
        },
        {
            title: "Kern van vertrouwen",
            text: topMatching
                ? `${topMatching.label} springt eruit als belangrijkste eigenschap van een goed platform.`
                : "De gewenste platformeigenschappen zijn nog niet scherp genoeg zichtbaar."
        },
        {
            title: "Mening over het idee",
            text: topOpinion
                ? `De meest voorkomende houding tegenover het platform is: "${topOpinion.label}".`
                : "De houding tegenover het platform is nog niet duidelijk genoeg zichtbaar."
        }
    ];

    conclusionGrid.innerHTML = conclusions.map((item) => `
        <article class="conclusion-card">
            <div class="conclusion-title">${escapeHtml(item.title)}</div>
            <p>${escapeHtml(item.text)}</p>
        </article>
    `).join("");

    const signals = [];

    if (autoPotential !== null) {
        signals.push(`Bij respondenten die met de auto komen, staat ${autoPotential}% open voor carpool of antwoordt misschien.`);
    }

    if (topParking) {
        signals.push(`Bij de parkeervraag komt "${topParking.label}" het vaakst terug, wat kan wijzen op concrete frictie rond bereikbaarheid of comfort.`);
    }

    if (topReason && topBarrier) {
        signals.push(`De combinatie van motivator "${topReason.label}" en barrière "${topBarrier.label}" toont waar communicatie en ontwerp van het platform het meeste effect kunnen hebben.`);
    }

    if (openShare >= 60) {
        signals.push("De bereidheid lijkt hoog genoeg om een eerste testfase of pilootproject geloofwaardig te maken.");
    } else if (openShare >= 40) {
        signals.push("Er is duidelijke interesse, maar waarschijnlijk moet het concept nog sterk worden geframed rond vertrouwen en praktisch gemak.");
    } else if (total > 0) {
        signals.push("De bereidheid lijkt voorlopig beperkt, dus het platform zal sterk moeten inzetten op drempelverlaging en duidelijke meerwaarde.");
    }

    signalPanel.innerHTML = `
        <div class="signal-panel-inner">
            <div class="signal-label">Wat springt eruit?</div>
            <div class="signal-list">
                ${signals.map((text) => `<div class="signal-item">${escapeHtml(text)}</div>`).join("")}
            </div>
        </div>
    `;
}

function destroyChart(key) {
    if (state.charts[key]) {
        state.charts[key].destroy();
    }
}

function createChart(key, canvasId, type, labels, data, extraOptions = {}) {
    destroyChart(key);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    state.charts[key] = new Chart(canvas, {
        type,
        data: {
            labels,
            datasets: [
                {
                    data,
                    borderWidth: 1,
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: type !== "bar",
                    position: "bottom",
                    labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    bodyFont: {
                        size: 12
                    },
                    titleFont: {
                        size: 12
                    }
                }
            },
            scales: type === "bar"
                ? {
                    x: {
                        ticks: {
                            font: { size: 11 }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            font: { size: 11 }
                        }
                    }
                }
                : {},
            ...extraOptions
        }
    });
}

function renderCharts(responses) {
    const transportCounts = countBy(responses, (r) => r.transport);
    const opennessCounts = countBy(responses, (r) => r.carpoolOpenness);
    const roleCounts = countBy(responses, (r) => r.role);
    const barrierCounts = countBy(responses, (r) => r.carpoolBarrier);
    const reasonCounts = countBy(responses, (r) => r.carpoolReason);
    const opinionCounts = countBy(responses, (r) => r.sustainabilityOpinion);

    createChart("transportChart", "transportChart", "doughnut", Object.keys(transportCounts), Object.values(transportCounts));
    createChart("opennessChart", "opennessChart", "doughnut", Object.keys(opennessCounts), Object.values(opennessCounts));
    createChart("roleChart", "roleChart", "bar", Object.keys(roleCounts), Object.values(roleCounts));

    createChart(
        "barrierChart",
        "barrierChart",
        "bar",
        Object.keys(barrierCounts),
        Object.values(barrierCounts),
        {
            indexAxis: "y",
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0, font: { size: 11 } }
                },
                y: {
                    ticks: { font: { size: 11 } }
                }
            }
        }
    );

    createChart(
        "reasonChart",
        "reasonChart",
        "bar",
        Object.keys(reasonCounts),
        Object.values(reasonCounts),
        {
            indexAxis: "y",
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0, font: { size: 11 } }
                },
                y: {
                    ticks: { font: { size: 11 } }
                }
            }
        }
    );

    createChart("opinionChart", "opinionChart", "bar", Object.keys(opinionCounts), Object.values(opinionCounts));
}

function getOpenTextResponses(responses) {
    const search = textSearchInput.value.trim().toLowerCase();

    return responses
        .map((response) => ({
            id: response.id,
            submittedAt: response.submittedAt,
            role: response.role,
            transport: response.transport,
            motivation: (response.motivation || "").trim()
        }))
        .filter((item) => item.motivation !== "")
        .filter((item) => {
            if (!search) return true;
            return item.motivation.toLowerCase().includes(search);
        });
}

function renderOpenText(responses) {
    const items = getOpenTextResponses(responses);
    textCountBadge.textContent = `${items.length} antwoord${items.length === 1 ? "" : "en"}`;

    if (!items.length) {
        openTextList.innerHTML = `<div class="empty-state">Geen open tekstantwoorden gevonden.</div>`;
        return;
    }

    openTextList.innerHTML = items.map((item) => `
        <article class="text-card">
            <div class="text-card-top">
                <div class="text-meta">
                    <span>${escapeHtml(formatDate(item.submittedAt))}</span>
                    <span>${escapeHtml(item.role || "-")}</span>
                    <span>${escapeHtml(item.transport || "-")}</span>
                </div>
            </div>
            <p>${escapeHtml(item.motivation)}</p>
        </article>
    `).join("");
}

function renderResponsesTable(responses) {
    responsesCountBadge.textContent = `${responses.length} resultaat${responses.length === 1 ? "" : "en"}`;

    if (!responses.length) {
        responsesTableBody.innerHTML = `
            <tr>
                <td colspan="7">Geen responses gevonden voor deze filters.</td>
            </tr>
        `;
        return;
    }

    responsesTableBody.innerHTML = responses.map((response, index) => {
        const hasOpenText = response.motivation && response.motivation.trim() !== "" ? "Ja" : "Nee";

        return `
            <tr class="response-row" data-index="${index}">
                <td>${escapeHtml(formatDate(response.submittedAt))}</td>
                <td>${escapeHtml(response.role || "-")}</td>
                <td>${escapeHtml(response.transport || "-")}</td>
                <td>${escapeHtml(response.campusDays || "-")}</td>
                <td>${escapeHtml(response.carpoolOpenness || "-")}</td>
                <td>${escapeHtml(sustainabilityLabel(response.sustainabilityPriority))}</td>
                <td>${hasOpenText}</td>
            </tr>
        `;
    }).join("");

    document.querySelectorAll(".response-row").forEach((row) => {
        row.addEventListener("click", () => {
            const index = Number(row.dataset.index);
            openModal(responses[index]);
        });
    });
}

function openModal(response) {
    modalMeta.innerHTML = `
        <div class="modal-stat">
            <span>Datum</span>
            <strong>${escapeHtml(formatDate(response.submittedAt))}</strong>
        </div>
        <div class="modal-stat">
            <span>Rol</span>
            <strong>${escapeHtml(response.role || "-")}</strong>
        </div>
        <div class="modal-stat">
            <span>Vervoer</span>
            <strong>${escapeHtml(response.transport || "-")}</strong>
        </div>
        <div class="modal-stat">
            <span>Carpool</span>
            <strong>${escapeHtml(response.carpoolOpenness || "-")}</strong>
        </div>
    `;

    const entries = Object.entries(response.answers || {}).sort((a, b) => {
        const aLabel = QUESTION_LABELS[a[0]] || a[0];
        const bLabel = QUESTION_LABELS[b[0]] || b[0];
        return aLabel.localeCompare(bLabel, "nl");
    });

    modalAnswers.innerHTML = entries.map(([key, value]) => `
        <div class="answer-card">
            <div class="answer-question">${escapeHtml(QUESTION_LABELS[key] || key)}</div>
            <div class="answer-value">${escapeHtml(value || "-")}</div>
        </div>
    `).join("");

    responseModal.classList.remove("hidden");
}

function closeModal() {
    responseModal.classList.add("hidden");
}

function getAllQuestionKeys(responses) {
    const set = new Set();

    responses.forEach((response) => {
        Object.keys(response.answers || {}).forEach((key) => {
            if (key) set.add(key);
        });
    });

    return [...set].sort((a, b) => a.localeCompare(b, "nl"));
}

function exportCsv() {
    if (!state.filteredResponses.length) return;

    const allKeys = getAllQuestionKeys(state.filteredResponses);

    const rows = state.filteredResponses.map((response) => {
        const row = {
            submittedAt: response.submittedAt || "",
            role: response.role || "",
            transport: response.transport || "",
            campusDays: response.campusDays || "",
            carpoolOpenness: response.carpoolOpenness || ""
        };

        allKeys.forEach((key) => {
            row[key] = response.answers?.[key] ?? "";
        });

        return row;
    });

    const headers = Object.keys(rows[0]);
    const csv = [
        headers.join(";"),
        ...rows.map((row) =>
            headers
                .map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`)
                .join(";")
        )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mobiliteitsdashboard_export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function updateSidebarActiveLink() {
    const sections = document.querySelectorAll("main section[id]");
    const links = document.querySelectorAll(".sidebar-link");

    let currentId = "";

    sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 140 && rect.bottom >= 140) {
            currentId = section.id;
        }
    });

    links.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${currentId}`);
    });
}

function renderAll() {
    state.filteredResponses = getFilteredResponses();
    renderOverview(state.filteredResponses);
    renderConclusions(state.filteredResponses);
    renderCharts(state.filteredResponses);
    renderOpenText(state.filteredResponses);
    renderResponsesTable(state.filteredResponses);
}

async function loadDashboard() {
    try {
        const response = await fetch("/api/dashboard-data");
        const data = await response.json();

        if (!response.ok || !data.success) {
            overviewTitle.textContent = "Dashboard kon niet geladen worden";
            overviewText.textContent = data.message || "Er liep iets mis bij het ophalen van de data.";
            return;
        }

        state.rawResponses = data.responses || [];

        fillSelect(roleFilter, state.rawResponses.map((r) => r.role));
        fillSelect(transportFilter, state.rawResponses.map((r) => r.transport));

        renderAll();
    } catch (error) {
        console.error(error);
        overviewTitle.textContent = "Dashboard kon niet geladen worden";
        overviewText.textContent = "Er liep iets mis bij het ophalen van de data.";
    }
}

[roleFilter, transportFilter, opennessFilter].forEach((el) => {
    el.addEventListener("change", renderAll);
});

searchInput.addEventListener("input", renderAll);
textSearchInput.addEventListener("input", () => renderOpenText(state.filteredResponses));

resetFiltersBtn.addEventListener("click", () => {
    roleFilter.value = "";
    transportFilter.value = "";
    opennessFilter.value = "";
    searchInput.value = "";
    textSearchInput.value = "";
    renderAll();
});

exportCsvBtn.addEventListener("click", exportCsv);
closeModalBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
});

document.addEventListener("scroll", updateSidebarActiveLink);
window.addEventListener("load", updateSidebarActiveLink);

loadDashboard();