import { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Unified empty state — illustration + title + description + action. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10">
      <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18)]">
        {icon ?? <Inbox className="h-7 w-7 text-[#9CA3AF]" strokeWidth={2} />}
      </div>
      <h3 className="mt-4 text-[16px] font-extrabold text-[#1F2937] tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-[13px] font-medium text-[#6B7280] max-w-[280px]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
