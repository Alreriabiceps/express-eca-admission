const express = require("express");
const Application = require("../models/Application");
const CourseTarget = require("../models/CourseTarget");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

const DEFAULT_YEAR = new Date().getFullYear();

const getRangeByYearAndTerm = (yearInput, termInput = "all") => {
  const year = Number.parseInt(yearInput, 10) || DEFAULT_YEAR;
  const term = termInput || "all";

  const allRange = {
    startDate: new Date(year, 0, 1),
    endDateExclusive: new Date(year + 1, 0, 1),
    year,
  };

  if (term === "all") return allRange;

  // 4-month term buckets: Jan-Apr, May-Aug, Sep-Dec
  const termMonths = {
    "1st": { start: 0, nextStart: 4 },
    "2nd": { start: 4, nextStart: 8 },
    summer: { start: 8, nextStart: 12 },
  };

  const termRange = termMonths[term];
  if (!termRange) return allRange;

  return {
    startDate: new Date(year, termRange.start, 1),
    endDateExclusive: new Date(year, termRange.nextStart, 1),
    year,
  };
};

const buildEnrolledDateFilter = (startDate, endDateExclusive) => ({
  $or: [
    {
      enrolledAt: {
        $gte: startDate,
        $lt: endDateExclusive,
      },
    },
    // Backward compatibility for historical imported records.
    {
      enrolledAt: { $exists: false },
      enrolledImportedAt: {
        $gte: startDate,
        $lt: endDateExclusive,
      },
    },
    // Legacy fallback for very old enrolled records.
    {
      enrolledAt: { $exists: false },
      enrolledImportedAt: { $exists: false },
      submittedAt: {
        $gte: startDate,
        $lt: endDateExclusive,
      },
    },
  ],
});

// Get enrollment analytics data
router.get("/enrollment", authMiddleware, async (req, res) => {
  try {
    const { year, term } = req.query;
    const { startDate, endDateExclusive, year: normalizedYear } =
      getRangeByYearAndTerm(year, term);
    const dateFilter = buildEnrolledDateFilter(startDate, endDateExclusive);

    // Get all applications for the period
    const applications = await Application.find({
      ...dateFilter,
      archived: { $ne: true },
      status: "enrolled",
    });

    // Get course targets from database
    const currentYear = normalizedYear.toString();
    const currentTerm = term || "all";
    
    const targetQuery = {
      academicYear: currentYear,
      isActive: true,
      term: currentTerm,
    };
    
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
    const currentYear = parseInt(year, 10) || DEFAULT_YEAR;
    const years = [currentYear - 2, currentYear - 1, currentYear];

    // Get enrollment data for each year
    const yearlyData = [];
    for (const eachYear of years) {
      const startDate = new Date(eachYear, 0, 1);
      const endDateExclusive = new Date(eachYear + 1, 0, 1);

      const applications = await Application.find({
        ...buildEnrolledDateFilter(startDate, endDateExclusive),
        archived: { $ne: true },
        status: "enrolled",
      });

      const enrollment = applications.length;
      const previousYearData = yearlyData[yearlyData.length - 1];
      const previousEnrollment = previousYearData
        ? previousYearData.enrollment
        : null;
      const growth =
        previousEnrollment && previousEnrollment > 0
          ? Math.round(
              ((enrollment - previousEnrollment) / previousEnrollment) * 100
            )
          : 0;

      yearlyData.push({
        year: eachYear,
        enrollment,
        growth,
      });
    }

    // Get top performing courses for the current year
    const currentYearStart = new Date(currentYear, 0, 1);
    const currentYearEndExclusive = new Date(currentYear + 1, 0, 1);

    const currentYearApplications = await Application.find({
      ...buildEnrolledDateFilter(currentYearStart, currentYearEndExclusive),
      archived: { $ne: true },
      status: "enrolled",
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
    const previousYearEndExclusive = new Date(currentYear, 0, 1);

    const previousYearApplications = await Application.find({
      ...buildEnrolledDateFilter(previousYearStart, previousYearEndExclusive),
      archived: { $ne: true },
      status: "enrolled",
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
            : 0,
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

    const normalizedYear = parseInt(year, 10) || DEFAULT_YEAR;
    const startDate = new Date(normalizedYear, 0, 1);
    const endDateExclusive = new Date(normalizedYear + 1, 0, 1);

    const applications = await Application.find({
      courseApplied: courseName,
      ...buildEnrolledDateFilter(startDate, endDateExclusive),
      archived: { $ne: true },
      status: "enrolled",
    });

    // Group by status
    const statusBreakdown = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    // Group by month
    const monthlyData = applications.reduce((acc, app) => {
      const month = new Date(
        app.enrolledAt || app.enrolledImportedAt || app.submittedAt
      ).getMonth();
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
