const REQUIREMENT_STATUS_VALUES = ["pending", "complete", "passed"];

const DONE_REQUIREMENT_STATUSES = ["complete", "passed"];

const MARINE_REQUIREMENTS = [
  "Medical Result",
  "NaMMAT Result",
  "2x2 recent photo white background with name tag (4pcs)",
  "Certificate of Good Moral Character",
  "Photocopy of PSA Birth Certificate",
  "Original Copy of Form 138",
  "Original Copy of Form 137",
  "Photocopy of Moving Up Certificate",
];

const STANDARD_REQUIREMENTS = [
  "2x2 recent photo white background with name tag (4pcs)",
  "Certificate of Good Moral Character",
  "Certificate of Barangay Residency with original Barangay Seal",
  "Photocopy of PSA Birth Certificate",
  "Original Copy of Form 138",
  "Original Copy of Form 137",
  "Photocopy of Moving Up Certificate",
];

const isMarineCourse = (course = "") => {
  const lowerCourse = course.toLowerCase();

  return (
    lowerCourse.includes("marine transportation") ||
    lowerCourse.includes("marine engineering")
  );
};

const normalizeStatus = (status) =>
  REQUIREMENT_STATUS_VALUES.includes(status) ? status : "pending";

const normalizeRequirement = (requirement) => {
  if (typeof requirement === "string") {
    return {
      name: requirement,
      status: "pending",
      note: "",
    };
  }

  return {
    name: String(requirement?.name || "").trim(),
    status: normalizeStatus(requirement?.status),
    note: String(requirement?.note || "").trim(),
    updatedAt: requirement?.updatedAt,
  };
};

const getRequirementNamesForCourse = (course) =>
  isMarineCourse(course) ? MARINE_REQUIREMENTS : STANDARD_REQUIREMENTS;

const getDefaultRequirementsForCourse = (course) =>
  getRequirementNamesForCourse(course).map((name) => ({
    name,
    status: "pending",
    note: "",
  }));

const mergeRequirementsForCourse = (course, savedRequirements = []) => {
  const savedByName = new Map();

  savedRequirements
    .map(normalizeRequirement)
    .filter((requirement) => requirement.name)
    .forEach((requirement) => {
      savedByName.set(requirement.name.toLowerCase(), requirement);
    });

  const defaultNames = getRequirementNamesForCourse(course);
  return defaultNames.map((name) => {
    const saved = savedByName.get(name.toLowerCase());

    return {
      name,
      status: normalizeStatus(saved?.status),
      note: saved?.note || "",
      updatedAt: saved?.updatedAt,
    };
  });
};

const prepareRequirementsForSave = (
  course,
  nextRequirements = [],
  currentRequirements = []
) => {
  const now = new Date();
  const currentByName = new Map();

  currentRequirements
    .map(normalizeRequirement)
    .filter((requirement) => requirement.name)
    .forEach((requirement) => {
      currentByName.set(requirement.name.toLowerCase(), requirement);
    });

  return mergeRequirementsForCourse(course, nextRequirements).map(
    (requirement) => {
      const current = currentByName.get(requirement.name.toLowerCase());
      const changed =
        !current ||
        current.status !== requirement.status ||
        (current.note || "") !== (requirement.note || "");

      return {
        ...requirement,
        updatedAt: changed ? now : current.updatedAt,
      };
    }
  );
};

const getRequirementSummary = (requirements = []) => {
  const total = requirements.length;
  const completed = requirements.filter((requirement) =>
    DONE_REQUIREMENT_STATUSES.includes(requirement.status)
  ).length;

  return {
    total,
    completed,
    pending: Math.max(total - completed, 0),
  };
};

module.exports = {
  DONE_REQUIREMENT_STATUSES,
  MARINE_REQUIREMENTS,
  REQUIREMENT_STATUS_VALUES,
  STANDARD_REQUIREMENTS,
  getDefaultRequirementsForCourse,
  getRequirementNamesForCourse,
  getRequirementSummary,
  isMarineCourse,
  mergeRequirementsForCourse,
  prepareRequirementsForSave,
};
