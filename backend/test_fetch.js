const dns = require('dns');

async function test() {
  console.log("DNS servers:", dns.getServers());
  console.log("Resolving generativelanguage.googleapis.com...");
  try {
    const addresses = await dns.promises.lookup('generativelanguage.googleapis.com', { all: true });
    console.log("Resolved:", addresses);
  } catch (err) {
    console.error("DNS lookup error:", err);
  }

  console.log("\nTrying fetch with URL...");
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/');
    console.log("Fetch success! Status:", res.status);
  } catch (err) {
    console.error("Fetch failed error details:", err);
    if (err.cause) {
      console.error("Fetch cause:", err.cause);
    }
  }

  console.log("\nTrying fetch with IPv4 address and Host header...");
  try {
    // Note: HTTPS will fail SSL certificate validation if we use IP unless we disable cert verification or use agent, but let's test connect
    const res = await fetch('https://216.239.36.223/', {
      headers: { 'Host': 'generativelanguage.googleapis.com' }
    });
    console.log("Fetch IP success! Status:", res.status);
  } catch (err) {
    console.error("Fetch IP failed:", err);
    if (err.cause) {
      console.error("Fetch IP cause:", err.cause);
    }
  }
}

test();
