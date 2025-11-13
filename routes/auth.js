const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Admin = require("../models/Admin");
const ResetToken = require("../models/ResetToken");
const authMiddleware = require("../middleware/auth");
const { sendEmail } = require("../services/emailService");

const router = express.Router();

// Admin login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// Get current admin info
router.get("/me", authMiddleware, async (req, res) => {
  try {
    res.json({
      admin: {
        id: req.admin._id,
        email: req.admin.email,
      },
    });
  } catch (error) {
    console.error("Get admin info error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update admin profile (email)
router.patch("/me/profile", authMiddleware, async (req, res) => {
  try {
    const { email, currentPassword } = req.body;

    if (!email || !currentPassword) {
      return res
        .status(400)
        .json({ message: "Email and current password are required" });
    }

    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const existingAdmin = await Admin.findOne({
      email: email.toLowerCase(),
      _id: { $ne: admin._id },
    });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email is already in use" });
    }

    admin.email = email.toLowerCase();
    await admin.save();

    res.json({
      message: "Email updated successfully",
      admin: { id: admin._id, email: admin.email },
    });
  } catch (error) {
    console.error("Update admin profile error:", error);
    res.status(500).json({ message: "Server error while updating profile" });
  }
});

// Update admin password
router.patch("/me/password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new passwords are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Update admin password error:", error);
    res.status(500).json({ message: "Server error while updating password" });
  }
});

// Request password reset
router.post("/request-password-reset", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ message: "Email is required to reset password" });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.json({
        message:
          "If an account exists for this email, a reset link has been sent.",
      });
    }

    await ResetToken.deleteMany({
      admin: admin._id,
      used: false,
    });

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    await ResetToken.create({
      admin: admin._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const baseUrl =
      process.env.ADMIN_RESET_URL ||
      req.headers.origin ||
      `${req.protocol}://${req.get("host")}`;
    const resetLink = `${baseUrl.replace(/\/$/, "")}/admin/reset-password?token=${token}&email=${encodeURIComponent(
      admin.email
    )}`;

    await sendEmail(admin.email, "adminPasswordReset", [
      admin.email,
      resetLink,
    ]);

    res.json({
      message:
        "If an account exists for this email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    res
      .status(500)
      .json({ message: "Server error while requesting password reset" });
  }
});

// Reset password with token
router.post("/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        message: "Email, token, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const resetToken = await ResetToken.findOne({
      admin: admin._id,
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    admin.password = newPassword;
    await admin.save();

    resetToken.used = true;
    await resetToken.save();

    await ResetToken.deleteMany({
      admin: admin._id,
      _id: { $ne: resetToken._id },
    });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    res
      .status(500)
      .json({ message: "Server error while resetting password" });
  }
});

// Create admin (for initial setup - remove in production)
router.post("/create-admin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // Create new admin
    const admin = new Admin({ email, password });
    await admin.save();

    res.status(201).json({
      message: "Admin created successfully",
      admin: {
        id: admin._id,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    res.status(500).json({ message: "Server error during admin creation" });
  }
});

module.exports = router;
