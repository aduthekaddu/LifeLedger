import nodemailer from 'nodemailer';
import logger from '../config/logger';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.error('SMTP credentials not configured. Email not sent.');
      console.error('❌ SMTP_USER or SMTP_PASS not set in .env file');
      return false;
    }

    logger.info(`Attempting to send email to ${options.to}: ${options.subject}`);
    console.log(`📧 Sending email to ${options.to}...`);

    const info = await transporter.sendMail({
      from: `"LifeLedger" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });

    logger.info(`✅ Email sent successfully to ${options.to}: ${options.subject} (MessageID: ${info.messageId})`);
    console.log(`✅ Email sent to ${options.to}`);
    return true;
  } catch (error: any) {
    logger.error('❌ Email send error:', error);
    console.error('❌ Email send error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.command) console.error('Failed command:', error.command);
    return false;
  }
};

export const sendAccessRequestNotification = async (
  patientEmail: string,
  patientName: string,
  doctorName: string,
  reason: string
) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 New Access Request</h1>
        </div>
        <div class="content">
          <p>Hello ${patientName},</p>
          <p><strong>Dr. ${doctorName}</strong> has requested access to your medical records.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>Please log in to your LifeLedger account to review and respond to this request.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/access-requests" class="button">
            Review Request
          </a>
          <p>If you did not expect this request, please contact support immediately.</p>
        </div>
        <div class="footer">
          <p>© 2025 LifeLedger. All rights reserved.</p>
          <p>HIPAA-compliant • Blockchain-secured • AI-powered</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: patientEmail,
    subject: '🏥 New Access Request - LifeLedger',
    html,
  });
};

export const sendAccessResponseNotification = async (
  doctorEmail: string,
  doctorName: string,
  patientName: string,
  status: 'approved' | 'denied'
) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${status === 'approved' ? '#10B981 0%, #059669' : '#EF4444 0%, #DC2626'} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${status === 'approved' ? '✅ Access Approved' : '❌ Access Denied'}</h1>
        </div>
        <div class="content">
          <p>Hello Dr. ${doctorName},</p>
          <p>Your access request for <strong>${patientName}'s</strong> medical records has been <strong>${status}</strong>.</p>
          ${status === 'approved' ? '<p>You can now view and manage this patient\'s records.</p>' : '<p>The patient has declined your access request.</p>'}
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/doctor/patients" class="button">
            ${status === 'approved' ? 'View Patient Records' : 'View Dashboard'}
          </a>
        </div>
        <div class="footer">
          <p>© 2025 LifeLedger. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: doctorEmail,
    subject: `${status === 'approved' ? '✅' : '❌'} Access Request ${status === 'approved' ? 'Approved' : 'Denied'} - LifeLedger`,
    html,
  });
};

export const sendEmergencyAccessNotification = async (
  patientEmail: string,
  patientName: string,
  doctorName: string,
  reason: string
) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert { background: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 Emergency Access Alert</h1>
        </div>
        <div class="content">
          <p>Hello ${patientName},</p>
          <div class="alert">
            <strong>⚠️ Emergency Access Granted</strong><br>
            Dr. ${doctorName} has accessed your medical records in an emergency situation.
          </div>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>This access was granted automatically via your emergency QR code to ensure you receive immediate medical care.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/access-logs" class="button">
            View Access Logs
          </a>
          <p>If you have concerns about this access, please contact support.</p>
        </div>
        <div class="footer">
          <p>© 2025 LifeLedger. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: patientEmail,
    subject: '🚨 Emergency Access Alert - LifeLedger',
    html,
  });
};

export const sendVerificationEmail = async (
  email: string,
  name: string,
  verificationToken: string
) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .code { background: #E5E7EB; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✉️ Verify Your Email</h1>
        </div>
        <div class="content">
          <p>Hello ${name},</p>
          <p>Welcome to <strong>LifeLedger</strong>! Please verify your email address to complete your registration.</p>
          <a href="${verificationUrl}" class="button">
            Verify Email Address
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3B82F6;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account with LifeLedger, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© 2025 LifeLedger. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '✉️ Verify Your Email - LifeLedger',
    html,
  });
};

export const sendWelcomeEmail = async (
  email: string,
  name: string,
  patientId: string
) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .patient-id { background: #E5E7EB; padding: 15px; border-radius: 8px; font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to LifeLedger!</h1>
        </div>
        <div class="content">
          <p>Hello ${name},</p>
          <p>Your account has been successfully created! Welcome to the future of secure medical record management.</p>
          <p><strong>Your Patient ID:</strong></p>
          <div class="patient-id">${patientId}</div>
          <p>Keep this ID safe - you'll need it for medical appointments and record access.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">
            Login to Your Account
          </a>
          <p><strong>What's next?</strong></p>
          <ul>
            <li>Complete your profile information</li>
            <li>Generate your emergency QR code</li>
            <li>Upload your medical records</li>
            <li>Manage doctor access permissions</li>
          </ul>
        </div>
        <div class="footer">
          <p>© 2025 LifeLedger. All rights reserved.</p>
          <p>HIPAA-compliant • Blockchain-secured • AI-powered</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🎉 Welcome to LifeLedger!',
    html,
  });
};


// SMS Notification Service using Twilio
import twilio from 'twilio';

let twilioClient: any = null;

// Initialize Twilio client if credentials are available
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

export interface SMSOptions {
  to: string;
  message: string;
}

export const sendSMS = async (options: SMSOptions): Promise<boolean> => {
  try {
    if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
      logger.warn('Twilio not configured. SMS not sent.');
      return false;
    }

    // Ensure phone number is in E.164 format
    let phoneNumber = options.to;
    if (!phoneNumber.startsWith('+')) {
      // Assume US number if no country code
      phoneNumber = `+1${phoneNumber.replace(/\D/g, '')}`;
    }

    await twilioClient.messages.create({
      body: options.message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    logger.info(`SMS sent to ${phoneNumber}`);
    return true;
  } catch (error) {
    logger.error('SMS send error:', error);
    return false;
  }
};

export const sendAccessRequestSMS = async (
  phoneNumber: string,
  patientName: string,
  doctorName: string
) => {
  const message = `LifeLedger Alert: Dr. ${doctorName} has requested access to your medical records. Please log in to review: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/access-requests`;
  
  return sendSMS({
    to: phoneNumber,
    message,
  });
};

export const sendEmergencyAccessSMS = async (
  phoneNumber: string,
  patientName: string,
  doctorName: string
) => {
  const message = `🚨 EMERGENCY ALERT - LifeLedger: Dr. ${doctorName} has accessed your medical records in an emergency situation via QR code. View details: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/access-logs`;
  
  return sendSMS({
    to: phoneNumber,
    message,
  });
};

export const sendVerificationSMS = async (
  phoneNumber: string,
  verificationCode: string
) => {
  const message = `Your LifeLedger verification code is: ${verificationCode}. This code expires in 10 minutes.`;
  
  return sendSMS({
    to: phoneNumber,
    message,
  });
};

export const sendWelcomeSMS = async (
  phoneNumber: string,
  patientName: string,
  patientId: string
) => {
  const message = `Welcome to LifeLedger, ${patientName}! Your Patient ID is: ${patientId}. Keep this ID safe for medical appointments.`;
  
  return sendSMS({
    to: phoneNumber,
    message,
  });
};
