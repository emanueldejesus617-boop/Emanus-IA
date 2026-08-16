import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const modelsToTest = [
  "gemini-2.5-flash",
  "gemini-flash-latest"
];

async function runTest() {
  for (const modelName of modelsToTest) {
    console.log(`\n--- Testing streaming for: ${modelName} ---`);
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const responseStream = await model.generateContentStream({
        contents: [{ role: "user", parts: [{ text: "Responda apenas com a palavra 'OK' se estiver funcionando." }] }]
      });
      
      let fullText = "";
      for await (const chunk of responseStream.stream) {
        fullText += chunk.text();
      }
      console.log(`Success! Stream Response: ${fullText.trim()}`);
    } catch (e) {
      console.error(`Error for ${modelName}:`, e.message || e);
    }
  }
}

runTest();
