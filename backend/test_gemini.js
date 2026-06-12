import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function runTest() {
  try {
    const prompt = `Gere uma mini-aula e um exercício de fixação sobre o tópico "Sintaxe da Oração" da disciplina de "Língua Portuguesa" direcionada a um aluno da "12.ª Classe" em Angola.
Retorne OBRIGATORIAMENTE um objeto JSON contendo exatamente as seguintes chaves:
- "content": String contendo o texto explicativo da aula em formato Markdown limpo.
- "question": Um objeto contendo o exercício com as chaves:
  - "question": String contendo o enunciado da questão.
  - "options": Um array contendo exatamente 4 alternativas de resposta (strings).
  - "correctIndex": Número de 0 a 3 correspondente à opção correta.
  - "explanation": Explicação didática do Tutor IA sobre a resposta certa.
Retorne APENAS o JSON válido.`;

    const model = ai.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    console.log("Generating...");
    const response = await model.generateContent(prompt);
    console.log("Response text:", response.response.text());
  } catch (e) {
    console.error("Error generating content:", e);
  }
}

runTest();
