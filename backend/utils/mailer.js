const nodemailer = require("nodemailer");
const sendEmail = async ({ to, subject, html, text, bcc }) => {
  const isConfigured =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (!isConfigured) {
    console.warn("\n SMTP credentials not found in .env. Logging mail content instead:\n");
    console.log(`-----------------------------------------------------------------`);
    console.log(`To      : ${to}`);
    if (bcc?.length) console.log(`✉️  Bcc     : ${[].concat(bcc).join(", ")}`);
    console.log(`Subject : ${subject}`);
    console.log(`Body    :\n${text || html}`);
    console.log(`-----------------------------------------------------------------\n`);
    return { mocked: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: parseInt(process.env.SMTP_PORT, 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  const fromName = process.env.SMTP_FROM_NAME || "Dynamics Square";
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  };

  if (bcc && [].concat(bcc).filter(Boolean).length) {
    mailOptions.bcc = [].concat(bcc).filter(Boolean).join(", ");
  }

  return await transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };
