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

const STORAGE_KEY = "campus_mobility_survey_v6";

const savedState = loadSavedState();
const answers = savedState.answers || {};
let history = savedState.history || [];
let currentQuestionId = savedState.currentQuestionId || "email";
let isSubmitting = false;

const iconMap = {
    "Student": "🎓",
    "Personeel": "💼",
    "Overig": "👤",

    "Odisee": "🏫",
    "KU Leuven": "🎓",
    "LUCA": "🎨",
    "Andere": "✨",

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

    "Nooit": "🚫",
    "Af en toe": "🔁",
    "Regelmatig": "✅",
    "Bijna altijd": "🔥",
    "Altijd": "💯",
    "Meestal": "📍",

    "Dagelijks of bijna altijd": "🅿️",
    "2 à 3 keer per week": "📅",
    "1 keer per week": "🗓️",
    "Bijna nooit": "🌙",

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
    "Enkel met personeel": "🧑‍💼",
    "Zowel studenten als personeel": "👥",
    "Maakt mij niet uit": "🤷",

    "Betrouwbaarheid": "🕒",
    "Veiligheid": "🛡️",
    "Flexibiliteit": "🧭",
    "Zeker zijn van rit terug": "🔁",

    "Eigen flexibiliteit behouden": "🧍",
    "Wisselende les- of werkroosters": "📅",
    "Geen goede match met anderen": "📍",
    "Liever onafhankelijk": "🧍",
    "Onvoldoende vertrouwen": "🔒",
    "Te weinig mensen uit mijn buurt": "📌",

    "Onvoldoende parking": "🅿️",
    "Afstand is haalbaar zonder auto": "📏",
    "File / verkeer": "🚦",
    "Openbaar vervoer is vlot": "🚌",
    "Financiële redenen": "💶",
    "Ik heb geen auto": "🚫",
    "Ik heb geen rijbewijs": "🪪",
    "Gezondheid / beweging": "🏃",
    "Duurzaamheid": "🌱",

    "Ik wacht en probeer opnieuw": "⏳",
    "Ik zoek verder buiten de campus": "🔍",
    "Ik parkeer op een betalende plaats": "💳",
    "Ik parkeer fout": "⚠️",
    "Ik wijzig mijn plan / keer terug": "↩️",

    "Toch met de fiets": "🚲",
    "Met het openbaar vervoer": "🚌",
    "Met de wagen": "🚗",
    "Ik kom dan meestal niet": "🏠",

    "Helemaal niet": "🚫",
    "Beperkt": "▫️",
    "Matig": "◽",
    "Sterk": "📈",
    "Zeer sterk": "🔥",

    "Bijna niet flexibel": "⏰",
    "Beperkt flexibel": "🗓️",
    "Redelijk flexibel": "🔄",
    "Heel flexibel": "✨",

    "Meestal vast": "📌",
    "Deels wisselend": "🔄",
    "Sterk wisselend": "🌪️",

    "Voor 8u": "🌅",
    "8u - 9u": "🕗",
    "9u - 10u": "🕘",
    "Na 10u": "☀️",
    "Voor 16u": "🕓",
    "16u - 17u": "🕔",
    "17u - 18u": "🕕",
    "Na 18u": "🌙",

    "1 dag per week": "1️⃣",
    "2 dagen per week": "2️⃣",
    "3 dagen per week": "3️⃣",
    "4 of meer dagen per week": "4️⃣",

    "Liefst bestuurder": "🚗",
    "Liefst passagier": "🪑",
    "Beide zijn oké": "🔄",
    "Weet ik nog niet": "🤔"
};

const NON_CAR_REASON_OPTIONS = [
    "Onvoldoende parking",
    "Afstand is haalbaar zonder auto",
    "File / verkeer",
    "Openbaar vervoer is vlot",
    "Financiële redenen",
    "Ik heb geen auto",
    "Ik heb geen rijbewijs",
    "Gezondheid / beweging",
    "Duurzaamheid",
    "Andere reden"
];

