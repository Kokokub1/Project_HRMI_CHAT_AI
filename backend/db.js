const sql = require("mssql");

const config = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  database: "ChatBot",

  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function queryDB(query, params = []) {
  try {
    console.log("🔌 Connecting DB...");

    const pool = await sql.connect(config);

    const request = pool.request();

    params.forEach((p, i) => {
      request.input(`p${i}`, p);
    });

    const result = await request.query(query);

    return result.recordset;

  } catch (err) {
    console.error("🔥 DB ERROR:", err);
    throw err; // 🔥 สำคัญ: อย่ากลืน error
  }
}

module.exports = { queryDB }; // ✅ FIX สำคัญ: ต้อง export ฟังก์ชันนี้เพื่อให้ไฟล์อื่นใช้งานได้