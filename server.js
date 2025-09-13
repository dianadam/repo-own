// ====== Imports ======
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import session from "express-session";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";
import expressLayouts from "express-ejs-layouts";
import Child from "./models/Child.js";
import prayerRoutes from "./routes/prayer.js";
import reportRoutes from "./routes/report.js";
import moment from "moment";
import momenttime from "moment-timezone";
import "moment/locale/id.js";
import dotenv from "dotenv";
import cors from "cors";
import pkg from "adhan";


// Ambil modul dari adhan (karena versi 11.3.0 CommonJS)
const { Coordinates, PrayerTimes, CalculationMethod, Madhab } = pkg;

// ====== Config ======
dotenv.config();
moment.locale("id");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;


// ====== Middleware ======
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.static(path.join(__dirname, "public")));
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layout");

// Inject user ke semua views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ====== Database ======
mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000000,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });

// ====== Schemas ======
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

const scheduleSchema = new mongoose.Schema({
  title: String,
  childName: String,
  Startdate: Date,
  Enddate: Date,
  status: { type: String, default: "Belum mulai" },
});

//const Schedule = mongoose.model("Schedule", scheduleSchema);
const Schedule = mongoose.models.Schedule || mongoose.model("Schedule", scheduleSchema);

// ====== Auth Middleware ======
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}
function getWeekNumber(date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = Math.floor((date - firstDay) / 86400000);
  return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
}
//const selectedWeek = parseInt(weekParam);
// ====== Routes ======

// Jadwal sholat versi sederhana
app.get("/api/prayer-times", (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || -6.2;
    const lng = parseFloat(req.query.lng) || 106.8;
    const date = new Date();

    const coordinates = new Coordinates(lat, lng);
    const params = CalculationMethod.MuslimWorldLeague();
    params.madhab = Madhab.Shafi;

    const prayerTimes = new PrayerTimes(coordinates, date, params);

    const formatTime = (time) =>
      time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    res.json({
      date: date.toISOString().split("T")[0],
      location: { lat, lng },
      times: {
        fajr: formatTime(prayerTimes.fajr),
        dhuhr: formatTime(prayerTimes.dhuhr),
        asr: formatTime(prayerTimes.asr),
        maghrib: formatTime(prayerTimes.maghrib),
        isha: formatTime(prayerTimes.isha),
      },
    });
  } catch (err) {
    console.error("Error menghitung jadwal sholat:", err);
    res.status(500).json({ error: "Gagal menghitung jadwal sholat" });
  }
});

// Import routes
app.use("/prayer", prayerRoutes);
app.use("/report", reportRoutes);

// Dashboard redirect
app.get("/prayers", (req, res) => res.redirect("/prayer"));

// ====== Auth ======
app.get("/login", (req, res) => res.render("login", { error: null }));

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (user && (await user.comparePassword(password))) {
    req.session.user = { id: user._id, username: user.username };
    return res.redirect("/");
  }
  res.render("login", { error: "Username atau password salah" });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// ====== Dashboard ======
