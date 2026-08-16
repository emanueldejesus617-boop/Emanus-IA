import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function runStreamTest() {
  try {
    const model = ai.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    });

    console.log("Starting stream...");
    const responseStream = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: "oi" }] }]
    });

    for await (const chunk of responseStream.stream) {
      console.log("Chunk:", chunk.text());
    }
    console.log("Stream finished!");
  } catch (e) {
    console.error("Stream error:", e);
  }
}

runStreamTest();
