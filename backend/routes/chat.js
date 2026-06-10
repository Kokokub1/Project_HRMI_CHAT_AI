const express = require("express");
const router = express.Router();
const sql = require("mssql");
const fs = require("fs");
const path = require("path");

// =========================
// โหลด Knowledge Base
// =========================
let knowledgeBase = [];
try {
    const kbPath = path.join(__dirname, "../data/hrmi_knowledge_base.json");
    knowledgeBase = JSON.parse(fs.readFileSync(kbPath, "utf-8"));
    console.log(`✅ Knowledge base loaded: ${knowledgeBase.length} documents`);
} catch (err) {
    console.error("❌ Could not load knowledge base:", err.message);
}

// =========================
// Keyword Map
// =========================
const KEYWORD_MAP = [
    {
        keys: ["เวอร์ชั่น", "version", "อัปเดต", "รุ่นใหม่", "รุ่นล่าสุด", "what new", "whatnew"],
        search: "what new version",
        type: "version"
    },
    {
        keys: ["วิธีใช้", "การใช้งาน", "how to", "คู่มือ"],
        search: "manual how to",
        type: "manual"
    },
    {
        keys: ["ลืมรหัส", "รหัสผ่าน", "password", "reset"],
        search: "password reset",
        type: "general"
    },
    {
        keys: ["เข้าระบบไม่ได้", "login", "เข้าสู่ระบบ"],
        search: "login",
        type: "general"
    },
    {
        keys: ["ชำระเงิน", "payment", "จ่ายเงิน"],
        search: "payment",
        type: "general"
    },
    {
        keys: ["ใบเสร็จ", "receipt"],
        search: "receipt",
        type: "general"
    },
    {
        keys: ["gateway", "เกตเวย์"],
        search: "gateway",
        type: "general"
    },
];

function resolveSearchTerms(query) {
    const lower = query.toLowerCase();
    for (const mapping of KEYWORD_MAP) {
        if (mapping.keys.some(k => lower.includes(k))) {
            console.log(`🗺️ Mapped "${query}" → "${mapping.search}" [type: ${mapping.type}]`);
            return { terms: mapping.search.split(" "), queryType: mapping.type };
        }
    }
    const cleaned = query.replace(/\s+/g, "");
    const nGrams = [];
    for (let size = 2; size <= 5; size++) {
        for (let i = 0; i <= cleaned.length - size; i++) {
            nGrams.push(cleaned.slice(i, i + size));
        }
    }
    const engWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    return { terms: [...new Set([...nGrams, ...engWords])], queryType: "general" };
}

// =========================
// ✅ ดึง version จาก content โดยตรง
// =========================
function extractVersionFromContent(content) {
    // ลอง pattern หลายแบบ
    const patterns = [
        /Version\s+([\d]+\.[\d]+(?:\.[\d]+)*)\s*\(Build\s+(\d+)\)/i,
        /V\.([\d]+\.[\d]+(?:\.[\d]+)*)\s*\(Build\s+(\d+)\)/i,
        /([\d]+\.[\d]+)\s*\(Build\s+(\d+)\)/i,
    ];

    for (const pattern of patterns) {
        // หาทุก match แล้วเลือก build date ใหญ่สุด
        const matches = [...content.matchAll(new RegExp(pattern.source, "gi"))];
        if (matches.length > 0) {
            // เรียง match ตาม build date ใหญ่สุดก่อน
            matches.sort((a, b) => parseInt(b[2]) - parseInt(a[2]));
            const best = matches[0];
            return {
                versionLabel: `Version ${best[1]} (Build ${best[2]})`,
                buildDate: parseInt(best[2])
            };
        }
    }
    return null;
}

