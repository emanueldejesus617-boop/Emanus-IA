require('dotenv').config();

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`;
  console.log("Fetching Gemini API Stream URL:", url.split('?')[0]);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello, answer in 5 words." }] }]
      })
    });
    console.log("Fetch response status:", res.status);
    if (res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        console.log("Chunk:", decoder.decode(value));
      }
    }
  } catch (err) {
    console.error("Fetch failed:", err);
    if (err.cause) {
      console.error("Fetch cause:", err.cause);
    }
  }
}

test();
