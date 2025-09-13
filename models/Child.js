import mongoose from "mongoose";

const prayerSchema = new mongoose.Schema({
  prayerType: {
    type: String,
    enum: ["Subuh", "Duha", "Syuruq", "Dzuhur", "Ashar", "Maghrib", "Isya"],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: Boolean,
    default: false
  }
});

const childSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  prayers: [prayerSchema]
});

const Child = mongoose.model("Child", childSchema);
export default Child;
