const nodemailer = require('nodemailer');

const createTransporter = () => {
  const email = process.env.SMTP_EMAIL;
  const password = process.env.SMTP_PASSWORD;
  
  if (!email || !password) {
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for port 465, false for other ports (like 587)
    auth: {
      user: email,
      pass: password
    },
    tls: {
      // Prevents SSL handshake failures common on local home/office networks
      rejectUnauthorized: false
    }
  });
};

const sendOTP = async (recipientEmail, otp) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    throw new Error('Email transporter not configured. Please add SMTP_EMAIL and SMTP_PASSWORD to your .env file.');
  }

  try {
    await transporter.sendMail({
      from: `"CredSetu Security" <${process.env.SMTP_EMAIL}>`,
      to: recipientEmail,
      subject: 'CredSetu — Your Login Verification Code',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0f; color: #fff; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #00f2fe, #f093fb); padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; color: #000;">CredSetu</h1>
            <p style="margin: 4px 0 0; color: rgba(0,0,0,0.6); font-size: 14px;">Predict Risk, Protect Trust.</p>
          </div>
          <div style="padding: 32px;">
            <p style="color: #b3b3b3; font-size: 16px; margin-bottom: 24px;">Your verification code is:</p>
            <div style="background: #18181b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #00f2fe;">${otp}</span>
            </div>
            <p style="color: #888; font-size: 14px;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
          </div>
          <div style="padding: 16px 32px; background: #18181b; text-align: center;">
            <p style="color: #555; font-size: 12px; margin: 0;">CredSetu • Confidential</p>
          </div>
        </div>
      `
    });
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

module.exports = { sendOTP };
