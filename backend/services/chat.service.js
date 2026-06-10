const openai = require("./openai.service");
const { searchKnowledge } = require("./manual.service");

async function askHRMI(question){

    const docs = await searchKnowledge(question);

    let context = "";

    if(docs.length > 0){

        context = docs
            .map(x => x.Content)
            .join("\n\n");

    }

    const prompt = `
คุณคือ HRMI Assistant

ข้อมูลจากคู่มือ:

${context}

คำถาม:
${question}

กฎ:
1. ใช้ข้อมูลจากคู่มือก่อน
2. ถ้าไม่มีข้อมูล ให้ตอบจากความรู้ทั่วไป
3. ตอบเป็นภาษาไทย
`;

    const response =
    await openai.responses.create({
        model: "gpt-5",
        input: prompt
    });

    return {
        answer: response.output_text,
        source: docs.length > 0
            ? "HRMI Manual"
            : "OpenAI"
    };
}

module.exports = {
    askHRMI
};