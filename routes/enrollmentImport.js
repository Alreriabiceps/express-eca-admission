const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const authMiddleware = require("../middleware/auth");
const Application = require("../models/Application");
const { getDefaultRequirementsForCourse } = require("../services/requirementService");

const router = express.Router();

const IMPORTED_PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' fill='%23e5e7eb'/%3E%3Ccircle cx='80' cy='62' r='28' fill='%239ca3af'/%3E%3Cpath d='M34 142c7-29 25-44 46-44s39 15 46 44' fill='%239ca3af'/%3E%3C/svg%3E";
const IMPORTED_PLACEHOLDER_SIGNATURE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='90' viewBox='0 0 260 90'%3E%3Crect width='260' height='90' fill='%23ffffff'/%3E%3Cpath d='M24 58c31-26 43 10 68-8 17-13 25-22 39-9 12 11 23 14 43-2 21-17 32-8 54 2' fill='none' stroke='%239ca3af' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E";

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

    if (
      normalized === "email" ||
      normalized === "email address" ||
      normalized === "student email"
    ) {
      mapped.email = String(value || "").trim();
    }

    if (
      normalized === "contact" ||
      normalized === "contact number" ||
      normalized === "phone" ||
      normalized === "mobile"
    ) {
      mapped.contact = String(value || "").trim();
    }

    if (
      normalized === "student id" ||
      normalized === "student no" ||
      normalized === "student number" ||
      normalized === "id number"
    ) {
      mapped.studentId = String(value || "").trim();
    }

    if (
      normalized === "enrollment date" ||
      normalized === "enrolled date" ||
      normalized === "date enrolled"
    ) {
      mapped.enrollmentDate = value;
    }
  });

  return mapped;
};

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildDisplayName = ({ fullName, firstName, middleName, lastName }) =>
  (
    fullName ||
    [firstName, middleName, lastName].filter(Boolean).join(" ") ||
    [firstName, lastName].filter(Boolean).join(" ")
  ).trim();

const buildImportedEmail = ({ email, studentId, displayName, rowIndex }) => {
  if (email) return email;

  const base = studentId || displayName || `row-${rowIndex + 1}`;
  const safeBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 48);

  return `${safeBase || `row-${rowIndex + 1}`}+imported@enrollment.local`;
};

