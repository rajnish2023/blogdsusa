const Lead = require("../models/Lead");
const { sendEmail } = require("../utils/mailer");
const { body, validationResult } = require("express-validator");

 
const contactValidation = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 120 }),
  body("email").trim().isEmail().withMessage("Valid email is required").isLength({ max: 200 }),
  body("phone").optional().trim().isLength({ max: 30 }),
  body("company").optional().trim().isLength({ max: 150 }),
  body("service").optional().trim().isLength({ max: 200 }),
  body("message").optional().trim().isLength({ max: 2000 }),
  body("source").optional().trim().isLength({ max: 200 }),
];
 
const submitContact = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  try {
    const { name, email, phone, company, service, message, source } = req.body;
 
    const lead = await Lead.create({
      name,
      email,
      phone: phone || "",
      company: company || "",
      service: service || "",
      message: message || "",
      source: source || "",
      ip: req.ip,
    });
 
    const adminEmail = process.env.LEAD_NOTIFY_EMAIL || process.env.SEED_ADMIN_EMAIL || "admin@dynamicssquare.com";

    const emailHtml = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; color: #ffffff; font-size: 18px;">🔔 New Lead Received</h2>
          <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 12px;">A visitor submitted a contact form on your website.</p>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 100px; vertical-align: top;">Name</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Email</td>
              <td style="padding: 8px 0; color: #0f172a;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td>
            </tr>
            ${phone ? `<tr><td style="padding: 8px 0; color: #64748b;">Phone</td><td style="padding: 8px 0; color: #0f172a;">${phone}</td></tr>` : ""}
            ${company ? `<tr><td style="padding: 8px 0; color: #64748b;">Company</td><td style="padding: 8px 0; color: #0f172a;">${company}</td></tr>` : ""}
            ${service ? `<tr><td style="padding: 8px 0; color: #64748b;">Service</td><td style="padding: 8px 0; color: #0f172a;">${service}</td></tr>` : ""}
            ${message ? `<tr><td style="padding: 8px 0; color: #64748b;">Message</td><td style="padding: 8px 0; color: #0f172a;">${message}</td></tr>` : ""}
            ${source ? `<tr><td style="padding: 8px 0; color: #64748b;">Page</td><td style="padding: 8px 0; color: #0f172a;">${source}</td></tr>` : ""}
          </table>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 16px 0;" />
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">Automated notification from Dynamics Square CMS</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: adminEmail,
      subject: `New Lead: ${name} – ${service || "General Inquiry"}`,
      html: emailHtml,
    });

    res.status(201).json({ message: "Thank you! We'll get back to you soon." });
  } catch (err) {
    console.error("[contact] Error:", err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

module.exports = { contactValidation, submitContact };
