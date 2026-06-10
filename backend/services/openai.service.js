const OpenAI = require("openai");

console.log(
    process.env.OPENAI_API_KEY?.substring(0,20)
);

module.exports = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});