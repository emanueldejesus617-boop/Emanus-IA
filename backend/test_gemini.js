require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  console.log("Calling generateContentStream...");
  try {
    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: "Olá" }] }]
    });
    
    console.log("Stream received. Iterating...");
    for await (const chunk of result.stream) {
      console.log("Chunk:", chunk.text());
    }
    console.log("Done!");
  } catch (err) {
    console.error("Error calling Gemini:", err);
  }
}

main();
