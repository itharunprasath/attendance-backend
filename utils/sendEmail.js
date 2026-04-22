const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text, html }) => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM_EMAIL,
    SMTP_SECURE,
  } = process.env;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: SMTP_FROM_EMAIL,
    to,
    subject,
    text,
    html,
  });
};

module.exports = sendEmail;


