const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sql = require("mssql");

const router = express.Router();

router.post("/login", async (req, res) => {
    try {

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "กรุณากรอก Username และ Password"
            });
        }

        const pool = await sql.connect();

        const result = await pool.request()
            .input("username", sql.NVarChar, username)
            .query(`
                SELECT *
                FROM Users
                WHERE Username = @username
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({
                message: "ไม่พบผู้ใช้งาน"
            });
        }

        const user = result.recordset[0];

        console.log("USER =", user);

        // หา column password อัตโนมัติ
        const passwordHash =
            user.Password ||
            user.PasswordHash ||
            user.UserPassword ||
            user.Pwd;

        if (!passwordHash) {
            return res.status(500).json({
                message: "ไม่พบคอลัมน์ Password ในฐานข้อมูล",
                columns: Object.keys(user)
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            passwordHash
        );

        if (!validPassword) {
            return res.status(401).json({
                message: "รหัสผ่านไม่ถูกต้อง"
            });
        }

        const token = jwt.sign(
            {
                id: user.UserID || user.Id || user.ID,
                username: user.Username
            },
            process.env.JWT_SECRET || "secret123",
            {
                expiresIn: "1d"
            }
        );

        res.json({
            token,
            user: {
                id: user.UserID || user.Id || user.ID,
                username: user.Username,
                email: user.Email,
                fullName: user.FullName
            }
        });

    } catch (err) {

        console.error("LOGIN ERROR:", err);

        res.status(500).json({
            message: err.message
        });

    }
});

module.exports = router;