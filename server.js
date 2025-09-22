const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/applications", require("./routes/applications"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/backup", require("./routes/backup"));
app.use("/api/export", require("./routes/export"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/course-targets", require("./routes/courseTargets"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ message: "SAM Backend is running!", status: "OK" });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/sam-db")
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "Something went wrong!", error: err.message });
});

module.exports = app;
