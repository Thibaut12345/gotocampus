const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
    res.render("home", { title: "Carpool Platform" });
});

app.get("/survey", (req, res) => {
    res.render("survey", { title: "Mobiliteitsbevraging" });
});

app.listen(PORT, () => {
    console.log(`Server draait op http://localhost:${PORT}`);
});