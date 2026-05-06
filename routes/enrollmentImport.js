const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const authMiddleware = require("../middleware/auth");
const Application = require("../models/Application");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const lowerName = (file.originalname || "").toLowerCase();
    const isAllowedExtension =
      lowerName.endsWith(".csv") || lowerName.endsWith(".xlsx");

    if (allowedMimeTypes.includes(file.mimetype) || isAllowedExtension) {
      cb(null, true);
      return;
    }

    cb(new Error("Only CSV and XLSX files are allowed"));
  },
});

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const parseDateToDayRange = (rawDate) => {
  if (!rawDate) return null;
  let dateValue = rawDate;

  if (typeof rawDate === "number") {
    const parsedExcelDate = XLSX.SSF.parse_date_code(rawDate);
    if (parsedExcelDate) {
      dateValue = new Date(
        parsedExcelDate.y,
        parsedExcelDate.m - 1,
        parsedExcelDate.d
      );
    }
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const mapRowFields = (row) => {
  const mapped = {};

  Object.entries(row || {}).forEach(([key, value]) => {
    const normalized = normalizeHeader(key);

    if (
      normalized === "full name" ||
      normalized === "name" ||
      normalized === "student name"
    ) {
      mapped.fullName = String(value || "").trim();
    }

    if (normalized === "first name" || normalized === "first_name") {
      mapped.firstName = String(value || "").trim();
    }

    if (normalized === "last name" || normalized === "last_name") {
      mapped.lastName = String(value || "").trim();
    }

    if (normalized === "middle name" || normalized === "middle_name") {
      mapped.middleName = String(value || "").trim();
    }

    if (
      normalized === "birthdate" ||
      normalized === "date of birth" ||
      normalized === "birthday" ||
      normalized === "birth_date"
    ) {
      mapped.birthdate = value;
    }

    if (
      normalized === "program" ||
      normalized === "course" ||
      normalized === "course applied"
    ) {
      mapped.program = String(value || "").trim();
    }
  });

  return mapped;
};

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/", authMiddleware, (req, res) => {
  res.json({
    message: "Enrollment import API is active",
    acceptedFormats: [".csv", ".xlsx"],
  });
});

router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const selectedSchoolYear = String(req.body?.schoolYear || "").trim();
      const schoolYearMatch = selectedSchoolYear.match(/^(\d{4})-(\d{4})$/);
      if (!schoolYearMatch) {
        return res.status(400).json({
          message: "Valid schoolYear is required (format: YYYY-YYYY)",
        });
      }
      const startYear = parseInt(schoolYearMatch[1], 10);
      const endYear = parseInt(schoolYearMatch[2], 10);
      if (endYear !== startYear + 1) {
        return res.status(400).json({
          message: "Invalid schoolYear range. Example: 2025-2026",
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Upload file is required" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const firstSheet = workbook.SheetNames[0];

      if (!firstSheet) {
        return res.status(400).json({ message: "No sheet found in file" });
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
        defval: "",
      });

      if (!rows.length) {
        return res.status(400).json({ message: "File contains no records" });
      }

      let matched = 0;
      let updated = 0;
      let alreadyEnrolled = 0;
      const unmatched = [];

      for (const row of rows) {
        const record = mapRowFields(row);
        const fullName = String(record.fullName || "").trim();
        const firstName = String(record.firstName || "").trim();
        const lastName = String(record.lastName || "").trim();

        if (!fullName && (!firstName || !lastName)) {
          unmatched.push({
            name: "(missing full name)",
            reason: "Row missing Full Name or First/Last Name column values",
          });
          continue;
        }

        const dateRange = parseDateToDayRange(record.birthdate);
        const query = { archived: { $ne: true }, status: "verified" };

        if (fullName) {
          query.name = new RegExp(`^${escapeRegex(fullName)}$`, "i");
        } else {
          // Support files that provide separated first_name/last_name.
          query.$and = [
            { name: new RegExp(escapeRegex(firstName), "i") },
            { name: new RegExp(escapeRegex(lastName), "i") },
          ];
        }

        if (dateRange) {
          query.dateOfBirth = {
            $gte: dateRange.start,
            $lte: dateRange.end,
          };
        }

        const application = await Application.findOne(query);

        if (!application) {
          const displayName = fullName || `${firstName} ${lastName}`.trim();
          unmatched.push({
            name: displayName,
            reason: dateRange
              ? "No applicant matched by name + birthdate"
              : "No applicant matched by name",
          });
          continue;
        }

        matched += 1;

        if (application.status === "enrolled") {
          alreadyEnrolled += 1;
          continue;
        }

        const importTime = new Date();
        application.status = "enrolled";
        application.enrolledByImport = true;
        application.enrolledAt = importTime;
        application.enrolledImportedAt = importTime;
        application.enrollmentImportFile = req.file.originalname;
        application.enrolledSchoolYear = selectedSchoolYear;
        if (record.program) {
          application.courseApplied = record.program;
        }
        await application.save();
        updated += 1;
      }

      return res.json({
        message: "Enrollment import processed successfully",
        fileName: req.file.originalname,
        schoolYear: selectedSchoolYear,
        totalRows: rows.length,
        matched,
        updated,
        alreadyEnrolled,
        unmatchedCount: unmatched.length,
        unmatched: unmatched.slice(0, 20),
      });
    } catch (error) {
      console.error("Enrollment import error:", error);
      return res.status(500).json({
        message: "Server error while processing enrollment import",
        error: error.message,
      });
    }
  }
);

