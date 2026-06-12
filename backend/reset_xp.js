const { createClient } = require('@libsql/client');
const client = createClient({ url: 'file:sqlite.db' });
async function run() {
  try {
    await client.execute("UPDATE users SET xp = 0, streak = 0");
    console.log("XP and streak reset to 0 for all users in SQLite.");
  } catch (err) {
    console.error("Error updating SQLite DB:", err);
  }
}
run();
