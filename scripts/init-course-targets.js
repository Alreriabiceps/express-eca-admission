const mongoose = require("mongoose");
const CourseTarget = require("../models/CourseTarget");

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/sam-db");

const defaultTargets = [
  { courseName: "Bachelor of Science in Marine Transportation", target: 50 },
  { courseName: "Bachelor of Science in Marine Engineering", target: 40 },
  { courseName: "Bachelor of Science in Nursing", target: 80 },
  { courseName: "Bachelor of Early Childhood Education", target: 30 },
  { courseName: "Bachelor of Technical-Vocational Teacher Education (Major in Food and Service Management)", target: 25 },
  { courseName: "Bachelor of Science in Entrepreneurship", target: 35 },
  { courseName: "Bachelor of Science in Management Accounting", target: 30 },
  { courseName: "Bachelor of Science in Information System", target: 45 },
  { courseName: "Bachelor of Science in Tourism Management", target: 40 },
  { courseName: "Bachelor of Science in Criminology", target: 60 },
];

async function initializeCourseTargets() {
  try {
    console.log("Initializing course targets...");
    
    const currentYear = new Date().getFullYear().toString();
    
    // Check if targets already exist for current year
    const existingTargets = await CourseTarget.find({ 
      academicYear: currentYear, 
      term: "all" 
    });
    
    if (existingTargets.length > 0) {
      console.log(`Course targets already exist for ${currentYear}. Skipping initialization.`);
      process.exit(0);
    }
    
    // Create targets for current year
    const targetsToCreate = defaultTargets.map(target => ({
      ...target,
      academicYear: currentYear,
      term: "all",
      isActive: true
    }));
    
    await CourseTarget.insertMany(targetsToCreate);
    console.log(`Successfully created ${targetsToCreate.length} course targets for ${currentYear}`);
    
    // Also create targets for next year
    const nextYear = (currentYear + 1).toString();
    const nextYearTargets = defaultTargets.map(target => ({
      ...target,
      academicYear: nextYear,
      term: "all",
      isActive: true
    }));
    
    await CourseTarget.insertMany(nextYearTargets);
    console.log(`Successfully created ${nextYearTargets.length} course targets for ${nextYear}`);
    
    console.log("Course targets initialization completed!");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing course targets:", error);
    process.exit(1);
  }
}

initializeCourseTargets();
