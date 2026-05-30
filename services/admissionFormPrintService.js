const fs = require("fs");
const path = require("path");

const courseOptions = [
  {
    value: "Bachelor of Science in Marine Transportation",
    label: "Bachelor of Science in Marine Transportation",
  },
  {
    value: "Bachelor of Science in Marine Engineering",
    label: "Bachelor of Science in Marine Engineering",
  },
  {
    value: "Bachelor of Science in Criminology",
    label: "Bachelor of Science in Criminology",
  },
  {
    value:
      "Bachelor of Technical-Vocational Teacher Education (Major in Food and Service Management)",
    label: "Bachelor of Technical Vocational Teacher Education",
  },
  {
    value: "Bachelor of Science in Tourism Management",
    label: "Bachelor of Science in Tourism Management",
  },
  {
    value: "Bachelor of Science in Information System",
    label: "Bachelor of Science in Information Systems",
  },
  {
    value: "Bachelor of Science in Entrepreneurship",
    label: "Bachelor of Science in Entrepreneurship",
  },
  {
    value: "Bachelor of Early Childhood Education",
    label: "Bachelor of Early Childhood Education",
  },
  {
    value: "Bachelor of Science in Management Accounting",
    label: "Bachelor of Science in Management Accounting",
  },
  {
    value: "Bachelor of Science in Nursing",
    label: "Bachelor of Science in Nursing",
  },
];

