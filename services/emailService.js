const { Resend } = require("resend");

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

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
          <p>© 2024 Exact Colleges of Asia. All rights reserved.</p>
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
};

// Send email function using Resend API
const sendEmail = async (to, template, data) => {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY not configured");
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    // Get email template
    const emailTemplate = emailTemplates[template](...data);
    
    console.log(`📧 Sending email via Resend to: ${to}`);
    console.log(`📧 Subject: ${emailTemplate.subject}`);

    // Send email using Resend
    const result = await resend.emails.send({
      from: "Exact Colleges of Asia <noreply@exactcolleges.edu.ph>",
      to: to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    console.log("✅ Email sent successfully via Resend");
    console.log("📧 Message ID:", result.data?.id);
    
    return { 
      success: true, 
      messageId: result.data?.id,
      provider: "resend"
    };
  } catch (error) {
    console.error("❌ Resend email failed:", error.message);
    console.error("📧 Error details:", error);
    
    return { 
      success: false, 
      error: error.message,
      provider: "resend"
    };
  }
};

module.exports = {
  sendEmail,
  emailTemplates,
};