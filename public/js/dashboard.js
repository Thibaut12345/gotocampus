(() => {
    const rawData = Array.isArray(window.dashboardData) ? window.dashboardData : [];

    const CAMPUS = {
        label: "Campus Gent",
        query: "Gebroeders De Smetstraat 1, 9000 Gent, Belgium",
        fallback: [51.0653, 3.7094]
    };

    const EMISSION_KG_PER_KM = 0.12;

    const state = {
        filters: {
            institution: "all",
            role: "all",
            transport: "all"
        },
        matchLimit: 10,
        respondentSearch: "",
        charts: {},
        currentMatches: [],
        currentRespondents: [],
        maps: {},
        geocodeCache: new Map(),
        campusCoords: null
    };

    function toArray(value) {
        if (Array.isArray(value)) return value;
        if (value === null || value === undefined || value === "") return [];
        return [value];
    }

    function toNumber(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function parseCampusDays(value) {
        if (!value) return 0;
        if (value === "5+") return 5;
        return toNumber(value);
    }

    function parseRealisticDays(value) {
        const map = {
            "Nooit": 0,
            "1 dag per week": 1,
            "2 dagen per week": 2,
            "3 dagen per week": 3,
            "4 of meer dagen per week": 4
        };
        return map[value] ?? 0;
    }

    function flexibilityScore(value) {
        const map = {
            "Bijna niet flexibel": 0,
            "Beperkt flexibel": 1,
            "Redelijk flexibel": 2,
            "Heel flexibel": 3
        };
        return map[value] ?? 0;
    }

    function scheduleScore(value) {
        const map = {
            "Meestal vast": 3,
            "Deels wisselend": 2,
            "Sterk wisselend": 1
        };
        return map[value] ?? 1;
    }

    function parkingPressureScore(value) {
        const map = {
            "Dagelijks of bijna altijd": 4,
            "2 à 3 keer per week": 3,
            "1 keer per week": 2,
            "Regelmatig": 2,
            "Af en toe": 1,
            "Bijna nooit": 0
        };
        return map[value] ?? 0;
    }

    function morningIndex(value) {
        const map = {
            "Voor 8u": 0,
            "8u - 9u": 1,
            "9u - 10u": 2,
            "Na 10u": 3
        };
        return map[value] ?? 99;
    }

    function eveningIndex(value) {
        const map = {
            "Voor 16u": 0,
            "16u - 17u": 1,
            "17u - 18u": 2,
            "Na 18u": 3
        };
        return map[value] ?? 99;
    }

    function nearbyTimeScore(a, b) {
        const morningDiff = Math.abs(morningIndex(a.departureWindowMorning) - morningIndex(b.departureWindowMorning));
        const eveningDiff = Math.abs(eveningIndex(a.departureWindowEvening) - eveningIndex(b.departureWindowEvening));

        if (morningDiff === 0 && eveningDiff === 0) return 1;
        if (morningDiff <= 1 && eveningDiff <= 1) return 0.8;
        if (morningDiff <= 1 && eveningDiff <= 2) return 0.6;
        return 0;
    }

    function postcodeToNumber(value) {
        const n = parseInt(String(value || "").trim(), 10);
        return Number.isFinite(n) ? n : null;
    }

    function postcodeDistance(pc1, pc2) {
        return Math.abs(pc1 - pc2);
    }

    function closeHomeScore(pc1, pc2) {
        if (pc1 == null || pc2 == null) return 0;

        const diff = postcodeDistance(pc1, pc2);

        if (pc1 === pc2) return 1;
        if (diff <= 10) return 0.95;
        if (diff <= 25) return 0.8;
        if (diff <= 40) return 0.6;
        return 0;
    }

    function corridorGroup(pc) {
        if (pc == null) return null;

        if (pc >= 9000 && pc < 9100) return "gent-core";
        if (pc >= 9100 && pc < 9300) return "waasland-gent";
        if (pc >= 9300 && pc < 9500) return "dendermonde-aalst-gent";
        if (pc >= 9500 && pc < 9700) return "ninove-geraardsbergen-gent";
        if (pc >= 9700 && pc < 9800) return "oudenaarde-de-pinte-gent";
        if (pc >= 9800 && pc < 9900) return "deinze-zulte-gent";
        return "other";
    }

    function overlappingTrajectoryScore(a, b) {
        const pcA = a.originAreaNumeric;
        const pcB = b.originAreaNumeric;

        if (pcA == null || pcB == null) return 0;

        const sameCorridor = corridorGroup(pcA) === corridorGroup(pcB);
        if (!sameCorridor) return 0;

        const distanceA = a.carDistanceNumeric || 0;
        const distanceB = b.carDistanceNumeric || 0;
        const distanceGap = Math.abs(distanceA - distanceB);

        if (distanceGap <= 5) return 0.55;
        if (distanceGap <= 10) return 0.7;
        if (distanceGap <= 20) return 0.5;

        return 0.25;
    }

    function spatialCompatibility(a, b) {
        const closeHome = closeHomeScore(a.originAreaNumeric, b.originAreaNumeric);
        const overlapRoute = overlappingTrajectoryScore(a, b);

        return {
            closeHome,
            overlapRoute,
            valid: closeHome >= 0.6 || overlapRoute >= 0.5
        };
    }

    function postureOfOpenness(value) {
        if (value === "Ja") return 2;
        if (value === "Misschien") return 1;
        return 0;
    }

    function preferenceCompatible(a, b) {
        const aPref = a.carpoolPartnerPreference || "Maakt mij niet uit";
        const bPref = b.carpoolPartnerPreference || "Maakt mij niet uit";

        const aAccepts =
            aPref === "Maakt mij niet uit" ||
            aPref === "Zowel studenten als personeel" ||
            (aPref === "Enkel met studenten" && b.role === "Student") ||
            (aPref === "Enkel met personeel" && b.role === "Personeel");

        const bAccepts =
            bPref === "Maakt mij niet uit" ||
            bPref === "Zowel studenten als personeel" ||
            (bPref === "Enkel met studenten" && a.role === "Student") ||
            (bPref === "Enkel met personeel" && a.role === "Personeel");

        return aAccepts && bAccepts;
    }

    function roleCompatibilityType(a, b) {
        const aRole = a.carpoolRolePreference || a.carpoolRolePreferenceNonCar || "Weet ik nog niet";
        const bRole = b.carpoolRolePreference || b.carpoolRolePreferenceNonCar || "Weet ik nog niet";

        const canDrive = value => ["Liefst bestuurder", "Beide zijn oké", "Weet ik nog niet"].includes(value);
        const canRide = value => ["Liefst passagier", "Beide zijn oké", "Weet ik nog niet"].includes(value);

        if (canDrive(aRole) && canRide(bRole)) return "A_driver";
        if (canDrive(bRole) && canRide(aRole)) return "B_driver";
        return null;
    }

    function normalizeRespondent(r) {
        return {
            ...r,
            role: r.role || "Onbekend",
            institution: r.institution || "Onbekend",
            transport: r.transport || "Onbekend",
            originAreaNumeric: postcodeToNumber(r.originArea),
            campusDaysNumeric: parseCampusDays(r.campusDays),
            realisticCarpoolDaysNumeric: parseRealisticDays(r.realisticCarpoolDays || r.realisticCarpoolDaysNonCar),
            departureFlexibilityScore: flexibilityScore(r.departureFlexibility),
            scheduleTypeScore: scheduleScore(r.scheduleType),
            parkingPressureNumeric: parkingPressureScore(r.parkingProblemFrequency),
            openToCarpoolScore: postureOfOpenness(r.openToCarpool),
            carDistanceNumeric: toNumber(r.carDistance),
            parkingIfFullArray: toArray(r.parkingIfFull),
            carpoolBarrierArray: toArray(r.carpoolBarrier)
        };
    }

    const respondents = rawData.map(normalizeRespondent);

    function eligibleForCarpoolModel(r) {
        return ["KU Leuven", "Odisee"].includes(r.institution) && r.transport === "Auto";
    }

    function willingDriver(r) {
        return eligibleForCarpoolModel(r) &&
            ["Ja", "Misschien"].includes(r.openToCarpool) &&
            r.realisticCarpoolDaysNumeric > 0;
    }

    function excludedFromImpact(r) {
        return ["KU Leuven", "Odisee"].includes(r.institution) && r.transport !== "Auto";
    }

    function getFilteredRespondents() {
        return respondents.filter(r => {
            if (state.filters.institution !== "all" && r.institution !== state.filters.institution) return false;
            if (state.filters.role !== "all" && r.role !== state.filters.role) return false;
            if (state.filters.transport !== "all" && r.transport !== state.filters.transport) return false;

            if (state.respondentSearch) {
                const haystack = [
                    r.email,
                    r.institution,
                    r.role,
                    r.transport,
                    r.originArea,
                    r.campusDays,
                    r.openToCarpool
                ].join(" ").toLowerCase();

                if (!haystack.includes(state.respondentSearch.toLowerCase())) return false;
            }

            return true;
        });
    }

    function carpoolAdoptionLikelihood(r) {
        if (!eligibleForCarpoolModel(r)) return 0;

        let score = 0;
        score += r.openToCarpoolScore * 20;
        score += Math.min(r.realisticCarpoolDaysNumeric, 4) * 8;
        score += r.departureFlexibilityScore * 7;
        score += r.scheduleTypeScore * 5;
        score += r.parkingPressureNumeric * 5;

        if (r.matchingPreference === "Betrouwbaarheid") score += 4;
        if (r.matchingPreference === "Flexibiliteit") score += 4;
        if (r.carpoolReason === "Makkelijker parkeren") score += 6;
        if (r.carpoolReason === "Lagere kost") score += 5;
        if (r.carpoolReason === "Minder uitstoot") score += 3;

        return Math.max(0, Math.min(100, score));
    }

    function canMatch(a, b) {
        if (!eligibleForCarpoolModel(a) || !eligibleForCarpoolModel(b)) return false;
        if (!willingDriver(a) || !willingDriver(b)) return false;
        if (a.email && b.email && a.email === b.email) return false;
        if (!preferenceCompatible(a, b)) return false;
        if (!roleCompatibilityType(a, b)) return false;

        const timeScore = nearbyTimeScore(a, b);
        if (timeScore < 0.6) return false;

        const spatial = spatialCompatibility(a, b);
        if (!spatial.valid) return false;

        return true;
    }

    function matchScore(a, b) {
        const spatial = spatialCompatibility(a, b);
        const time = nearbyTimeScore(a, b);
        const flex = Math.min(a.departureFlexibilityScore, b.departureFlexibilityScore) / 3;
        const schedule = Math.min(a.scheduleTypeScore, b.scheduleTypeScore) / 3;
        const adoption = (carpoolAdoptionLikelihood(a) + carpoolAdoptionLikelihood(b)) / 200;
        const pref = preferenceCompatible(a, b) ? 1 : 0;
        const role = roleCompatibilityType(a, b) ? 1 : 0;

        const spatialScore = Math.max(spatial.closeHome, spatial.overlapRoute);

        const score =
            (spatialScore * 34) +
            (time * 24) +
            (flex * 10) +
            (schedule * 8) +
            (adoption * 12) +
            (pref * 6) +
            (role * 6);

        return Math.round(Math.max(0, Math.min(100, score)));
    }

    function calculateSharedDistanceAndFactor(a, b) {
        const distanceA = a.carDistanceNumeric || 0;
        const distanceB = b.carDistanceNumeric || 0;
        const spatial = spatialCompatibility(a, b);

        let overlapFactor = 0;

        if (spatial.closeHome >= 0.8) {
            overlapFactor = 0.85;
        } else if (spatial.closeHome >= 0.6) {
            overlapFactor = 0.7;
        } else if (spatial.overlapRoute >= 0.7) {
            overlapFactor = 0.65;
        } else if (spatial.overlapRoute >= 0.5) {
            overlapFactor = 0.5;
        } else {
            overlapFactor = 0.35;
        }

        const sharedDistance = Math.min(distanceA, distanceB) * overlapFactor;

        return {
            overlapFactor,
            sharedDistance
        };
    }

    function pairCO2Savings(a, b) {
        const days = Math.min(
            a.realisticCarpoolDaysNumeric || a.campusDaysNumeric || 0,
            b.realisticCarpoolDaysNumeric || b.campusDaysNumeric || 0
        );

        if (!days) return 0;

        const distanceA = a.carDistanceNumeric || 0;
        const distanceB = b.carDistanceNumeric || 0;

        if (!distanceA || !distanceB) return 0;

        const { sharedDistance } = calculateSharedDistanceAndFactor(a, b);

        const baseline = (distanceA + distanceB) * 2 * days * EMISSION_KG_PER_KM;
        const afterCarpool = ((distanceA + distanceB) - sharedDistance) * 2 * days * EMISSION_KG_PER_KM;

        return Math.max(0, baseline - afterCarpool);
    }

    function generateAllMatches(filtered) {
        const eligible = filtered.filter(willingDriver);
        const pairs = [];

        for (let i = 0; i < eligible.length; i++) {
            for (let j = i + 1; j < eligible.length; j++) {
                const a = eligible[i];
                const b = eligible[j];

                if (!canMatch(a, b)) continue;

                pairs.push({
                    id: `match-${i}-${j}`,
                    a,
                    b,
                    score: matchScore(a, b),
                    co2: pairCO2Savings(a, b)
                });
            }
        }

        return pairs.sort((x, y) => {
            if (y.score !== x.score) return y.score - x.score;
            return y.co2 - x.co2;
        });
    }

    function pickBestUniqueMatches(pairs) {
        const used = new Set();
        const chosen = [];

        for (const pair of pairs) {
            const keyA = pair.a.email || `${pair.a.originArea}-${pair.a.departureWindowMorning}-${pair.a.departureWindowEvening}`;
            const keyB = pair.b.email || `${pair.b.originArea}-${pair.b.departureWindowMorning}-${pair.b.departureWindowEvening}`;

            if (used.has(keyA) || used.has(keyB)) continue;

            used.add(keyA);
            used.add(keyB);
            chosen.push(pair);
        }

        return chosen;
    }

    function countBy(items, selector) {
        return items.reduce((acc, item) => {
            const key = selector(item);
            if (!key) return acc;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }

    function countMulti(items, selector) {
        return items.reduce((acc, item) => {
            const values = selector(item);
            if (!Array.isArray(values)) return acc;
            values.forEach(value => {
                if (!value) return;
                acc[value] = (acc[value] || 0) + 1;
            });
            return acc;
        }, {});
    }

    function topEntries(obj, limit = 6) {
        return Object.entries(obj)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
    }

    function sum(arr, selector) {
        return arr.reduce((acc, item) => acc + selector(item), 0);
    }

    function percentage(part, whole) {
        if (!whole) return 0;
        return Math.round((part / whole) * 100);
    }

    function formatKg(value) {
        return `${value.toFixed(1)} kg/week`;
    }

    function describeReadiness(score) {
        if (score >= 75) return "Sterke basis voor een proefproject";
        if (score >= 55) return "Veelbelovend, maar goede matching is cruciaal";
        if (score >= 35) return "Mogelijk, maar nog beperkt";
        return "Vandaag nog een smalle basis";
    }

    function mainRiskLabel(eligibleDrivers) {
        if (!eligibleDrivers.length) {
            return {
                title: "Te weinig geschikte bestuurders",
                text: "Er zijn momenteel te weinig huidige autobestuurders om stevige carpoolimpact te modelleren."
            };
        }

        const rigid = eligibleDrivers.filter(r => r.departureFlexibilityScore === 0).length;
        const variable = eligibleDrivers.filter(r => r.scheduleType === "Sterk wisselend").length;
        const notOpen = eligibleDrivers.filter(r => !["Ja", "Misschien"].includes(r.openToCarpool)).length;

        const ratios = [
            {
                type: "Lage flexibiliteit",
                value: rigid / eligibleDrivers.length,
                text: "Een deel van de doelgroep heeft erg weinig speling in vertrek- of terugkeeruur."
            },
            {
                type: "Wisselende roosters",
                value: variable / eligibleDrivers.length,
                text: "Wisselende roosters maken vaste ritafspraken minder stabiel."
            },
            {
                type: "Beperkte bereidheid",
                value: notOpen / eligibleDrivers.length,
                text: "Niet elke huidige autobestuurder staat open voor meer carpoolen."
            }
        ].sort((a, b) => b.value - a.value)[0];

        return ratios;
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function buildInsights(filtered, eligible, willing, uniqueMatches, readinessScore) {
        const insights = [];
        const transportCounts = countBy(filtered, r => r.transport);
        const topTransport = topEntries(transportCounts, 1)[0];

        if (topTransport) {
            insights.push({
                title: "Dominant vervoersmiddel",
                text: `${topTransport[0]} is in de huidige selectie het meest gebruikte vervoersmiddel met ${topTransport[1]} respondenten.`
            });
        }

        insights.push({
            title: "Geen vervoersmiddelshift",
            text: `${filtered.filter(excludedFromImpact).length} niet-autogebruikers uit KU Leuven/Odisee worden bewust niet meegerekend in de CO2-winst.`
        });

        if (eligible.length) {
            insights.push({
                title: "Bereidheid bij huidige chauffeurs",
                text: `${percentage(willing.length, eligible.length)}% van de eligible huidige autobestuurders staat open voor meer carpoolen en ziet minstens enige haalbaarheid.`
            });
        }

        if (uniqueMatches.length) {
            const best = uniqueMatches[0];
            insights.push({
                title: "Sterkste matchsignaal",
                text: `De beste unieke match scoort ${best.score}/100 en kan ongeveer ${best.co2.toFixed(1)} kg CO2 per week vermijden.`
            });
        }

        insights.push({
            title: "Pilot readiness",
            text: `${readinessScore}/100. ${describeReadiness(readinessScore)}.`
        });

        const container = document.getElementById("insightList");
        if (container) {
            container.innerHTML = insights.map(item => `
                <div class="insight-card">
                    <h4>${item.title}</h4>
                    <p>${item.text}</p>
                </div>
            `).join("");
        }
    }

    function buildParkingInsights(eligibleDrivers, uniqueMatches) {
        const container = document.getElementById("parkingInsightList");
        const pressureDrivers = eligibleDrivers.filter(r => ["Dagelijks of bijna altijd", "2 à 3 keer per week", "1 keer per week"].includes(r.parkingProblemFrequency)).length;
        const parkingMotivated = eligibleDrivers.filter(r => r.carpoolReason === "Makkelijker parkeren").length;
        const wrongParking = eligibleDrivers.filter(r => ["Af en toe", "Regelmatig", "Meestal"].includes(r.wrongParkingFrequency)).length;

        setText("parkingPressureDrivers", String(pressureDrivers));
        setText("parkingMotivationDrivers", String(parkingMotivated));
        setText("parkingPotentialCarsRemoved", String(uniqueMatches.length));

        const insights = [
            {
                title: "Druk op de parking",
                text: `${pressureDrivers} huidige autobestuurders geven aan dat parkeerproblemen minstens wekelijks voorkomen.`
            },
            {
                title: "Parking als trigger voor carpool",
                text: `${parkingMotivated} bestuurders noemen makkelijker parkeren expliciet als motivatie om meer te carpoolen.`
            },
            {
                title: "Foutparkeren als signaal",
                text: `${wrongParking} bestuurders geven aan minstens af en toe fout te parkeren wanneer ze geen plaats vinden.`
            },
            {
                title: "Potentieel effect",
                text: `Als de beste unieke matches effectief doorgaan, kunnen ongeveer ${uniqueMatches.length} afzonderlijke auto's minder richting campus rijden op de betrokken carpooldagen.`
            }
        ];

        if (container) {
            container.innerHTML = insights.map(item => `
                <div class="insight-card">
                    <h4>${item.title}</h4>
                    <p>${item.text}</p>
                </div>
            `).join("");
        }
    }

    function buildPostcodeClusters(filtered) {
        const eligible = filtered.filter(r => ["KU Leuven", "Odisee"].includes(r.institution));
        const clusters = eligible.reduce((acc, r) => {
            if (r.originAreaNumeric == null) return acc;
            const cluster = `${Math.floor(r.originAreaNumeric / 100)}xx`;
            if (!acc[cluster]) acc[cluster] = { count: 0, drivers: 0, willingDrivers: 0 };
            acc[cluster].count += 1;
            if (r.transport === "Auto") acc[cluster].drivers += 1;
            if (willingDriver(r)) acc[cluster].willingDrivers += 1;
            return acc;
        }, {});

        const entries = Object.entries(clusters)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 8);

        const container = document.getElementById("postcodeClusters");

        if (!container) return;

        if (!entries.length) {
            container.innerHTML = `<div class="empty-block">Geen bruikbare postcodeclusters in de huidige selectie.</div>`;
            return;
        }

        container.innerHTML = entries.map(([cluster, info]) => `
            <div class="cluster-row">
                <div>
                    <strong>${cluster}</strong>
                    <p>${info.count} respondenten in deze regio</p>
                </div>
                <div class="cluster-meta">
                    <span>${info.drivers} autobestuurders</span>
                    <span>${info.willingDrivers} bereid tot carpool</span>
                </div>
            </div>
        `).join("");
    }

    function buildMethodology(filtered, eligible, pairs, uniqueMatches) {
        const items = [
            `CO2-impact wordt enkel berekend voor huidige autobestuurders van KU Leuven en Odisee.`,
            `Niet-autogebruikers blijven zichtbaar in het dashboard, maar tellen niet mee in de vermeden uitstoot.`,
            `Een match is alleen geldig als mensen dicht bij elkaar wonen of een duidelijk overlappend traject hebben.`,
            `Tijdsvensters mogen licht verschillen, maar niet los van elkaar liggen.`,
            `Rolvoorkeur, partnervoorkeur, flexibiliteit en roostertype verhogen of verlagen de matchscore.`,
            `Voor CO2-berekening gebruiken we enkel het geschatte gedeelde traject, niet de volledige individuele afstand.`,
            `Parkinganalyse kijkt apart naar parkeerdruk, gedrag bij volle parking en foutparkeren.`,
            `Van ${pairs.length} mogelijke paren blijven ${uniqueMatches.length} unieke topmatches over voor de impactschatting.`,
            `Kaartpunten worden gegeocodeerd op basis van postcode of locatie-invoer en zijn dus benaderingen, geen exacte woonadressen.`
        ];

        const container = document.getElementById("methodologyList");
        if (container) {
            container.innerHTML = items.map(item => `<div class="method-item">${item}</div>`).join("");
        }
    }

    function buildFinalConclusion(filtered, eligible, willing, uniqueMatches, readinessScore, totalCO2) {
        const container = document.getElementById("finalConclusion");
        if (!container) return;

        if (!filtered.length) {
            container.innerHTML = `<p>Er zijn geen data in de huidige selectie.</p>`;
            return;
        }

        const conclusion = [];

        if (!eligible.length) {
            conclusion.push("In deze selectie zijn er te weinig huidige autobestuurders van KU Leuven/Odisee om een zinvolle carpoolimpact te berekenen.");
        } else {
            conclusion.push("De analyse focust bewust op bestaande autoverplaatsingen, zodat de gerapporteerde winst een echte optimalisatie van autogebruik is.");
        }

        if (eligible.length) {
            conclusion.push(`${percentage(willing.length, eligible.length)}% van die doelgroep staat open voor carpoolen en vormt dus een bruikbare basis voor een pilot.`);
        }

        if (uniqueMatches.length) {
            conclusion.push(`Op basis van de beste unieke matches ligt de geschatte potentiële besparing rond ${totalCO2.toFixed(1)} kg CO2 per week.`);
        } else {
            conclusion.push("De huidige selectie levert nog geen sterke concrete matches op volgens de ruimtelijke en trajectlogica.");
        }

        conclusion.push(`De algemene pilot readiness komt uit op ${readinessScore}/100, wat neerkomt op: ${describeReadiness(readinessScore).toLowerCase()}.`);

        container.innerHTML = conclusion.map(text => `<p>${text}</p>`).join("");
    }

    function destroyChart(name) {
        if (state.charts[name]) {
            state.charts[name].destroy();
            delete state.charts[name];
        }
    }

    function renderChart(name, ctxId, config) {
        destroyChart(name);
        const canvas = document.getElementById(ctxId);
        if (!canvas) return;
        state.charts[name] = new Chart(canvas, config);
    }

    function renderCharts(filtered, eligible) {
        const transportCounts = countBy(filtered, r => r.transport);
        renderChart("transport", "transportChart", {
            type: "doughnut",
            data: {
                labels: Object.keys(transportCounts),
                datasets: [{ data: Object.values(transportCounts), borderWidth: 0 }]
            },
            options: {
                plugins: { legend: { position: "bottom" } },
                responsive: true,
                maintainAspectRatio: false
            }
        });

        const institutionRoleCounts = countBy(filtered, r => `${r.institution} · ${r.role}`);
        renderChart("institutionRole", "institutionRoleChart", {
            type: "bar",
            data: {
                labels: Object.keys(institutionRoleCounts),
                datasets: [{ label: "Aantal respondenten", data: Object.values(institutionRoleCounts) }]
            },
            options: {
                plugins: { legend: { display: false } },
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });

        const carpoolInterestCounts = {
            "Ja": eligible.filter(r => r.openToCarpool === "Ja").length,
            "Misschien": eligible.filter(r => r.openToCarpool === "Misschien").length,
            "Nee": eligible.filter(r => r.openToCarpool === "Nee").length
        };
        renderChart("carpoolInterest", "carpoolInterestChart", {
            type: "bar",
            data: {
                labels: Object.keys(carpoolInterestCounts),
                datasets: [{ label: "Eligible huidige autobestuurders", data: Object.values(carpoolInterestCounts) }]
            },
            options: {
                plugins: { legend: { display: false } },
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });

        const flexCounts = countBy(eligible, r => r.departureFlexibility || "Onbekend");
        const scheduleCounts = countBy(eligible, r => r.scheduleType || "Onbekend");
        const labels = Array.from(new Set([...Object.keys(flexCounts), ...Object.keys(scheduleCounts)]));
        renderChart("scheduleFlex", "scheduleFlexChart", {
            type: "bar",
            data: {
                labels,
                datasets: [
                    { label: "Flexibiliteit", data: labels.map(label => flexCounts[label] || 0) },
                    { label: "Roostertype", data: labels.map(label => scheduleCounts[label] || 0) }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });

        const parkingCounts = countBy(eligible, r => r.parkingProblemFrequency || "Onbekend");
        renderChart("parking", "parkingChart", {
            type: "bar",
            data: {
                labels: Object.keys(parkingCounts),
                datasets: [{ label: "Aantal respondenten", data: Object.values(parkingCounts) }]
            },
            options: {
                indexAxis: "y",
                plugins: { legend: { display: false } },
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { beginAtZero: true } }
            }
        });

        const parkingIfFullCounts = countMulti(eligible, r => r.parkingIfFullArray);
        renderChart("parkingIfFull", "parkingIfFullChart", {
            type: "bar",
            data: {
                labels: Object.keys(parkingIfFullCounts),
                datasets: [{ label: "Aantal respondenten", data: Object.values(parkingIfFullCounts) }]
            },
            options: {
                indexAxis: "y",
                plugins: { legend: { display: false } },
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { beginAtZero: true } }
            }
        });

        const wrongParkingCounts = countBy(eligible, r => r.wrongParkingFrequency || "Onbekend");
        renderChart("wrongParking", "wrongParkingChart", {
            type: "bar",
            data: {
                labels: Object.keys(wrongParkingCounts),
                datasets: [{ label: "Aantal respondenten", data: Object.values(wrongParkingCounts) }]
            },
            options: {
                plugins: { legend: { display: false } },
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    function renderMatchTable(matches) {
        state.currentMatches = matches;
        const tbody = document.getElementById("matchTableBody");
        if (!tbody) return;

        if (!matches.length) {
            tbody.innerHTML = `<tr><td colspan="9" class="empty-row">Geen geschikte matches in de huidige selectie.</td></tr>`;
            return;
        }

        tbody.innerHTML = matches.slice(0, state.matchLimit).map((match, index) => {
            const aRole = match.a.carpoolRolePreference || "Onbekend";
            const bRole = match.b.carpoolRolePreference || "Onbekend";
            const routeText = `${match.a.carDistanceNumeric || "?"} km / ${match.b.carDistanceNumeric || "?"} km`;
            const timingText = `${match.a.departureWindowMorning} · ${match.a.departureWindowEvening}`;

            return `
                <tr class="clickable-row" data-match-index="${index}">
                    <td><span class="score-badge">${match.score}</span></td>
                    <td><div class="person-cell"><strong>${match.a.email || "Onbekend"}</strong><span>${match.a.role}</span></div></td>
                    <td><div class="person-cell"><strong>${match.b.email || "Onbekend"}</strong><span>${match.b.role}</span></div></td>
                    <td>${match.a.institution} / ${match.b.institution}</td>
                    <td>${match.a.originArea || "-"} ↔ ${match.b.originArea || "-"}</td>
                    <td>${routeText}</td>
                    <td>${timingText}</td>
                    <td>${aRole} / ${bRole}</td>
                    <td><strong>${match.co2.toFixed(1)} kg/week</strong></td>
                </tr>
            `;
        }).join("");
    }

    function renderRespondentTable(filtered) {
        state.currentRespondents = filtered;
        const tbody = document.getElementById("respondentTableBody");
        if (!tbody) return;

        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-row">Geen respondenten in de huidige selectie.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map((r, index) => `
            <tr class="clickable-row" data-respondent-index="${index}">
                <td>${r.email || "-"}</td>
                <td>${r.institution || "-"}</td>
                <td>${r.role || "-"}</td>
                <td>${r.originArea || "-"}</td>
                <td>${r.transport || "-"}</td>
                <td>${r.campusDays || "-"}</td>
                <td>${r.openToCarpool || r.carpoolOpenness || "-"}</td>
                <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString("nl-BE") : "-"}</td>
            </tr>
        `).join("");
    }

    function openOverlay() {
        document.getElementById("overlay")?.classList.remove("hidden");
        document.body.classList.add("no-scroll");
    }

    function closeOverlay() {
        document.getElementById("overlay")?.classList.add("hidden");
        document.body.classList.remove("no-scroll");
    }

    function openDrawer(id) {
        const drawer = document.getElementById(id);
        if (!drawer) return;
        openOverlay();
        drawer.classList.remove("hidden");
        drawer.setAttribute("aria-hidden", "false");
    }

    function closeDrawer(id) {
        const drawer = document.getElementById(id);
        if (!drawer) return;
        drawer.classList.add("hidden");
        drawer.setAttribute("aria-hidden", "true");
        closeOverlay();
    }

    async function geocodeLocation(query, fallback = null) {
        if (!query) return fallback;

        if (state.geocodeCache.has(query)) {
            return state.geocodeCache.get(query);
        }

        try {
            const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=be&q=${encodeURIComponent(query)}`;
            const response = await fetch(url, {
                headers: {
                    "Accept": "application/json"
                }
            });

            const json = await response.json();
            if (Array.isArray(json) && json[0]) {
                const coords = [Number(json[0].lat), Number(json[0].lon)];
                state.geocodeCache.set(query, coords);
                return coords;
            }
        } catch (error) {
            console.error("Geocoding fout:", query, error);
        }

        if (fallback) {
            state.geocodeCache.set(query, fallback);
            return fallback;
        }

        state.geocodeCache.set(query, null);
        return null;
    }

    async function getCampusCoords() {
        if (state.campusCoords) return state.campusCoords;
        state.campusCoords = await geocodeLocation(CAMPUS.query, CAMPUS.fallback);
        return state.campusCoords;
    }

    function buildLocationQuery(respondent) {
        const area = String(respondent.originArea || "").trim();
        if (!area) return null;

        if (/^\d{4}$/.test(area)) return `${area}, Belgium`;
        return `${area}, Belgium`;
    }

    function resetMap(id) {
        if (state.maps[id]) {
            state.maps[id].remove();
            delete state.maps[id];
        }
    }

    async function renderOverviewMap(filtered) {
        const mapId = "overviewMap";
        const mapElement = document.getElementById(mapId);
        if (!mapElement) return;

        resetMap(mapId);

        const campusCoords = await getCampusCoords();
        const map = L.map(mapId).setView(campusCoords, 10);
        state.maps[mapId] = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
        }).addTo(map);

        const bounds = [];

        const campusMarker = L.marker(campusCoords).addTo(map);
        campusMarker.bindPopup("<strong>Campus Gent</strong><br>Gebroeders De Smetstraat 1, Gent");
        bounds.push(campusCoords);

        const seen = new Set();
        for (const respondent of filtered) {
            const query = buildLocationQuery(respondent);
            if (!query || seen.has(query)) continue;

            seen.add(query);
            const coords = await geocodeLocation(query);
            if (!coords) continue;

            const marker = L.circleMarker(coords, {
                radius: 7,
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);

            marker.bindPopup(`
                <strong>${respondent.email || "Respondent"}</strong><br>
                ${respondent.institution || "-"}<br>
                ${respondent.transport || "-"}<br>
                ${respondent.originArea || "-"}
            `);

            bounds.push(coords);
        }

        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [30, 30] });
        }
    }

    async function renderMatchMap(match) {
        const mapId = "matchRouteMap";
        const mapElement = document.getElementById(mapId);
        if (!mapElement) return;

        resetMap(mapId);

        const campusCoords = await getCampusCoords();
        const queryA = buildLocationQuery(match.a);
        const queryB = buildLocationQuery(match.b);

        const coordsA = await geocodeLocation(queryA);
        const coordsB = await geocodeLocation(queryB);

        const map = L.map(mapId).setView(campusCoords, 10);
        state.maps[mapId] = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
        }).addTo(map);

        const bounds = [];

        const campusMarker = L.marker(campusCoords).addTo(map);
        campusMarker.bindPopup("<strong>Campus Gent</strong><br>Gebroeders De Smetstraat 1, Gent");
        bounds.push(campusCoords);

        if (coordsA) {
            const markerA = L.marker(coordsA).addTo(map);
            markerA.bindPopup(`<strong>Persoon A</strong><br>${match.a.email || "-"}<br>${match.a.originArea || "-"}`);
            bounds.push(coordsA);
            L.polyline([coordsA, campusCoords], { weight: 4 }).addTo(map);
        }

        if (coordsB) {
            const markerB = L.marker(coordsB).addTo(map);
            markerB.bindPopup(`<strong>Persoon B</strong><br>${match.b.email || "-"}<br>${match.b.originArea || "-"}`);
            bounds.push(coordsB);
            L.polyline([coordsB, campusCoords], { weight: 4, dashArray: "8 8" }).addTo(map);
        }

        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [30, 30] });
        }
    }

    function buildWhyMatch(match) {
        const a = match.a;
        const b = match.b;
        const reasons = [];
        const spatial = spatialCompatibility(a, b);
        const time = nearbyTimeScore(a, b);
        const roleType = roleCompatibilityType(a, b);

        if (spatial.closeHome >= 0.8) {
            reasons.push("Beide respondenten wonen duidelijk dicht bij elkaar.");
        } else if (spatial.closeHome >= 0.6) {
            reasons.push("De woonlocaties liggen nog voldoende dicht bij elkaar voor een lokale carpoolmatch.");
        }

        if (spatial.overlapRoute >= 0.7) {
            reasons.push("Hun traject naar campus overlapt sterk.");
        } else if (spatial.overlapRoute >= 0.5) {
            reasons.push("Hun traject naar campus overlapt voldoende om samen een deel van de rit te delen.");
        }

        if (time === 1) {
            reasons.push("Ochtend- en avondvensters overlappen zeer sterk.");
        } else if (time >= 0.8) {
            reasons.push("De tijdsvensters liggen dicht genoeg bij elkaar.");
        } else if (time >= 0.6) {
            reasons.push("De timing is nog net bruikbaar voor een pilotmatch.");
        }

        if (preferenceCompatible(a, b)) {
            reasons.push("Hun voorkeur over met wie ze willen carpoolen is compatibel.");
        }

        if (roleType === "A_driver") {
            reasons.push("Persoon A kan logisch bestuurder zijn en persoon B passagier.");
        } else if (roleType === "B_driver") {
            reasons.push("Persoon B kan logisch bestuurder zijn en persoon A passagier.");
        }

        return reasons;
    }

    async function renderMatchDrawer(match) {
        const title = document.getElementById("matchDrawerTitle");
        const meta = document.getElementById("matchDrawerMeta");
        const routeText = document.getElementById("matchRouteText");
        const whyList = document.getElementById("matchWhyList");
        const co2Box = document.getElementById("matchCO2Box");

        const realisticDays = Math.min(
            match.a.realisticCarpoolDaysNumeric || match.a.campusDaysNumeric || 0,
            match.b.realisticCarpoolDaysNumeric || match.b.campusDaysNumeric || 0
        );

        const distanceA = match.a.carDistanceNumeric || 0;
        const distanceB = match.b.carDistanceNumeric || 0;

        const { overlapFactor, sharedDistance } = calculateSharedDistanceAndFactor(match.a, match.b);

        const baseline = (distanceA + distanceB) * 2 * realisticDays * EMISSION_KG_PER_KM;
        const afterCarpool = ((distanceA + distanceB) - sharedDistance) * 2 * realisticDays * EMISSION_KG_PER_KM;
        const saved = Math.max(0, baseline - afterCarpool);

        if (title) {
            title.textContent = `${match.a.email || "Persoon A"} ↔ ${match.b.email || "Persoon B"}`;
        }

        if (meta) {
            meta.innerHTML = `
                <div class="summary-chip"><strong>Score</strong><span>${match.score}/100</span></div>
                <div class="summary-chip"><strong>Postcodes</strong><span>${match.a.originArea || "-"} ↔ ${match.b.originArea || "-"}</span></div>
                <div class="summary-chip"><strong>Timing</strong><span>${match.a.departureWindowMorning || "-"} / ${match.a.departureWindowEvening || "-"}</span></div>
                <div class="summary-chip"><strong>CO2</strong><span>${match.co2.toFixed(1)} kg/week</span></div>
            `;
        }

        if (routeText) {
            routeText.textContent = "De kaart toont de campus en de benaderde vertrekzones van beide respondenten op basis van postcode of opgegeven locatie.";
        }

        if (whyList) {
            whyList.innerHTML = buildWhyMatch(match).map(item => `<div class="why-item">${item}</div>`).join("");
        }

        if (co2Box) {
            co2Box.innerHTML = `
                <div class="calc-line"><span>Persoon A: enkel trajectafstand</span><strong>${distanceA.toFixed(1)} km</strong></div>
                <div class="calc-line"><span>Persoon B: enkel trajectafstand</span><strong>${distanceB.toFixed(1)} km</strong></div>
                <div class="calc-line"><span>Gedeeld traject (geschat)</span><strong>${sharedDistance.toFixed(1)} km</strong></div>
                <div class="calc-line"><span>Overlapfactor</span><strong>${(overlapFactor * 100).toFixed(0)}%</strong></div>
                <div class="calc-line"><span>Carpooldagen per week</span><strong>${realisticDays}</strong></div>
                <hr />
                <div class="calc-line"><span>Zonder carpool</span><strong>${baseline.toFixed(1)} kg/week</strong></div>
                <div class="calc-line"><span>Met carpool</span><strong>${afterCarpool.toFixed(1)} kg/week</strong></div>
                <div class="calc-line result"><span>Vermeden uitstoot</span><strong>${saved.toFixed(1)} kg/week</strong></div>
                <p class="calc-note">
                    De besparing wordt enkel berekend op het gedeelde deel van het traject. Dat gedeelde deel is bewust kleiner dan de opgegeven afstand, omdat beide personen elkaar eerst moeten vinden voor ze samen verder rijden.
                </p>
            `;
        }

        openDrawer("matchDrawer");
        setTimeout(() => {
            renderMatchMap(match);
        }, 40);
    }

    function prettifyKey(key) {
        const map = {
            email: "E-mailadres",
            role: "Rol",
            institution: "Instelling",
            originArea: "Gemeente / postcode",
            campusDays: "Campusdagen per week",
            scheduleType: "Type rooster",
            departureWindowMorning: "Vertrek naar campus",
            departureWindowEvening: "Vertrek terug",
            transport: "Vervoersmiddel",
            otherTransport: "Ander vervoersmiddel",
            carDistance: "Afstand met auto",
            bikeDistance: "Fietsafstand",
            walkTime: "Wandeltijd",
            ovHomeDistance: "OV-afstand",
            ovTravelTime: "OV-reistijd",
            carpoolFrequency: "Huidige carpoolfrequentie",
            carOccupancy: "Aantal personen in auto",
            parkingProblemFrequency: "Parkeerproblemen",
            parkingIfFull: "Wat doet men als parking vol is",
            wrongParkingFrequency: "Foutparkeren",
            openToCarpool: "Open om vaker te carpoolen",
            carpoolReason: "Belangrijkste motivatie",
            carpoolBarrier: "Belangrijkste drempels",
            realisticCarpoolDays: "Realistische carpooldagen",
            realisticCarpoolDaysNonCar: "Realistische carpooldagen (niet-auto)",
            departureFlexibility: "Flexibiliteit uren",
            carpoolRolePreference: "Rolvoorkeur",
            carpoolRolePreferenceNonCar: "Rolvoorkeur (niet-auto)",
            matchingPreference: "Belangrijkste platformkenmerk",
            carpoolPartnerPreference: "Voorkeur carpoolpartner",
            ovReasonNotCar: "Waarom geen auto maar OV",
            ovSatisfaction: "Tevredenheid OV",
            ovCarReason: "Wanneer OV-gebruiker wel auto neemt",
            bikeReasonNotCar: "Waarom geen auto maar fiets",
            bikeBadWeather: "Gedrag bij slecht weer",
            bikeCarReason: "Wanneer fietser wel auto neemt",
            walkReasonNotCar: "Waarom geen auto maar te voet",
            walkCarReason: "Wanneer wandelaar wel auto neemt",
            otherReasonNotCar: "Waarom geen auto maar ander vervoer",
            otherCarReason: "Wanneer wel auto",
            parkingCampusOpinion: "Parkeerprobleem op campus",
            sustainabilityPriority: "Belang duurzaamheid",
            sustainabilityOpinion: "Nuttig carpoolplatform?",
            motivation: "Motivatie / vrije uitleg",
            pilotContactPermission: "Later contacteren voor pilot",
            createdAt: "Ingediend op"
        };
        return map[key] || key;
    }

    function formatAnswerValue(value) {
        if (Array.isArray(value)) return value.length ? value.join(", ") : "";
        if (value === null || value === undefined || value === "") return "";
        return String(value);
    }

    function renderRespondentDrawer(respondent) {
        const title = document.getElementById("respondentDrawerTitle");
        const quick = document.getElementById("respondentQuickFacts");
        const answers = document.getElementById("respondentAnswerList");

        if (title) {
            title.textContent = respondent.email || "Respondent";
        }

        if (quick) {
            quick.innerHTML = `
                <div class="summary-chip"><strong>Instelling</strong><span>${respondent.institution || "-"}</span></div>
                <div class="summary-chip"><strong>Rol</strong><span>${respondent.role || "-"}</span></div>
                <div class="summary-chip"><strong>Postcode</strong><span>${respondent.originArea || "-"}</span></div>
                <div class="summary-chip"><strong>Vervoer</strong><span>${respondent.transport || "-"}</span></div>
            `;
        }

        const keys = [
            "email",
            "role",
            "institution",
            "originArea",
            "campusDays",
            "scheduleType",
            "departureWindowMorning",
            "departureWindowEvening",
            "transport",
            "otherTransport",
            "carDistance",
            "bikeDistance",
            "walkTime",
            "ovHomeDistance",
            "ovTravelTime",
            "carpoolFrequency",
            "carOccupancy",
            "parkingProblemFrequency",
            "parkingIfFull",
            "wrongParkingFrequency",
            "openToCarpool",
            "carpoolReason",
            "carpoolBarrier",
            "realisticCarpoolDays",
            "realisticCarpoolDaysNonCar",
            "departureFlexibility",
            "carpoolRolePreference",
            "carpoolRolePreferenceNonCar",
            "matchingPreference",
            "carpoolPartnerPreference",
            "ovReasonNotCar",
            "ovSatisfaction",
            "ovCarReason",
            "bikeReasonNotCar",
            "bikeBadWeather",
            "bikeCarReason",
            "walkReasonNotCar",
            "walkCarReason",
            "otherReasonNotCar",
            "otherCarReason",
            "parkingCampusOpinion",
            "sustainabilityPriority",
            "sustainabilityOpinion",
            "motivation",
            "pilotContactPermission",
            "createdAt"
        ];

        const rows = [];

        for (const key of keys) {
            let value = respondent[key];
            if (key === "createdAt" && value) {
                value = new Date(value).toLocaleString("nl-BE");
            }

            const formatted = formatAnswerValue(value);
            if (!formatted) continue;

            rows.push(`
                <div class="answer-row">
                    <div class="answer-key">${prettifyKey(key)}</div>
                    <div class="answer-value">${formatted}</div>
                </div>
            `);
        }

        if (answers) {
            answers.innerHTML = rows.length
                ? rows.join("")
                : `<div class="empty-block">Geen ingevulde detailvelden gevonden.</div>`;
        }

        openDrawer("respondentDrawer");
    }

    function renderDashboard() {
        const filtered = getFilteredRespondents();
        const eligible = filtered.filter(eligibleForCarpoolModel);
        const willing = eligible.filter(willingDriver);
        const pairs = generateAllMatches(filtered);
        const uniqueMatches = pickBestUniqueMatches(pairs);
        const excluded = filtered.filter(excludedFromImpact);

        const readinessBase =
            (percentage(willing.length, eligible.length) * 0.4) +
            (Math.min(uniqueMatches.length, 10) * 4) +
            (eligible.length ? (sum(eligible, carpoolAdoptionLikelihood) / eligible.length) * 0.3 : 0);

        const readinessScore = Math.max(0, Math.min(100, Math.round(readinessBase)));
        const totalPotentialCO2 = sum(uniqueMatches, m => m.co2);
        const risk = mainRiskLabel(eligible);

        setText("datasetTimestamp", new Date().toLocaleString("nl-BE"));
        setText("kpiTotalResponses", String(filtered.length));
        setText("kpiEligibleCarpool", String(eligible.length));
        setText("kpiOpenToCarpool", `${percentage(willing.length, eligible.length)}%`);
        setText("kpiReadinessScore", `${readinessScore}/100`);
        setText("kpiPotentialCO2", formatKg(totalPotentialCO2));
        setText("kpiExcludedNonDrivers", String(excluded.length));

        setText("predictedMatchRate", `${Math.min(100, uniqueMatches.length * 12)}%`);
        setText("predictedMatchRateText", "Gebaseerd op regio, timing, voorkeuren en praktische haalbaarheid.");
        setText("predictedActiveMatches", String(uniqueMatches.length));
        setText("predictedActiveMatchesText", "Unieke topmatches die vandaag al plausibel lijken.");
        setText("predictedCO2Range", `${Math.max(0, totalPotentialCO2 * 0.7).toFixed(1)} - ${(totalPotentialCO2 * 1.0).toFixed(1)} kg/week`);
        setText("predictedCO2RangeText", "Conservatieve bandbreedte voor een eerste proefproject.");
        setText("predictedMainRisk", risk.title);
        setText("predictedMainRiskText", risk.text);

        buildInsights(filtered, eligible, willing, uniqueMatches, readinessScore);
        buildParkingInsights(eligible, uniqueMatches);
        buildPostcodeClusters(filtered);
        buildMethodology(filtered, eligible, pairs, uniqueMatches);
        buildFinalConclusion(filtered, eligible, willing, uniqueMatches, readinessScore, totalPotentialCO2);
        renderMatchTable(uniqueMatches);
        renderRespondentTable(filtered);
        renderCharts(filtered, eligible);

        setTimeout(() => {
            renderOverviewMap(filtered);
        }, 40);
    }

    function switchTopTab(tabId) {
        document.querySelectorAll(".top-tab").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.tabTarget === tabId);
        });

        document.querySelectorAll(".top-tab-panel").forEach(panel => {
            panel.classList.toggle("active", panel.id === tabId);
        });

        setTimeout(() => {
            Object.values(state.maps).forEach(map => {
                if (map) map.invalidateSize();
            });
        }, 80);
    }

    function attachEvents() {
        const institutionFilter = document.getElementById("institutionFilter");
        const roleFilter = document.getElementById("roleFilter");
        const transportFilter = document.getElementById("transportFilter");
        const matchLimit = document.getElementById("matchLimit");
        const resetBtn = document.getElementById("resetFiltersBtn");
        const respondentSearch = document.getElementById("respondentSearch");

        institutionFilter?.addEventListener("change", e => {
            state.filters.institution = e.target.value;
            renderDashboard();
        });

        roleFilter?.addEventListener("change", e => {
            state.filters.role = e.target.value;
            renderDashboard();
        });

        transportFilter?.addEventListener("change", e => {
            state.filters.transport = e.target.value;
            renderDashboard();
        });

        matchLimit?.addEventListener("change", e => {
            state.matchLimit = Number(e.target.value) || 10;
            renderDashboard();
        });

        respondentSearch?.addEventListener("input", e => {
            state.respondentSearch = e.target.value.trim();
            renderDashboard();
        });

        resetBtn?.addEventListener("click", () => {
            state.filters = { institution: "all", role: "all", transport: "all" };
            state.matchLimit = 10;
            state.respondentSearch = "";

            if (institutionFilter) institutionFilter.value = "all";
            if (roleFilter) roleFilter.value = "all";
            if (transportFilter) transportFilter.value = "all";
            if (matchLimit) matchLimit.value = "10";
            if (respondentSearch) respondentSearch.value = "";

            renderDashboard();
        });

        document.querySelectorAll(".top-tab").forEach(button => {
            button.addEventListener("click", () => {
                switchTopTab(button.dataset.tabTarget);
            });
        });

        document.addEventListener("click", e => {
            const matchRow = e.target.closest("[data-match-index]");
            if (matchRow) {
                const index = Number(matchRow.dataset.matchIndex);
                const match = state.currentMatches[index];
                if (match) renderMatchDrawer(match);
            }

            const respondentRow = e.target.closest("[data-respondent-index]");
            if (respondentRow) {
                const index = Number(respondentRow.dataset.respondentIndex);
                const respondent = state.currentRespondents[index];
                if (respondent) renderRespondentDrawer(respondent);
            }

            const closeBtn = e.target.closest("[data-close-drawer]");
            if (closeBtn) {
                closeDrawer(closeBtn.dataset.closeDrawer);
            }

            if (e.target.id === "overlay") {
                closeDrawer("matchDrawer");
                closeDrawer("respondentDrawer");
            }
        });

        document.addEventListener("keydown", e => {
            if (e.key === "Escape") {
                closeDrawer("matchDrawer");
                closeDrawer("respondentDrawer");
            }
        });
    }

    attachEvents();
    renderDashboard();
})();