import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
  title: String,
  childName: String,
  deadline: Date,
  duration: String,
  status: { type: String, default: "Belum mulai" },
  Startdate: Date,
  Enddate: Date
});

const Schedule = mongoose.model("Schedule", scheduleSchema);

export default Schedule;