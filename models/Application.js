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
    previousSchoolAddress: {
      type: String,
      trim: true,
    },
    honorsAwards: {
      type: String,
      trim: true,
    },
    presentAddress: {
      type: String,
      trim: true,
    },
    addressHouseNo: {
      type: String,
      trim: true,
    },
    addressStreet: {
      type: String,
      trim: true,
    },
    addressBarangay: {
      type: String,
      trim: true,
    },
    addressCityMunicipality: {
      type: String,
      trim: true,
    },
    addressProvince: {
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
    telephoneNumber: {
      type: String,
      trim: true,
    },
    nationality: {
      type: String,
      trim: true,
    },
    religion: {
      type: String,
      trim: true,
    },
    civilStatus: {
      type: String,
      enum: ["", "Single", "Married"],
      default: "",
    },
    fatherLastName: {
      type: String,
      trim: true,
    },
    fatherFirstName: {
      type: String,
      trim: true,
    },
    fatherMiddleName: {
      type: String,
      trim: true,
    },
    fatherMobileNumber: {
      type: String,
      trim: true,
    },
    fatherEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    fatherOccupation: {
      type: String,
      trim: true,
    },
    fatherWorkAddress: {
      type: String,
      trim: true,
    },
    motherLastName: {
      type: String,
      trim: true,
    },
    motherFirstName: {
      type: String,
      trim: true,
    },
    motherMiddleName: {
      type: String,
      trim: true,
    },
    motherMobileNumber: {
      type: String,
      trim: true,
    },
    motherEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    motherOccupation: {
      type: String,
      trim: true,
    },
    motherWorkAddress: {
      type: String,
      trim: true,
    },
    dateSigned: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "incomplete", "admitted", "rejected", "enrolled"],
      default: "pending",
    },
    requirements: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        status: {
          type: String,
          enum: ["pending", "complete", "passed"],
          default: "pending",
        },
        note: {
          type: String,
          trim: true,
          default: "",
        },
        updatedAt: {
          type: Date,
        },
      },
    ],
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
    enrolledByImport: {
      type: Boolean,
      default: false,
    },
    importedOnly: {
      type: Boolean,
      default: false,
    },
    importedStudentId: {
      type: String,
      trim: true,
    },
    enrolledImportedAt: {
      type: Date,
    },
    enrollmentImportFile: {
      type: String,
      trim: true,
    },
    enrolledSchoolYear: {
      type: String,
      trim: true,
    },
    enrolledAt: {
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
applicationSchema.index({ enrolledAt: -1 });

module.exports = mongoose.model("Application", applicationSchema);
