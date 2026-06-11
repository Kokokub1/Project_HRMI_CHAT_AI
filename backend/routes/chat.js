const express = require("express");
const router = express.Router();
const sql = require("mssql");
const fs = require("fs");
const path = require("path");

// =========================
// LOAD KNOWLEDGE BASE
// =========================

let knowledgeBase = [];

try {

    const kbPath =
        path.join(
            __dirname,
            "../data/hrmi_knowledge_base.json"
        );

    knowledgeBase =
        JSON.parse(
            fs.readFileSync(kbPath, "utf8")
        );

    console.log(
        `✅ Knowledge base loaded: ${knowledgeBase.length} documents`
    );

} catch (err) {
    console.error("❌ KB LOAD ERROR:", err.message);
}

// =========================
// NORMALIZE QUESTION
// =========================

function normalizeQuery(query) {

    const q = query.toLowerCase();

    if (
        q.includes("เวอร์ชั่น") ||
        q.includes("version") ||
        q.includes("what new") ||
        q.includes("new version")
    ) return "version";

    if (
        q.includes("ลา") ||
        q.includes("ลาป่วย") ||
        q.includes("ลากิจ") ||
        q.includes("ลาพักร้อน")
    ) return "การลา";

    if (q.includes("ot") || q.includes("โอที"))
        return "ot";

    if (q.includes("เงินเดือน"))
        return "เงินเดือน";

    if (q.includes("ภาษี"))
        return "ภาษี";

    if (q.includes("ประกันสังคม"))
        return "ประกันสังคม";

    return query;
}

// =========================
// SEARCH KNOWLEDGE
// =========================

function searchKnowledge(query, topK = 3) {

    const q = query.toLowerCase();

    const results = knowledgeBase
        .map(doc => {

            const topic = (doc.topic || "").toLowerCase();
            const content = (doc.content || "").toLowerCase();

            let score = 0;
            if (topic.includes(q)) score += 500;
            if (content.includes(q)) score += 100;

            return { ...doc, score };
        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    console.log("QUESTION =", query);
    console.log("FOUND =", results.length);

    return results;
}

// =========================
// FIND LATEST VERSION
// =========================

function findLatestVersion() {

    let latest = null;

    for (const doc of knowledgeBase) {

        const text = (doc.topic || "") + " " + (doc.content || "");
        const match = text.match(
            /Version\s+([\d.]+)\s+\(Build\s+(\d+)\)/i
        );

        if (!match) continue;

        const build = parseInt(match[2]);

        if (!latest || build > latest.build) {
            latest = { version: match[1], build };
        }
    }

    return latest;
}

// =========================
// ASK OLLAMA
// =========================

async function askOllama(question, docs) {

    let context = "";

    if (docs && docs.length > 0) {
        context = docs
            .map(doc => `หัวข้อ: ${doc.topic}\nเนื้อหา: ${doc.content}`)
            .join("\n\n");
    }

    const systemPrompt = `คุณคือผู้ช่วยอัจฉริยะสำหรับโปรแกรม HRMI
ตอบคำถามเกี่ยวกับการใช้งานระบบ HRMI เท่านั้น เช่น การลา, เงินเดือน, OT, ภาษี, ประกันสังคม
ตอบเป็นภาษาไทยเสมอ ตอบกระชับและชัดเจน

${context ? `ข้อมูลอ้างอิงจากคู่มือ HRMI:\n${context}` : "ไม่พบข้อมูลในคู่มือ ให้แจ้งผู้ใช้ว่าไม่มีข้อมูลในระบบ"}`;

    const res = await axios.post("http://localhost:11434/api/chat", {
        model: "llama3",
        stream: false,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question }
        ]
    });

    return res.data.message.content;
}

// =========================
// CREATE SESSION
// =========================

