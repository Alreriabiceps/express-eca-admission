const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const exportService = require("../services/exportService");

// Export applications to CSV (admin only)
router.get("/applications/csv", authMiddleware, async (req, res) => {
  try {
    const result = await exportService.exportApplicationsToCSV();

    if (result.success) {
      res.download(result.filepath, result.filename, (err) => {
        if (err) {
          console.error("Download error:", err);
        }
        // Clean up file after download
        setTimeout(() => {
          if (fs.existsSync(result.filepath)) {
            fs.unlinkSync(result.filepath);
          }
        }, 1000);
      });
    } else {
      res.status(500).json({
        message: "Export failed",
        error: result.error || result.message,
      });
    }
  } catch (error) {
    console.error("CSV export error:", error);
    res.status(500).json({ message: "Server error during CSV export" });
  }
});

// Export applications to Excel (admin only)
router.get("/applications/excel", authMiddleware, async (req, res) => {
  try {
    const result = await exportService.exportApplicationsToExcel();

    if (result.success) {
      res.download(result.filepath, result.filename, (err) => {
        if (err) {
          console.error("Download error:", err);
        }
        // Clean up file after download
        setTimeout(() => {
          if (fs.existsSync(result.filepath)) {
            fs.unlinkSync(result.filepath);
          }
        }, 1000);
      });
    } else {
      res.status(500).json({
        message: "Export failed",
        error: result.error || result.message,
      });
    }
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ message: "Server error during Excel export" });
  }
});

// Export system statistics (admin only)
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const result = await exportService.exportSystemStats();

    if (result.success) {
      res.download(result.filepath, result.filename, (err) => {
        if (err) {
          console.error("Download error:", err);
        }
        // Clean up file after download
        setTimeout(() => {
          if (fs.existsSync(result.filepath)) {
            fs.unlinkSync(result.filepath);
          }
        }, 1000);
      });
    } else {
      res.status(500).json({
        message: "Export failed",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Stats export error:", error);
    res.status(500).json({ message: "Server error during stats export" });
  }
});

// Create comprehensive export package (admin only)
router.get("/package", authMiddleware, async (req, res) => {
  try {
    const result = await exportService.createExportPackage();

    if (result.success) {
      res.download(result.filepath, result.filename, (err) => {
        if (err) {
          console.error("Download error:", err);
        }
        // Clean up file after download
        setTimeout(() => {
          if (fs.existsSync(result.filepath)) {
            fs.unlinkSync(result.filepath);
          }
        }, 1000);
      });
    } else {
      res.status(500).json({
        message: "Export package creation failed",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Export package error:", error);
    res
      .status(500)
      .json({ message: "Server error during export package creation" });
  }
});

// Clean up old exports (admin only)
router.post("/cleanup", authMiddleware, async (req, res) => {
  try {
    const result = await exportService.cleanupOldExports();

    if (result.success) {
      res.json({
        message: `Cleaned up ${result.cleaned} old export files`,
        cleaned: result.cleaned,
      });
    } else {
      res.status(500).json({
        message: "Cleanup failed",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Export cleanup error:", error);
    res.status(500).json({ message: "Server error during export cleanup" });
  }
});

module.exports = router;
