const { sendEmail } = require("./services/emailService");

// Test email functionality
async function testEmail() {
  console.log("🧪 Testing Email Functionality...\n");

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
      console.log("✅ EMAIL SENT SUCCESSFULLY!");
      console.log(`📨 Message ID: ${result.messageId}`);
      console.log(`📧 Check inbox: ${testEmail}`);
    } else {
      console.log("❌ EMAIL FAILED!");
      console.log(`🚨 Error: ${result.error}`);
    }
  } catch (error) {
    console.log("❌ EMAIL TEST FAILED!");
    console.log(`🚨 Error: ${error.message}`);
  }

  console.log("\n🔍 Email test completed!");
}

// Run the test
testEmail();
