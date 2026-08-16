require('dotenv').config();

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  console.log("Fetching Gemini API URL (without key in console log):", url.split('?')[0]);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello" }] }]
      })
    });
    console.log("Fetch response status:", res.status);
    const data = await res.json();
    console.log("Fetch response data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
    if (err.cause) {
      console.error("Fetch cause:", err.cause);
    }
  }
}

test();
