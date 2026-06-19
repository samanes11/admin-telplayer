"use client";

import { useEffect, useState } from "react";

const API_BASE = "https://musicbackend-production-7d94.up.railway.app/api";

type DefaultChannel = {
  _id: string;
  channelUsername: string;
  channelName: string;
  addedAt: string;
};

export default function DefaultChannelsPage() {
  const [adminKey, setAdminKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);

  const [channels, setChannels] = useState<DefaultChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin_key");
    if (saved) {
      setAdminKey(saved);
      setKeySaved(true);
    }
  }, []);

  useEffect(() => {
    if (keySaved) fetchChannels();
  }, [keySaved]);

  function headers() {
    return {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    };
  }

  async function fetchChannels() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/default-channels`, { headers: headers() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || data.msg || "خطا در دریافت لیست");
      setChannels(data.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function saveKey() {
    localStorage.setItem("admin_key", adminKey);
    setKeySaved(true);
  }

  async function addChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE}/admin/default-channels`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ channelUsername: username.trim(), channelName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || data.msg || "خطا در افزودن چنل");
      setUsername("");
      setName("");
      setNotice("چنل پیش‌فرض اضافه شد.");
      await fetchChannels();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeChannel(id: string) {
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE}/admin/default-channels/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || data.msg || "خطا در حذف چنل");
      setChannels((prev) => prev.filter((c) => c._id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function applyToAllUsers() {
    setApplying(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE}/admin/default-channels/apply-all`, {
        method: "POST",
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || data.msg || "خطا در اعمال چنل‌ها");
      setNotice(
        `اعمال شد روی ${data.usersProcessed} کاربر — ${data.added} چنل جدید اضافه شد.`
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  }

  if (!keySaved) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-6" dir="rtl">
        <div className="w-full max-w-sm rounded-2xl border border-[#27272a] bg-[#111114] p-8">
          <h1 className="mb-1 text-xl font-bold text-white">ورود ادمین</h1>
          <p className="mb-6 text-sm text-[#71717a]">
            کلید ادمین (ADMIN_SECRET) رو وارد کن تا به پنل دسترسی پیدا کنی.
          </p>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="کلید ادمین"
            className="mb-4 w-full rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-3 text-sm text-white outline-none focus:border-[#ef4444]"
          />
          <button
            onClick={saveKey}
            disabled={!adminKey.trim()}
            className="w-full rounded-xl bg-[#ef4444] py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            ورود
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] px-6 py-10" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white">چنل‌های پیش‌فرض</h1>
            <p className="mt-1 text-sm text-[#71717a]">
              هر چنلی که این‌جا اضافه کنی، خودکار برای هر کاربر جدیدی که ثبت‌نام می‌کنه اضافه و sync می‌شه.
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("admin_key");
              setKeySaved(false);
              setAdminKey("");
            }}
            className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-[#71717a] hover:text-white"
          >
            خروج
          </button>
        </div>

        {/* Add channel form */}
        <form
          onSubmit={addChannel}
          className="mb-6 rounded-2xl border border-[#27272a] bg-[#111114] p-5"
        >
          <h2 className="mb-4 text-sm font-bold text-white">افزودن چنل جدید</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="یوزرنیم چنل (مثلاً channel_name)"
              className="flex-1 rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-2.5 text-sm text-white outline-none focus:border-[#ef4444]"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام نمایشی چنل"
              className="flex-1 rounded-xl border border-[#27272a] bg-[#09090b] px-4 py-2.5 text-sm text-white outline-none focus:border-[#ef4444]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#ef4444] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {submitting ? "..." : "+ افزودن"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-4 rounded-xl border border-[#ef4444]/40 bg-[#2a0d0d] px-4 py-3 text-sm text-[#ef4444]">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 rounded-xl border border-[#2a7a4f]/40 bg-[#0d2a18] px-4 py-3 text-sm text-[#34d399]">
            {notice}
          </div>
        )}

        {/* List */}
        <div className="mb-6 rounded-2xl border border-[#27272a] bg-[#111114]">
          <div className="flex items-center justify-between border-b border-[#27272a] px-5 py-4">
            <h2 className="text-sm font-bold text-white">
              لیست فعلی <span className="text-[#71717a]">({channels.length})</span>
            </h2>
            <button onClick={fetchChannels} className="text-xs text-[#71717a] hover:text-white">
              بازخوانی
            </button>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-[#71717a]">در حال بارگذاری...</div>
          ) : channels.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#71717a]">
              هنوز چنل پیش‌فرضی اضافه نکردی.
            </div>
          ) : (
            <ul>
              {channels.map((c) => (
                <li
                  key={c._id}
                  className="flex items-center justify-between border-b border-[#1e1e22] px-5 py-3 last:border-0"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{c.channelName}</div>
                    <div className="text-xs text-[#71717a]">@{c.channelUsername}</div>
                  </div>
                  <button
                    onClick={() => removeChannel(c._id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#ef4444] hover:bg-[#ef4444]/10"
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Apply to existing users */}
        <div className="rounded-2xl border border-[#27272a] bg-[#111114] p-5">
          <h2 className="mb-1 text-sm font-bold text-white">اعمال روی کاربرهای موجود</h2>
          <p className="mb-4 text-xs text-[#71717a]">
            چنل‌های پیش‌فرض فقط برای کاربرهای جدید خودکاره. برای اضافه کردنشون به کاربرهایی که قبلاً ثبت‌نام
            کرده‌ن، از این دکمه استفاده کن.
          </p>
          <button
            onClick={applyToAllUsers}
            disabled={applying || channels.length === 0}
            className="rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-5 py-2.5 text-sm font-bold text-[#ef4444] disabled:opacity-40"
          >
            {applying ? "در حال اعمال..." : "اعمال روی همه کاربرهای موجود"}
          </button>
        </div>
      </div>
    </main>
  );
}