/* app.get("/", async (req, res) => {
	
  const schedules = await Schedule.find().sort({ deadline: 1 });
  const children = await Child.find();

  // === bagian progress sholat tahunan ===
  const thisYear = moment().year();
  const startYear = moment().startOf("year");
  const endYear = moment().endOf("year");

  const progressYear = children.map((child) => {
    const prayersThisYear = child.prayers.filter((p) =>
      moment(p.date).isBetween(startYear, endYear, "day", "[]")
    );
    const total = prayersThisYear.length;
    const done = prayersThisYear.filter((p) => p.status).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    return { childName: child.name, total, done, percent };
  });

  // === jadwal sholat pakai adhan ===
  const lat = -6.2, lng = 106.8;
  const date = new Date();
  const coordinates = new Coordinates(lat, lng);
  const params = CalculationMethod.MuslimWorldLeague();
  params.madhab = Madhab.Shafi;
  const prayerTimes = new PrayerTimes(coordinates, date, params);

  const formatTime = (time) =>
    time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const result = {
    date: date.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    fajr: formatTime(prayerTimes.fajr),
    sunrise: formatTime(prayerTimes.sunrise),
    dhuhr: formatTime(prayerTimes.dhuhr),
    asr: formatTime(prayerTimes.asr),
    maghrib: formatTime(prayerTimes.maghrib),
    isha: formatTime(prayerTimes.isha),
  };

  res.render("index", { schedules, children, progressYear, result });
}); */
app.get("/", async (req, res) => {
  try {
    const children = await Child.find();

    const JAKARTA_TZ = "Asia/Jakarta";
    const thisYear = moment().tz(JAKARTA_TZ).year();
    const startYear = moment().tz(JAKARTA_TZ).startOf("year");
    const endYear = moment().tz(JAKARTA_TZ).endOf("year");

    // Hitung progress tahunan anak
    const progressYear = children.map((child) => {
      const prayersThisYear = child.prayers.filter((p) =>
        moment(p.date).tz(JAKARTA_TZ).isBetween(startYear, endYear, "day", "[]")
      );
      const total = prayersThisYear.length;
      const done = prayersThisYear.filter((p) => p.status).length;
      const percent = total ? Math.round((done / total) * 100) : 0;
      return { childName: child.name, total, done, percent };
    });

    // Hitung jadwal sholat (Adhan.js)
    const date = new Date();
    const coordinates = new pkg.Coordinates(-6.2, 106.816666); // Jakarta
    const params = pkg.CalculationMethod.MuslimWorldLeague();
    params.madhab = pkg.Madhab.Shafi;
    const prayerTimes = new pkg.PrayerTimes(coordinates, date, params);

    function formatTime(date) {
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: JAKARTA_TZ,
      });
    }

    const result = {
      date: date.toLocaleDateString("id-ID", { timeZone: JAKARTA_TZ }),
      timezone: JAKARTA_TZ,
      fajr: formatTime(prayerTimes.fajr),
      sunrise: formatTime(prayerTimes.sunrise),
      dhuhr: formatTime(prayerTimes.dhuhr),
      asr: formatTime(prayerTimes.asr),
      maghrib: formatTime(prayerTimes.maghrib),
      isha: formatTime(prayerTimes.isha),
    };

    // 🔹 Ambil minggu dari query (default minggu ini)
    const weekParam = parseInt(req.query.week) || moment().tz(JAKARTA_TZ).week();
    const weekStart = moment().tz(JAKARTA_TZ).week(weekParam).startOf("week");
    const weekEnd = moment().tz(JAKARTA_TZ).week(weekParam).endOf("week");

    // 🔹 Filter schedule hanya untuk minggu ini
    const schedules = await Schedule.find({
      Startdate: { $gte: weekStart.toDate(), $lte: weekEnd.toDate() },
    });

    // 🔹 Semua minggu di tahun ini (buat dropdown)
    const totalWeeks = moment().tz(JAKARTA_TZ).weeksInYear();
    const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

    res.render("index", {
      result,
      schedules,
      progressYear,
      children,
      weekParam,
      weeks,
      weekStart: weekStart.format("DD MMM"),
      weekEnd: weekEnd.format("DD MMM"),
      user: req.session.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Terjadi kesalahan di server");
  }
});

// ====== Anak ======
app.get("/children", requireAuth, async (req, res) => {
  const children = await Child.find();
  res.render("children", { children });
});

app.post("/children", requireAuth, async (req, res) => {
  await new Child({ name: req.body.name }).save();
  res.redirect("/children");
});

// ====== Jadwal ======
app.get("/new", requireAuth, async (req, res) => {
  const children = await Child.find();
  res.render("add", { children });
});

app.post("/new", requireAuth, async (req, res) => {
  const { title, childName, Startdate, Enddate } = req.body;
  await new Schedule({ title, childName, Startdate, Enddate }).save();
  res.redirect("/");
});

app.get("/edit/:id", requireAuth, async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);
  const children = await Child.find();
  res.render("edit", { schedule, children });
});

app.post("/edit/:id", requireAuth, async (req, res) => {
  const { title, childName, Startdate, Enddate, status } = req.body;
  await Schedule.findByIdAndUpdate(req.params.id, {
    title,
    childName,
    Startdate,
    Enddate,
    status,
  });
  res.redirect("/");
});

app.post("/delete/:id", requireAuth, async (req, res) => {
  await Schedule.findByIdAndDelete(req.params.id);
  res.redirect("/");
});

app.post("/update-status/:id", async (req, res) => {
  try {
    await Schedule.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ success: true });
  } catch (err) {
    console.error("Gagal update status:", err);
    res.status(500).json({ success: false });
  }
});

// ====== User Management ======
app.get("/users", requireAuth, async (req, res) => {
  const users = await User.find();
  res.render("users", { users });
});

app.get("/users/new", requireAuth, (req, res) => res.render("users_add"));

app.post("/users/new", requireAuth, async (req, res) => {
  const hashed = await bcrypt.hash(req.body.password, 10);
  await new User({ username: req.body.username, password: hashed }).save();
  res.redirect("/users");
});

app.get("/users/edit/:id", requireAuth, async (req, res) => {
  const user = await User.findById(req.params.id);
  res.render("users_edit", { user });
});

app.post("/users/edit/:id", requireAuth, async (req, res) => {
  const { username, password } = req.body;
  const updateData = { username };
  if (password) updateData.password = await bcrypt.hash(password, 10);
  await User.findByIdAndUpdate(req.params.id, updateData);
  res.redirect("/users");
});

app.post("/users/delete/:id", requireAuth, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect("/users");
});

// ====== Default Admin ======
async function createDefaultAdmin() {
  const existing = await User.findOne({ username: "CpanelAdmin" });
  if (!existing) {
    const hashed = await bcrypt.hash("admin123", 10);
    await new User({ username: "CpanelAdmin", password: hashed }).save();
    console.log("✅ Default Admin dibuat -> username: CpanelAdmin | password: admin123");
  }
}
createDefaultAdmin();

// ====== Start Server ======
app.listen(PORT, () => {
  console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});