const buildImportedOnlyQuery = ({ displayName, dateRange, program, studentId }) => {
  const query = {
    archived: { $ne: true },
    enrolledByImport: true,
    importedOnly: true,
  };

  if (studentId) {
    query.importedStudentId = new RegExp(`^${escapeRegex(studentId)}$`, "i");
    return query;
  }

  query.name = new RegExp(`^${escapeRegex(displayName)}$`, "i");
  if (program) {
    query.courseApplied = new RegExp(`^${escapeRegex(program)}$`, "i");
  }
  if (dateRange) {
    query.dateOfBirth = {
      $gte: dateRange.start,
      $lte: dateRange.end,
    };
  }

  return query;
};

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
      let created = 0;
      let alreadyEnrolled = 0;
      const unmatched = [];

      for (const [rowIndex, row] of rows.entries()) {
        const record = mapRowFields(row);
        const fullName = String(record.fullName || "").trim();
        const firstName = String(record.firstName || "").trim();
        const middleName = String(record.middleName || "").trim();
        const lastName = String(record.lastName || "").trim();
        const displayName = buildDisplayName({
          fullName,
          firstName,
          middleName,
          lastName,
        });
        const program = String(record.program || "").trim() || "Unspecified Program";

        if (!fullName && (!firstName || !lastName)) {
          unmatched.push({
            name: "(missing full name)",
            reason: "Row missing Full Name or First/Last Name column values",
          });
          continue;
        }

        const dateRange = parseDateToDayRange(record.birthdate);
        const query = {
          archived: { $ne: true },
          status: { $in: ["verified", "enrolled"] },
        };

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
          const existingImportedStudent = await Application.findOne(
            buildImportedOnlyQuery({
              displayName,
              dateRange,
              program,
              studentId: record.studentId,
            })
          );

          if (existingImportedStudent?.status === "enrolled") {
            alreadyEnrolled += 1;
            continue;
          }

          const importTime = new Date();
          const enrolledAtRange = parseDateToDayRange(record.enrollmentDate);
          const enrolledAt = enrolledAtRange?.start || importTime;
          const importedApplication =
            existingImportedStudent ||
            new Application({
              name: displayName,
              lastName,
              givenName: firstName,
              middleName,
              email: buildImportedEmail({
                email: record.email,
                studentId: record.studentId,
                displayName,
                rowIndex,
              }),
              contact: record.contact || "N/A",
              courseApplied: program,
              dateOfBirth: dateRange?.start,
              status: "enrolled",
              photoUrl: IMPORTED_PLACEHOLDER_IMAGE,
              signatureUrl: IMPORTED_PLACEHOLDER_SIGNATURE,
              importedOnly: true,
              submittedAt: importTime,
              requirements: getDefaultRequirementsForCourse(program),
            });

          importedApplication.name = displayName;
          importedApplication.lastName = lastName || importedApplication.lastName;
          importedApplication.givenName =
            firstName || importedApplication.givenName;
          importedApplication.middleName =
            middleName || importedApplication.middleName;
          importedApplication.email =
            record.email ||
            importedApplication.email ||
            buildImportedEmail({
              email: "",
              studentId: record.studentId,
              displayName,
              rowIndex,
            });
          importedApplication.contact =
            record.contact || importedApplication.contact || "N/A";
          importedApplication.courseApplied = program;
          if (dateRange) importedApplication.dateOfBirth = dateRange.start;
          importedApplication.status = "enrolled";
          importedApplication.enrolledByImport = true;
          importedApplication.importedOnly = true;
          importedApplication.importedStudentId = record.studentId;
          importedApplication.enrolledAt = enrolledAt;
          importedApplication.enrolledImportedAt = importTime;
          importedApplication.enrollmentImportFile = req.file.originalname;
          importedApplication.enrolledSchoolYear = selectedSchoolYear;
          if (!importedApplication.requirements?.length) {
            importedApplication.requirements =
              getDefaultRequirementsForCourse(program);
          }

          await importedApplication.save();
          created += 1;
          continue;
        }

        matched += 1;

        if (application.status === "enrolled") {
          alreadyEnrolled += 1;
          continue;
        }

        const importTime = new Date();
        const enrolledAtRange = parseDateToDayRange(record.enrollmentDate);
        application.status = "enrolled";
        application.enrolledByImport = true;
        application.importedOnly = false;
        application.enrolledAt = enrolledAtRange?.start || importTime;
        application.enrolledImportedAt = importTime;
        application.enrollmentImportFile = req.file.originalname;
        application.enrolledSchoolYear = selectedSchoolYear;
        if (record.studentId) {
          application.importedStudentId = record.studentId;
        }
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
        created,
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

    const importedOnlyFilter = {
      ...filter,
      importedOnly: true,
    };
    const matchedAdmissionFilter = {
      ...filter,
      importedOnly: { $ne: true },
    };

    const deleteResult = await Application.deleteMany(importedOnlyFilter);
    const result = await Application.updateMany(matchedAdmissionFilter, {
      $set: {
        status: "verified",
      },
      $unset: {
        enrolledByImport: 1,
        importedOnly: 1,
        importedStudentId: 1,
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
      resetCount: (result.modifiedCount || 0) + (deleteResult.deletedCount || 0),
      revertedCount: result.modifiedCount || 0,
      removedImportedOnly: deleteResult.deletedCount || 0,
    });
  } catch (error) {
    console.error("Reset enrollment batch error:", error);
    return res.status(500).json({
      message: "Server error while resetting enrollment batch",
    });
  }
});

module.exports = router;
