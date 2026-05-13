const nodemailer = require("nodemailer");

const {
  EMAIL_SERVICE,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_SECURE,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
} = process.env;

const transporterOptions = {};

if (EMAIL_SERVICE) {
  transporterOptions.service = EMAIL_SERVICE;
}

if (!EMAIL_SERVICE) {
  transporterOptions.host = EMAIL_HOST || "smtp.gmail.com";
  transporterOptions.port = EMAIL_PORT ? parseInt(EMAIL_PORT, 10) : 465;
  transporterOptions.secure =
    EMAIL_SECURE !== undefined
      ? EMAIL_SECURE === "true"
      : transporterOptions.port === 465;
}

if (EMAIL_USER && EMAIL_PASS) {
  transporterOptions.auth = {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  };
}

const transporter = nodemailer.createTransport(transporterOptions);

// Email templates (keeping all existing templates intact)
const emailTemplates = {
  submissionConfirmation: (studentName, applicationId) => ({
    subject: "Application Submitted Successfully - Exact Colleges of Asia",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0D1B2A, #1B9AAA); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Exact Colleges of Asia</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Student Admission Management System</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #0D1B2A; margin-top: 0;">Application Submitted Successfully!</h2>
          
          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            Dear <strong>${studentName}</strong>,
          </p>
          
          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            Thank you for submitting your application to Exact Colleges of Asia. We have successfully received your application and it is now under review.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1B9AAA;">
            <h3 style="color: #0D1B2A; margin-top: 0;">Application Details</h3>
            <p style="margin: 5px 0; color: #343A40;"><strong>Application ID:</strong> ${applicationId}</p>
            <p style="margin: 5px 0; color: #343A40;"><strong>Status:</strong> <span style="color: #FFC300; font-weight: bold;">Pending Review</span></p>
            <p style="margin: 5px 0; color: #343A40;"><strong>Submitted:</strong> ${new Date().toLocaleDateString(
              "en-US",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            )}</p>
          </div>
          
          <div style="background: #e8f5e8; border: 1px solid #c3e6c3; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2d5a2d; margin-top: 0;">What Happens Next?</h3>
            <ol style="color: #2d5a2d; margin: 10px 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;"><strong>Initial Review (1-2 days):</strong> Our admissions team will verify your submitted documents and information.</li>
              <li style="margin-bottom: 8px;"><strong>Document Verification (2-3 days):</strong> We'll check the authenticity and completeness of your requirements.</li>
              <li style="margin-bottom: 8px;"><strong>Evaluation Process (3-5 days):</strong> Your application will be evaluated based on our admission criteria.</li>
              <li style="margin-bottom: 8px;"><strong>Decision Notification:</strong> You'll receive an email with the admission decision and next steps.</li>
            </ol>
          </div>
          
          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            <strong>Please wait for our response.</strong> We will contact you within 3-5 business days with updates on your application status. You can also check your application status by contacting our admissions office.
          </p>
          
          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            If you have any questions, please don't hesitate to contact us at <a href="mailto:info@exactcolleges.edu.ph" style="color: #1B9AAA;">info@exactcolleges.edu.ph</a> or call us at (045) 123-4567.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://your-frontend-domain.com" style="background: #1B9AAA; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Visit Our Website</a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 14px;">
          <p>Suclayin, Arayat, Pampanga, Philippines</p>
        </div>
      </div>
    `,
  }),

  missingRequirements: (studentName, missingItems, customMessage = "") => ({
    subject: "Missing Requirements - Action Required - Exact Colleges of Asia",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0D1B2A, #E63946); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Exact Colleges of Asia</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Student Admission Management System</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #E63946; margin-top: 0;">Missing Requirements - Action Required</h2>
          
          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            Dear <strong>${studentName}</strong>,
          </p>
          
          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            We have reviewed your application and found that some requirements are missing or incomplete. Please submit the following items to complete your application:
          </p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">Missing Requirements:</h3>
            <ul style="color: #856404; margin: 10px 0;">
              ${missingItems.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </div>
          
          ${
            customMessage
              ? `
            <div style="background: #e3f2fd; border: 1px solid #bbdefb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1565c0; margin-top: 0;">Additional Instructions:</h3>
              <p style="color: #1565c0; margin: 0; font-style: italic;">${customMessage}</p>
            </div>
          `
              : ""
          }
          
          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            Please submit these requirements within <strong>7 days</strong> to avoid any delays in processing your application.
          </p>
          
          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            If you have any questions about these requirements, please contact us at <a href="mailto:info@exactcolleges.edu.ph" style="color: #1B9AAA;">info@exactcolleges.edu.ph</a> or call us at (045) 123-4567.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://your-frontend-domain.com/application" style="background: #E63946; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Submit Missing Requirements</a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 14px;">
          <p>© 2024 Exact Colleges of Asia. All rights reserved.</p>
          <p>Suclayin, Arayat, Pampanga, Philippines</p>
        </div>
      </div>
    `,
  }),

  customNotification: (
    studentName,
    subject,
    message,
    notificationType = "general"
  ) => ({
    subject: `${subject} - Exact Colleges of Asia`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0D1B2A, #1B9AAA); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Exact Colleges of Asia</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Student Admission Management System</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #0D1B2A; margin-top: 0;">${subject}</h2>
          
          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            Dear <strong>${studentName}</strong>,
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1B9AAA;">
            <div style="color: #343A40; font-size: 16px; line-height: 1.6; white-space: pre-line;">${message}</div>
          </div>
          
          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            If you have any questions, please don't hesitate to contact us at <a href="mailto:info@exactcolleges.edu.ph" style="color: #1B9AAA;">info@exactcolleges.edu.ph</a> or call us at (045) 123-4567.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://your-frontend-domain.com" style="background: #1B9AAA; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Visit Our Website</a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 14px;">
          <p>© 2024 Exact Colleges of Asia. All rights reserved.</p>
          <p>Suclayin, Arayat, Pampanga, Philippines</p>
        </div>
      </div>
    `,
  }),

  admissionResult: (studentName, status, course) => ({
    subject: `Admission Decision - ${
      status === "admitted" ? "Congratulations!" : "Application Update"
    } - Exact Colleges of Asia`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0D1B2A, ${
          status === "admitted" ? "#22c55e" : "#E63946"
        }); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Exact Colleges of Asia</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Student Admission Management System</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: ${
            status === "admitted" ? "#22c55e" : "#E63946"
          }; margin-top: 0;">
            ${
              status === "admitted"
                ? "🎉 Congratulations! You've Been Admitted!"
                : "Application Update"
            }
          </h2>
          
          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            Dear <strong>${studentName}</strong>,
          </p>
          
          ${
            status === "admitted"
              ? `
            <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
              We are pleased to inform you that you have been <strong>admitted</strong> to Exact Colleges of Asia!
            </p>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #155724; margin-top: 0;">Admission Details</h3>
              <p style="margin: 5px 0; color: #155724;"><strong>Program:</strong> ${course}</p>
              <p style="margin: 5px 0; color: #155724;"><strong>Status:</strong> <span style="color: #22c55e; font-weight: bold;">Admitted</span></p>
              <p style="margin: 5px 0; color: #155724;"><strong>Decision Date:</strong> ${new Date().toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}</p>
            </div>
            
            <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
              Welcome to the Exact Colleges of Asia family! Our admissions team will contact you within the next few days with detailed information about enrollment procedures, orientation, and next steps.
            </p>
          `
              : `
            <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
              After careful review of your application, we regret to inform you that we are unable to offer you admission at this time.
            </p>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #721c24; margin-top: 0;">Application Status</h3>
              <p style="margin: 5px 0; color: #721c24;"><strong>Program:</strong> ${course}</p>
              <p style="margin: 5px 0; color: #721c24;"><strong>Status:</strong> <span style="color: #E63946; font-weight: bold;">Not Admitted</span></p>
              <p style="margin: 5px 0; color: #721c24;"><strong>Decision Date:</strong> ${new Date().toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}</p>
            </div>
            
            <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
              We encourage you to consider other programs or reapply in the future. If you have any questions about this decision, please contact our admissions office.
            </p>
          `
          }
          
          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            If you have any questions, please don't hesitate to contact us at <a href="mailto:info@exactcolleges.edu.ph" style="color: #1B9AAA;">info@exactcolleges.edu.ph</a> or call us at (045) 123-4567.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://your-frontend-domain.com" style="background: ${
              status === "admitted" ? "#22c55e" : "#1B9AAA"
            }; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              ${status === "admitted" ? "View Next Steps" : "Visit Our Website"}
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 14px;">
          <p>© 2024 Exact Colleges of Asia. All rights reserved.</p>
          <p>Suclayin, Arayat, Pampanga, Philippines</p>
        </div>
      </div>
    `,
  }),
  adminPasswordReset: (adminEmail, resetLink) => ({
    subject: "Admin Password Reset Request - Exact Colleges of Asia",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0D1B2A, #1B9AAA); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Exact Colleges of Asia</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Admin Password Reset</p>
        </div>

        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            Hello <strong>${adminEmail}</strong>,
          </p>

          <p style="color: #343A40; font-size: 16px; line-height: 1.6;">
            We received a request to reset your admin account password for the Student Admission Management System.
          </p>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetLink}" style="background: #1B9AAA; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
          </div>

          <p style="color: #343A40; font-size: 14px; line-height: 1.6;">
            If you did not request this change, you can safely ignore this email. The link will expire in 15 minutes.
          </p>

          <p style="color: #343A40; font-size: 14px; line-height: 1.6;">
            For security reasons, please do not share this link with anyone.
          </p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 14px;">
          <p>© 2024 Exact Colleges of Asia. All rights reserved.</p>
          <p>Suclayin, Arayat, Pampanga, Philippines</p>
        </div>
      </div>
    `,
  }),
  applicationVerified: (studentName, course) => {
    const lowerCourse = (course || "").toLowerCase();
    const isMarineCourse =
      lowerCourse.includes("marine transportation") ||
      lowerCourse.includes("marine engineering");

    if (isMarineCourse) {
      return {
        subject: "Letter of Acceptance - Exact Colleges of Asia",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #d1d5db; color: #111827;">
            <div style="padding: 24px 32px 18px; text-align: center; border-bottom: 2px solid #2f67b1;">
              <div style="font-size: 28px; font-weight: 800; color: #2f5da8; letter-spacing: 1px; text-transform: uppercase;">EXACT COLLEGES OF ASIA</div>
              <div style="font-size: 13px; color: #111827; line-height: 1.45; margin-top: 6px;">
                Suclayin, Arayat, Pampanga<br/>
                Cel No. 0925-870-1013 ; 0917-324-7803<br/>
                Email address: exact.colleges@yahoo.com
              </div>
            </div>

            <div style="padding: 44px 42px 36px;">
              <div style="font-size: 18px; letter-spacing: 8px; text-align: center; margin-bottom: 46px;">LETTER OF ACCEPTANCE</div>
              <p style="font-size: 15px; line-height: 1.7; margin: 0 0 36px;">Dear: <strong>${studentName}</strong></p>

              <p style="font-size: 15px; line-height: 1.7; margin: 0 0 24px;">Greetings from Exact Colleges of Asia!</p>

              <p style="font-size: 15px; line-height: 1.8; margin: 0 0 28px;">
                It is with great pleasure to inform you of your <strong>ACCEPTANCE</strong> in the
                <strong>${course}</strong> program for the First Semester, Academic Year 2026-2027 at the
                <strong>Exact Colleges of Asia</strong>.
              </p>

              <p style="font-size: 15px; line-height: 1.7; margin: 0 0 22px;">
                To proceed with your admission process, kindly like and monitor the announcement posted at the
                <strong>EXACT Colleges of Asia-Maritime Education Facebook Page</strong> to know your medical schedule.
                Fill-out Google Form to reserve your slot.
              </p>

              <p style="font-size: 15px; line-height: 1.7; margin: 0 0 18px;">
                Please wait for the release of your medical results. If you successfully pass, kindly prepare the
                following documents to proceed with the enrolment procedure:
              </p>

              <ul style="list-style: none; padding-left: 22px; margin: 0 0 24px; font-size: 15px; line-height: 1.65;">
                <li>&#9744; &nbsp;Medical Result</li>
                <li>&#9744; &nbsp;NaMMAT Result</li>
                <li>&#9744; &nbsp;2x2 recent photo white background with name tag (4pcs)</li>
                <li>&#9744; &nbsp;Certificate of Good Moral Character</li>
                <li>&#9744; &nbsp;Photocopy of PSA Birth Certificate</li>
                <li>&#9744; &nbsp;Original Copy of Form 138</li>
                <li>&#9744; &nbsp;Original Copy of Form 137</li>
                <li>&#9744; &nbsp;Photocopy of Moving Up Certificate</li>
              </ul>

              <p style="font-size: 15px; line-height: 1.7; margin: 0 0 28px; font-style: italic;">
                Note: You can submit the last three listed requirements once available.
              </p>

              <p style="font-size: 15px; line-height: 1.7; margin: 0 0 26px;">
                Please submit the abovementioned requirements in a <strong>LONG BROWN ENVELOPE</strong> at the
                Registrar's Office.
              </p>

              <p style="font-size: 15px; line-height: 1.7; margin: 0 0 22px;">
                Again, congratulations and welcome to the Exactian Family!
              </p>

              <p style="font-size: 15px; line-height: 1.6; margin: 0; font-weight: 700;">
                -Dr. Ferdinand G. Marcos (Sgd)<br/>
                School President
              </p>
            </div>
          </div>
        `,
      };
    }

    return {
      subject: "Letter of Acceptance - Exact Colleges of Asia",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #d1d5db; color: #111827;">
          <div style="padding: 24px 32px 18px; text-align: center; border-bottom: 1px solid #d1d5db;">
            <div style="font-size: 28px; font-weight: 800; color: #5B7FBE; letter-spacing: 1px; text-transform: uppercase;">EXACT COLLEGES OF ASIA</div>
            <div style="font-size: 13px; color: #111827; line-height: 1.45; margin-top: 6px;">
              Suclayin, Arayat, Pampanga<br/>
              Cel No. 0925-870-1013 ; 0917-324-7803<br/>
              Email address: exact.colleges@yahoo.com
            </div>
          </div>

          <div style="padding: 44px 42px 36px;">
            <div style="font-size: 18px; letter-spacing: 8px; text-align: center; margin-bottom: 46px;">LETTER OF ACCEPTANCE</div>

            <p style="font-size: 15px; line-height: 1.7; margin: 0 0 36px;">Dear: <strong>${studentName}</strong></p>

            <p style="font-size: 15px; line-height: 1.7; margin: 0 0 24px;">Greetings from Exact Colleges of Asia!</p>

            <p style="font-size: 15px; line-height: 1.8; margin: 0 0 28px;">
              It is with great pleasure to inform you of your <strong>ACCEPTANCE</strong> in the
              <strong>${course}</strong> program for the First Semester, Academic Year 2025-2026 at the
              <strong>Exact Colleges of Asia</strong>.
            </p>

            <p style="font-size: 15px; line-height: 1.7; margin: 0 0 8px;">
              To proceed with your enrollment, kindly prepare the following documents:
            </p>

            <ul style="list-style: none; padding-left: 22px; margin: 0 0 24px; font-size: 15px; line-height: 1.65;">
              <li>&#9744; &nbsp;2x2 recent photo white background with name tag (4pcs)</li>
              <li>&#9744; &nbsp;Certificate of Good Moral Character</li>
              <li>&#9744; &nbsp;Certificate of Barangay Residency with original Barangay Seal</li>
              <li>&#9744; &nbsp;Photocopy of PSA Birth Certificate</li>
              <li style="margin-top: 16px;">&#9744; &nbsp;Original Copy of Form 138</li>
              <li>&#9744; &nbsp;Original Copy of Form 137</li>
              <li>&#9744; &nbsp;Photocopy of Moving Up Certificate</li>
            </ul>

            <p style="font-size: 15px; line-height: 1.7; margin: 0 0 28px; font-style: italic;">
              Note: You can submit the last three listed requirements once available.
            </p>

            <p style="font-size: 15px; line-height: 1.7; margin: 0 0 26px;">
              To reserve a slot, please submit the abovementioned requirements in a
              <strong>LONG BROWN ENVELOPE</strong> at the Registrar's Office and pay the
              <strong>RESERVATION FEE</strong> at the Accounting Office.
            </p>

            <p style="font-size: 15px; line-height: 1.7; margin: 0 0 22px;">
              Again, Congratulations and Welcome to the Exactian Family!
            </p>

            <p style="font-size: 15px; line-height: 1.6; margin: 0; font-weight: 700;">
              -Dr. Ferdinand G. Marcos (Sgd)<br/>
              School President
            </p>
          </div>

        </div>
      `,
    };
  },
};

// Send email function using SMTP
const sendEmail = async (to, template, data) => {
  try {
    const emailTemplate = emailTemplates[template](...data);

    if (!EMAIL_USER || !EMAIL_PASS) {
      console.error("❌ EMAIL_USER or EMAIL_PASS not configured in .env");
      return {
        success: false,
        error: "Email credentials not configured",
        provider: "smtp",
      };
    }

    console.log(`📧 Sending email via SMTP to: ${to}`);
    console.log(`📧 Subject: ${emailTemplate.subject}`);

    const result = await transporter.sendMail({
      from: EMAIL_FROM || EMAIL_USER,
      to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    console.log("📧 SMTP Response:", JSON.stringify(result, null, 2));
    console.log("✅ Email sent successfully via SMTP");
    console.log("📧 Message ID:", result.messageId || "N/A");

    return {
      success: true,
      messageId: result.messageId || "smtp-success",
      provider: "smtp",
    };
  } catch (error) {
    console.error("SMTP email failed:", error.message);
    console.error("📧 Error details:", error);

    return {
      success: false,
      error: error.message,
      provider: "smtp",
    };
  }
};

module.exports = {
  sendEmail,
  emailTemplates,
};
