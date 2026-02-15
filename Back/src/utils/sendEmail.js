const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
    // Strip spaces from Gmail App Password if present
    const emailPass = process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.replace(/\s/g, "") : "";

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, // Use SSL
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: emailPass,
        },
    });

    const mailOptions = {
        from: `"FortCode Team" <${process.env.EMAIL_USERNAME}>`,
        to: options.email,
        subject: options.subject,
        text: options.message || "Please see the HTML version of this email.",
        html: options.html,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
