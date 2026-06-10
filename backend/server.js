const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const sql = require("mssql");

dotenv.config();

const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

app.use(express.json());

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

const config = require("./config/db");

sql.connect(config)
    .then(() => {
        console.log("SQL Server Connected");
    })
    .catch(err => {
        console.error("SQL Error:", err);
    });

app.get("/", (req, res) => {
    res.send("AI HRMI API Running");
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});