# TelPlayer Admin Panel

کنترل پنل مدیریت برای اپ TelPlayer — Next.js 15, TypeScript, Tailwind CSS

## فیچرها

- داشبورد Overview با نمودار دانلودها و کانال‌های برتر
- مدیریت کاربران (ویرایش / حذف / تغییر رول / ریست پسورد)
- مدیریت کانال‌ها با وضعیت sync و مالک
- مدیریت آهنگ‌ها با جستجو و لینک تلگرام
- Analytics با نمودارهای تعاملی
- Auth: فقط کاربران با role: "admin" اجازه ورود دارند

## راه‌اندازی

### 1. نصب

```bash
npm install
```

### 2. فایل .env.local

```env
MONGODB_URI=mongodb://user:pass@host:port/emusicplayer?authSource=admin
NEXTAUTH_SECRET=your-random-secret-32-chars-minimum
NEXTAUTH_URL=http://localhost:3001
```

### 3. ساخت ادمین اول

```bash
MONGODB_URI="mongodb://..." node scripts/create-admin.mjs
```

اگه ایمیل یوزر موجود رو بدی، رول admin بهش میده.
اگه ایمیل جدید بدی، یوزر ادمین جدید میسازه.

### 4. اجرا

```bash
# Development
npm run dev -- --port 3001

# Production
npm run build && npm start -- --port 3001
```

پنل: http://localhost:3001
