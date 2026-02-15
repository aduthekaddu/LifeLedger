import { sendEmail } from './notifications';
import logger from '../config/logger';
import dotenv from 'dotenv';

dotenv.config();

const testEmail = async () => {
  console.log('🧪 Testing Email Configuration...\n');
  
  console.log('SMTP Configuration:');
  console.log('- Host:', process.env.SMTP_HOST);
  console.log('- Port:', process.env.SMTP_PORT);
  console.log('- User:', process.env.SMTP_USER);
  console.log('- Pass:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');
  console.log('');

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP credentials not configured!');
    console.error('Please set SMTP_USER and SMTP_PASS in .env file');
    process.exit(1);
  }

  console.log('📧 Sending test email...\n');

  const result = await sendEmail({
    to: process.env.SMTP_USER, // Send to yourself
    subject: '✅ LifeLedger Email Test',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #3B82F6;">🎉 Email Configuration Successful!</h1>
        <p>Your LifeLedger email system is working correctly.</p>
        <p><strong>Test Details:</strong></p>
        <ul>
          <li>SMTP Host: ${process.env.SMTP_HOST}</li>
          <li>SMTP Port: ${process.env.SMTP_PORT}</li>
          <li>From: ${process.env.SMTP_USER}</li>
        </ul>
        <p>You can now receive:</p>
        <ul>
          <li>✉️ Verification emails</li>
          <li>🎉 Welcome emails</li>
          <li>🏥 Access request notifications</li>
          <li>🚨 Emergency alerts</li>
        </ul>
      </div>
    `,
  });

  if (result) {
    console.log('✅ Test email sent successfully!');
    console.log('📬 Check your inbox:', process.env.SMTP_USER);
  } else {
    console.error('❌ Test email failed!');
    console.error('Check the error logs above for details.');
  }

  process.exit(result ? 0 : 1);
};

testEmail();
