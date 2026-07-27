/** Shared visual tokens for supplier workspace screens. */
export const SUPPLIER = {
  /** Deeper page wash so white cards separate clearly */
  pageBg: "#E4EBE7",
  green: "#0E6B5A",
  greenDark: "#0A5446",
  greenSoft: "#E8F5F1",
  ink: "#0F172A",
  muted: "#64748B",
  line: "#D5DED9",
  card:
    "bg-white rounded-[24px] border border-[#D5DED9] shadow-[0_2px_14px_-6px_rgba(15,23,42,0.10)]",
  cardPad: "bg-white rounded-[24px] border border-[#D5DED9] shadow-[0_2px_14px_-6px_rgba(15,23,42,0.10)] p-5",
  btnPrimary:
    "h-12 rounded-2xl bg-[#0E6B5A] hover:bg-[#0A5446] text-white font-bold inline-flex items-center justify-center gap-2 active:scale-[0.99] transition",
  btnInk:
    "h-12 rounded-2xl bg-[#0F172A] hover:bg-black text-white font-bold inline-flex items-center justify-center gap-2 active:scale-[0.99] transition",
  btnSecondary:
    "h-11 rounded-2xl bg-white border border-[#0E6B5A]/35 text-[#0E6B5A] font-bold inline-flex items-center justify-center gap-2 active:scale-[0.99] transition",
  btnGhost:
    "h-11 rounded-2xl bg-white border border-[#D5DED9] text-[#0F172A] font-bold inline-flex items-center justify-center gap-2 active:scale-[0.99] transition",
  input:
    "h-12 rounded-2xl bg-white border border-[#D5DED9] focus-visible:border-[#0E6B5A]",
} as const;
