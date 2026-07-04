"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
  Badge,
  Avatar,
} from "@/components/ui";
import {
  Radio,
  Music2,
  ChevronRight,
  ArrowLeft,
  Clock,
  Gem,
  ListMusic,
  CreditCard,
  LogOut,
  Smartphone,
} from "lucide-react";
import { formatDuration, formatDate } from "@/lib/utils";

interface AdminUser {
  _id: string;
  name?: string;
  telegramUsername?: string;
  subscriptionPlan?: string | null;
  subscriptionExpiresAt?: string | null;
}

interface AdminChannel {
  _id: string;
  channelName: string;
  channelUsername: string;
  status: string;
  songCount?: number;
  songsCount?: number;
}

interface AdminPlaylist {
  _id: string;
  name: string;
  description?: string | null;
  songsCount: number;
  updatedAt?: string;
}

interface AdminSong {
  _id: string;
  title: string;
  artist: string;
  duration: number;
  fileSize: number;
}

interface AdminSession {
  _id: string;
  deviceName: string;
  platform: string;
  deviceId?: string;
  isActive: boolean;
  createdAt?: string;
  lastActive?: string;
}

type Tab = "channels" | "playlists" | "payments" | "sessions";

const statusConfig: Record<
  string,
  { label: string; badge: "success" | "error" | "warning" | "outline" }
> = {
  active: { label: "Active", badge: "success" },
  error: { label: "Error", badge: "error" },
  syncing: { label: "Syncing…", badge: "warning" },
  pending: { label: "Pending", badge: "outline" },
};

function formatFileSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "channels", label: "Channels", icon: <Radio size={13} /> },
  { id: "playlists", label: "Playlists", icon: <ListMusic size={13} /> },
  { id: "payments", label: "Payments", icon: <CreditCard size={13} /> },
  { id: "sessions", label: "Sessions", icon: <Smartphone size={13} /> },
];

