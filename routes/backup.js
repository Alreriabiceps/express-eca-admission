const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const backupService = require("../services/backupService");

// Create full backup (admin only)
router.post("/create-full", authMiddleware, async (req, res) => {
  try {
    console.log("Backup request received from admin");

    // Set a longer timeout for backup operations
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000); // 5 minutes

    const result = await backupService.createFullBackup();

    if (result.success) {
      console.log("Backup created successfully:", result.backupName);
      res.json({
        message: "Full backup created successfully",
        backupName: result.backupName,
        path: result.path,
      });
    } else {
      console.error("Backup creation failed:", result.error);
      res.status(500).json({
        message: "Backup creation failed",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Create full backup error:", error);
    res.status(500).json({
      message: "Server error during backup creation",
      error: error.message,
    });
  }
});

// Create incremental backup (admin only)
router.post("/create-incremental", authMiddleware, async (req, res) => {
  try {
    const result = await backupService.createIncrementalBackup();

    if (result.success) {
      res.json({
        message: "Incremental backup created successfully",
        backupName: result.backupName,
        path: result.path,
      });
    } else {
      res.status(500).json({
        message: "Backup creation failed",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Create incremental backup error:", error);
    res.status(500).json({ message: "Server error during backup creation" });
  }
});

// List all backups (admin only)
router.get("/list", authMiddleware, async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    res.json({ backups });
  } catch (error) {
    console.error("List backups error:", error);
    res.status(500).json({ message: "Server error while listing backups" });
  }
});

// Restore from backup (admin only)
router.post("/restore/:backupName", authMiddleware, async (req, res) => {
  try {
    const { backupName } = req.params;
    const result = await backupService.restoreFromBackup(backupName);

    if (result.success) {
      res.json({
        message: "Backup restored successfully",
        backupName,
      });
    } else {
      res.status(500).json({
        message: "Backup restore failed",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Restore backup error:", error);
    res.status(500).json({ message: "Server error during backup restore" });
  }
});

// Get backup statistics (admin only)
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const stats = await backupService.getBackupStats();
    res.json({ stats });
  } catch (error) {
    console.error("Backup stats error:", error);
    res
      .status(500)
      .json({ message: "Server error while getting backup stats" });
  }
});

// Download backup (admin only)
router.get("/download/:backupName", authMiddleware, async (req, res) => {
  try {
    const { backupName } = req.params;
    const backupPath = path.join(__dirname, "../backups", backupName);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ message: "Backup not found" });
    }

    // Create zip file
    const zipPath = path.join(__dirname, "../backups", `${backupName}.zip`);
    await backupService.createZipArchive(backupPath, zipPath);

    // Send file
    res.download(zipPath, `${backupName}.zip`, (err) => {
      if (err) {
        console.error("Download error:", err);
      }
      // Clean up zip file after download
      fs.unlinkSync(zipPath);
    });
  } catch (error) {
    console.error("Download backup error:", error);
    res.status(500).json({ message: "Server error during backup download" });
  }
});

// Delete backup (admin only)
router.delete("/delete/:backupName", authMiddleware, async (req, res) => {
  try {
    const { backupName } = req.params;
    const backupPath = path.join(__dirname, "../backups", backupName);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ message: "Backup not found" });
    }

    // Remove backup directory
    fs.rmSync(backupPath, { recursive: true, force: true });

    res.json({ message: "Backup deleted successfully" });
  } catch (error) {
    console.error("Delete backup error:", error);
    res.status(500).json({ message: "Server error during backup deletion" });
  }
});

module.exports = router;
