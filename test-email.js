const { sendEmail } = require("./services/emailService");

// Test email functionality with Resend
async function testEmail() {
  console.log("🧪 Testing Resend Email Functionality...\n");

  try {
    // Test with a sample email (replace with your email)
    const testEmail = process.env.TEST_EMAIL || "smurf1egoisto@gmail.com";
    const testName = "Test User";
    const testApplicationId = "TEST-" + Date.now();

    console.log(`📧 Sending test email to: ${testEmail}`);
    console.log(`👤 Test name: ${testName}`);
    console.log(`🆔 Test application ID: ${testApplicationId}\n`);

    const result = await sendEmail(testEmail, "submissionConfirmation", [
      testName,
      testApplicationId,
    ]);

    if (result.success) {
      console.log("✅ EMAIL SENT SUCCESSFULLY VIA RESEND!");
      console.log(`📨 Message ID: ${result.messageId}`);
      console.log(`📧 Provider: ${result.provider}`);
      console.log(`📧 Check inbox: ${testEmail}`);
    } else {
      console.log("❌ EMAIL FAILED!");
      console.log(`🚨 Error: ${result.error}`);
      console.log(`📧 Provider: ${result.provider}`);
    }
  } catch (error) {
    console.log("❌ EMAIL TEST FAILED!");
    console.log(`🚨 Error: ${error.message}`);
  }

  console.log("\n🔍 Resend email test completed!");
}

// Run the test
testEmail();
