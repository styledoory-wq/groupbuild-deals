import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  sticky?: boolean;
}

/** Unified app-wide search field. */
export function SearchInput({
  value,
  onChange,
  placeholder = "חיפוש",
  sticky = false,
}: SearchInputProps) {
  const wrap = sticky ? "sticky z-20 px-5 pt-2 pb-3" : "px-5";
  const stickyStyle: React.CSSProperties = sticky
    ? {
        top: "env(safe-area-inset-top)",
        background: "linear-gradient(180deg,#F7F5F0 60%, rgba(247,248,250,0))",
        backdropFilter: "saturate(180%) blur(8px)",
        WebkitBackdropFilter: "saturate(180%) blur(8px)",
      }
    : {};

  return (
    <div className={wrap} style={stickyStyle}>
      <div className="relative">
        <Search
          className="h-[18px] w-[18px] absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280]"
          strokeWidth={2}
        />
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          aria-label={placeholder}
          dir="rtl"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="[&::-webkit-search-cancel-button]:appearance-none w-full h-12 pr-11 pl-10 rounded-[16px] bg-white text-[14px] font-medium text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0E6B5A]/40 shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)]"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="נקה חיפוש"
            className="tap-target absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-[#F4F6FA] flex items-center justify-center"
          >
            <X className="h-4 w-4 text-[#6B7280]" />
          </button>
        )}
      </div>
    </div>
  );
}
