"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Skeleton, Badge, Avatar } from "@/components/ui";
import { Radio, Music2, ChevronRight, ArrowLeft, Clock } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface AdminUser {
  _id: string;
  name?: string;
  email: string;
}

interface AdminChannel {
  _id: string;
  channelName: string;
  channelUsername: string;
  status: string;
  songCount?: number;
  songsCount?: number;
}

interface AdminSong {
  _id: string;
  title: string;
  artist: string;
  duration: number;
  fileSize: number;
}

const statusConfig: Record<string, { label: string; badge: "success" | "error" | "warning" | "outline" }> = {
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

export default function UserDetailModal({
  user,
  onClose,
}: {
  user: AdminUser | null;
  onClose: () => void;
}) {
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  const [selectedChannel, setSelectedChannel] = useState<AdminChannel | null>(null);
  const [songs, setSongs] = useState<AdminSong[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);

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
    if (!selectedChannel) {
      setSongs([]);
      return;
    }
    setLoadingSongs(true);
    fetch(`/api/admin/songs?channelDbId=${selectedChannel._id}&limit=50`)
      .then((r) => r.json())
      .then((d) => setSongs(d.data || []))
      .finally(() => setLoadingSongs(false));
  }, [selectedChannel]);

  return (
    <>
      {/*  Channels modal */}
      <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar name={user?.name || user?.email || "?"} />
              <div>
                <p>{user?.name || "Unnamed"}</p>
                <p className="text-xs text-zinc-500 font-normal font-mono">{user?.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto -mx-6 px-6 flex-1">
            {loadingChannels ? (
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
                  const status = statusConfig[ch.status] || statusConfig.pending;
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
                        <p className="text-sm font-medium text-white truncate">{ch.channelName}</p>
                        <p className="text-xs text-zinc-500 font-mono truncate">@{ch.channelUsername}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={status.badge} className="text-[10px]">
                          {status.label}
                        </Badge>
                        <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                          <Music2 size={9} />
                          {(ch.songCount ?? ch.songsCount ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-zinc-600 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/*  Songs modal (nested) */}
      <Dialog open={!!selectedChannel} onOpenChange={(o) => !o && setSelectedChannel(null)}>
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
                  <div
                    key={song._id}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors"
                  >
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
                      <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{formatFileSize(song.fileSize)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}