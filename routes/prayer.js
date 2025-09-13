import express from "express";
import moment from "moment";
import Child from "../models/Child.js";

const router = express.Router();

const PRAYERS = ["Subuh", "Duha", "Syuruq", "Dzuhur", "Ashar", "Maghrib", "Isya"];

router.get("/", async (req, res) => {
  const { date, childId } = req.query;
  const today = date ? moment(date).startOf("day") : moment().startOf("day");

  // ambil minggu dari tanggal yang dipilih
  const startWeek = moment(today).startOf("week");
  const endWeek = moment(today).endOf("week");

  const children = await Child.find();

  for (const child of children) {
    let current = moment(startWeek);
    while (current.isSameOrBefore(endWeek, "day")) {
      for (const prayerType of PRAYERS) {
        const exists = child.prayers.find(
          (p) => moment(p.date).isSame(current, "day") && p.prayerType === prayerType
        );
        if (!exists) {
          child.prayers.push({
            prayerType,
            date: current.toDate(),
            status: false,
          });
        }
      }
      current.add(1, "day");
    }
    await child.save();
  }

  // kalau filter anak dipilih
  const filteredChildren = childId
    ? children.filter((c) => c._id.toString() === childId)
    : children;

  res.render("prayers", { children: filteredChildren, today, moment, allChildren: children, childId });
});

// ✅ Update status (sudah/belum)
router.post("/update/:childId", async (req, res) => {
  const { childId } = req.params;
  const { prayerId, status } = req.body;

  await Child.updateOne(
    { _id: childId, "prayers._id": prayerId },
    { $set: { "prayers.$.status": status } }
  );

  res.json({ success: true });
});

export default router;
