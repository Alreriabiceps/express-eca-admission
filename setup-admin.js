const mongoose = require("mongoose");
const Admin = require("./models/Admin");
require("dotenv").config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/sam-db",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log("Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      email: "admin@exactcolleges.edu.ph",
    });
    if (existingAdmin) {
      console.log(
        "Admin already exists with email: admin@exactcolleges.edu.ph"
      );
      console.log("Password: admin123");
      process.exit(0);
    }

    // Create admin account
    const admin = new Admin({
      email: "admin@exactcolleges.edu.ph",
      password: "admin123",
    });

    await admin.save();
    console.log("Admin created successfully!");
    console.log("Email: admin@exactcolleges.edu.ph");
    console.log("Password: admin123");

    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();
