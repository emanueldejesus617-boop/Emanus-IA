import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function runTest() {
  try {
    const subject = "Sistemas de Informação";
    const classe = "12.ª Classe";
    const curso = "Informática";
    
    const prompt = `Gere um simulado contendo exatamente 5 questões de escolha múltipla sobre a disciplina de "${subject}" para um estudante angolano da "${classe}" (curso: ${curso}).
As questões devem seguir rigorosamente o padrão e o currículo oficial dos exames nacionais do MINED (Ministério da Educação de Angola).
Retorne OBRIGATORIAMENTE um array JSON contendo objetos com as chaves:
- "id": número de 1 a 5
- "question": string contendo o enunciado da questão
- "options": um array contendo exatamente 4 alternativas de resposta (strings)
- "correctIndex": número de 0 a 3 indicando a opção correta
- "explanation": uma explicação didática da Emanus IA explicando o raciocínio correto.

Retorne APENAS o JSON válido, sem qualquer tipo de formatação markdown, blocos de código ou caracteres adicionais.`;

    const model = ai.getGenerativeModel({
      model: "gemini-3.5-flash",
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
