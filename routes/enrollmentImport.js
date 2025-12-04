const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const Application = require("../models/Application");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Use memory storage because we only need the file contents once
const upload = multer({ storage: multer.memoryStorage() });

// Helper functions
const normalizeString = (value) =>
  (value || "").toString().trim().toLowerCase();

const parseDateKey = (value) => {
  if (!value) return "";

  // If it's already a Date
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  // Try to parse common string formats
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return "";
};

// POST /api/enrollment-import/batch-enrollment
// Upload registrar file (XLSX or CSV), match by first name, last name, email, and birthday,
// and mark matched applications as "enrolled".
router.post(
  "/batch-enrollment",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "No file uploaded. Please select a file first." });
      }

      // Read workbook from buffer (supports .xlsx and .csv)
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        return res
          .status(400)
          .json({ message: "The uploaded file appears to be empty." });
      }

      // Infer column keys from header row (case-insensitive, ignore spaces)
      const headerKeys = Object.keys(rows[0] || {});
      const normalizedHeaderMap = {};
      headerKeys.forEach((key) => {
        // Normalize by removing spaces, underscores, and other symbols
        const norm = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        normalizedHeaderMap[norm] = key;
      });

      const resolveColumn = (candidates) => {
        for (const cand of candidates) {
          const norm = cand.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          if (normalizedHeaderMap[norm]) return normalizedHeaderMap[norm];
        }
        // Fallback: search by contains
        for (const [norm, original] of Object.entries(normalizedHeaderMap)) {
          if (
            candidates.some((c) =>
              norm.includes(c.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
            )
          ) {
            return original;
          }
        }
        return null;
      };

      const firstNameCol = resolveColumn([
        "First Name",
        "Given Name",
        "Firstname",
        "first_name",
      ]);
      const lastNameCol = resolveColumn([
        "Last Name",
        "Surname",
        "Lastname",
        "last_name",
      ]);
      const emailCol = resolveColumn(["Email", "Email Address", "email"]);
      const birthdateCol = resolveColumn([
        "Birthdate",
        "Date of Birth",
        "Birthday",
        "DOB",
        "birth_date",
      ]);

      if (!firstNameCol || !lastNameCol || !emailCol || !birthdateCol) {
        return res.status(400).json({
          message:
            "Required columns not found. Please make sure your template includes First Name, Last Name, Email Address, and Birthdate.",
        });
      }

      // Load all active applications once and build helpers
      const applications = await Application.find({
        archived: { $ne: true },
      }).select(
        "givenName lastName email dateOfBirth status courseApplied submittedAt"
      );

      // Precompute normalized fields for each application
      const indexedApplications = applications.map((app) => {
        const lastNameNorm = normalizeString(app.lastName);
        const firstNameNorm = normalizeString(app.givenName);
        const emailNorm = normalizeString(app.email);
        const dobKey = parseDateKey(app.dateOfBirth);

        return {
          app,
          lastNameNorm,
          firstNameNorm,
          emailNorm,
          dobKey,
        };
      });

      // Exact 4-of-4 match index (fast path)
      const exactIndex = new Map();

      indexedApplications.forEach((entry) => {
        const key = [
          entry.lastNameNorm,
          entry.firstNameNorm,
          entry.emailNorm,
          entry.dobKey,
        ].join("|");

        if (!exactIndex.has(key)) {
          exactIndex.set(key, entry.app);
        }
      });

      let totalRows = 0;
      let matched = 0;
      let alreadyEnrolled = 0;
      const unmatchedSamples = [];

      const updates = [];

      for (const row of rows) {
        totalRows++;

        const lastName = normalizeString(row[lastNameCol]);
        const firstName = normalizeString(row[firstNameCol]);
        const email = normalizeString(row[emailCol]);
        const dobKey = parseDateKey(row[birthdateCol]);

        // Require at least 3 populated fields to even attempt a match
        const populatedCount = [lastName, firstName, email, dobKey].filter(
          Boolean
        ).length;

        if (populatedCount < 3) {
          if (unmatchedSamples.length < 10) {
            unmatchedSamples.push({
              row,
              reason:
                "Need at least three of: first name, last name, email, birthdate",
            });
          }
          continue;
        }

        // 1) Try exact 4-of-4 match first
        const exactKey = [lastName, firstName, email, dobKey].join("|");
        let app = exactIndex.get(exactKey);
        let matchScore = app ? 4 : 0;

        // 2) If no exact match, allow a "soft" match: at least 3 of 4 fields must match
        if (!app) {
          let bestMatch = null;
          let bestScore = 0;
          let bestScoreCount = 0;

          for (const entry of indexedApplications) {
            let score = 0;

            if (lastName && lastName === entry.lastNameNorm) score++;
            if (firstName && firstName === entry.firstNameNorm) score++;
            if (email && email === entry.emailNorm) score++;
            if (dobKey && dobKey === entry.dobKey) score++;

            if (score > bestScore) {
              bestScore = score;
              bestMatch = entry.app;
              bestScoreCount = 1;
            } else if (score === bestScore && score >= 3) {
              // Ambiguous: more than one application with the same best (>=3) score
              bestScoreCount++;
            }
          }

          if (bestScore >= 3 && bestScoreCount === 1 && bestMatch) {
            app = bestMatch;
            matchScore = bestScore;
          }
        }

        if (!app) {
          if (unmatchedSamples.length < 10) {
            unmatchedSamples.push({
              row,
              reason: "No matching application found (needs at least 3 of 4 fields to match)",
            });
          }
          continue;
        }

        if (app.status === "enrolled") {
          alreadyEnrolled++;
          continue;
        }

        matched++;
        app.status = "enrolled";
        updates.push(app.save());
      }

      if (updates.length) {
        await Promise.all(updates);
      }

      return res.json({
        message: "Batch enrollment matching completed.",
        summary: {
          totalRows,
          matchedAndUpdated: matched,
          alreadyEnrolled,
          unmatched: totalRows - matched - alreadyEnrolled,
        },
        unmatchedSamples,
      });
    } catch (error) {
      console.error("Batch enrollment import error:", error);
      return res.status(500).json({
        message:
          "Server error while processing the batch enrollment file. Please try again.",
      });
    }
  }
);

module.exports = router;


