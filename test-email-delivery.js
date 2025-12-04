// Quick email test script
const { sendEmail } = require("./services/emailService");

async function testEmailDelivery() {
  console.log("🧪 Testing Email Delivery...\n");

  // Test with your email
  const testEmails = [
    "ecaams01@gmail.com",
    "smurf1egoisto@gmail.com", // Alternative email
  ];

  for (const email of testEmails) {
    console.log(`📧 Testing email delivery to: ${email}`);

    try {
      const result = await sendEmail(email, "submissionConfirmation", [
        "Test User",
        "TEST-" + Date.now(),
      ]);

      if (result.success) {
        console.log(`✅ Email sent successfully to ${email}`);
        console.log(`📧 Message ID: ${result.messageId}`);
      } else {
        console.log(`❌ Email failed to ${email}: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error sending to ${email}: ${error.message}`);
    }

    console.log("---");
  }
}

testEmailDelivery();











