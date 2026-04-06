const nodemailer = require("nodemailer");

// Strip spaces from Gmail App Password if present
const emailPass = process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.replace(/\s/g, "") : "";

// Reuse a single transporter instance to avoid reconnecting for each invitation.
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 1,
    maxMessages: 100,
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: emailPass,
    },
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendEmail = async (options) => {
    const textFallback = options.message || (options.html ? options.html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : '');

    const mailOptions = {
        from: `"FortCode Team" <${process.env.EMAIL_USERNAME}>`,
        to: options.email,
        subject: options.subject,
        text: textFallback,
        html: options.html,
        attachments: options.attachments || [],
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        // Retry once for transient SMTP/provider throttling errors.
        await wait(1200);
        await transporter.sendMail(mailOptions);
    }
};

module.exports = sendEmail;
