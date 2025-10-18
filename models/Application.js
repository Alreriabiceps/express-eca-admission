const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Separated name fields
    lastName: {
      type: String,
      trim: true,
    },
    givenName: {
      type: String,
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
    },
    courseApplied: {
      type: String,
      required: true,
      trim: true,
    },
    // Additional personal information
    schoolLastAttended: {
      type: String,
      trim: true,
    },
    presentAddress: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    age: {
      type: Number,
    },
    sex: {
      type: String,
      enum: ["Male", "Female"],
    },
    dateSigned: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "incomplete", "admitted", "rejected"],
      default: "pending",
    },
    photoUrl: {
      type: String,
      required: true,
    },
    signatureUrl: {
      type: String,
      required: true,
    },
    // Examination Permit fields (for maritime courses)
    examDateTime: {
      type: Date,
    },
    examinerDateSigned: {
      type: Date,
    },
    examinerSignatureUrl: {
      type: String,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
applicationSchema.index({ email: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ courseApplied: 1 });
applicationSchema.index({ submittedAt: -1 });

module.exports = mongoose.model("Application", applicationSchema);
