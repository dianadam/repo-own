import express from "express";
import Schedule from "../models/Schedule.js";
import Prayer from "./models/Prayer.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const schedules = await Schedule.find();
  res.json(schedules);
});

router.post("/", async (req, res) => {
  try {
    const schedule = new Schedule(req.body);
    await schedule.save();
    res.status(201).json(schedule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(schedule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await Schedule.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/praying", requireAuth, async (req, res) => {
  const children = await Child.find();
  const prayers = await Prayer.find({ date: { $gte: new Date().setHours(0,0,0,0) } });
  res.render("praying", { children, prayers, user: req.session.user });
});

app.post("/update-status/:id", requireAuth, async (req, res) => {
  await Prayer.findByIdAndUpdate(req.params.id, { status: req.body.status });
  res.redirect("/");
});


export default router;