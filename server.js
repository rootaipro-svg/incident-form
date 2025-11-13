const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const SHEET_ID = "1DWQF1XJGSK6hwrdekHG9yQ3I2qtG7JYXTYP3VVYmYG4";

// 🟢 نقرأ credentials من متغير البيئة
const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

const serviceAccountAuth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);

// ✅ استقبال بيانات الفورم
app.post("/incident", async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Sheet1"];
    const id = "RID-" + Date.now().toString(36);
    const data = req.body;

    await sheet.addRow({
      Timestamp: new Date().toLocaleString(),
      Name: data.name || "",
      Email: data.email || "",
      WhatsApp: data.whatsapp || "",
      Country: data.country || "",
      Description: data.description || "",
      ReportHTML: "",
      UniqueID: id
    });

    res.json({ success: true, id });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ✅ جلب التقرير من Google Sheets
app.get("/report", async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Sheet1"];
    const rows = await sheet.getRows();
    const row = rows.find(r => r.UniqueID === id);

    if (row && row.ReportHTML) {
      res.send(row.ReportHTML);
    } else {
      res.status(404).send("<h2>⚠️ Report not found or not ready yet.</h2>");
    }
  } catch (e) {
    console.error("❌ Fetch error:", e);
    res.status(500).send("Server error fetching report.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
