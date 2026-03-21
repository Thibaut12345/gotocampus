const express = require("express");
const path = require("path");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "1mb" }));

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "carpool_platform";
const COLLECTION_NAME = process.env.COLLECTION_NAME || "survey_responses";

let mongoClient;
let surveyCollection;

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

        if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
        ) {
            cleaned[key] = value;
        } else if (value === null || value === undefined) {
            cleaned[key] = "";
        } else {
            cleaned[key] = String(value);
        }
    }

    return cleaned;
}

function sanitizeVisiblePath(visiblePath) {
    if (!Array.isArray(visiblePath)) return [];

    return visiblePath
        .filter((item) => typeof item === "string" && item.trim() !== "")
        .slice(0, 100);
}

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
        mongoConnected: !!surveyCollection
    });
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

        const document = {
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

        return res.status(201).json({
            success: true,
            message: "Survey succesvol opgeslagen.",
            insertedId: result.insertedId,
            redirectUrl: "/survey/bedankt"
        });
    } catch (error) {
        console.error("Fout bij opslaan in MongoDB:", error);

        return res.status(500).json({
            success: false,
            message: "Er ging iets mis bij het opslaan van de bevraging."
        });
    }
});

app.use((req, res) => {
    res.status(404).send("404 - Pagina niet gevonden");
});

async function startServer() {
    try {
        await connectToMongo();

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