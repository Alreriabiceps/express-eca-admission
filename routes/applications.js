const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Application = require("../models/Application");
const authMiddleware = require("../middleware/auth");
const { sendEmail } = require("../services/emailService");

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Upload to Cloudinary helper function with timeout
const uploadToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Cloudinary upload timeout"));
    }, 15000); // 15 second timeout

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `sam/${folder}` },
      (error, result) => {
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(file.buffer);
  });
};

// Submit new application (public route)
router.post(
  "/submit",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log("Request body:", req.body);
      console.log("Request files:", req.files);

      const { name, email, contact, courseApplied } = req.body;

      // Validate required fields
      if (!name || !email || !contact || !courseApplied) {
        return res.status(400).json({
          message: "Name, email, contact, and course are required",
        });
      }

      // Validate files
      if (!req.files || !req.files.photo || !req.files.signature) {
        console.log("Files validation failed:", req.files);
        return res.status(400).json({
          message: "Photo and signature are required",
        });
      }

      // Upload files to Cloudinary
      const [photoResult, signatureResult] = await Promise.all([
        uploadToCloudinary(req.files.photo[0], "photos"),
        uploadToCloudinary(req.files.signature[0], "signatures"),
      ]);

      // Create application
      const application = new Application({
        name,
        email,
        contact,
        courseApplied,
        photoUrl: photoResult.secure_url,
        signatureUrl: signatureResult.secure_url,
      });

      await application.save();

      // Send confirmation email (non-blocking)
      sendEmail(email, "submissionConfirmation", [name, application._id])
        .then(() => {
          console.log("Confirmation email sent to:", email);
        })
        .catch((emailError) => {
          console.error("Failed to send confirmation email:", emailError);
          // Don't fail the request if email fails
        });

      res.status(201).json({
        message: "Application submitted successfully",
        applicationId: application._id,
      });
    } catch (error) {
      console.error("Submit application error:", error);
      res
        .status(500)
        .json({ message: "Server error during application submission" });
    }
  }
);

// Get all applications (admin only)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { status, course, search, page = 1, limit = 10 } = req.query;

    // Build filter object
    const filter = { archived: { $ne: true } }; // Exclude archived applications by default
    if (status) filter.status = status;
    if (course) {
      // Handle multiple course filtering - if course contains comma, split and use $in
      if (course.includes(",")) {
        const courses = course.split(",").map((c) => c.trim());
        filter.courseApplied = { $in: courses };
      } else {
        filter.courseApplied = new RegExp(course, "i");
      }
    }
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get applications with pagination
    const applications = await Application.find(filter)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-__v");

    // Get total count for pagination
    const total = await Application.countDocuments(filter);

    res.json({
      applications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Get applications error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching applications" });
  }
});

// Get archived applications (admin only) - MUST be before /:id route
router.get("/archived", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    console.log("Fetching archived applications:", {
      page: pageNum,
      limit: limitNum,
      skip,
    });

    const applications = await Application.find({ archived: true })
      .sort({ archivedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select("-__v");

    const total = await Application.countDocuments({ archived: true });

    console.log(
      "Found archived applications:",
      applications.length,
      "Total:",
      total
    );

    res.json({
      applications: applications || [],
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total: total || 0,
      },
    });
  } catch (error) {
    console.error("Get archived applications error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching archived applications" });
  }
});

// Get single application (admin only)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid application ID format" });
    }

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json(application);
  } catch (error) {
    console.error("Get application error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching application" });
  }
});

// Update application status (admin only)
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid application ID format" });
    }

    const { status } = req.body;

    if (
      !status ||
      !["pending", "verified", "incomplete", "admitted", "rejected"].includes(
        status
      )
    ) {
      return res.status(400).json({
        message: "Valid status is required",
      });
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Send email notification based on status
    try {
      if (status === "incomplete") {
        // Send missing requirements email
        const missingItems = [
          "Updated photo",
          "Clear signature",
          "Additional documents",
        ];
        await sendEmail(application.email, "missingRequirements", [
          application.name,
          missingItems,
        ]);
        console.log("Missing requirements email sent to:", application.email);
      } else if (status === "admitted" || status === "rejected") {
        // Send admission result email
        await sendEmail(application.email, "admissionResult", [
          application.name,
          status,
          application.courseApplied,
        ]);
        console.log("Admission result email sent to:", application.email);
      }
    } catch (emailError) {
      console.error("Failed to send status email:", emailError);
      // Don't fail the request if email fails
    }

    res.json({
      message: "Application status updated successfully",
      application,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Server error while updating status" });
  }
});

