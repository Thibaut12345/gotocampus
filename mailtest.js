const nodemailer = require("nodemailer");
require("dotenv").config();

async function test() {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    try {
        await transporter.verify();
        console.log("Mailserver correct geconfigureerd.");
    } catch (err) {
        console.error("Fout:", err);
    }
}

test();