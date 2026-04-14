const express = require("express");
const path = require("path");
const { MongoClient } = require("mongodb");
const session = require("express-session");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "1mb" }));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "duurzaamheid_dashboard_secret_2026",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 8
        }
    })
);

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "carpool_platform";
const COLLECTION_NAME = process.env.COLLECTION_NAME || "survey_responses_v3";

const DASHBOARD_USERNAME = process.env.DASHBOARD_USERNAME || "duurzaamheid_2026";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "admin_2026";

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "Campus Carpool";

let mongoClient;
let surveyCollection;
let mailTransporter = null;

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function createMailTransporter() {
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.warn("EMAIL_USER of EMAIL_PASS ontbreekt. Bevestigingsmails zijn uitgeschakeld.");
        return null;
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });
}

async function verifyMailTransporter() {
    if (!mailTransporter) return;

    try {
        await mailTransporter.verify();
        console.log("Mailserver correct geconfigureerd.");
    } catch (error) {
        console.error("Mailserver kon niet geverifieerd worden:", error.message);
        console.log("Server blijft draaien, maar mails verzenden kan mislukken.");
    }
}

async function sendConfirmationEmail(toEmail, answers = {}) {
    if (!mailTransporter) {
        console.warn("Geen mailTransporter beschikbaar. Mail wordt niet verzonden.");
        return;
    }

    const recipientName =
        answers.name ||
        answers.naam ||
        answers.firstName ||
        answers.firstname ||
        "";

    const safeName = String(recipientName || "").trim();
    const greeting = safeName ? `Hallo ${safeName},` : "Hallo,";

    const mailOptions = {
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`,
        to: toEmail,
        subject: "Bevestiging van je deelname aan de mobiliteitsbevraging",
        html: `
        <div style="font-family: Arial, sans-serif; background: #f5f7fb; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">

            <!-- HEADER -->
            <div style="background: linear-gradient(135deg, #2c7a7b, #38b2ac); padding: 30px; text-align: center;">
            <h1 style="margin: 0;">🚗 Campus Carpool</h1>
            <p style="margin: 5px 0 0;">Bedankt voor je deelname!</p>
            </div>

            <!-- BODY -->
            <div style="padding: 30px; color: #1f2937;">

            <h2 style="margin-top: 0;">Je antwoorden zijn ontvangen ✅</h2>

            <p>
                Bedankt om onze mobiliteitsbevraging in te vullen. 
                Met jouw input onderzoeken we of carpoolen op campus een haalbare en duurzame oplossing is.
            </p>

            <!-- BELONING BLOK -->
            <div style="margin: 25px 0; padding: 20px; background: #ecfdf5; border-left: 5px solid #10b981; border-radius: 8px;">
                <h3 style="margin-top: 0;">🎁 Je beloning</h3>
                <p style="margin-bottom: 0;">
                Toon deze mail aan ons team op campus en ontvang jouw beloning.
                </p>
            </div>

            <!-- CTA -->
            <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; padding: 12px 20px; background: #2c7a7b; color: white; border-radius: 8px; font-weight: bold;">
                📩 Toon deze mail op campus
                </div>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
                Deze mail dient als bevestiging van je deelname.
            </p>

            </div>

            <!-- FOOTER -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0;">Campus Carpool Project</p>
            <p style="margin: 5px 0 0;">KU Leuven – Industrieel Ingenieur - Thibaut, Quinten en Mathieu</p>
            </div>

        </div>
        </div>
        `
    };

    await mailTransporter.sendMail(mailOptions);
}

async function ensureIndexes() {
    if (!surveyCollection) return;

    try {
        await surveyCollection.createIndex(
            { email: 1 },
            {
                name: "email_1",
                unique: true,
                partialFilterExpression: {
                    email: {
                        $exists: true,
                        $type: "string",
                        $gt: ""
                    }
                }
            }
        );

        console.log("Unieke partiële index op e-mail actief.");
    } catch (error) {
        console.error("Kon indexen niet aanmaken:", error.message);
        console.log("Server blijft verder draaien zonder opstart-crash.");
    }
}

async function connectToMongo() {
    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI ontbreekt in je .env bestand.");
    }

    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();

    const db = mongoClient.db(DB_NAME);
    surveyCollection = db.collection(COLLECTION_NAME);

    console.log(`Verbonden met MongoDB database: ${DB_NAME}`);
    console.log(`Collectie actief: ${COLLECTION_NAME}`);

    await ensureIndexes();
}

function getClientIp(req) {
    return (
        req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
        req.socket?.remoteAddress ||
        null
    );
}

function sanitizeAnswers(answers) {
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
        return null;
    }

    const cleaned = {};

    for (const [key, value] of Object.entries(answers)) {
        if (typeof key !== "string" || !key.trim()) continue;

        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            cleaned[key] = value;
        } else if (Array.isArray(value)) {
            cleaned[key] = value
                .filter((item) => item !== null && item !== undefined)
                .map((item) => String(item).trim())
                .filter((item) => item !== "");
        } else if (value === null || value === undefined) {
            cleaned[key] = "";
        } else {
            cleaned[key] = String(value);
        }
    }

    if (cleaned.email) {
        cleaned.email = normalizeEmail(cleaned.email);
    }

    return cleaned;
}

function sanitizeVisiblePath(visiblePath) {
    if (!Array.isArray(visiblePath)) return [];

    return visiblePath
        .filter((item) => typeof item === "string" && item.trim() !== "")
        .slice(0, 100);
}

function requireDashboardAuth(req, res, next) {
    if (req.session && req.session.dashboardAuthenticated) {
        return next();
    }

    return res.redirect("/dashboard/login");
}

function parseNumber(value) {
    if (value === undefined || value === null || value === "") return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
}

function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === "") return [];
    return [value];
}

function normalizeResponse(doc) {
    const answers = doc.answers || {};

    const carpoolOpenness =
        answers.openToCarpool ||
        answers.ovToCarpool ||
        answers.bikeToCarpool ||
        answers.walkToCarpool ||
        answers.otherToCarpool ||
        null;

    const considerCar =
        answers.ovConsiderCar ||
        answers.bikeConsiderCar ||
        answers.walkConsiderCar ||
        answers.otherConsiderCar ||
        null;

    return {
        id: String(doc._id),
        submittedAt: doc.submittedAt || null,
        createdAt: doc.createdAt || null,

        email: doc.email || answers.email || "",
        role: answers.role || null,
        institution: answers.institution || null,
        campusDays: answers.campusDays || null,
        transport: answers.transport || null,

        carDistance: parseNumber(answers.carDistance),
        bikeDistance: parseNumber(answers.bikeDistance),
        walkTime: parseNumber(answers.walkTime),
        ovHomeDistance: parseNumber(answers.ovHomeDistance),
        ovTravelTime: parseNumber(answers.ovTravelTime),
        carOccupancy: parseNumber(answers.carOccupancy),

        carpoolFrequency: answers.carpoolFrequency || null,
        parkingProblemFrequency: answers.parkingProblemFrequency || null,
        parkingIfFull: toArray(answers.parkingIfFull),
        wrongParkingFrequency: answers.wrongParkingFrequency || null,

        carpoolOpenness,
        considerCar,

        carpoolReason: answers.carpoolReason || null,
        carpoolBarrier: toArray(answers.carpoolBarrier),
        departureFlexibility: answers.departureFlexibility || null,
        matchingPreference: answers.matchingPreference || null,
        carpoolPartnerPreference: answers.carpoolPartnerPreference || null,

        ovReasonNotCar: toArray(answers.ovReasonNotCar),
        bikeReasonNotCar: toArray(answers.bikeReasonNotCar),
        walkReasonNotCar: toArray(answers.walkReasonNotCar),
        otherReasonNotCar: toArray(answers.otherReasonNotCar),

        ovSatisfaction: answers.ovSatisfaction || null,
        bikeBadWeather: answers.bikeBadWeather || null,

        ovCarReason: answers.ovCarReason || "",
        bikeCarReason: answers.bikeCarReason || "",
        walkCarReason: answers.walkCarReason || "",
        otherCarReason: answers.otherCarReason || "",

        sustainabilityPriority: parseNumber(answers.sustainabilityPriority),
        sustainabilityOpinion: answers.sustainabilityOpinion || null,
        parkingCampusOpinion: answers.parkingCampusOpinion || null,

        motivation: answers.motivation || "",
        otherTransport: answers.otherTransport || "",
        answers
    };
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

function countMulti(items, selector) {
    const counts = {};

    items.forEach((item) => {
        const values = selector(item);

        if (!Array.isArray(values)) return;

        values.forEach((value) => {
            if (!value) return;
            counts[value] = (counts[value] || 0) + 1;
        });
    });

    return counts;
}

function averageOf(items, selector) {
    const values = items
        .map(selector)
        .filter((v) => typeof v === "number" && !Number.isNaN(v));

    if (!values.length) return null;

    const sum = values.reduce((acc, val) => acc + val, 0);
    return Number((sum / values.length).toFixed(2));
}

function getTopEntry(obj) {
    const entries = Object.entries(obj || {});
    if (!entries.length) return null;

    entries.sort((a, b) => b[1] - a[1]);
    return {
        label: entries[0][0],
        value: entries[0][1]
    };
}

function buildDashboardData(responses) {
    const total = responses.length;

    const transportCounts = countBy(responses, (r) => r.transport);
    const roleCounts = countBy(responses, (r) => r.role);
    const institutionCounts = countBy(responses, (r) => r.institution);
    const campusDaysCounts = countBy(responses, (r) => r.campusDays);

    const opennessCounts = countBy(responses, (r) => r.carpoolOpenness);
    const considerCarCounts = countBy(responses, (r) => r.considerCar);
    const reasonCounts = countBy(responses, (r) => r.carpoolReason);
    const barrierCounts = countMulti(responses, (r) => r.carpoolBarrier);
    const ovSatisfactionCounts = countBy(responses, (r) => r.ovSatisfaction);
    const sustainabilityOpinionCounts = countBy(responses, (r) => r.sustainabilityOpinion);
    const matchingPreferenceCounts = countBy(responses, (r) => r.matchingPreference);
    const carpoolPartnerPreferenceCounts = countBy(responses, (r) => r.carpoolPartnerPreference);

    const parkingProblemFrequencyCounts = countBy(responses, (r) => r.parkingProblemFrequency);
    const parkingIfFullCounts = countMulti(responses, (r) => r.parkingIfFull);
    const wrongParkingFrequencyCounts = countBy(responses, (r) => r.wrongParkingFrequency);
    const parkingCampusOpinionCounts = countBy(responses, (r) => r.parkingCampusOpinion);
    const departureFlexibilityCounts = countBy(responses, (r) => r.departureFlexibility);

    const ovReasonNotCarCounts = countMulti(responses, (r) => r.ovReasonNotCar);
    const bikeReasonNotCarCounts = countMulti(responses, (r) => r.bikeReasonNotCar);
    const walkReasonNotCarCounts = countMulti(responses, (r) => r.walkReasonNotCar);
    const otherReasonNotCarCounts = countMulti(responses, (r) => r.otherReasonNotCar);

    const bikeBadWeatherCounts = countBy(responses, (r) => r.bikeBadWeather);

    const avgSustainability = averageOf(responses, (r) => r.sustainabilityPriority);
    const avgCarDistance = averageOf(
        responses.filter((r) => r.transport === "Auto"),
        (r) => r.carDistance
    );
    const avgBikeDistance = averageOf(
        responses.filter((r) => r.transport === "Fiets"),
        (r) => r.bikeDistance
    );
    const avgWalkTime = averageOf(
        responses.filter((r) => r.transport === "Te voet"),
        (r) => r.walkTime
    );
    const avgOvDistance = averageOf(
        responses.filter((r) => r.transport === "Openbaar vervoer"),
        (r) => r.ovHomeDistance
    );
    const avgOvTravelTime = averageOf(
        responses.filter((r) => r.transport === "Openbaar vervoer"),
        (r) => r.ovTravelTime
    );
    const avgCarOccupancy = averageOf(
        responses.filter((r) => r.transport === "Auto"),
        (r) => r.carOccupancy
    );

    const openCount = (opennessCounts["Ja"] || 0) + (opennessCounts["Misschien"] || 0);
    const autoCount = transportCounts["Auto"] || 0;

    const kpis = {
        totalResponses: total,
        autoShare: total ? Number(((autoCount / total) * 100).toFixed(1)) : 0,
        carpoolPotentialShare: total ? Number(((openCount / total) * 100).toFixed(1)) : 0,
        avgSustainability,
        avgCarDistance,
        avgBikeDistance,
        avgWalkTime,
        avgOvDistance,
        avgOvTravelTime,
        avgCarOccupancy
    };

    const topTransport = getTopEntry(transportCounts);
    const topBarrier = getTopEntry(barrierCounts);
    const topReason = getTopEntry(reasonCounts);
    const topRole = getTopEntry(roleCounts);
    const topInstitution = getTopEntry(institutionCounts);
    const topParkingProblem = getTopEntry(parkingProblemFrequencyCounts);

    const insights = [];

    if (topTransport) {
        insights.push({
            title: "Meest gebruikte vervoersmiddel",
            text: `${topTransport.label} is momenteel het vaakst gekozen vervoersmiddel (${topTransport.value} antwoorden).`
        });
    }

    insights.push({
        title: "Potentieel voor carpool",
        text: `${kpis.carpoolPotentialShare}% van alle respondenten zegt "Ja" of "Misschien" op een vorm van carpoolbereidheid.`
    });

    if (topBarrier) {
        insights.push({
            title: "Grootste drempel",
            text: `De grootste drempel om te carpoolen is momenteel: "${topBarrier.label}".`
        });
    }

    if (topReason) {
        insights.push({
            title: "Sterkste motivatie",
            text: `De meest genoemde motivatie om te carpoolen is: "${topReason.label}".`
        });
    }

    if (topParkingProblem) {
        insights.push({
            title: "Parkeerdruk",
            text: `De meest voorkomende ervaring bij autobestuurders is: "${topParkingProblem.label}".`
        });
    }

    if (avgSustainability !== null) {
        insights.push({
            title: "Duurzaamheidsscore",
            text: `De gemiddelde duurzaamheidsscore ligt op ${avgSustainability}/4.`
        });
    }

    if (avgOvTravelTime !== null) {
        insights.push({
            title: "Gemiddelde OV-reistijd",
            text: `Respondenten die met het openbaar vervoer komen, doen gemiddeld ${avgOvTravelTime} minuten over één traject.`
        });
    }

    if (topRole) {
        insights.push({
            title: "Grootste respondentengroep",
            text: `${topRole.label} vormt de grootste groep in de antwoorden (${topRole.value} reacties).`
        });
    }

    if (topInstitution) {
        insights.push({
            title: "Meest vertegenwoordigde instelling",
            text: `${topInstitution.label} komt het vaakst voor in de antwoorden (${topInstitution.value} reacties).`
        });
    }

    return {
        responses,
        charts: {
            transportCounts,
            roleCounts,
            institutionCounts,
            campusDaysCounts,
            opennessCounts,
            considerCarCounts,
            reasonCounts,
            barrierCounts,
            ovSatisfactionCounts,
            sustainabilityOpinionCounts,
            matchingPreferenceCounts,
            carpoolPartnerPreferenceCounts,
            parkingProblemFrequencyCounts,
            parkingIfFullCounts,
            wrongParkingFrequencyCounts,
            parkingCampusOpinionCounts,
            departureFlexibilityCounts,
            ovReasonNotCarCounts,
            bikeReasonNotCarCounts,
            walkReasonNotCarCounts,
            otherReasonNotCarCounts,
            bikeBadWeatherCounts
        },
        kpis,
        insights
    };
}

/* -------------------- PAGINA'S -------------------- */

app.get("/", (req, res) => {
    res.render("home", { title: "Carpool Platform" });
});

app.get("/survey", (req, res) => {
    res.render("survey", { title: "Mobiliteitsbevraging" });
});

app.get("/survey/bedankt", (req, res) => {
    res.render("survey-thankyou", { title: "Bedankt voor je deelname" });
});

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server draait",
        mongoConnected: !!surveyCollection,
        mailConfigured: !!mailTransporter,
        collection: COLLECTION_NAME
    });
});

/* -------------------- SURVEY API -------------------- */

app.post("/api/survey/check-email", async (req, res) => {
    try {
        if (!surveyCollection) {
            return res.status(503).json({
                success: false,
                message: "Database is momenteel niet beschikbaar."
            });
        }

        const email = normalizeEmail(req.body?.email);

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "E-mailadres ontbreekt."
            });
        }

        const existingSubmission = await surveyCollection.findOne(
            { email },
            { projection: { _id: 1 } }
        );

        return res.json({
            success: true,
            exists: !!existingSubmission
        });
    } catch (error) {
        console.error("Fout bij controleren e-mail:", error);

        return res.status(500).json({
            success: false,
            message: "Serverfout bij controleren van e-mailadres."
        });
    }
});

app.post("/api/survey", async (req, res) => {
    try {
        if (!surveyCollection) {
            return res.status(503).json({
                success: false,
                message: "Database is momenteel niet beschikbaar."
            });
        }

        const { answers, visiblePath, submittedAt, userAgent } = req.body;

        const cleanedAnswers = sanitizeAnswers(answers);
        const cleanedVisiblePath = sanitizeVisiblePath(visiblePath);

        if (!cleanedAnswers || Object.keys(cleanedAnswers).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Ongeldige of lege antwoorden ontvangen."
            });
        }

        const email = normalizeEmail(cleanedAnswers.email);

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "E-mailadres is verplicht."
            });
        }

        cleanedAnswers.email = email;

        const existingSubmission = await surveyCollection.findOne(
            { email },
            { projection: { _id: 1 } }
        );

        if (existingSubmission) {
            return res.status(409).json({
                success: false,
                message: "Je hebt deze vragenlijst al ingevuld."
            });
        }

        const document = {
            email,
            answers: cleanedAnswers,
            visiblePath: cleanedVisiblePath,
            submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
            createdAt: new Date(),
            metadata: {
                userAgent: userAgent || req.get("user-agent") || null,
                ip: getClientIp(req),
                referer: req.get("referer") || null,
                origin: req.get("origin") || null
            }
        };

        const result = await surveyCollection.insertOne(document);

        try {
            await sendConfirmationEmail(email, cleanedAnswers);
            console.log(`Bevestigingsmail verzonden naar ${email}`);
        } catch (mailError) {
            console.error(`Survey opgeslagen, maar mail verzenden mislukte voor ${email}:`, mailError.message);
        }

        return res.status(201).json({
            success: true,
            message: "Survey succesvol opgeslagen.",
            insertedId: result.insertedId,
            redirectUrl: "/survey/bedankt"
        });
    } catch (error) {
        console.error("Fout bij opslaan in MongoDB:", error);

        if (error && error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Dubbele invoer gedetecteerd. Probeer opnieuw."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Er ging iets mis bij het opslaan van de bevraging."
        });
    }
});

/* -------------------- DASHBOARD LOGIN -------------------- */

app.get("/dashboard/login", (req, res) => {
    if (req.session.dashboardAuthenticated) {
        return res.redirect("/dashboard");
    }

    res.render("dashboard-login", {
        title: "Dashboard login",
        error: null
    });
});

app.post("/dashboard/login", (req, res) => {
    const { username, password } = req.body;

    if (username === DASHBOARD_USERNAME && password === DASHBOARD_PASSWORD) {
        req.session.dashboardAuthenticated = true;
        return res.redirect("/dashboard");
    }

    return res.status(401).render("dashboard-login", {
        title: "Dashboard login",
        error: "Ongeldige gebruikersnaam of wachtwoord."
    });
});

app.post("/dashboard/logout", requireDashboardAuth, (req, res) => {
    req.session.destroy(() => {
        res.redirect("/dashboard/login");
    });
});

/* -------------------- DASHBOARD PAGINA -------------------- */

app.get("/dashboard", requireDashboardAuth, (req, res) => {
    res.render("dashboard", {
        title: "Duurzaamheidsdashboard"
    });
});

/* -------------------- DASHBOARD DATA API -------------------- */

app.get("/api/dashboard-data", requireDashboardAuth, async (req, res) => {
    try {
        if (!surveyCollection) {
            return res.status(503).json({
                success: false,
                message: "Database is momenteel niet beschikbaar."
            });
        }

        const docs = await surveyCollection
            .find({})
            .sort({ createdAt: -1, submittedAt: -1 })
            .toArray();

        const responses = docs.map(normalizeResponse);
        const dashboardData = buildDashboardData(responses);

        return res.json({
            success: true,
            ...dashboardData
        });
    } catch (error) {
        console.error("Fout bij ophalen dashboard-data:", error);

        return res.status(500).json({
            success: false,
            message: "Dashboard-data kon niet geladen worden."
        });
    }
});

app.use((req, res) => {
    res.status(404).send("404 - Pagina niet gevonden");
});

async function startServer() {
    try {
        await connectToMongo();

        mailTransporter = createMailTransporter();
        await verifyMailTransporter();

        app.listen(PORT, () => {
            console.log(`Server draait op http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Kon server niet starten:", error);
        process.exit(1);
    }
}

process.on("SIGINT", async () => {
    try {
        if (mongoClient) {
            await mongoClient.close();
            console.log("MongoDB verbinding netjes afgesloten.");
        }
    } catch (error) {
        console.error("Fout bij afsluiten MongoDB:", error);
    } finally {
        process.exit(0);
    }
});

startServer();