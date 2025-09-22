const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const Application = require("../models/Application");
const Admin = require("../models/Admin");

class ExportService {
  constructor() {
    this.exportDir = path.join(__dirname, "../exports");
    this.ensureExportDirectory();
  }

  // Ensure export directory exists
  ensureExportDirectory() {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  // Export applications to CSV
  async exportApplicationsToCSV() {
    try {
      const applications = await Application.find({}).lean();

      if (applications.length === 0) {
        return { success: false, message: "No applications found" };
      }

      // Create CSV header
      const headers = [
        "ID",
        "Name",
        "Email",
        "Contact",
        "Course Applied",
        "Status",
        "Photo URL",
        "Signature URL",
        "Created At",
        "Updated At",
      ];

      // Create CSV content
      const csvContent = [
        headers.join(","),
        ...applications.map((app) =>
          [
            app._id,
            `"${app.name}"`,
            `"${app.email}"`,
            `"${app.contact}"`,
            `"${app.courseApplied}"`,
            app.status,
            `"${app.photoUrl || ""}"`,
            `"${app.signatureUrl || ""}"`,
            new Date(app.createdAt).toISOString(),
            new Date(app.updatedAt).toISOString(),
          ].join(",")
        ),
      ].join("\n");

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `applications-export-${timestamp}.csv`;
      const filepath = path.join(this.exportDir, filename);

      fs.writeFileSync(filepath, csvContent);

      return { success: true, filename, filepath };
    } catch (error) {
      console.error("CSV export failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Export applications to Excel
  async exportApplicationsToExcel() {
    try {
      const applications = await Application.find({}).lean();

      if (applications.length === 0) {
        return { success: false, message: "No applications found" };
      }

      // Create Excel-like JSON structure
      const excelData = {
        applications: applications.map((app) => ({
          ID: app._id,
          Name: app.name,
          Email: app.email,
          Contact: app.contact,
          "Course Applied": app.courseApplied,
          Status: app.status,
          "Photo URL": app.photoUrl || "",
          "Signature URL": app.signatureUrl || "",
          "Created At": new Date(app.createdAt).toISOString(),
          "Updated At": new Date(app.updatedAt).toISOString(),
        })),
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `applications-export-${timestamp}.json`;
      const filepath = path.join(this.exportDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(excelData, null, 2));

      return { success: true, filename, filepath };
    } catch (error) {
      console.error("Excel export failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Export system statistics
  async exportSystemStats() {
    try {
      const stats = await this.generateSystemStats();

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `system-stats-${timestamp}.json`;
      const filepath = path.join(this.exportDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(stats, null, 2));

      return { success: true, filename, filepath };
    } catch (error) {
      console.error("Stats export failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Generate comprehensive system statistics
  async generateSystemStats() {
    try {
      const totalApplications = await Application.countDocuments();
      const totalAdmins = await Admin.countDocuments();

      const statusBreakdown = await Application.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      const courseBreakdown = await Application.aggregate([
        { $group: { _id: "$courseApplied", count: { $sum: 1 } } },
      ]);

      const monthlyApplications = await Application.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      const recentApplications = await Application.find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }).lean();

      const oldestApplication = await Application.findOne().sort({
        createdAt: 1,
      });
      const newestApplication = await Application.findOne().sort({
        createdAt: -1,
      });

      return {
        exportDate: new Date().toISOString(),
        summary: {
          totalApplications,
          totalAdmins,
          oldestApplication: oldestApplication?.createdAt,
          newestApplication: newestApplication?.createdAt,
        },
        statusBreakdown,
        courseBreakdown,
        monthlyApplications,
        recentApplications: recentApplications.length,
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime(),
        },
      };
    } catch (error) {
      console.error("Stats generation failed:", error);
      return { error: error.message };
    }
  }

  // Create comprehensive export package
  async createExportPackage() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const packageName = `sam-export-${timestamp}`;
      const packageDir = path.join(this.exportDir, packageName);

      // Create package directory
      fs.mkdirSync(packageDir, { recursive: true });

      // Export all data
      const csvResult = await this.exportApplicationsToCSV();
      const excelResult = await this.exportApplicationsToExcel();
      const statsResult = await this.exportSystemStats();

      // Copy files to package directory
      if (csvResult.success) {
        fs.copyFileSync(
          csvResult.filepath,
          path.join(packageDir, csvResult.filename)
        );
      }

      if (excelResult.success) {
        fs.copyFileSync(
          excelResult.filepath,
          path.join(packageDir, excelResult.filename)
        );
      }

      if (statsResult.success) {
        fs.copyFileSync(
          statsResult.filepath,
          path.join(packageDir, statsResult.filename)
        );
      }

      // Create package manifest
      const manifest = {
        packageName,
        created: new Date().toISOString(),
        files: [
          csvResult.success ? csvResult.filename : null,
          excelResult.success ? excelResult.filename : null,
          statsResult.success ? statsResult.filename : null,
        ].filter(Boolean),
        description: "Complete SAM System Export Package",
      };

      fs.writeFileSync(
        path.join(packageDir, "manifest.json"),
        JSON.stringify(manifest, null, 2)
      );

      // Create zip file
      const zipPath = path.join(this.exportDir, `${packageName}.zip`);
      await this.createZipArchive(packageDir, zipPath);

      // Clean up package directory
      fs.rmSync(packageDir, { recursive: true, force: true });

      return {
        success: true,
        filename: `${packageName}.zip`,
        filepath: zipPath,
      };
    } catch (error) {
      console.error("Export package creation failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Create zip archive
  async createZipArchive(sourceDir, zipPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {
        console.log(`Archive created: ${archive.pointer()} total bytes`);
        resolve();
      });

      archive.on("error", (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  // Clean up old exports
  async cleanupOldExports(maxAge = 7 * 24 * 60 * 60 * 1000) {
    // 7 days
    try {
      const files = fs.readdirSync(this.exportDir);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        const filePath = path.join(this.exportDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }

      console.log(`Cleaned up ${cleaned} old export files`);
      return { success: true, cleaned };
    } catch (error) {
      console.error("Export cleanup failed:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ExportService();
