// Alternative email service using SendGrid (better for Render)
const sgMail = require("@sendgrid/mail");

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

// SendGrid email function
const sendEmailViaSendGrid = async (to, template, data) => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("SendGrid API key not configured");
    }

    const emailTemplate = emailTemplates[template](...data);

    const msg = {
      to: to,
      from: {
        email: process.env.EMAIL_USER,
        name: "Exact Colleges of Asia",
      },
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    };

    console.log("📧 Sending email via SendGrid...");
    const result = await sgMail.send(msg);
    console.log("✅ SendGrid email sent successfully");
    return { success: true, messageId: result[0].headers["x-message-id"] };
  } catch (error) {
    console.error("❌ SendGrid email failed:", error.message);
    return { success: false, error: error.message };
  }
};

// Enhanced email function with SendGrid fallback
const sendEmailEnhanced = async (to, template, data, retryCount = 0) => {
  // First try SendGrid if API key is available
  if (process.env.SENDGRID_API_KEY && retryCount === 0) {
    console.log("🚀 Trying SendGrid first...");
    const sendGridResult = await sendEmailViaSendGrid(to, template, data);
    if (sendGridResult.success) {
      return sendGridResult;
    }
    console.log("⚠️ SendGrid failed, falling back to Gmail...");
  }

  // Fallback to Gmail with multiple configurations
  return await sendEmail(to, template, data, retryCount);
};

module.exports = {
  sendEmail: sendEmailEnhanced, // Use enhanced version
  sendEmailViaSendGrid,
  emailTemplates,
};
