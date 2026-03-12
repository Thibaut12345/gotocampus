const searchBtn = document.getElementById("searchBtn");
const searchMessage = document.getElementById("searchMessage");

if (searchBtn) {
    searchBtn.addEventListener("click", () => {
        searchMessage.textContent = "Zoekfunctie aangeklikt — later kunnen we dit koppelen aan echte ritten.";
    });
}

const countBtn = document.getElementById("countBtn");
const countResult = document.getElementById("countResult");

if (countBtn) {
    countBtn.addEventListener("click", () => {
        const fakeUsers = Math.floor(Math.random() * 500) + 100;
        countResult.textContent = `${fakeUsers} gebruikers zoeken vandaag een carpoolrit.`;
    });
}