import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/store/AppStore";
import { acceptInvitationToken } from "@/lib/projectClient";
import { Users, Check, AlertCircle } from "lucide-react";

export default function ProjectJoin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, authReady } = useApp();
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      // preserve intended target through the auth flow
      try { sessionStorage.setItem("gb:pm:pendingInvite", token || ""); } catch {}
      navigate(`/auth?next=${encodeURIComponent(`/project/join/${token || ""}`)}`, { replace: true });
      return;
    }
    if (!token || status !== "idle") return;
    setStatus("working");
    acceptInvitationToken(token)
      .then(() => {
        setStatus("done");
        setTimeout(() => navigate("/resident/project-management", { replace: true }), 900);
      })
      .catch((e) => {
        setStatus("error");
        const msg = String(e?.message || e);
        if (msg.includes("expired")) setError("קישור ההזמנה פג תוקף");
        else if (msg.includes("not_found")) setError("קישור ההזמנה לא קיים");
        else setError("לא הצלחנו לצרף אותך לפרויקט");
      });
  }, [authReady, user, token, status, navigate]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-lg text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-[#0E6B5A]/10 text-[#0E6B5A]">
          {status === "done" ? <Check className="h-8 w-8" /> :
           status === "error" ? <AlertCircle className="h-8 w-8 text-red-500" /> :
           <Users className="h-8 w-8" />}
        </div>
        <h1 className="text-[18px] font-extrabold text-[#1A1A1A] mb-2">
          {status === "done" ? "הצטרפת לפרויקט 🎉" :
           status === "error" ? "לא ניתן להצטרף" :
           "מצרף אותך לפרויקט..."}
        </h1>
        <p className="text-[13px] text-gray-500">
          {status === "error" ? error : status === "done" ? "מעביר אותך לניהול הפרויקט..." : "רק רגע"}
        </p>
        {status === "error" && (
          <button
            onClick={() => navigate("/resident")}
            className="mt-5 w-full py-3 rounded-xl bg-[#0E6B5A] text-white font-bold text-[13.5px]"
          >
            חזרה לדף הבית
          </button>
        )}
      </div>
    </div>
  );
}
