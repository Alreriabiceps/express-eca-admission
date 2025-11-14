const { sendEmail } = require("./services/emailService");

// Test email functionality with verified domain
async function testEmailToAnyAddress() {
  console.log("🧪 Testing Email to Any Address with Verified Domain...\n");

  try {
    // Test with any email address (not just verified one)
    const testEmail = "test@example.com"; // Any email address
    const testName = "Test User";
    const testApplicationId = "TEST-" + Date.now();

    console.log(`📧 Sending test email to: ${testEmail}`);
    console.log(`👤 Test name: ${testName}`);
    console.log(`🆔 Test application ID: ${testApplicationId}`);
    console.log(`📧 From: noreply@exactcolleges.edu.ph\n`);

    const result = await sendEmail(testEmail, "submissionConfirmation", [
      testName,
      testApplicationId,
    ]);

    if (result.success) {
      console.log("✅ EMAIL SENT SUCCESSFULLY TO ANY ADDRESS!");
      console.log(`📨 Message ID: ${result.messageId}`);
      console.log(`📧 Provider: ${result.provider}`);
      console.log(`📧 Domain: exactcolleges.edu.ph`);
    } else {
      console.log("❌ EMAIL FAILED!");
      console.log(`🚨 Error: ${result.error}`);
      console.log(`📧 Provider: ${result.provider}`);
    }
  } catch (error) {
    console.log("❌ EMAIL TEST FAILED!");
    console.log(`🚨 Error: ${error.message}`);
  }

  console.log("\n🔍 Email test completed!");
}

// Run the test
testEmailToAnyAddress();






