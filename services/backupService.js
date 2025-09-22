const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const cron = require("node-cron");
const Application = require("../models/Application");
const Admin = require("../models/Admin");

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, "../backups");
    this.ensureBackupDirectory();
    this.setupScheduledBackups();
  }

  // Ensure backup directory exists
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Setup scheduled backups (daily at 2 AM)
  setupScheduledBackups() {
    // Run daily backup at 2 AM
    cron.schedule("0 2 * * *", () => {
      console.log("Starting scheduled backup...");
      this.createFullBackup();
    });

    // Run incremental backup every 6 hours
    cron.schedule("0 */6 * * *", () => {
      console.log("Starting incremental backup...");
      this.createIncrementalBackup();
    });
  }

  // Create full backup
  async createFullBackup() {
    let backupPath = null;
    let backupName = null;

    try {
      console.log("Starting full backup creation...");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      backupName = `full-backup-${timestamp}`;
      backupPath = path.join(this.backupDir, backupName);

      console.log(`Creating backup directory: ${backupPath}`);
      // Create backup directory
      fs.mkdirSync(backupPath, { recursive: true });

      console.log("Exporting database data...");
      // Export database data
      await this.exportDatabaseData(backupPath);

      console.log("Exporting files...");
      // Export files
      await this.exportFiles(backupPath);

      console.log("Creating backup manifest...");
      // Create backup manifest
      await this.createBackupManifest(backupPath, "full");

      console.log("Creating backup zip...");
      // Create backup zip file
      await this.createBackupZip(backupPath, backupName);

      console.log(`Full backup created successfully: ${backupName}`);
      return { success: true, backupName, path: backupPath };
    } catch (error) {
      console.error("Full backup failed:", error);

      // Clean up partial backup on failure
      if (backupPath && fs.existsSync(backupPath)) {
        try {
          fs.rmSync(backupPath, { recursive: true, force: true });
          console.log("Cleaned up partial backup directory");
        } catch (cleanupError) {
          console.error("Failed to clean up partial backup:", cleanupError);
        }
      }

      return { success: false, error: error.message };
    }
  }

  // Create incremental backup
  async createIncrementalBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupName = `incremental-backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      // Create backup directory
      fs.mkdirSync(backupPath, { recursive: true });

      // Get last backup time
      const lastBackup = await this.getLastBackupTime();
      const cutoffDate =
        lastBackup || new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago

      // Export only new/modified data
      await this.exportIncrementalData(backupPath, cutoffDate);

      // Create backup manifest
      await this.createBackupManifest(backupPath, "incremental", cutoffDate);

      // Create backup zip file
      await this.createBackupZip(backupPath, backupName);

      console.log(`Incremental backup created: ${backupName}`);
      return { success: true, backupName, path: backupPath };
    } catch (error) {
      console.error("Incremental backup failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Export database data
  async exportDatabaseData(backupPath) {
    try {
      console.log("Starting database export...");

      // Export applications
      console.log("Exporting applications...");
      const applications = await Application.find({}).lean();
      console.log(`Found ${applications.length} applications`);

      fs.writeFileSync(
        path.join(backupPath, "applications.json"),
        JSON.stringify(applications, null, 2)
      );

      // Export admins (with default password for restore)
      console.log("Exporting admins...");
      const admins = await Admin.find({}).select("-password").lean();
      console.log(`Found ${admins.length} admins`);

      // Add default password for restore purposes
      const adminsWithPassword = admins.map((admin) => ({
        ...admin,
        password: "admin123", // Default password for restored admins
      }));

      fs.writeFileSync(
        path.join(backupPath, "admins.json"),
        JSON.stringify(adminsWithPassword, null, 2)
      );

      // Export statistics
      console.log("Generating statistics...");
      const stats = await this.generateSystemStats();
      fs.writeFileSync(
        path.join(backupPath, "statistics.json"),
        JSON.stringify(stats, null, 2)
      );

      console.log("Database data exported successfully");
    } catch (error) {
      console.error("Database export failed:", error);
      throw error;
    }
  }

  // Export incremental data
  async exportIncrementalData(backupPath, cutoffDate) {
    try {
      // Export new/modified applications
      const applications = await Application.find({
        updatedAt: { $gte: cutoffDate },
      }).lean();

      if (applications.length > 0) {
        fs.writeFileSync(
          path.join(backupPath, "applications.json"),
          JSON.stringify(applications, null, 2)
        );
      }

      // Export new/modified admins
      const admins = await Admin.find({
        updatedAt: { $gte: cutoffDate },
      })
        .select("-password")
        .lean();

      if (admins.length > 0) {
        fs.writeFileSync(
          path.join(backupPath, "admins.json"),
          JSON.stringify(admins, null, 2)
        );
      }

      console.log("Incremental data exported successfully");
    } catch (error) {
      console.error("Incremental export failed:", error);
      throw error;
    }
  }

  // Export files (photos and signatures)
  async exportFiles(backupPath) {
    try {
      console.log("Creating files directory...");
      const filesDir = path.join(backupPath, "files");
      fs.mkdirSync(filesDir, { recursive: true });

      console.log("Querying applications for file URLs...");
      // Get all applications with file URLs
      const applications = await Application.find({
        $or: [
          { photoUrl: { $exists: true, $ne: null } },
          { signatureUrl: { $exists: true, $ne: null } },
        ],
      }).lean();

      console.log(`Found ${applications.length} applications with files`);

      // Create file manifest
      const fileManifest = [];

      for (const app of applications) {
        const appDir = path.join(filesDir, app._id.toString());
        fs.mkdirSync(appDir, { recursive: true });

        if (app.photoUrl) {
          fileManifest.push({
            applicationId: app._id,
            type: "photo",
            url: app.photoUrl,
            localPath: path.join(appDir, "photo.jpg"),
          });
        }

        if (app.signatureUrl) {
          fileManifest.push({
            applicationId: app._id,
            type: "signature",
            url: app.signatureUrl,
            localPath: path.join(appDir, "signature.png"),
          });
        }
      }

      // Save file manifest
      fs.writeFileSync(
        path.join(backupPath, "file-manifest.json"),
        JSON.stringify(fileManifest, null, 2)
      );

      console.log(
        `File manifest created successfully with ${fileManifest.length} files`
      );
    } catch (error) {
      console.error("File export failed:", error);
      throw error;
    }
  }

  // Create backup manifest
  async createBackupManifest(backupPath, type, cutoffDate = null) {
    const manifest = {
      type,
      timestamp: new Date().toISOString(),
      version: "1.0",
      cutoffDate: cutoffDate?.toISOString(),
      files: [],
      database: {
        applications: 0,
        admins: 0,
      },
    };

    // Count files
    const files = fs.readdirSync(backupPath, { withFileTypes: true });
    for (const file of files) {
      if (file.isFile()) {
        const filePath = path.join(backupPath, file.name);
        const stats = fs.statSync(filePath);
        manifest.files.push({
          name: file.name,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        });
      }
    }

    // Count database records
    if (fs.existsSync(path.join(backupPath, "applications.json"))) {
      const applications = JSON.parse(
        fs.readFileSync(path.join(backupPath, "applications.json"))
      );
      manifest.database.applications = applications.length;
    }

    if (fs.existsSync(path.join(backupPath, "admins.json"))) {
      const admins = JSON.parse(
        fs.readFileSync(path.join(backupPath, "admins.json"))
      );
      manifest.database.admins = admins.length;
    }

    // Save manifest
    fs.writeFileSync(
      path.join(backupPath, "manifest.json"),
      JSON.stringify(manifest, null, 2)
    );

    console.log("Backup manifest created successfully");
  }

  // Create backup zip file (local storage)
  async createBackupZip(backupPath, backupName) {
    try {
      // Create zip file
      const zipPath = path.join(this.backupDir, `${backupName}.zip`);
      await this.createZipArchive(backupPath, zipPath);

      console.log(`Backup zip created: ${zipPath}`);
      return { success: true, zipPath };
    } catch (error) {
      console.error("Backup zip creation failed:", error);
      throw error;
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

  // Generate system statistics
  async generateSystemStats() {
    try {
      const totalApplications = await Application.countDocuments();
      const statusBreakdown = await Application.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);
      const courseBreakdown = await Application.aggregate([
        { $group: { _id: "$courseApplied", count: { $sum: 1 } } },
      ]);
      const recentApplications = await Application.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      });

      return {
        totalApplications,
        statusBreakdown,
        courseBreakdown,
        recentApplications,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Stats generation failed:", error);
      return {};
    }
  }

  // Get last backup time
  async getLastBackupTime() {
    try {
      const files = fs.readdirSync(this.backupDir);
      let lastBackup = null;

      for (const file of files) {
        if (!file.endsWith(".zip") && !file.endsWith(".json")) {
          const backupPath = path.join(this.backupDir, file);
          const manifestPath = path.join(backupPath, "manifest.json");

          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath));
              const backupTime = new Date(manifest.timestamp);
              if (!lastBackup || backupTime > lastBackup) {
                lastBackup = backupTime;
              }
            } catch (manifestError) {
              console.error(
                `Failed to read manifest for ${file}:`,
                manifestError
              );
            }
          }
        }
      }

      return lastBackup;
    } catch (error) {
      console.error("Failed to get last backup time:", error);
      return null;
    }
  }

  // List available backups
  async listBackups() {
    try {
      const backups = [];
      const files = fs.readdirSync(this.backupDir);

      for (const file of files) {
        // Look for backup directories (not zip files)
        if (!file.endsWith(".zip") && !file.endsWith(".json")) {
          const backupPath = path.join(this.backupDir, file);
          const manifestPath = path.join(backupPath, "manifest.json");

          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath));
              backups.push({
                name: file,
                type: manifest.type,
                timestamp: manifest.timestamp,
                size: manifest.files.reduce(
                  (total, file) => total + file.size,
                  0
                ),
                records: manifest.database,
              });
            } catch (manifestError) {
              console.error(
                `Failed to read manifest for ${file}:`,
                manifestError
              );
            }
          }
        }
      }

      return backups.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
    } catch (error) {
      console.error("Failed to list backups:", error);
      return [];
    }
  }

  // Restore from backup
  async restoreFromBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      const manifestPath = path.join(backupPath, "manifest.json");

      if (!fs.existsSync(manifestPath)) {
        throw new Error("Backup manifest not found");
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath));

      // Restore database data
      if (fs.existsSync(path.join(backupPath, "applications.json"))) {
        const applications = JSON.parse(
          fs.readFileSync(path.join(backupPath, "applications.json"))
        );
        await Application.deleteMany({});
        await Application.insertMany(applications);
      }

      if (fs.existsSync(path.join(backupPath, "admins.json"))) {
        const admins = JSON.parse(
          fs.readFileSync(path.join(backupPath, "admins.json"))
        );
        await Admin.deleteMany({});

        // Create admins individually to trigger password hashing middleware
        for (const adminData of admins) {
          const admin = new Admin({
            email: adminData.email,
            password: adminData.password || "admin123", // fallback if password is missing
          });
          await admin.save();
        }
      }

      console.log(`Backup restored successfully: ${backupName}`);
      return { success: true, message: "Backup restored successfully" };
    } catch (error) {
      console.error("Backup restore failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Get backup statistics
  async getBackupStats() {
    try {
      const backups = await this.listBackups();
      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      const lastBackup = await this.getLastBackupTime();
      const fullBackups = backups.filter(
        (backup) => backup.type === "full"
      ).length;
      const incrementalBackups = backups.filter(
        (backup) => backup.type === "incremental"
      ).length;

      return {
        totalBackups: backups.length,
        totalSize,
        lastBackup: lastBackup ? lastBackup.toISOString() : null,
        fullBackups,
        incrementalBackups,
      };
    } catch (error) {
      console.error("Failed to get backup stats:", error);
      return {
        totalBackups: 0,
        totalSize: 0,
        lastBackup: null,
        fullBackups: 0,
        incrementalBackups: 0,
      };
    }
  }

  // Export to CSV
  async exportToCSV() {
    try {
      const applications = await Application.find({});
      const csvData = applications.map((app) => ({
        name: app.name,
        email: app.email,
        course: app.courseApplied,
        status: app.status,
        createdAt: app.createdAt,
      }));

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `applications-export-${timestamp}.csv`;
      const filepath = path.join(this.backupDir, filename);

      // Create CSV content
      const headers = ["Name", "Email", "Course", "Status", "Created At"];
      const csvContent = [
        headers.join(","),
        ...csvData.map((row) => Object.values(row).join(",")),
      ].join("\n");

      fs.writeFileSync(filepath, csvContent);
      return { success: true, filename, filepath };
    } catch (error) {
      console.error("CSV export failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Export to JSON
  async exportToJSON() {
    try {
      const applications = await Application.find({});
      const admins = await Admin.find({});

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `data-export-${timestamp}.json`;
      const filepath = path.join(this.backupDir, filename);

      const exportData = {
        applications,
        admins,
        exportedAt: new Date().toISOString(),
        totalApplications: applications.length,
        totalAdmins: admins.length,
      };

      fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
      return { success: true, filename, filepath };
    } catch (error) {
      console.error("JSON export failed:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new BackupService();