const escapeHtml = (value = "") =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getLogoDataUri = () => {
  try {
    const logoPath = path.join(
      __dirname,
      "../../frontend/public/logo na pogi.png"
    );
    const logo = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logo.toString("base64")}`;
  } catch (error) {
    console.warn("Could not load logo for printable admission form:", error.message);
    return "";
  }
};

const formatDate = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const fieldValue = (value) => escapeHtml(value || "");

const checkbox = (checked) =>
  `<span class="checkbox">${checked ? "&#10003;" : ""}</span>`;

const nameLine = (label, lastName, firstName, middleName) => `
  <div class="name-line-label">${label}</div>
  <div class="written-line strong">
    <span>${fieldValue(lastName)}</span>
    <span>${fieldValue(firstName)}</span>
    <span>${fieldValue(middleName)}</span>
  </div>
  <div class="line-captions three">
    <span>Last name</span>
    <span>First Name</span>
    <span>Middle Name</span>
  </div>
`;

const buildAdmissionFormHtml = (
  application,
  { autoPrint = false, includeToolbar = true } = {}
) => {
  const app =
    application && typeof application.toObject === "function"
      ? application.toObject()
      : application || {};
  const logoDataUri = getLogoDataUri();
  const middleInitial = app.middleName ? `${String(app.middleName).charAt(0)}.` : "";
  const selectedCourse = String(app.courseApplied || "").trim();
  const addressStreet = app.addressStreet || (!app.addressHouseNo ? app.presentAddress : "");
  const applicantName = [app.lastName, app.givenName, app.middleName]
    .filter(Boolean)
    .join(" ");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Application for Admission - ${fieldValue(app.name || applicantName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #e5e7eb;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.2;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 10px;
      background: #0d1b2a;
      box-shadow: 0 2px 12px rgba(0,0,0,.18);
    }
    .toolbar button {
      border: 0;
      border-radius: 6px;
      padding: 9px 14px;
      background: #1b9aaa;
      color: white;
      font-weight: 700;
      cursor: pointer;
    }
    .sheet {
      width: 8.5in;
      min-height: 13in;
      margin: 18px auto;
      padding: .34in .55in .42in;
      background: white;
      box-shadow: 0 8px 28px rgba(15, 23, 42, .24);
      position: relative;
    }
    .header {
      position: relative;
      min-height: .82in;
      text-align: center;
      margin-bottom: .2in;
    }
    .logo {
      position: absolute;
      left: .72in;
      top: -.04in;
      width: .62in;
      height: .62in;
      object-fit: contain;
    }
    .school-name {
      color: #3159ad;
      font-size: 28px;
      font-weight: 900;
      letter-spacing: .5px;
      line-height: 1;
      text-transform: uppercase;
    }
    .school-address {
      margin-top: 2px;
      font-family: "Times New Roman", serif;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.15;
    }
    .title {
      margin-top: .22in;
      font-family: "Times New Roman", serif;
      font-size: 23px;
      font-weight: 700;
    }
    .form-number {
      margin: .03in 0 .32in .68in;
      font-family: "Times New Roman", serif;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .form-table td, .form-table th {
      border: 1px solid #222;
      padding: 3px 5px;
      vertical-align: top;
    }
    .section-title {
      width: 2.92in;
      background: #e6e6e6;
      font-weight: 900;
      text-align: left;
      text-transform: uppercase;
      font-size: 12px;
    }
    .label {
      font-weight: 800;
      white-space: nowrap;
    }
    .field {
      min-height: 17px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .name-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr .35fr;
      align-items: end;
      gap: 10px;
      min-height: 35px;
    }
    .underline {
      border-bottom: 2px solid #111;
      min-height: 20px;
      display: flex;
      align-items: end;
      font-weight: 700;
      padding: 0 4px 1px;
    }
    .caption-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr .35fr;
      gap: 10px;
      font-size: 11px;
      font-style: italic;
      text-align: center;
    }
    .address-captions {
      display: grid;
      grid-template-columns: .58fr 1.35fr 1.8fr 1.85fr 1.25fr;
      gap: 6px;
      font-size: 11px;
      font-style: italic;
      text-align: center;
    }
    .address-values {
      display: grid;
      grid-template-columns: .58fr 1.35fr 1.8fr 1.85fr 1.25fr;
      gap: 6px;
      min-height: 22px;
      align-items: end;
    }
    .address-values span {
      border-bottom: 2px solid #111;
      min-height: 18px;
      font-weight: 700;
      padding: 0 3px 1px;
    }
    .gender-box {
      height: 57px;
      font-size: 12px;
    }
    .gender-box .row {
      margin-top: 9px;
      padding-left: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
    }
    .checkbox {
      display: inline-flex;
      width: 11px;
      height: 11px;
      border: 1.5px solid #111;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 900;
      line-height: 1;
      margin-right: 8px;
      vertical-align: middle;
    }
    .parents { margin-top: 6px; }
    .name-line-label {
      font-weight: 800;
      margin-bottom: 2px;
    }
    .written-line {
      border-bottom: 2px solid #111;
      min-height: 29px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      align-items: end;
      padding: 0 7px 2px;
    }
    .written-line.strong { font-weight: 700; }
    .line-captions {
      display: grid;
      gap: 12px;
      font-size: 11px;
      font-style: italic;
      text-align: center;
    }
    .line-captions.three { grid-template-columns: 1fr 1fr 1fr; }
    .programs {
      margin-top: .25in;
      display: grid;
      grid-template-columns: 1fr .8fr;
      gap: .45in;
      padding-left: .12in;
    }
    .program-title {
      font-weight: 900;
      font-size: 13px;
      margin-bottom: 9px;
    }
    .program-row {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 12px;
      margin: 8px 0;
      font-weight: 600;
    }
    .privacy {
      margin-top: .48in;
      font-size: 13px;
      line-height: 1.47;
      text-align: justify;
      font-style: italic;
      font-weight: 600;
      padding: 0 .05in;
    }
    .signature-area {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25in;
      align-items: end;
      margin-top: .56in;
      padding: 0 .35in;
      text-align: center;
      font-size: 12px;
      font-style: italic;
      font-weight: 700;
    }
    .signature-line {
      border-top: 2px solid #111;
      min-height: 22px;
      position: relative;
      padding-top: 4px;
    }
    .signature-image {
      position: absolute;
      left: 8%;
      right: 8%;
      bottom: 18px;
      max-width: 84%;
      max-height: 54px;
      object-fit: contain;
    }
    @media print {
      @page { size: 8.5in 13in; margin: 0; }
      body { background: white; }
      .toolbar { display: none; }
      .sheet {
        margin: 0;
        box-shadow: none;
        width: 8.5in;
        min-height: 13in;
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  ${
    includeToolbar
      ? `<div class="toolbar"><button type="button" onclick="window.print()">Print Admission Form</button></div>`
      : ""
  }
  <main class="sheet">
    <header class="header">
      ${logoDataUri ? `<img class="logo" src="${logoDataUri}" alt="Exact Colleges of Asia" />` : ""}
      <div class="school-name">EXACT COLLEGES OF ASIA</div>
      <div class="school-address">
        Suclayin, Arayat, Pampanga<br />
        Cel No. 0925-870-1013/ 0922-769-5381/ 0917-324-7803<br />
        Email address: exact.colleges@yahoo.com
      </div>
      <div class="title">Application for Admission</div>
    </header>

    <div class="form-number">Form No. AA/00/AUG.2020</div>

    <table class="form-table">
      <tr>
        <th class="section-title">STUDENT INFORMATION</th>
        <td style="border:0;"></td>
      </tr>
    </table>
    <table class="form-table">
      <colgroup>
        <col style="width: 82%;" />
        <col style="width: 18%;" />
      </colgroup>
      <tr>
        <td>
          <span class="label">Name:</span>
          <div class="name-grid">
            <div class="underline">${fieldValue(app.lastName)}</div>
            <div class="underline">${fieldValue(app.givenName)}</div>
            <div class="underline">${fieldValue(app.middleName)}</div>
            <div class="underline">${fieldValue(middleInitial)}</div>
          </div>
          <div class="caption-grid">
            <span>Last name</span>
            <span>First Name</span>
            <span>Middle Name</span>
            <span>MI.</span>
          </div>
        </td>
        <td class="gender-box">
          <span class="label">Gender :</span>
          <div class="row">${checkbox(app.sex === "Male")} Male</div>
          <div class="row">${checkbox(app.sex === "Female")} Female</div>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <span class="label">Address:</span>
          <div class="address-values">
            <span>${fieldValue(app.addressHouseNo)}</span>
            <span>${fieldValue(addressStreet)}</span>
            <span>${fieldValue(app.addressBarangay)}</span>
            <span>${fieldValue(app.addressCityMunicipality)}</span>
            <span>${fieldValue(app.addressProvince)}</span>
          </div>
          <div class="address-captions">
            <span>No.</span>
            <span>Street</span>
            <span>Brgy./Village</span>
            <span>City/ Municipality</span>
            <span>Province</span>
          </div>
        </td>
      </tr>
    </table>
    <table class="form-table">
      <colgroup>
        <col style="width: 38%;" />
        <col style="width: 24%;" />
        <col style="width: 38%;" />
      </colgroup>
      <tr>
        <td><span class="label">Date Of Birth:</span> <span class="field">${fieldValue(formatDate(app.dateOfBirth))}</span></td>
        <td><span class="label">Age:</span> <span class="field">${fieldValue(app.age)}</span></td>
        <td><span class="label">Nationality:</span> <span class="field">${fieldValue(app.nationality)}</span></td>
      </tr>
      <tr>
        <td colspan="3"><span class="label">Religion:</span> <span class="field">${fieldValue(app.religion)}</span></td>
      </tr>
      <tr>
        <td><span class="label">Tel. No.</span> <span class="field">${fieldValue(app.telephoneNumber)}</span></td>
        <td><span class="label">Mobile No.:</span> <span class="field">${fieldValue(app.contact)}</span></td>
        <td><span class="label">E-mail add:</span> <span class="field">${fieldValue(app.email)}</span></td>
      </tr>
      <tr>
        <td>
          <span class="label">Civil Status:</span>
          <span style="margin-left:18px;">${checkbox(app.civilStatus === "Single")}Single</span>
          <span style="margin-left:20px;">${checkbox(app.civilStatus === "Married")}Married</span>
        </td>
        <td colspan="2"><span class="label">Name of Previous School:</span> <span class="field">${fieldValue(app.schoolLastAttended)}</span></td>
      </tr>
      <tr>
        <td><span class="label">Honors/ Awards Received in Grade 10/12:</span> <span class="field">${fieldValue(app.honorsAwards)}</span></td>
        <td colspan="2"><span class="label">School Address:</span> <span class="field">${fieldValue(app.previousSchoolAddress)}</span></td>
      </tr>
    </table>

    <table class="form-table parents">
      <tr>
        <th class="section-title">PARENTS' INFORMATION</th>
        <td style="border:0;"></td>
      </tr>
      <tr>
        <td colspan="2">
          ${nameLine("Father:", app.fatherLastName, app.fatherFirstName, app.fatherMiddleName)}
        </td>
      </tr>
      <tr>
        <td style="width:52%;"><span class="label">Mobile No.:</span> <span class="field">${fieldValue(app.fatherMobileNumber)}</span></td>
        <td><span class="label">E-mail add:</span> <span class="field">${fieldValue(app.fatherEmail)}</span></td>
      </tr>
      <tr>
        <td><span class="label">Occupation:</span> <span class="field">${fieldValue(app.fatherOccupation)}</span></td>
        <td><span class="label">Work Address:</span> <span class="field">${fieldValue(app.fatherWorkAddress)}</span></td>
      </tr>
      <tr>
        <td colspan="2">
          ${nameLine("Mother (Full Maiden Name):", app.motherLastName, app.motherFirstName, app.motherMiddleName)}
        </td>
      </tr>
      <tr>
        <td><span class="label">Mobile No.:</span> <span class="field">${fieldValue(app.motherMobileNumber)}</span></td>
        <td><span class="label">E-mail add:</span> <span class="field">${fieldValue(app.motherEmail)}</span></td>
      </tr>
      <tr>
        <td><span class="label">Occupation:</span> <span class="field">${fieldValue(app.motherOccupation)}</span></td>
        <td><span class="label">Work Address:</span> <span class="field">${fieldValue(app.motherWorkAddress)}</span></td>
      </tr>
    </table>

    <section class="programs">
      <div>
        <div class="program-title">College Course/ Program:</div>
        ${courseOptions
          .map(
            (course) => `
              <div class="program-row">
                ${checkbox(selectedCourse === course.value)}
                <span>${escapeHtml(course.label)}</span>
              </div>
            `
          )
          .join("")}
      </div>
      <div></div>
    </section>

    <p class="privacy">
      I hereby certify that all the information written in this application are complete and accurate. I agree to update the Registrar's Office for any changes. I understand that by applying for admission/registering as a student of this institution, I allow EXACT COLLEGES OF ASIA through the Office of the Registrar to collect, record, organize, update, retrieve, consult, utilize, consolidate, block, erase or delete any information which are a part of my personal data for historical, statistical, research and evaluation purposes pursuant to the provisions of the Republic Act No. 10173 of the Philippines, Data Privacy Act of 2012 and its corresponding Implementing Rules and Regulations. I also agree, if accepted as a student, that my admission, matriculation, eligibility for any assistance/grant, and graduation are subject to the rules and regulations of this institution.
    </p>

    <section class="signature-area">
      <div class="signature-line">
        ${app.signatureUrl ? `<img class="signature-image" src="${escapeHtml(app.signatureUrl)}" alt="Applicant signature" />` : ""}
        Applicant's Signature
      </div>
      <div class="signature-line">
        ${fieldValue(app.dateSigned || formatDate(app.submittedAt))}
        <br />
        Date of Application
      </div>
    </section>
  </main>
  ${
    autoPrint
      ? `<script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 400); });</script>`
      : ""
  }
</body>
</html>`;
};

module.exports = {
  buildAdmissionFormHtml,
};
