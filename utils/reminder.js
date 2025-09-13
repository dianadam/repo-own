import cron from "node-cron";
import nodemailer from "nodemailer";
import Schedule from "../models/Schedule.js";

export function initReminders() {
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const inFiveMinutes = new Date(now.getTime() + 5 * 60000);

    const schedules = await Schedule.find({
      date: { $gte: now, $lte: inFiveMinutes }
    });

    if (schedules.length > 0) {
      for (const s of schedules) {
        await sendEmail(
          process.env.REMINDER_TO,
          `Pengingat Kegiatan: ${s.title}`,
          `Hai! Kegiatan "${s.title}" untuk ${s.childName} dimulai pukul ${s.date.toLocaleTimeString()}`
        );
      }
    }
  });
}

async function sendEmail(to, subject, text) {
  if (!process.env.SMTP_HOST) return console.log("⚠️ Email not configured");
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text });
  console.log("📧 Reminder sent:", subject);
}