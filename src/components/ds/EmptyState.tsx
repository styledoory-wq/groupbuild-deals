import { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Unified empty state — icon medallion + title + description + CTA. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10 animate-fade-in">
      <div className="h-16 w-16 rounded-full bg-card flex items-center justify-center shadow-[var(--shadow-soft)] [&_svg]:h-7 [&_svg]:w-7 [&_svg]:text-muted-foreground">
        {icon ?? <Inbox strokeWidth={2} />}
      </div>
      <h3 className="mt-4 text-[16px] font-extrabold text-foreground tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1.5 text-[13px] font-medium text-muted-foreground max-w-[280px] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