// =========================
// ค้นหาข้อมูลจาก Knowledge Base
// =========================
function searchKnowledge(query, topK = 3) {

    const q = query.toLowerCase().trim();

    const scored = knowledgeBase.map(doc => {

        let score = 0;

        const topic = (doc.topic || "").toLowerCase();
        const content = (doc.content || "").toLowerCase();
        const source = (doc.source || "").toLowerCase();

        // ตรงหัวข้อเป๊ะ
        if (topic === q) {
            score += 1000;
        }

        // คำถามอยู่ในหัวข้อ
        if (topic.includes(q)) {
            score += 500;
        }

        // คำถามอยู่ใน source
        if (source.includes(q)) {
            score += 300;
        }

        // คำถามอยู่ใน content
        if (content.includes(q)) {
            score += 100;
        }

        const words = q.split(/\s+/);

        words.forEach(word => {

            if (!word || word.length < 2) return;

            if (topic.includes(word))
                score += 100;

            if (source.includes(word))
                score += 50;

            if (content.includes(word))
                score += 10;
        });

        return {
            ...doc,
            score
        };

    });

    const results = scored
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    console.log("========== SEARCH ==========");
    console.log("QUESTION =", query);

    results.forEach((r, i) => {
        console.log(
            `${i + 1}. ${r.topic} | score=${r.score}`
        );
    });

    return results;
}
// =========================
// สร้างคำตอบ
// =========================
function buildAnswer(query, docs) {

    if (!docs || docs.length === 0) {
        return `
ไม่พบข้อมูลที่เกี่ยวข้องในคู่มือ HRMI

ลองค้นหาด้วยคำว่า:
• การลา
• เงินเดือน
• OT
• ภาษี
• ประกันสังคม
`;
    }

    const best = docs[0];

    let content = best.content || "";

    // ตัดข้อความยาวเกิน
    content = content
        .replace(/\s+/g, " ")
        .trim();

    // เอาแค่ 500 ตัวอักษรแรก
    content = content.substring(0, 500);

    return `
📘 ${best.topic}

${content}

...
พิมพ์ "รายละเอียดเพิ่มเติม" หากต้องการดูข้อมูลทั้งหมด
`;
}

function normalizeQuery(query) {

    const mappings = {

        "วิธีการลา": "กำหนดประเภทการลา",
        "ข้อมูลการลา": "กำหนดประเภทการลา",
        "ลาป่วย": "กำหนดประเภทการลา",
        "ลากิจ": "กำหนดประเภทการลา",
        "ลาพักร้อน": "กำหนดประเภทการลา",

        "ot": "โอที",
        "ทำโอที": "โอที",

        "เงินเดือน": "เงินเดือน",
        "สลิปเงินเดือน": "เงินเดือน",

        "ประกันสังคม": "ประกันสังคม",

        "ภาษี": "ภาษี",

        "พนักงาน": "พนักงาน"
    };

    const lower = query.toLowerCase();

    for (const [key, value] of Object.entries(mappings)) {

        if (lower.includes(key)) {
            return value;
        }
    }

    return query;
}

// =========================
// GET /api/chat/history
// =========================
router.get("/history", async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .query(`
                SELECT TOP 50 Message, Response, CreatedAt
                FROM ChatHistory
                ORDER BY CreatedAt DESC
            `);
        res.json(result.recordset.reverse());
    } catch (err) {
        console.error("HISTORY ERROR:", err.message);
        res.status(500).json({ message: err.message });
    }
});

// =========================
// POST /api/chat
// =========================
router.post("/", async (req, res) => {
    try {

        const { message, userId } = req.body;

        const intent = detectIntent(message);

        console.log("MESSAGE =", message);
        console.log("INTENT =", intent);

        if (!message || !message.trim()) {
            return res.status(400).json({
                message: "กรุณาพิมพ์คำถาม"
            });
        }

        const normalizedQuestion =
            normalizeQuery(message);

        const relevantDocs =
            searchKnowledge(normalizedQuestion, 3);

        const answer =
            buildAnswer(message, relevantDocs);

        try {

            const pool = await sql.connect();

            await pool.request()
                .input("userId", sql.Int, userId || 1)
                .input("message", sql.NVarChar(sql.MAX), message)
                .input("response", sql.NVarChar(sql.MAX), answer)
                .query(`
                    INSERT INTO ChatHistory
                    (UserId, Message, Response)
                    VALUES
                    (@userId, @message, @response)
                `);

        } catch (dbErr) {

            console.error(
                "DB SAVE ERROR:",
                dbErr.message
            );

        }

        res.json({ answer });

    } catch (err) {

        console.error(
            "CHAT ERROR:",
            err.message
        );

        res.status(500).json({
            message: err.message
        });

    }
});

    const intents = require("../data/intents");

function detectIntent(question) {

    const q = question.toLowerCase();

    for (const [intent, data] of Object.entries(intents)) {

        for (const keyword of data.keywords) {

            if (q.includes(keyword.toLowerCase())) {
                return intent;
            }
        }
    }

    return null;
}
module.exports = router;