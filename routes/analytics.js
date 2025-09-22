const express = require("express");
const Application = require("../models/Application");
const CourseTarget = require("../models/CourseTarget");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Get enrollment analytics data
router.get("/enrollment", authMiddleware, async (req, res) => {
  try {
    const { year, term } = req.query;

    // Build date filter based on year and term
    const startDate = new Date(year, 0, 1); // January 1st of the year
    const endDate = new Date(year, 11, 31); // December 31st of the year

    let dateFilter = {
      submittedAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // If specific term is selected, adjust date range
    if (term && term !== "all") {
      const termMonths = {
        "1st": { start: 0, end: 3 }, // Jan-Mar
        "2nd": { start: 4, end: 7 }, // May-Aug
        summer: { start: 8, end: 11 }, // Sep-Dec
      };

      if (termMonths[term]) {
        dateFilter.submittedAt = {
          $gte: new Date(year, termMonths[term].start, 1),
          $lte: new Date(year, termMonths[term].end, 31),
        };
      }
    }

    // Get all applications for the period
    const applications = await Application.find({
      ...dateFilter,
      archived: { $ne: true },
    });

    // Get course targets from database
    const currentYear = year.toString();
    const currentTerm = term || "all";
    
    let targetQuery = { academicYear: currentYear, isActive: true };
    if (currentTerm !== "all") {
      targetQuery.term = currentTerm;
    }
    
    const dbTargets = await CourseTarget.find(targetQuery);
    
    // Create course targets object, fallback to default if not found in DB
    const defaultTargets = {
      "Bachelor of Science in Marine Transportation": 50,
      "Bachelor of Science in Marine Engineering": 40,
      "Bachelor of Science in Nursing": 80,
      "Bachelor of Early Childhood Education": 30,
      "Bachelor of Technical-Vocational Teacher Education (Major in Food and Service Management)": 25,
      "Bachelor of Science in Entrepreneurship": 35,
      "Bachelor of Science in Management Accounting": 30,
      "Bachelor of Science in Information System": 45,
      "Bachelor of Science in Tourism Management": 40,
      "Bachelor of Science in Criminology": 60,
    };
    
    const courseTargets = {};
    dbTargets.forEach(target => {
      courseTargets[target.courseName] = target.target;
    });
    
    // Add any missing courses with default targets
    Object.keys(defaultTargets).forEach(courseName => {
      if (!courseTargets[courseName]) {
        courseTargets[courseName] = defaultTargets[courseName];
      }
    });

    // Calculate course data
    const courseData = Object.keys(courseTargets).map((courseName) => {
      const courseApplications = applications.filter(
        (app) => app.courseApplied === courseName
      );
      const actual = courseApplications.length;
      const target = courseTargets[courseName];
      const achievement = target > 0 ? Math.round((actual / target) * 100) : 0;
      const variance = actual - target;

      return {
        courseName,
        target,
        actual,
        achievement,
        variance,
      };
    });

    // Calculate summary statistics
    const totalEnrolled = applications.length;
    const totalTarget = Object.values(courseTargets).reduce(
      (sum, target) => sum + target,
      0
    );
    const coursesMeetingTarget = courseData.filter(
      (course) => course.achievement >= 100
    ).length;
    const coursesBelowTarget = courseData.filter(
      (course) => course.achievement < 80
    ).length;
    const averageAchievement = Math.round(
      courseData.reduce((sum, course) => sum + course.achievement, 0) /
        courseData.length
    );

    res.json({
      totalEnrolled,
      totalTarget,
      coursesMeetingTarget,
      coursesBelowTarget,
      averageAchievement,
      courseData,
    });
  } catch (error) {
    console.error("Analytics enrollment error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching analytics data" });
  }
});

// Get year-to-year comparison data
router.get("/comparison", authMiddleware, async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = parseInt(year);
    const years = [currentYear - 2, currentYear - 1, currentYear];

    // Get enrollment data for each year
    const yearlyData = [];
    for (const year of years) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      const applications = await Application.find({
        submittedAt: {
          $gte: startDate,
          $lte: endDate,
        },
        archived: { $ne: true },
      });

      const enrollment = applications.length;
      const previousYearData = yearlyData[yearlyData.length - 1];
      const growth = previousYearData
        ? Math.round(
            ((enrollment - previousYearData.enrollment) /
              previousYearData.enrollment) *
              100
          )
        : 0;

      yearlyData.push({
        year,
        enrollment,
        growth,
      });
    }

    // Get top performing courses for the current year
    const currentYearStart = new Date(currentYear, 0, 1);
    const currentYearEnd = new Date(currentYear, 11, 31);

    const currentYearApplications = await Application.find({
      submittedAt: {
        $gte: currentYearStart,
        $lte: currentYearEnd,
      },
      archived: { $ne: true },
    });

    // Group by course and calculate growth
    const courseStats = {};
    currentYearApplications.forEach((app) => {
      if (!courseStats[app.courseApplied]) {
        courseStats[app.courseApplied] = { current: 0, previous: 0 };
      }
      courseStats[app.courseApplied].current++;
    });

    // Get previous year data for comparison
    const previousYearStart = new Date(currentYear - 1, 0, 1);
    const previousYearEnd = new Date(currentYear - 1, 11, 31);

    const previousYearApplications = await Application.find({
      submittedAt: {
        $gte: previousYearStart,
        $lte: previousYearEnd,
      },
      archived: { $ne: true },
    });

    previousYearApplications.forEach((app) => {
      if (courseStats[app.courseApplied]) {
        courseStats[app.courseApplied].previous++;
      }
    });

    // Calculate growth and sort
    const topCourses = Object.entries(courseStats)
      .map(([name, stats]) => ({
        name,
        enrollment: stats.current,
        growth:
          stats.previous > 0
            ? Math.round(
                ((stats.current - stats.previous) / stats.previous) * 100
              )
            : 100,
      }))
      .sort((a, b) => b.enrollment - a.enrollment)
      .slice(0, 5);

    res.json({
      yearlyData,
      topCourses,
    });
  } catch (error) {
    console.error("Analytics comparison error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching comparison data" });
  }
});

// Get detailed course analytics
router.get("/course/:courseName", authMiddleware, async (req, res) => {
  try {
    const { courseName } = req.params;
    const { year } = req.query;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const applications = await Application.find({
      courseApplied: courseName,
      submittedAt: {
        $gte: startDate,
        $lte: endDate,
      },
      archived: { $ne: true },
    });

    // Group by status
    const statusBreakdown = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    // Group by month
    const monthlyData = applications.reduce((acc, app) => {
      const month = new Date(app.submittedAt).getMonth();
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    // Convert to array format
    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      count: monthlyData[i] || 0,
      monthName: new Date(0, i).toLocaleString("default", { month: "short" }),
    }));

    res.json({
      courseName,
      totalApplications: applications.length,
      statusBreakdown,
      monthlyBreakdown,
    });
  } catch (error) {
    console.error("Course analytics error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching course analytics" });
  }
});

module.exports = router;
