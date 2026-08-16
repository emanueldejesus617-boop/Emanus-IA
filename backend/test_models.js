import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const modelsToTest = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-flash-latest"
];

async function runTest() {
  for (const modelName of modelsToTest) {
    console.log(`\n--- Testing model: ${modelName} ---`);
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Responda apenas com a palavra 'OK' se estiver funcionando." }] }]
      });
      console.log(`Success! Response: ${result.response.text().trim()}`);
    } catch (e) {
      console.error(`Error for ${modelName}:`, e.message || e);
    }
  }
}

runTest();
