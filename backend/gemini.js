require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

async function askGemini(question, context = "") {
  const prompt = `
คุณคือ AI สำหรับระบบ HRMI

ข้อมูลในระบบ:
${context}

คำถาม:
${question}

ตอบให้สั้น กระชับ และถูกต้อง
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = { askGemini };