// Send missing requirements notification (admin only)
router.post(
  "/:id/send-missing-requirements",
  authMiddleware,
  async (req, res) => {
    try {
      // Validate ObjectId format
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return res
          .status(400)
          .json({ message: "Invalid application ID format" });
      }

      const { missingItems, customMessage } = req.body;

      if (
        !missingItems ||
        !Array.isArray(missingItems) ||
        missingItems.length === 0
      ) {
        return res.status(400).json({
          message: "Missing items array is required",
        });
      }

      const application = await Application.findById(req.params.id);

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Send missing requirements email with custom message
      const emailResult = await sendEmail(
        application.email,
        "missingRequirements",
        [application.name, missingItems, customMessage]
      );

      if (emailResult.success) {
        res.json({
          message: "Missing requirements notification sent successfully",
          emailId: emailResult.messageId,
        });
      } else {
        res.status(500).json({
          message: "Failed to send email notification",
          error: emailResult.error,
        });
      }
    } catch (error) {
      console.error("Send missing requirements error:", error);
      res
        .status(500)
        .json({ message: "Server error while sending notification" });
    }
  }
);

// Send custom notification (admin only)
router.post(
  "/:id/send-custom-notification",
  authMiddleware,
  async (req, res) => {
    try {
      // Validate ObjectId format
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return res
          .status(400)
          .json({ message: "Invalid application ID format" });
      }

      const { subject, message, notificationType } = req.body;

      if (!subject || !message) {
        return res.status(400).json({
          message: "Subject and message are required",
        });
      }

      const application = await Application.findById(req.params.id);

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Send custom notification email
      const emailResult = await sendEmail(
        application.email,
        "customNotification",
        [application.name, subject, message, notificationType]
      );

      if (emailResult.success) {
        res.json({
          message: "Custom notification sent successfully",
          emailId: emailResult.messageId,
        });
      } else {
        res.status(500).json({
          message: "Failed to send email notification",
          error: emailResult.error,
        });
      }
    } catch (error) {
      console.error("Send custom notification error:", error);
      res
        .status(500)
        .json({ message: "Server error while sending notification" });
    }
  }
);

// Update application (admin only)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid application ID format" });
    }

    const { name, email, contact, courseApplied, status } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (contact) updateData.contact = contact;
    if (courseApplied) updateData.courseApplied = courseApplied;
    if (status) updateData.status = status;

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json({
      message: "Application updated successfully",
      application,
    });
  } catch (error) {
    console.error("Update application error:", error);
    res
      .status(500)
      .json({ message: "Server error while updating application" });
  }
});

// Delete application (admin only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid application ID format" });
    }

    const application = await Application.findByIdAndDelete(req.params.id);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json({ message: "Application deleted successfully" });
  } catch (error) {
    console.error("Delete application error:", error);
    res
      .status(500)
      .json({ message: "Server error while deleting application" });
  }
});

// Archive application (admin only)
router.patch("/:id/archive", authMiddleware, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid application ID format" });
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { archived: true, archivedAt: new Date() },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json({
      message: "Application archived successfully",
      application,
    });
  } catch (error) {
    console.error("Archive application error:", error);
    res
      .status(500)
      .json({ message: "Server error while archiving application" });
  }
});

// Unarchive application (admin only)
router.patch("/:id/unarchive", authMiddleware, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid application ID format" });
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { archived: false, $unset: { archivedAt: 1 } },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json({
      message: "Application unarchived successfully",
      application,
    });
  } catch (error) {
    console.error("Unarchive application error:", error);
    res
      .status(500)
      .json({ message: "Server error while unarchiving application" });
  }
});

// Get application statistics (admin only)
router.get("/stats/overview", authMiddleware, async (req, res) => {
  try {
    const stats = await Application.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const courseStats = await Application.aggregate([
      {
        $group: {
          _id: "$courseApplied",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const totalApplications = await Application.countDocuments();
    const recentApplications = await Application.countDocuments({
      submittedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    res.json({
      totalApplications,
      recentApplications,
      statusBreakdown: stats,
      courseBreakdown: courseStats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ message: "Server error while fetching statistics" });
  }
});

module.exports = router;
