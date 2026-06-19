// اسکریپت موقت برای تست اتصال دیتابیس و بررسی یوزر ادمین
// اجرا: npx ts-node test-db.ts   (یا با node بعد از کامپایل)
// بعد از تست، این فایل رو حذف کنید.

import { config } from "dotenv";
import path from "path";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

// Next.js معمولاً .env.local رو می‌خونه، نه .env — هر دو رو لود می‌کنیم
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  // چک چند اسم رایج برای متغیر دیتابیس
  const candidates = ["MONGODB_URI", "MONGO_URI", "DATABASE_URL", "MONGODB_URL"];
  console.log("🔎 متغیرهای env مرتبط با دیتابیس که پیدا شد:");
  for (const key of candidates) {
    if (process.env[key]) {
      console.log(`   ${key} = موجوده ✅`);
    } else {
      console.log(`   ${key} = پیدا نشد ❌`);
    }
  }

  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL ||
    process.env.MONGODB_URL;

  if (!uri) {
    console.error("\n❌ هیچ متغیر اتصال دیتابیسی پیدا نشد! فایل .env.local رو چک کنید.");
    return;
  }

  console.log("🔗 در حال اتصال به:", uri.replace(/:[^:@]+@/, ":****@")); // پسورد رو مخفی می‌کنه

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ اتصال موفق");

    const db = client.db(); // دیتابیسی که توی URI مشخص شده
    console.log("📦 نام دیتابیس:", db.databaseName);

    const users = await db.collection("users").find({}).limit(20).toArray();
    console.log(`👥 تعداد یوزرها (نمونه ${users.length} تا):`);

    users.forEach((u) => {
      console.log({
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        hasPassword: !!u.password,
      });
    });

    // جستجوی مشخص ایمیل ادمین
    const targetEmail = "s@gmail.com";
    const target = await db.collection("users").findOne({ email: targetEmail.toLowerCase() });

    if (!target) {
      console.log("\n❌ یوزر هدف پیدا نشد!");
      return;
    }

    console.log("\n🎯 یوزر هدف پیدا شد:");
    console.log("   email:", target.email);
    console.log("   role:", target.role);
    console.log("   isActive:", target.isActive);
    console.log("   password hash:", target.password);
    console.log(
      "   فرمت هش معتبره؟ ",
      typeof target.password === "string" && /^\$2[aby]\$\d{2}\$/.test(target.password)
        ? "✅ بله (bcrypt hash استاندارد)"
        : "❌ نه — این یعنی پسورد اصلاً bcrypt hash نیست!"
    );

    // ── تست bcrypt.compare با پسوردی که خط فرمان می‌دید ──
    const testPassword = process.argv[2];
    if (testPassword) {
      const valid = await bcrypt.compare(testPassword, target.password);
      console.log(`\n🔑 تست پسورد "${testPassword}" → ${valid ? "✅ مطابقت دارد" : "❌ مطابقت ندارد"}`);
    } else {
      console.log("\nℹ️  برای تست پسورد، دستور رو این‌طور اجرا کنید:");
      console.log("   npx ts-node test-db.ts YOUR_PASSWORD_HERE");
    }
  } catch (err) {
    console.error("❌ خطای اتصال یا کوئری:", err);
  } finally {
    await client.close();
  }
}

main();