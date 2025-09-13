import express from "express";
import moment from "moment";
import Child from "../models/Child.js";
import Schedule from "../models/Schedule.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const children = await Child.find();
  const schedules = await Schedule.find();

  // Progress Sholat Tahunan
  const startYear = moment().startOf("year");
  const endYear = moment().endOf("year");

  const sholatTahunan = children.map(child => {
    const prayers = child.prayers.filter(p =>
      moment(p.date).isBetween(startYear, endYear, "day", "[]")
    );
    const total = prayers.length;
    const done = prayers.filter(p => p.status).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    return {
      childName: child.name,
      total,
      done,
      percent
    };
  });

  // Progress Sholat Mingguan
  const startWeek = moment().startOf("week");
  const endWeek = moment().endOf("week");

  const sholatMingguan = children.map(child => {
    const prayers = child.prayers.filter(p =>
      moment(p.date).isBetween(startWeek, endWeek, "day", "[]")
    );
    const total = prayers.length;
    const done = prayers.filter(p => p.status).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    return {
      childName: child.name,
      total,
      done,
      percent
    };
  });

  // Progress Kegiatan (Schedule)
  const kegiatan = children.map(child => {
    const childSchedules = schedules.filter(s => s.childName === child.name);
    const total = childSchedules.length;
    const selesai = childSchedules.filter(s => s.status === "Selesai").length;
    const percent = total ? Math.round((selesai / total) * 100) : 0;

    return {
      childName: child.name,
      total,
      selesai,
      percent
    };
  });

  res.render("report", { sholatTahunan, sholatMingguan, kegiatan });
});

export default router;
