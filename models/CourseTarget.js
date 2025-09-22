const mongoose = require("mongoose");

const courseTargetSchema = new mongoose.Schema({
  courseName: {
    type: String,
    required: true,
    unique: true
  },
  target: {
    type: Number,
    required: true,
    min: 0
  },
  academicYear: {
    type: String,
    required: true,
    default: () => new Date().getFullYear().toString()
  },
  term: {
    type: String,
    enum: ["all", "1st", "2nd", "summer"],
    default: "all"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  }
}, {
  timestamps: true
});

// Index for efficient queries
courseTargetSchema.index({ courseName: 1, academicYear: 1, term: 1 });

module.exports = mongoose.model("CourseTarget", courseTargetSchema);
