import express from "express";
import Child from "../models/Child.js";

const router = express.Router();

// Daftar anak
router.get("/", async (req, res) => {
  const children = await Child.find().sort({ name: 1 });
  res.json(children);
});

// Tambah anak
router.post("/", async (req, res) => {
  try {
    const child = new Child(req.body);
    await child.save();
    res.status(201).json(child);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Hapus anak
router.delete("/:id", async (req, res) => {
  await Child.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

await Child.updateOne(
  { _id: req.params.childId, "prayers._id": prayerId },
  { $set: { "prayers.$.status": status } }
);

export default router;
