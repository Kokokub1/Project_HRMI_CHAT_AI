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
            fs.readFileSync(
                kbPath,
                "utf8"
            )
        );

    console.log(
        `✅ Knowledge base loaded: ${knowledgeBase.length} documents`
    );

} catch (err) {

    console.error(
        "❌ KB LOAD ERROR:",
        err.message
    );

}

// =========================
// NORMALIZE QUESTION
// =========================

function normalizeQuery(query) {

    const q =
        query.toLowerCase();

    if (
        q.includes("เวอร์ชั่น") ||
        q.includes("version") ||
        q.includes("what new") ||
        q.includes("new version")
    ) {
        return "version";
    }

    if (
        q.includes("ลา") ||
        q.includes("ลาป่วย") ||
        q.includes("ลากิจ") ||
        q.includes("ลาพักร้อน")
    ) {
        return "การลา";
    }

    if (
        q.includes("ot") ||
        q.includes("โอที")
    ) {
        return "ot";
    }

    if (
        q.includes("เงินเดือน")
    ) {
        return "เงินเดือน";
    }

    if (
        q.includes("ภาษี")
    ) {
        return "ภาษี";
    }

    if (
        q.includes("ประกันสังคม")
    ) {
        return "ประกันสังคม";
    }

    return query;
}

// =========================
// SEARCH KNOWLEDGE
// =========================

function searchKnowledge(query, topK = 3) {

    const q =
        query.toLowerCase();

    const results =
        knowledgeBase
            .map(doc => {

                const topic =
                    (doc.topic || "")
                        .toLowerCase();

                const content =
                    (doc.content || "")
                        .toLowerCase();

                let score = 0;

                if (topic.includes(q))
                    score += 500;

                if (content.includes(q))
                    score += 100;

                return {
                    ...doc,
                    score
                };

            })
            .filter(x => x.score > 0)
            .sort(
                (a, b) =>
                    b.score - a.score
            )
            .slice(0, topK);

    console.log(
        "QUESTION =",
        query
    );

    console.log(
        "FOUND =",
        results.length
    );

    return results;
}

// =========================
// FIND LATEST VERSION
// =========================

function findLatestVersion() {

    let latest = null;

    for (const doc of knowledgeBase) {

        const text =
            (doc.topic || "") +
            " " +
            (doc.content || "");

        const match =
            text.match(
                /Version\s+([\d.]+)\s+\(Build\s+(\d+)\)/i
            );

        if (!match)
            continue;

        const build =
            parseInt(match[2]);

        if (
            !latest ||
            build > latest.build
        ) {

            latest = {
                version: match[1],
                build
            };

        }

    }

    return latest;
}

// =========================
// BUILD ANSWER
// =========================

function buildAnswer(
    question,
    docs
) {

    const q =
        question.toLowerCase();

    // =====================
    // VERSION
    // =====================

    if (
        q.includes("version") ||
        q.includes("เวอร์ชั่น")
    ) {

        const latest =
            findLatestVersion();

        if (latest) {

            return `
📘 เวอร์ชั่นล่าสุดของ HRMI

Version ${latest.version}
(Build ${latest.build})
`;

        }

    }

    // =====================
    // LEAVE
    // =====================

    if (
        q.includes("ลา")
    ) {

        return `
📘 สรุปขั้นตอนการลาในระบบ HRMI

1. เข้าเมนู การลา

2. เลือก เพิ่มรายการลา

3. เลือกประเภทการลา
• ลาป่วย
• ลากิจ
• ลาพักร้อน

4. ระบุวันที่ลา

5. ระบุเหตุผล

6. กดบันทึก

7. รอผู้อนุมัติ

หากต้องการรายละเอียดเพิ่มเติม สามารถถาม:

• ประเภทการลา
• สิทธิการลา
• การอนุมัติการลา
`;

    }

    // =====================
    // OT
    // =====================

    if (
        q.includes("ot") ||
        q.includes("โอที")
    ) {

        return `
📘 สรุปขั้นตอนการขอ OT

1. เข้าเมนู OT

2. เลือก เพิ่มรายการ OT

3. ระบุวันและเวลา

4. ระบุเหตุผล

5. กดบันทึก

6. รอผู้อนุมัติ
`;

    }

    // =====================
    // NOT FOUND
    // =====================

    if (
        !docs ||
        docs.length === 0
    ) {

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

    // =====================
    // DEFAULT
    // =====================

    const best =
        docs[0];

    let content =
        best.content || "";

    content =
        content
            .replace(/\s+/g, " ")
            .trim();

    if (
        content.length > 500
    ) {

        content =
            content.substring(
                0,
                500
            ) + "...";

    }

    return `
📘 ${best.topic}

${content}
`;

}

// =========================
// HISTORY
// =========================

router.get(
    "/history",
    async (req, res) => {

        try {

            const pool =
                await sql.connect();

            const result =
                await pool.request()
                    .query(`
                        SELECT TOP 50
                            Message,
                            Response,
                            CreatedAt
                        FROM ChatHistory
                        ORDER BY CreatedAt DESC
                    `);

            res.json(
                result.recordset.reverse()
            );

        } catch (err) {

            console.error(
                err.message
            );

            res.status(500)
                .json({
                    message:
                        err.message
                });

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

            const {
                message,
                userId
            } = req.body;

            if (
                !message ||
                !message.trim()
            ) {

                return res.status(400)
                    .json({
                        message:
                            "กรุณาพิมพ์คำถาม"
                    });

            }

            const normalized =
                normalizeQuery(
                    message
                );

            const docs =
                searchKnowledge(
                    normalized,
                    3
                );

            const answer =
                buildAnswer(
                    message,
                    docs
                );

            try {

                const pool =
                    await sql.connect();

                await pool.request()

                    .input(
                        "userId",
                        sql.Int,
                        userId || 1
                    )

                    .input(
                        "message",
                        sql.NVarChar(sql.MAX),
                        message
                    )

                    .input(
                        "response",
                        sql.NVarChar(sql.MAX),
                        answer
                    )

                    .query(`
                        INSERT INTO ChatHistory
                        (
                            UserId,
                            Message,
                            Response
                        )
                        VALUES
                        (
                            @userId,
                            @message,
                            @response
                        )
                    `);

            } catch (dbErr) {

                console.error(
                    "DB SAVE ERROR:",
                    dbErr.message
                );

            }

            res.json({
                answer
            });

        } catch (err) {

            console.error(
                "CHAT ERROR:",
                err.message
            );

            res.status(500)
                .json({
                    message:
                        err.message
                });

        }

    }
);

module.exports = router;