router.post(
    "/session",
    async (req, res) => {

        try {

            const { userId, title } = req.body;

            const pool = await sql.connect();

            const result = await pool.request()
                .input("userId", sql.Int, userId || 0)
                .input("title", sql.NVarChar(500), title || "New Chat")
                .query(`
                    INSERT INTO ChatSessions (UserId, Title)
                    OUTPUT INSERTED.Id
                    VALUES (@userId, @title)
                `);

            const sessionId = result.recordset[0].Id;

            res.json({ sessionId });

        } catch (err) {
            console.error("CREATE SESSION ERROR:", err.message);
            res.status(500).json({ message: err.message });
        }

    }
);

// =========================
// GET ALL SESSIONS (HISTORY)
// =========================

router.get(
    "/history",
    async (req, res) => {

        try {

            const userId = req.query.userId;

            const pool = await sql.connect();
            const request = pool.request();

            let query = `
                SELECT TOP 50 Id, Title, CreatedAt
                FROM ChatSessions
            `;

            if (userId) {
                request.input("userId", sql.Int, parseInt(userId));
                query += ` WHERE UserId = @userId`;
            }

            query += ` ORDER BY CreatedAt DESC`;

            const result = await request.query(query);

            res.json(result.recordset);

        } catch (err) {
            console.error(err.message);
            res.status(500).json({ message: err.message });
        }

    }
);

// =========================
// GET MESSAGES IN SESSION
// =========================

router.get(
    "/session/:id",
    async (req, res) => {

        try {

            const sessionId = parseInt(req.params.id);

            const pool = await sql.connect();

            const result = await pool.request()
                .input("sessionId", sql.Int, sessionId)
                .query(`
                    SELECT Id, Message, Response, CreatedAt
                    FROM ChatHistory
                    WHERE SessionId = @sessionId
                    ORDER BY CreatedAt ASC
                `);

            res.json(result.recordset);

        } catch (err) {
            console.error(err.message);
            res.status(500).json({ message: err.message });
        }

    }
);

// =========================
// DELETE SESSION + MESSAGES
// =========================

router.delete(
    "/session/:id",
    async (req, res) => {

        try {

            const sessionId = parseInt(req.params.id);

            if (!sessionId) {
                return res.status(400).json({ message: "Invalid session ID" });
            }

            const pool = await sql.connect();

            // ลบ messages ก่อน
            await pool.request()
                .input("sessionId", sql.Int, sessionId)
                .query("DELETE FROM ChatHistory WHERE SessionId = @sessionId");

            // แล้วค่อยลบ session
            await pool.request()
                .input("sessionId", sql.Int, sessionId)
                .query("DELETE FROM ChatSessions WHERE Id = @sessionId");

            res.json({ message: "ลบสำเร็จ" });

        } catch (err) {
            console.error("DELETE SESSION ERROR:", err.message);
            res.status(500).json({ message: err.message });
        }

    }
);

// =========================
// CHAT
// =========================

router.post(
    "/",
    async (req, res) => {

        try {

            const { message, userId, sessionId } = req.body;

            if (!message || !message.trim()) {
                return res.status(400).json({ message: "กรุณาพิมพ์คำถาม" });
            }

            // ค้นหาข้อมูลจาก knowledge base ก่อน
            const normalized = normalizeQuery(message);
            const docs = searchKnowledge(normalized, 3);

            // ส่งให้ Ollama ตอบโดยใช้ข้อมูลที่ค้นหาได้
            const answer = await askOllama(message, docs);

            try {

                const pool = await sql.connect();

                await pool.request()
                    .input("userId", sql.Int, userId || 1)
                    .input("message", sql.NVarChar(sql.MAX), message)
                    .input("response", sql.NVarChar(sql.MAX), answer)
                    .input("sessionId", sql.Int, sessionId || null)
                    .query(`
                        INSERT INTO ChatHistory (UserId, Message, Response, SessionId)
                        VALUES (@userId, @message, @response, @sessionId)
                    `);

            } catch (dbErr) {
                console.error("DB SAVE ERROR:", dbErr.message);
            }

            res.json({ answer });

        } catch (err) {
            console.error("CHAT ERROR:", err.message);
            res.status(500).json({ message: err.message });
        }

    }
);

module.exports = router;