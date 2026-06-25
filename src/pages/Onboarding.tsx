import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Briefcase, MapPin, UserIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandLogo";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";

type Role = "resident" | "supplier";

export default function Onboarding() {
  const navigate = useNavigate();
  const { setUser } = useApp();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [defaultName, setDefaultName] = useState("");
  const [role, setRole] = useState<Role>("resident");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const u = session.user;
      setUserId(u.id);
      setEmail(u.email ?? "");
      const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
      const guess = meta.full_name ?? meta.name ?? "";
      setDefaultName(guess);
      setFullName(guess);

      // If already onboarded, bounce out.
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed,user_type")
        .eq("id", u.id)
        .maybeSingle();
      if (profile && (profile as { onboarding_completed?: boolean }).onboarding_completed) {
        navigate(profile.user_type === "supplier" ? "/supplier" : "/resident");
        return;
      }
      setChecking(false);
    })();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!fullName.trim()) { toast.error("יש להזין שם מלא"); return; }
    if (role === "resident" && !city.trim()) { toast.error("יש להזין עיר"); return; }
    if (role === "supplier" && !businessName.trim()) { toast.error("יש להזין שם עסק"); return; }

    setLoading(true);
    try {
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          user_type: role,
          city: role === "resident" ? city.trim() : null,
          business_name: role === "supplier" ? businessName.trim() : null,
          onboarding_completed: true,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: CURRENT_TERMS_VERSION,
        } as never)
        .eq("id", userId);
      if (pErr) throw pErr;

      const { error: rErr } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role } as never);
      if (rErr && !/duplicate/i.test(rErr.message)) throw rErr;

      // Best-effort: notify admin about new signup.
      supabase.functions.invoke("notify-admin", {
        body: {
          event: role === "supplier" ? "new_supplier" : "new_resident",
          title: role === "supplier" ? "ספק חדש נרשם" : "דייר חדש נרשם",
          details: { full_name: fullName, email, city, business_name: businessName, role, via: "google" },
        },
      }).catch(() => { /* ignore */ });

      setUser({
        id: userId,
        role,
        name: fullName,
        phone: "",
        email,
        projectId: undefined,
      });

      toast.success("הפרטים נשמרו");
      navigate(role === "supplier" ? "/supplier" : "/resident");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div dir="rtl" className="min-h-[100dvh] flex items-center justify-center bg-[#F7F5F0]">
        <Loader2 className="h-6 w-6 animate-spin text-[#0E6B5A]" />
      </div>
    );
  }

  const fieldInput =
    "h-[56px] w-full rounded-[14px] bg-white pr-12 pl-4 text-[15px] text-[#1F2937] placeholder:text-[#9CA3AF] text-right border border-[#E0E4E8] shadow-[0_2px_8px_rgba(0,0,0,0.08)] focus:shadow-[0_0_0_3px_rgba(14,107,90,0.22)] focus:outline-none focus:ring-0 transition-all duration-200";

  const roles: { id: Role; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: "resident", label: "דייר", icon: Building2, desc: "הצטרפו לעסקאות" },
    { id: "supplier", label: "ספק", icon: Briefcase, desc: "צרו הצעות" },
  ];

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] w-full flex justify-center text-[#1F2937] relative overflow-hidden"
      style={{ background: "linear-gradient(170deg, #F7F5F0 0%, #EFEAE0 100%)" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <BrandMark className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(60vw,420px)] opacity-[0.06] select-none" />
      </div>

      <div className="relative z-10 w-full max-w-screen-sm flex flex-col px-6 py-8">
        <div className="text-center mb-5 animate-fade-up">
          <h1 className="text-[clamp(1.4rem,5vw,1.75rem)] font-extrabold leading-tight tracking-tight text-[#0B1220]">
            ברוכים הבאים{defaultName ? `, ${defaultName.split(" ")[0]}` : ""} 👋
          </h1>
          <div className="mt-3 h-[2px] w-10 rounded-full bg-[#0E6B5A] mx-auto" />
          <p className="mt-3 text-[#5B6472] text-[13px] font-medium leading-relaxed">
            כדי להתאים לכם את החוויה — איך תרצו להשתמש ב‑GroupBuild?
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3.5 animate-fade-up">
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="text-[12px] font-bold tracking-wide text-[#6B7280] uppercase">בחר סוג חשבון</span>
              <div className="flex-1 h-px bg-[#ECEEF2]" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {roles.map(({ id, label, icon: Icon, desc }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setRole(id)}
                  className={cn(
                    "p-3 rounded-[16px] text-right transition-all flex items-center gap-3 shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] active:scale-[0.97]",
                    role === id
                      ? "bg-[#0E6B5A] text-white shadow-[0_8px_20px_-10px_rgba(10,31,61,0.45)]"
                      : "bg-white text-[#1F2937]"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-[12px] flex items-center justify-center shrink-0 transition-colors",
                    role === id ? "bg-white/15 text-white" : "bg-[#F4F6FA] text-[#0E6B5A]"
                  )}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className={cn("text-sm font-bold leading-tight", role === id ? "text-white" : "text-[#1F2937]")}>{label}</div>
                    <div className={cn("text-[11px] leading-tight mt-0.5", role === id ? "text-white/70" : "text-[#6B7280]")}>{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#0E6B5A] pointer-events-none" />
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="שם מלא"
              required
              maxLength={60}
              className={fieldInput}
            />
          </div>

          {role === "resident" ? (
            <div className="relative">
              <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#0E6B5A] pointer-events-none" />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="עיר"
                required
                maxLength={40}
                className={fieldInput}
              />
            </div>
          ) : (
            <div className="relative">
              <Briefcase className="absolute right-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#0E6B5A] pointer-events-none" />
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="שם העסק"
                required
                maxLength={60}
                className={fieldInput}
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-[56px] rounded-[14px] text-[15px] font-bold bg-[#0E6B5A] hover:bg-[#0a5447] text-white shadow-[0_8px_20px_-10px_rgba(14,107,90,0.6)]"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "המשך"}
          </Button>

          <button
            type="button"
            onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
            className="w-full text-center text-xs text-[#6B7280] hover:text-[#1F2937] transition-colors pt-2"
          >
            התנתק
          </button>
        </form>
      </div>
    </div>
  );
}
