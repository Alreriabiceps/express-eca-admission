// Simple email queue system for handling email failures
const fs = require("fs");
const path = require("path");

class EmailQueue {
  constructor() {
    this.queueFile = path.join(__dirname, "../data/email-queue.json");
    this.ensureQueueFile();
  }

  ensureQueueFile() {
    const dir = path.dirname(this.queueFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.queueFile)) {
      fs.writeFileSync(this.queueFile, JSON.stringify([]));
    }
  }

  addToQueue(emailData) {
    try {
      const queue = this.getQueue();
      queue.push({
        ...emailData,
        timestamp: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
      });
      this.saveQueue(queue);
      console.log("📬 Email added to queue for retry");
    } catch (error) {
      console.error("❌ Failed to add email to queue:", error.message);
    }
  }

  getQueue() {
    try {
      const data = fs.readFileSync(this.queueFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("❌ Failed to read email queue:", error.message);
      return [];
    }
  }

  saveQueue(queue) {
    try {
      fs.writeFileSync(this.queueFile, JSON.stringify(queue, null, 2));
    } catch (error) {
      console.error("❌ Failed to save email queue:", error.message);
    }
  }

  processQueue() {
    const queue = this.getQueue();
    const now = new Date();

    // Process emails that haven't been attempted recently
    const emailsToProcess = queue.filter((email) => {
      const lastAttempt = new Date(email.lastAttempt || email.timestamp);
      const timeDiff = now - lastAttempt;
      return email.attempts < email.maxAttempts && timeDiff > 300000; // 5 minutes
    });

    if (emailsToProcess.length > 0) {
      console.log(`📬 Processing ${emailsToProcess.length} queued emails...`);
    }

    return emailsToProcess;
  }

  removeFromQueue(emailId) {
    const queue = this.getQueue();
    const filteredQueue = queue.filter((email) => email.id !== emailId);
    this.saveQueue(filteredQueue);
  }

  updateAttempt(emailId, success = false) {
    const queue = this.getQueue();
    const emailIndex = queue.findIndex((email) => email.id === emailId);

    if (emailIndex !== -1) {
      queue[emailIndex].attempts += 1;
      queue[emailIndex].lastAttempt = new Date().toISOString();

      if (
        success ||
        queue[emailIndex].attempts >= queue[emailIndex].maxAttempts
      ) {
        queue.splice(emailIndex, 1);
        console.log(
          success
            ? "✅ Email sent successfully, removed from queue"
            : "❌ Email failed after max attempts, removed from queue"
        );
      }

      this.saveQueue(queue);
    }
  }
}

module.exports = EmailQueue;