router.get("/matched", authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      course = "",
      sourceFile = "",
      schoolYear = "",
      dateFrom = "",
      dateTo = "",
    } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      status: "enrolled",
      enrolledByImport: true,
      archived: { $ne: true },
    };

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ name: regex }, { email: regex }, { courseApplied: regex }];
    }

    if (course) {
      filter.courseApplied = new RegExp(course, "i");
    }

    if (sourceFile) {
      filter.enrollmentImportFile = new RegExp(sourceFile, "i");
    }

    if (schoolYear) {
      filter.enrolledSchoolYear = new RegExp(`^${escapeRegex(schoolYear)}$`, "i");
    }

    if (dateFrom || dateTo) {
      filter.enrolledImportedAt = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (!Number.isNaN(from.getTime())) {
          filter.enrolledImportedAt.$gte = from;
        }
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (!Number.isNaN(to.getTime())) {
          filter.enrolledImportedAt.$lte = to;
        }
      }

      if (Object.keys(filter.enrolledImportedAt).length === 0) {
        delete filter.enrolledImportedAt;
      }
    }

    const applications = await Application.find(filter)
      .sort({ enrolledImportedAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select("-__v");

    const total = await Application.countDocuments(filter);

    return res.json({
      applications,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
      },
    });
  } catch (error) {
    console.error("Get matched enrolled applications error:", error);
    return res.status(500).json({
      message: "Server error while fetching matched enrolled applications",
    });
  }
});

router.delete("/batch", authMiddleware, async (req, res) => {
  try {
    const { sourceFile, schoolYear } = req.body || {};
    const filter = {
      status: "enrolled",
      enrolledByImport: true,
      archived: { $ne: true },
    };

    const normalizedSource = String(sourceFile || "").trim();
    if (normalizedSource) {
      // Partial filename match to make reset more forgiving.
      filter.enrollmentImportFile = new RegExp(escapeRegex(normalizedSource), "i");
    }

    if (schoolYear && String(schoolYear).trim()) {
      filter.enrolledSchoolYear = new RegExp(
        `^${escapeRegex(String(schoolYear).trim())}$`,
        "i"
      );
    }

    const result = await Application.updateMany(filter, {
      $set: {
        status: "verified",
      },
      $unset: {
        enrolledByImport: 1,
        enrolledAt: 1,
        enrolledImportedAt: 1,
        enrollmentImportFile: 1,
        enrolledSchoolYear: 1,
      },
    });

    return res.json({
      message: "Batch reset completed",
      sourceFile: normalizedSource || null,
      schoolYear: schoolYear ? String(schoolYear).trim() : null,
      resetCount: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error("Reset enrollment batch error:", error);
    return res.status(500).json({
      message: "Server error while resetting enrollment batch",
    });
  }
});

module.exports = router;