const questions = {
    email: {
        label: "Wat is je e-mailadres?",
        help: "Dit is verplicht zodat dezelfde persoon de vragenlijst niet meerdere keren kan invullen. Als dit e-mailadres al gebruikt werd, krijg je meteen een melding.",
        type: "input",
        inputType: "email",
        placeholder: "jouwmail@voorbeeld.be",
        required: true,
        next: () => "role"
    },

    role: {
        label: "Ben je student, personeel of overig?",
        help: "Zo kunnen we de resultaten beter analyseren per doelgroep.",
        type: "choice",
        options: [
            { value: "Student", subtext: "Je volgt les of studeert op de campus." },
            { value: "Personeel", subtext: "Je werkt op of voor de campus." },
            { value: "Overig", subtext: "Bezoeker, extern, stagiair of andere situatie." }
        ],
        next: () => "institution"
    },

    institution: {
        label: "Aan welke hogeschool of instelling ben je vooral verbonden?",
        help: "Zo kunnen we zien of mobiliteit verschilt tussen de verschillende instellingen op en rond de campus.",
        type: "choice",
        options: ["Odisee", "KU Leuven", "LUCA", "Andere"],
        next: () => "originArea"
    },

    originArea: {
        label: "Vanuit welke gemeente of postcode vertrek je meestal?",
        help: "Een postcode is voldoende. Zo kunnen we zien of er geografische clusters zijn voor carpoolen.",
        type: "input",
        inputType: "number",
        placeholder: "Bijvoorbeeld 9000",
        next: () => "campusDays"
    },

    campusDays: {
        label: "Hoeveel dagen per week kom je meestal naar de campus?",
        help: "Kies wat het best bij jouw normale week past.",
        type: "choice",
        options: ["1", "2", "3", "4", "5+"],
        next: () => "scheduleType"
    },

    scheduleType: {
        label: "Is jouw les- of werkrooster meestal vast of wisselend?",
        help: "Dit helpt ons inschatten hoe haalbaar vaste carpoolafspraken zijn.",
        type: "choice",
        options: ["Meestal vast", "Deels wisselend", "Sterk wisselend"],
        next: () => "departureWindowMorning"
    },

    departureWindowMorning: {
        label: "Rond welk uur vertrek je meestal naar de campus?",
        help: "Een tijdsvenster is genoeg. Zo kunnen we kijken of mensen qua timing overlappen.",
        type: "choice",
        options: ["Voor 8u", "8u - 9u", "9u - 10u", "Na 10u"],
        next: () => "departureWindowEvening"
    },

    departureWindowEvening: {
        label: "Rond welk uur vertrek je meestal terug van de campus?",
        help: "Ook dit helpt om de haalbaarheid van matches in te schatten.",
        type: "choice",
        options: ["Voor 16u", "16u - 17u", "17u - 18u", "Na 18u"],
        next: () => "transport"
    },

    transport: {
        label: "Met welk vervoersmiddel kom je meestal naar de campus?",
        help: "Daarna krijg je enkel de relevante vervolgvragen.",
        type: "choice",
        options: [
            { value: "Auto", subtext: "Je rijdt meestal met de wagen naar de campus." },
            { value: "Openbaar vervoer", subtext: "Bus, trein, tram of combinatie." },
            { value: "Fiets", subtext: "Gewone fiets of elektrische fiets." },
            { value: "Te voet", subtext: "Je woont op wandelafstand." },
            { value: "Anders", subtext: "Bijvoorbeeld brommer, step of combinatie." }
        ],
        next: (value) => {
            if (value === "Auto") return "carDistance";
            if (value === "Openbaar vervoer") return "ovHomeDistance";
            if (value === "Fiets") return "bikeDistance";
            if (value === "Te voet") return "walkTime";
            return "otherTransport";
        }
    },

    carDistance: {
        label: "Van hoe ver kom je ongeveer naar de campus?",
        help: "Geef een ruwe schatting in kilometer.",
        type: "input",
        inputType: "number",
        placeholder: "Bijvoorbeeld 18",
        next: () => "carpoolFrequency"
    },

    carpoolFrequency: {
        label: "Hoe vaak carpool je momenteel al?",
        help: "Zo krijgen we een beter beeld dan met een simpele ja/nee-vraag.",
        type: "choice",
        options: ["Nooit", "Af en toe", "Regelmatig", "Bijna altijd", "Altijd"],
        next: () => "carOccupancy"
    },

    carOccupancy: {
        label: "Met hoeveel personen zit je meestal in de auto?",
        help: "Tel jezelf mee. Een schatting is voldoende.",
        type: "input",
        inputType: "number",
        placeholder: "Bijvoorbeeld 2",
        next: () => "parkingProblemFrequency"
    },

    parkingProblemFrequency: {
        label: "Hoe vaak ervaar je parkeerproblemen op of rond de campus?",
        help: "Denk aan volzet zijn, lang moeten zoeken of stress om nog een plaats te vinden.",
        type: "choice",
        options: [
            "Dagelijks of bijna altijd",
            "2 à 3 keer per week",
            "1 keer per week",
            "Regelmatig",
            "Af en toe",
            "Bijna nooit"
        ],
        next: () => "parkingIfFull"
    },

    parkingIfFull: {
        label: "Wat doe je meestal als de parking vol is?",
        help: "Je mag meerdere opties aanduiden als dit afhangt van de situatie.",
        type: "multiChoice",
        options: [
            "Ik wacht en probeer opnieuw",
            "Ik zoek verder buiten de campus",
            "Ik parkeer op een betalende plaats",
            "Ik parkeer fout",
            "Ik wijzig mijn plan / keer terug",
            "Andere reden"
        ],
        next: () => "wrongParkingFrequency"
    },

    wrongParkingFrequency: {
        label: "Hoe vaak parkeer je fout omdat je geen plaats vindt?",
        help: "Dit helpt ons inschatten hoe groot de druk echt is.",
        type: "choice",
        options: ["Nooit", "Af en toe", "Regelmatig", "Meestal"],
        next: () => "openToCarpool"
    },

    openToCarpool: {
        label: "Zou je openstaan om vaker te carpoolen als dit praktisch en betrouwbaar geregeld is?",
        help: "We willen weten of de bereidheid er is, zelfs als je het vandaag nog niet veel doet.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: (value) => {
            if (value === "Ja" || value === "Misschien") return "carpoolReason";
            return "carpoolBarrier";
        }
    },

    carpoolReason: {
        label: "Wat zou voor jou de belangrijkste motivatie zijn om meer te carpoolen?",
        help: "Kies wat voor jou het zwaarst doorweegt.",
        type: "choice",
        options: ["Lagere kost", "Minder uitstoot", "Gezelliger", "Makkelijker parkeren", "Tijdswinst", "Andere reden"],
        next: () => "realisticCarpoolDays"
    },

    carpoolBarrier: {
        label: "Wat houdt je het meest tegen om te carpoolen?",
        help: "Je mag meerdere drempels aanduiden als er meer dan één meespeelt.",
        type: "multiChoice",
        options: [
            "Eigen flexibiliteit behouden",
            "Wisselende les- of werkroosters",
            "Geen goede match met anderen",
            "Liever onafhankelijk",
            "Onvoldoende vertrouwen",
            "Te weinig mensen uit mijn buurt",
            "Zeker zijn van rit terug"
        ],
        next: () => "realisticCarpoolDays"
    },

    realisticCarpoolDays: {
        label: "Op hoeveel campusdagen per week zou carpoolen voor jou realistisch kunnen zijn?",
        help: "Zo meten we niet alleen interesse, maar ook praktische haalbaarheid.",
        type: "choice",
        options: ["Nooit", "1 dag per week", "2 dagen per week", "3 dagen per week", "4 of meer dagen per week"],
        next: () => "departureFlexibility"
    },

    departureFlexibility: {
        label: "Hoe flexibel zijn jouw vertrek- en aankomsturen meestal?",
        help: "Dit is belangrijk om te weten of ritten makkelijk combineerbaar zijn.",
        type: "choice",
        options: ["Bijna niet flexibel", "Beperkt flexibel", "Redelijk flexibel", "Heel flexibel"],
        next: () => "carpoolRolePreference"
    },

    carpoolRolePreference: {
        label: "Welke rol zou jij het liefst opnemen bij carpoolen?",
        help: "Dit helpt ons inschatten of er genoeg mogelijke bestuurders én passagiers zijn.",
        type: "choice",
        options: ["Liefst bestuurder", "Liefst passagier", "Beide zijn oké", "Weet ik nog niet"],
        next: () => "matchingPreference"
    },

    matchingPreference: {
        label: "Wat is voor jou het belangrijkst bij een goed carpoolplatform?",
        help: "Zo zien we welke functies het meeste vertrouwen en gebruik kunnen creëren.",
        type: "choice",
        options: ["Betrouwbaarheid", "Veiligheid", "Flexibiliteit", "Zeker zijn van rit terug"],
        next: () => "carpoolPartnerPreference"
    },

    carpoolPartnerPreference: {
        label: "Met wie zou je liefst carpoolen?",
        help: "Omdat we zowel studenten als personeel willen kunnen bevragen, is deze nuance nuttig.",
        type: "choice",
        options: [
            "Enkel met studenten",
            "Enkel met personeel",
            "Zowel studenten als personeel",
            "Maakt mij niet uit"
        ],
        next: () => "parkingCampusOpinion"
    },

    ovHomeDistance: {
        label: "Wat is de afstand van thuis of kot tot de campus?",
        help: "Geef een ruwe schatting in kilometer.",
        type: "input",
        inputType: "number",
        placeholder: "Bijvoorbeeld 14",
        next: () => "ovTravelTime"
    },

    ovTravelTime: {
        label: "Hoe lang duurt een enkel traject met het openbaar vervoer gemiddeld?",
        help: "Vul het aantal minuten in.",
        type: "input",
        inputType: "number",
        placeholder: "Bijvoorbeeld 35",
        next: () => "ovReasonNotCar"
    },

    ovReasonNotCar: {
        label: "Waarom kom je meestal niet met de auto, maar met het openbaar vervoer?",
        help: "Je mag meerdere redenen aanduiden.",
        type: "multiChoice",
        options: NON_CAR_REASON_OPTIONS,
        next: () => "ovSatisfaction"
    },

    ovSatisfaction: {
        label: "Hoe tevreden ben je over het openbaar vervoer naar de campus?",
        help: "Denk aan betrouwbaarheid, reistijd en comfort.",
        type: "choice",
        options: ["Zeer tevreden", "Tevreden", "Neutraal", "Ontevreden", "Zeer ontevreden"],
        next: () => "ovConsiderCar"
    },

    ovConsiderCar: {
        label: "Zou je ooit overwegen om met de auto naar de campus te komen?",
        help: "We willen eerst weten of de auto voor jou überhaupt een realistisch alternatief is.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: (value) => {
            if (value === "Ja" || value === "Misschien") return "ovCarReason";
            return "parkingCampusOpinion";
        }
    },

    ovCarReason: {
        label: "In welke situatie zou je wél met de auto naar de campus komen?",
        help: "Bijvoorbeeld bij slechte verbindingen, tijdsdruk, stakingen, slecht weer, ...",
        type: "textarea",
        placeholder: "Typ hier kort wanneer of waarom je wel met de auto zou komen",
        required: false,
        next: () => "ovToCarpool"
    },

    ovToCarpool: {
        label: "Als je met de auto naar de campus zou komen, zou je dan carpool overwegen?",
        help: "Pas nadat de auto een optie is, is deze vraag echt relevant.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: (value) => {
            if (value === "Ja" || value === "Misschien") return "realisticCarpoolDaysNonCar";
            return "parkingCampusOpinion";
        }
    },

    bikeDistance: {
        label: "Hoeveel kilometer fiets je ongeveer naar de campus?",
        help: "Een ruwe schatting is genoeg.",
        type: "input",
        inputType: "number",
        placeholder: "Bijvoorbeeld 6",
        next: () => "bikeReasonNotCar"
    },

    bikeReasonNotCar: {
        label: "Waarom kom je meestal niet met de auto, maar met de fiets?",
        help: "Je mag meerdere redenen aanduiden.",
        type: "multiChoice",
        options: NON_CAR_REASON_OPTIONS,
        next: () => "bikeBadWeather"
    },

    bikeBadWeather: {
        label: "Bij slecht weer kom ik meestal ...",
        help: "Dit helpt ons zien of slecht weer mensen richting auto duwt.",
        type: "choice",
        options: [
            "Toch met de fiets",
            "Met het openbaar vervoer",
            "Met de wagen",
            "Ik kom dan meestal niet"
        ],
        next: () => "bikeConsiderCar"
    },

    bikeConsiderCar: {
        label: "Zou je ooit overwegen om met de auto naar de campus te komen?",
        help: "We willen eerst weten of de auto voor jou een realistisch alternatief is.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: (value) => {
            if (value === "Ja" || value === "Misschien") return "bikeCarReason";
            return "parkingCampusOpinion";
        }
    },

    bikeCarReason: {
        label: "In welke situatie zou je wél met de auto naar de campus komen?",
        help: "Bijvoorbeeld slecht weer, een zwaardere dag, materiaal meenemen, tijdsdruk, ...",
        type: "textarea",
        placeholder: "Typ hier kort wanneer of waarom je wel met de auto zou komen",
        required: false,
        next: () => "bikeToCarpool"
    },

    bikeToCarpool: {
        label: "Als je met de auto naar de campus zou komen, zou je dan carpool overwegen?",
        help: "Pas nadat de auto een optie is, is deze vraag echt relevant.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: (value) => {
            if (value === "Ja" || value === "Misschien") return "realisticCarpoolDaysNonCar";
            return "parkingCampusOpinion";
        }
    },

    walkTime: {
        label: "Hoe lang wandel je ongeveer naar de campus?",
        help: "Vul het aantal minuten in.",
        type: "input",
        inputType: "number",
        placeholder: "Bijvoorbeeld 12",
        next: () => "walkReasonNotCar"
    },

    walkReasonNotCar: {
        label: "Waarom kom je meestal niet met de auto, maar te voet?",
        help: "Je mag meerdere redenen aanduiden.",
        type: "multiChoice",
        options: NON_CAR_REASON_OPTIONS,
        next: () => "walkConsiderCar"
    },

    walkConsiderCar: {
        label: "Zou je ooit overwegen om met de auto naar de campus te komen?",
        help: "We willen eerst weten of de auto voor jou een realistisch alternatief is.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: (value) => {
            if (value === "Ja" || value === "Misschien") return "walkCarReason";
            return "parkingCampusOpinion";
        }
    },

    walkCarReason: {
        label: "In welke situatie zou je wél met de auto naar de campus komen?",
        help: "Bijvoorbeeld bij een andere campuslocatie, tijdsdruk, slecht weer, materiaal meenemen, ...",
        type: "textarea",
        placeholder: "Typ hier kort wanneer of waarom je wel met de auto zou komen",
        required: false,
        next: () => "walkToCarpool"
    },

    walkToCarpool: {
        label: "Als je met de auto naar de campus zou komen, zou je dan carpool overwegen?",
        help: "Pas nadat de auto een optie is, is deze vraag echt relevant.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: (value) => {
            if (value === "Ja" || value === "Misschien") return "realisticCarpoolDaysNonCar";
            return "parkingCampusOpinion";
        }
    },

    otherTransport: {
        label: "Welk ander vervoersmiddel gebruik je meestal?",
        help: "Bijvoorbeeld brommer, step, trein + fiets, ...",
        type: "input",
        inputType: "text",
        placeholder: "Typ hier je vervoersmiddel",
        next: () => "otherReasonNotCar"
    },

    otherReasonNotCar: {
        label: "Waarom kom je meestal niet met de auto, maar met dit vervoersmiddel?",
        help: "Je mag meerdere redenen aanduiden.",
        type: "multiChoice",
        options: NON_CAR_REASON_OPTIONS,
        next: () => "otherConsiderCar"
    },

    otherConsiderCar: {
        label: "Zou je ooit overwegen om met de auto naar de campus te komen?",
        help: "We willen eerst weten of de auto voor jou een realistisch alternatief is.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: (value) => {
            if (value === "Ja" || value === "Misschien") return "otherCarReason";
            return "parkingCampusOpinion";
        }
    },

    otherCarReason: {
        label: "In welke situatie zou je wél met de auto naar de campus komen?",
        help: "Bijvoorbeeld slecht weer, tijdsdruk, comfort, langere afstand, ...",
        type: "textarea",
        placeholder: "Typ hier kort wanneer of waarom je wel met de auto zou komen",
        required: false,
        next: () => "otherToCarpool"
    },

    otherToCarpool: {
        label: "Als je met de auto naar de campus zou komen, zou je dan carpool overwegen?",
        help: "Pas nadat de auto een optie is, is deze vraag echt relevant.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: (value) => {
            if (value === "Ja" || value === "Misschien") return "realisticCarpoolDaysNonCar";
            return "parkingCampusOpinion";
        }
    },

    realisticCarpoolDaysNonCar: {
        label: "Op hoeveel campusdagen per week zou carpoolen voor jou realistisch kunnen zijn?",
        help: "Zo meten we niet alleen interesse, maar ook praktische haalbaarheid.",
        type: "choice",
        options: ["Nooit", "1 dag per week", "2 dagen per week", "3 dagen per week", "4 of meer dagen per week"],
        next: () => "carpoolRolePreferenceNonCar"
    },

    carpoolRolePreferenceNonCar: {
        label: "Welke rol zou jij het liefst opnemen bij carpoolen?",
        help: "Dit helpt ons inschatten of er genoeg mogelijke bestuurders én passagiers zijn.",
        type: "choice",
        options: ["Liefst bestuurder", "Liefst passagier", "Beide zijn oké", "Weet ik nog niet"],
        next: () => "carpoolPartnerPreference"
    },

    parkingCampusOpinion: {
        label: "Denk je dat parkeerproblemen op of rond de campus een belangrijk mobiliteitsprobleem zijn?",
        help: "Ook als je zelf niet met de auto komt, is jouw inschatting interessant.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: () => "sustainabilityPriority"
    },

    sustainabilityPriority: {
        label: "Hoe belangrijk vind jij duurzaamheid bij je keuze van vervoer?",
        help: "Kies het niveau dat het best bij jouw gevoel past.",
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
        help: "Volg hier gewoon je eigen inschatting.",
        type: "choice",
        options: ["Ja", "Misschien", "Nee"],
        next: () => "motivation"
    },

    motivation: {
        label: "Waarom denk je dat dit wel of niet nuttig zou zijn?",
        help: "Hier mag je kort je mening of ervaring geven.",
        type: "textarea",
        placeholder: "Bijvoorbeeld: veel studenten komen uit dezelfde regio, parkeerdruk is hoog, OV sluit niet goed aan, roosters verschillen sterk, ...",
        required: false,
        next: () => "pilotContactPermission"
    },

    pilotContactPermission: {
        label: "Mogen we je later contacteren op dit e-mailadres als we een proefproject of testfase rond carpoolen opstarten?",
        help: "Dit is volledig vrijblijvend, maar kan nuttig zijn als jullie interesse later willen omzetten in een echte test.",
        type: "choice",
        options: ["Ja", "Nee"],
        next: () => "existingPlatform"
    },

    existingPlatform: {
        label: "Wist je dat er vandaag al een initiatief bestaat?",
        help: "Deze info geven we pas op het einde mee zodat je antwoorden niet beïnvloed worden.",
        type: "info",
        content: "Voor wie nu al wil starten: op <a href='https://www.carpool.be' target='_blank' rel='noopener noreferrer'>carpool.be</a> kun je vandaag al ritten zoeken of aanbieden.",
        next: () => "summary"
    },

    summary: {
        label: "Klaar! Kijk nog even je antwoorden na.",
        help: "Je kan hieronder meteen verzenden of nog iets aanpassen.",
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

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizeAnswerForDisplay(questionId, value) {
    const question = questions[questionId];
    if (!question) return value;

    if (Array.isArray(value)) {
        return value.length ? value.join(", ") : "-";
    }

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

function isEmptyValue(value) {
    if (Array.isArray(value)) return value.length === 0;
    return value === undefined || value === null || value === "";
}

function valuesEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function getPredictedTotalSteps() {
    const simulatedAnswers = { ...answers };
    const currentLiveValue = getCurrentValue(false);

    if (!isEmptyValue(currentLiveValue)) {
        simulatedAnswers[currentQuestionId] = currentQuestionId === "email"
            ? normalizeEmail(currentLiveValue)
            : currentLiveValue;
    }

    let qid = "email";
    let count = 0;
    let guard = 0;

    while (qid && qid !== "done" && guard < 200) {
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
    let qid = "email";
    let guard = 0;

    while (qid && qid !== "done" && guard < 200) {
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
    html += `<div class="question-label">${question.label}</div>`;

    if (question.help) {
        html += `<p class="question-help">${question.help}</p>`;
    }

    if (question.type === "choice" || question.type === "multiChoice") {
        const currentValue = question.type === "multiChoice"
            ? (Array.isArray(answers[questionId]) ? answers[questionId] : [])
            : answers[questionId];

        html += `<div class="choice-grid">`;

        question.options.forEach((option) => {
            const optionValue = getOptionValue(option);
            const optionSubtext = getOptionSubtext(option);
            const selected = question.type === "multiChoice"
                ? currentValue.includes(optionValue)
                : currentValue === optionValue;
            const icon = iconMap[optionValue] || "•";

            html += `
                <button
                    type="button"
                    class="choice-card ${selected ? "selected" : ""}"
                    data-value="${escapeHtml(optionValue)}"
                    data-mode="${question.type === "multiChoice" ? "multiple" : "single"}"
                    aria-pressed="${selected ? "true" : "false"}"
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

        if (question.type === "multiChoice") {
            html += `<div class="input-hint">Je mag meerdere opties aanduiden.</div>`;
        }
    }

    if (question.type === "input") {
        const value = answers[questionId] || "";

        html += `
            <div class="input-wrap">
                <input
                    class="text-input"
                    type="${question.inputType || "text"}"
                    name="question"
                    min="${question.inputType === "number" ? "0" : ""}"
                    step="${question.inputType === "number" ? "any" : ""}"
                    value="${escapeHtml(value)}"
                    placeholder="${question.placeholder || ""}"
                    autocomplete="${question.inputType === "email" ? "email" : "off"}"
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
            const mode = card.dataset.mode;

            if (mode === "multiple") {
                const isSelected = card.classList.contains("selected");
                card.classList.toggle("selected", !isSelected);
                card.setAttribute("aria-pressed", String(!isSelected));
            } else {
                cards.forEach((c) => {
                    if (c.dataset.mode === "single") {
                        c.classList.remove("selected");
                        c.setAttribute("aria-pressed", "false");
                    }
                });

                card.classList.add("selected");
                card.setAttribute("aria-pressed", "true");
            }

            updateProgress();
            updateHeroInsight();
        });

        card.addEventListener("dblclick", async () => {
            if (card.dataset.mode === "single") {
                card.click();
                await goToNextQuestion();
            }
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
    const rangeInput = document.querySelector(".range-input");
    const rangeButtons = document.querySelectorAll("[data-range-value]");

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
    const labels = document.querySelectorAll("[data-range-value]");

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

    if (question.type === "multiChoice") {
        return Array.from(document.querySelectorAll(".choice-card.selected"))
            .map((card) => card.dataset.value);
    }

    if (question.type === "summary" || question.type === "info") {
        return "ok";
    }

    const input = document.querySelector('[name="question"]');
    if (!input) return "";

    const value = trim ? input.value.trim() : input.value;

    if (currentQuestionId === "email") {
        return normalizeEmail(value);
    }

    return value;
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

    if (question.type !== "summary" && question.type !== "info" && isRequired) {
        if (isEmptyValue(value)) {
            showError("Vul eerst een antwoord in.");
            return false;
        }
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

    skipBtn.classList.toggle("hidden", !isSkippable || currentQuestion.type === "summary" || currentQuestionId === "email");

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
        progressSubtext.textContent = "Start met je e-mailadres";
    } else if (currentQuestionId === "summary") {
        progressSubtext.textContent = "Laatste controle voor verzenden";
    } else {
        progressSubtext.textContent = `${currentStep - 1} ${currentStep - 1 === 1 ? "vraag" : "vragen"} ingevuld`;
    }
}

function updateHeroInsight() {
    const transport = answers.transport || (currentQuestionId === "transport" ? getCurrentValue() : "");
    const openness =
        answers.openToCarpool ||
        answers.ovToCarpool ||
        answers.bikeToCarpool ||
        answers.walkToCarpool ||
        answers.otherToCarpool ||
        "";
    const sustainability = answers.sustainabilityPriority || (currentQuestionId === "sustainabilityPriority" ? getCurrentValue() : "");
    const parkingProblems = answers.parkingProblemFrequency || "";
    const parkingOpinion = answers.parkingCampusOpinion || "";
    const scheduleType = answers.scheduleType || "";

    if (currentQuestionId === "summary") {
        heroInsightTitle.textContent = "Bedankt, jouw input maakt het verschil";
        heroInsightText.textContent = "Je antwoorden helpen ons om te begrijpen waar de grootste kansen en drempels voor slim carpoolen liggen.";
        return;
    }

    if (currentQuestionId === "email") {
        heroInsightTitle.textContent = "Eerst even je deelname registreren";
        heroInsightText.textContent = "Zo vermijden we dubbele inzendingen en blijft de dataset betrouwbaar.";
        return;
    }

    if (scheduleType === "Meestal vast") {
        heroInsightTitle.textContent = "Vaste roosters maken matching makkelijker";
        heroInsightText.textContent = "Als veel respondenten vaste uren hebben, stijgt de kans dat een carpoolplatform ook praktisch bruikbaar wordt.";
        return;
    }

    if (transport === "Auto") {
        heroInsightTitle.textContent = "Autoverplaatsingen tonen het grootste carpoolpotentieel";
        heroInsightText.textContent = "Vooral ritten met vrije zitplaatsen kunnen een groot verschil maken voor parkeerdruk, kost en uitstoot.";
        return;
    }

    if (parkingProblems === "Dagelijks of bijna altijd" || parkingProblems === "2 à 3 keer per week") {
        heroInsightTitle.textContent = "Parkeerdruk lijkt een echte factor";
        heroInsightText.textContent = "Als veel bestuurders dit zo ervaren, kan carpoolen ook een praktische oplossing worden en niet alleen een duurzame.";
        return;
    }

    if (parkingOpinion === "Ja") {
        heroInsightTitle.textContent = "Parkeerdruk is meer dan een individueel probleem";
        heroInsightText.textContent = "Ook de perceptie van campusgebruikers helpt ons inschatten of gedeelde mobiliteit een bredere meerwaarde heeft.";
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
        heroInsightText.textContent = "Dat is een sterk onderzoekssignaal: de uitdaging ligt dan vooral in vertrouwen, matching en praktische organisatie.";
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

    while (oldQid && oldQid !== "done" && guard < 200) {
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

async function checkEmailExists(email) {
    const response = await fetch(window.SURVEY_CONFIG.checkEmailUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: normalizeEmail(email) })
    });

    const data = await response.json();
    return {
        ok: response.ok,
        status: response.status,
        ...data
    };
}

async function goToNextQuestion() {
    if (!validateCurrentQuestion()) return;

    const value = getCurrentValue();

    if (currentQuestionId === "email") {
        try {
            const data = await checkEmailExists(value);

            if (!data.ok) {
                showError(data.message || "We konden je e-mailadres niet controleren. Probeer opnieuw.");
                return;
            }

            if (data.exists) {
                showError("Je hebt deze vragenlijst al ingevuld.");
                return;
            }
        } catch (error) {
            console.error("Fout bij e-mailcontrole:", error);
            showError("We konden je e-mailadres niet controleren. Probeer opnieuw.");
            return;
        }
    }

    if (currentQuestionId !== "summary" && currentQuestionId !== "info") {
        const previousValue = answers[currentQuestionId];
        answers[currentQuestionId] = value;

        if (previousValue !== undefined && !valuesEqual(previousValue, value)) {
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

nextBtn.addEventListener("click", async () => {
    await goToNextQuestion();
});

prevBtn.addEventListener("click", () => {
    if (history.length === 0) return;

    currentQuestionId = history.pop();
    renderQuestion(currentQuestionId);
});

skipBtn.addEventListener("click", async () => {
    showError("");
    answers[currentQuestionId] = questions[currentQuestionId].type === "multiChoice" ? [] : "";
    await goToNextQuestion();
});

form.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();

        if (!nextBtn.classList.contains("hidden")) {
            await goToNextQuestion();
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
            answers: {
                ...answers,
                email: normalizeEmail(answers.email)
            },
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

        if (response.status === 409) {
            showError("Je hebt deze vragenlijst al ingevuld.");
        } else {
            showError(data.message || "Opslaan mislukt. Probeer opnieuw.");
        }
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