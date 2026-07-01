import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";
import { Camera, LogOut, Settings, Bell, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { resizeToPreset } from "@/lib/imageResize";

/**
 * Premium circular avatar (top-right). Tap → menu (Profile/Settings/Notifications/Logout).
 * Long-press / camera icon → upload. Shows real uploaded image when present.
 */
export function ProfileAvatar({
  size = 40,
  fallbackName,
  avatarUrl: avatarUrlProp,
}: {
  size?: number;
  fallbackName?: string;
  avatarUrl?: string | null;
}) {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    avatarUrlProp ?? (user?.id ? sessionStorage.getItem(`avatar:${user.id}`) : null)
  );
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Load avatar from profiles if not passed in
  useEffect(() => {
    if (avatarUrlProp !== undefined) { setAvatarUrl(avatarUrlProp); return; }
    if (!user?.id) return;
    const cacheKey = `avatar:${user.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setAvatarUrl(cached); return; }
    let cancel = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
      const path = (data as { avatar_url: string | null } | null)?.avatar_url;
      if (!path || cancel) return;
      if (path.startsWith("http")) { sessionStorage.setItem(cacheKey, path); setAvatarUrl(path); return; }
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signed?.signedUrl && !cancel) {
        sessionStorage.setItem(cacheKey, signed.signedUrl);
        setAvatarUrl(signed.signedUrl);
      }
    })();
    return () => { cancel = true; };
  }, [user?.id, avatarUrlProp]);

  // Click outside closes menu
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const initials = (fallbackName || user?.name || "U")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const handleFile = async (file: File) => {
    if (!user?.id) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("הקובץ גדול מ-10MB"); return; }
    setUploading(true);
    try {
      const resized = await resizeToPreset(file, "avatar");
      const ext = resized.type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, resized, {
        upsert: true,
        cacheControl: "31536000",
        contentType: resized.type,
      });
      if (upErr) throw upErr;
      await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) {
        sessionStorage.setItem(`avatar:${user.id}`, signed.signedUrl);
        setAvatarUrl(signed.signedUrl);
      }
      toast.success("תמונת הפרופיל עודכנה");
    } catch (e) {
      console.error(e);
      toast.error("העלאה נכשלה");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    logout();
    setOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <div ref={wrapRef} className="relative" dir="rtl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full overflow-hidden ring-2 ring-white shadow-[0_4px_14px_-4px_rgba(10,31,61,0.25)] active:scale-95 transition-transform"
        style={{ width: size, height: size, background: "linear-gradient(135deg,#0E6B5A,#0A5446)" }}
        aria-label="פרופיל"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" decoding="async" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-white font-bold" style={{ fontSize: size * 0.4 }}>
            {initials}
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-60 bg-white rounded-2xl shadow-[0_20px_40px_-12px_rgba(10,31,61,0.18)] border border-[#ECEEF2] overflow-hidden z-50 origin-top-left animate-in fade-in zoom-in-95 duration-150">
          <div className="p-4 border-b border-[#ECEEF2] flex items-center gap-3">
            <div className="h-11 w-11 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0E6B5A,#0A5446)" }}>
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold text-sm">{initials}</span>}
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="font-bold text-[#1F2937] text-sm truncate">{user?.name || "משתמש"}</div>
              <button
                onClick={() => fileRef.current?.click()}
                className="text-[11px] text-[#0E6B5A] font-semibold flex items-center gap-1 mr-auto"
              >
                <Camera className="h-3 w-3" /> שנה תמונה
              </button>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
          <MenuItem icon={UserIcon} label="פרופיל" onClick={() => { setOpen(false); navigate("/resident/profile"); }} />
          <MenuItem icon={Bell} label="התראות" onClick={() => { setOpen(false); navigate("/resident/notifications"); }} />
          <MenuItem icon={Settings} label="הגדרות" onClick={() => { setOpen(false); navigate("/resident/profile/edit"); }} />
          <div className="h-px bg-[#ECEEF2]" />
          <MenuItem icon={LogOut} label="התנתקות" onClick={handleLogout} danger />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Bell; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-medium hover:bg-[#F7F5F0] transition-colors ${danger ? "text-[#E74C3C]" : "text-[#1F2937]"}`}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      <span className="flex-1">{label}</span>
    </button>
  );
}