export default function UserDetailModal({
  user,
  onClose,
}: {
  user: AdminUser | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("channels");

  // ── Channels ────────────────────────────────────────────────
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<AdminChannel | null>(
    null,
  );
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);

  // ── Playlists ───────────────────────────────────────────────
  const [playlists, setPlaylists] = useState<AdminPlaylist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<AdminPlaylist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<AdminSong[]>([]);
  const [loadingPlaylistSongs, setLoadingPlaylistSongs] = useState(false);

  // ── Payments ────────────────────────────────────────────────
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // ── Sessions ────────────────────────────────────────────────
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loggingOutId, setLoggingOutId] = useState<string | null>(null);

  // Reset transient state whenever a new user is opened
  useEffect(() => {
    setTab("channels");
    setSelectedChannel(null);
    setSelectedPlaylist(null);
  }, [user?._id]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    setLoadingOrders(true);
    fetch(`/api/admin/transactions?userId=${user._id}&limit=50`)
      .then((r) => r.json())
      .then((d) => setOrders(d.data || []))
      .finally(() => setLoadingOrders(false));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }
    setLoadingSessions(true);
    fetch(`/api/admin/sessions?userId=${user._id}`)
      .then((r) => r.json())
      .then((d) => setSessions(d.data || []))
      .finally(() => setLoadingSessions(false));
  }, [user]);

  async function handleLogoutSession(sessionId: string) {
    setLoggingOutId(sessionId);
    try {
      await fetch(`/api/admin/sessions?id=${sessionId}`, { method: "DELETE" });
      setSessions((prev) =>
        prev.map((s) => (s._id === sessionId ? { ...s, isActive: false } : s)),
      );
    } finally {
      setLoggingOutId(null);
    }
  }

  useEffect(() => {
    if (!user) {
      setChannels([]);
      return;
    }
    setLoadingChannels(true);
    fetch(`/api/admin/channels?userId=${user._id}&limit=100`)
      .then((r) => r.json())
      .then((d) => setChannels(d.data || []))
      .finally(() => setLoadingChannels(false));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setPlaylists([]);
      return;
    }
    setLoadingPlaylists(true);
    fetch(`/api/admin/playlists?userId=${user._id}`)
      .then((r) => r.json())
      .then((d) => setPlaylists(d.data || []))
      .finally(() => setLoadingPlaylists(false));
  }, [user]);

  useEffect(() => {
    if (!selectedChannel) {
      setSongs([]);
      return;
    }
    setLoadingSongs(true);
    fetch(
      `/api/admin/songs?channelUsername=${selectedChannel.channelUsername}&limit=100`,
    )
      .then((r) => r.json())
      .then((d) => setSongs(d.data || []))
      .finally(() => setLoadingSongs(false));
  }, [selectedChannel]);

  useEffect(() => {
    if (!selectedPlaylist) {
      setPlaylistSongs([]);
      return;
    }
    setLoadingPlaylistSongs(true);
    fetch(`/api/admin/playlists?id=${selectedPlaylist._id}`)
      .then((r) => r.json())
      .then((d) => setPlaylistSongs(d.data || []))
      .finally(() => setLoadingPlaylistSongs(false));
  }, [selectedPlaylist]);

  return (
    <>
      {/* Main user modal (Channels / Playlists / Payments tabs) */}
      <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar name={user?.name || user?.telegramUsername || "?"} />
              <div>
                <p>{user?.name || "Unnamed"}</p>
                <p className="text-xs text-zinc-500 font-normal font-mono">
                  {user?.telegramUsername}
                </p>
                {user?.subscriptionExpiresAt &&
                new Date(user.subscriptionExpiresAt) > new Date() ? (
                  <Badge variant="success" className="mt-1.5">
                    <Gem size={10} />
                    {(user.subscriptionPlan || "premium").toUpperCase()} · until{" "}
                    {formatDate(user.subscriptionExpiresAt)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mt-1.5">
                    No active subscription
                  </Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 mb-4 shrink-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded-lg font-medium transition-all duration-150 ${
                  tab === t.id
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto -mx-6 px-6 flex-1">
            {/* ── Channels tab ────────────────────────────────── */}
            {tab === "channels" &&
              (loadingChannels ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              ) : channels.length === 0 ? (
                <div className="text-center py-12 text-zinc-600">
                  <Radio size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No channels for this user</p>
                </div>
              ) : (
                <div className="space-y-2 pb-2">
                  {channels.map((ch) => {
                    const status =
                      statusConfig[ch.status] || statusConfig.pending;
                    return (
                      <button
                        key={ch._id}
                        onClick={() => setSelectedChannel(ch)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-900/60 to-purple-950 flex items-center justify-center shrink-0">
                          <Radio size={16} className="text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {ch.channelName}
                          </p>
                          <p className="text-xs text-zinc-500 font-mono truncate">
                            @{ch.channelUsername}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={status.badge} className="text-[10px]">
                            {status.label}
                          </Badge>
                          <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                            <Music2 size={9} />
                            {(
                              ch.songCount ??
                              ch.songsCount ??
                              0
                            ).toLocaleString()}
                          </span>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-zinc-600 shrink-0"
                        />
                      </button>
                    );
                  })}
                </div>
              ))}

            {/* ── Playlists tab ───────────────────────────────── */}
            {tab === "playlists" &&
              (loadingPlaylists ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              ) : playlists.length === 0 ? (
                <div className="text-center py-12 text-zinc-600">
                  <ListMusic size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No playlists for this user</p>
                </div>
              ) : (
                <div className="space-y-2 pb-2">
                  {playlists.map((pl) => (
                    <button
                      key={pl._id}
                      onClick={() => setSelectedPlaylist(pl)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-700/60 to-purple-900 flex items-center justify-center shrink-0">
                        <ListMusic size={16} className="text-pink-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {pl.name}
                        </p>
                        {pl.description && (
                          <p className="text-xs text-zinc-500 truncate">
                            {pl.description}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1 shrink-0">
                        <Music2 size={9} />
                        {pl.songsCount.toLocaleString()}
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-zinc-600 shrink-0"
                      />
                    </button>
                  ))}
                </div>
              ))}

            {/* ── Payments tab ────────────────────────────────── */}
            {tab === "payments" &&
              (loadingOrders ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-zinc-600">
                  <CreditCard size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No purchases yet</p>
                </div>
              ) : (
                <div className="space-y-1.5 pb-2">
                  {orders.map((o) => (
                    <div
                      key={o.orderId}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800"
                    >
                      <div>
                        <p className="text-sm text-white">
                          {o.planTitle || o.planId}
                        </p>
                        <p className="text-[10px] text-zinc-600 font-mono">
                          {formatDate(o.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-400">
                          {Number(o.amount ?? 0).toLocaleString()}
                        </span>
                        <Badge
                          variant={
                            o.status === "paid"
                              ? "success"
                              : o.status === "failed"
                                ? "error"
                                : "warning"
                          }
                        >
                          {o.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            {/* ── Sessions tab ─────────────────────────────────── */}
            {tab === "sessions" &&
              (loadingSessions ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-zinc-600">
                  <Smartphone size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No sessions found</p>
                </div>
              ) : (
                <div className="space-y-2 pb-2">
                  {sessions.map((s) => (
                    <div
                      key={s._id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/60"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          s.isActive ? "bg-emerald-900/40" : "bg-zinc-800"
                        }`}
                      >
                        <Smartphone
                          size={16}
                          className={
                            s.isActive ? "text-emerald-400" : "text-zinc-500"
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {s.deviceName}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                          {s.platform}
                          {s.deviceId ? ` · ${s.deviceId.slice(0, 8)}` : ""}
                        </p>
                        <p className="text-[10px] text-zinc-600 font-mono mt-1">
                          Last active:{" "}
                          {s.lastActive ? formatDate(s.lastActive) : "—"}
                          {"  ·  "}
                          Created: {s.createdAt ? formatDate(s.createdAt) : "—"}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <Badge variant={s.isActive ? "success" : "outline"}>
                          {s.isActive ? "Active" : "Logged out"}
                        </Badge>
                        {s.isActive && (
                          <button
                            onClick={() => handleLogoutSession(s._id)}
                            disabled={loggingOutId === s._id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-950 transition-colors disabled:opacity-50"
                          >
                            <LogOut size={12} />
                            {loggingOutId === s._id ? "..." : "Logout"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Channel songs drill-down */}
      <Dialog
        open={!!selectedChannel}
        onOpenChange={(o) => !o && setSelectedChannel(null)}
      >
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedChannel(null)}
                className="p-1 -ml-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <DialogTitle>{selectedChannel?.channelName}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto -mx-6 px-6 flex-1">
            {loadingSongs ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : songs.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                <Music2 size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No songs found</p>
              </div>
            ) : (
              <div className="space-y-1 pb-2">
                {songs.map((song) => (
                  <SongRow key={song._id} song={song} />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Playlist songs drill-down */}
      <Dialog
        open={!!selectedPlaylist}
        onOpenChange={(o) => !o && setSelectedPlaylist(null)}
      >
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedPlaylist(null)}
                className="p-1 -ml-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <DialogTitle>{selectedPlaylist?.name}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto -mx-6 px-6 flex-1">
            {loadingPlaylistSongs ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : playlistSongs.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                <ListMusic size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No songs in this playlist</p>
              </div>
            ) : (
              <div className="space-y-1 pb-2">
                {playlistSongs.map((song) => (
                  <SongRow key={song._id} song={song} />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SongRow({ song }: { song: AdminSong }) {
  return (
    <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-900/60 to-red-950 flex items-center justify-center shrink-0">
        <Music2 size={14} className="text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{song.title}</p>
        <p className="text-xs text-zinc-500 truncate">
          {song.artist === "Unknown" ? "—" : song.artist}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-zinc-500 font-mono flex items-center gap-1 justify-end">
          <Clock size={10} />
          {song.duration ? formatDuration(song.duration) : "—"}
        </p>
        <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
          {formatFileSize(song.fileSize)}
        </p>
      </div>
    </div>
  );
}
