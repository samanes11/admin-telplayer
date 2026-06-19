/**
 * create-admin.mjs
 * 
 * ایجاد اولین کاربر ادمین در MongoDB
 * 
 * Usage:
 *   MONGODB_URI="mongodb://..." node scripts/create-admin.mjs
 * 
 * یا مستقیم ویرایش کنید:
 */

import { MongoClient } from "mongodb";
import crypto from "crypto";
import readline from "readline";

// ── Config ─────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://user:pass@host:port/emusicplayer?authSource=admin";

// ── Bcrypt-like hash using crypto (no extra deps) ──────────────
// اگه bcryptjs نصب باشه از اون استفاده کن، وگرنه خطا میده
async function hashPassword(password) {
  try {
    const { default: bcrypt } = await import("bcryptjs");
    return await bcrypt.hash(password, 10);
  } catch {
    throw new Error("bcryptjs not found. Run: npm install bcryptjs");
  }
}

// ── Prompt helper ──────────────────────────────────────────────
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  console.log("\n🎵 TelPlayer Admin Panel — Create Admin User\n");
  console.log("━".repeat(50));

  if (MONGODB_URI === "YOUR_MONGODB_URI_HERE") {
    console.error("❌  Set MONGODB_URI environment variable first!\n");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("✅  Connected to MongoDB\n");

    // Extract DB name from URI
    const dbName = MONGODB_URI.split("/").pop()?.split("?")[0] || "emusicplayer";
    const db = client.db(dbName);

    // Check existing admins
    const existingAdmin = await db.collection("users").findOne({ role: "admin" });
    if (existingAdmin) {
      console.log(`⚠️  Admin already exists: ${existingAdmin.email}`);
      const cont = await prompt("Create another admin? (y/N): ");
      if (cont.toLowerCase() !== "y") { process.exit(0); }
    }

    // Get credentials
    const email = await prompt("Admin email: ");
    const name  = await prompt("Admin name (optional): ");
    const pass1 = await prompt("Password (min 6 chars): ");
    const pass2 = await prompt("Confirm password: ");

    if (pass1 !== pass2) {
      console.error("\n❌  Passwords don't match!\n");
      process.exit(1);
    }
    if (pass1.length < 6) {
      console.error("\n❌  Password too short (min 6)!\n");
      process.exit(1);
    }

    // Check email duplicate
    const dup = await db.collection("users").findOne({ email: email.toLowerCase() });
    if (dup) {
      // Update existing user to admin
      await db.collection("users").updateOne(
        { email: email.toLowerCase() },
        { $set: { role: "admin", isActive: true, updatedAt: new Date() } }
      );
      console.log(`\n✅  Existing user "${email}" promoted to admin!\n`);
    } else {
      const hashed = await hashPassword(pass1);
      await db.collection("users").insertOne({
        email: email.toLowerCase(),
        password: hashed,
        name: name || "Admin",
        role: "admin",
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`\n✅  Admin user created: ${email}\n`);
    }

    console.log("━".repeat(50));
    console.log("🚀  You can now login at: http://localhost:3001/login");
    console.log("━".repeat(50) + "\n");

  } catch (err) {
    console.error("❌  Error:", err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
