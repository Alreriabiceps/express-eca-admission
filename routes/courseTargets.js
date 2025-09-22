const express = require("express");
const CourseTarget = require("../models/CourseTarget");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Get all course targets
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { year, term } = req.query;
    const currentYear = year || new Date().getFullYear().toString();
    
    let query = { academicYear: currentYear, isActive: true };
    if (term && term !== "all") {
      query.term = term;
    }

    const targets = await CourseTarget.find(query).sort({ courseName: 1 });
    res.json(targets);
  } catch (error) {
    console.error("Error fetching course targets:", error);
    res.status(500).json({ message: "Server error while fetching course targets" });
  }
});

// Create or update course target
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { courseName, target, academicYear, term } = req.body;
    const adminId = req.admin.id;

    if (!courseName || target === undefined) {
      return res.status(400).json({ message: "Course name and target are required" });
    }

    const currentYear = academicYear || new Date().getFullYear().toString();
    const currentTerm = term || "all";

    // Check if target already exists
    const existingTarget = await CourseTarget.findOne({
      courseName,
      academicYear: currentYear,
      term: currentTerm
    });

    if (existingTarget) {
      // Update existing target
      existingTarget.target = target;
      existingTarget.updatedBy = adminId;
      await existingTarget.save();
      res.json({ message: "Course target updated successfully", target: existingTarget });
    } else {
      // Create new target
      const newTarget = new CourseTarget({
        courseName,
        target,
        academicYear: currentYear,
        term: currentTerm,
        createdBy: adminId,
        updatedBy: adminId
      });
      await newTarget.save();
      res.json({ message: "Course target created successfully", target: newTarget });
    }
  } catch (error) {
    console.error("Error creating/updating course target:", error);
    res.status(500).json({ message: "Server error while saving course target" });
  }
});

// Update specific course target
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { target } = req.body;
    const adminId = req.admin.id;

    if (target === undefined) {
      return res.status(400).json({ message: "Target value is required" });
    }

    const courseTarget = await CourseTarget.findById(id);
    if (!courseTarget) {
      return res.status(404).json({ message: "Course target not found" });
    }

    courseTarget.target = target;
    courseTarget.updatedBy = adminId;
    await courseTarget.save();

    res.json({ message: "Course target updated successfully", target: courseTarget });
  } catch (error) {
    console.error("Error updating course target:", error);
    res.status(500).json({ message: "Server error while updating course target" });
  }
});

// Delete course target
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const courseTarget = await CourseTarget.findById(id);
    if (!courseTarget) {
      return res.status(404).json({ message: "Course target not found" });
    }

    await CourseTarget.findByIdAndDelete(id);
    res.json({ message: "Course target deleted successfully" });
  } catch (error) {
    console.error("Error deleting course target:", error);
    res.status(500).json({ message: "Server error while deleting course target" });
  }
});

// Bulk update targets for a year/term
router.post("/bulk", authMiddleware, async (req, res) => {
  try {
    const { targets, academicYear, term } = req.body;
    const adminId = req.admin.id;
    const currentYear = academicYear || new Date().getFullYear().toString();
    const currentTerm = term || "all";

    if (!Array.isArray(targets)) {
      return res.status(400).json({ message: "Targets must be an array" });
    }

    const results = [];
    
    for (const targetData of targets) {
      const { courseName, target } = targetData;
      
      if (!courseName || target === undefined) {
        continue; // Skip invalid entries
      }

      const existingTarget = await CourseTarget.findOne({
        courseName,
        academicYear: currentYear,
        term: currentTerm
      });

      if (existingTarget) {
        existingTarget.target = target;
        existingTarget.updatedBy = adminId;
        await existingTarget.save();
        results.push(existingTarget);
      } else {
        const newTarget = new CourseTarget({
          courseName,
          target,
          academicYear: currentYear,
          term: currentTerm,
          createdBy: adminId,
          updatedBy: adminId
        });
        await newTarget.save();
        results.push(newTarget);
      }
    }

    res.json({ 
      message: "Bulk update completed successfully", 
      targets: results,
      count: results.length
    });
  } catch (error) {
    console.error("Error in bulk update:", error);
    res.status(500).json({ message: "Server error during bulk update" });
  }
});

module.exports = router;
