import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.warn('Skipping email: SMTP not configured');
        return;
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"ERM System" <no-reply@erm-system.com>',
            to,
            subject,
            html,
        });
        console.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
        console.error('Failed to send email:', error);
        // Do not throw, finding is that failed email shouldn't block main logic
    }
}
