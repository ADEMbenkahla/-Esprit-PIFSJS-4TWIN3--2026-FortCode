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

    const textFallback = options.message || (options.html ? options.html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : '');

    const mailOptions = {
        from: `"FortCode Team" <${process.env.EMAIL_USERNAME}>`,
        to: options.email,
        subject: options.subject,
        text: textFallback,
        html: options.html,
        attachments: options.attachments || [],
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
