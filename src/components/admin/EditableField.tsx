import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPendingValue,
  setPendingChange,
  useEditMode,
  usePendingCount,
} from "@/lib/editMode";

type FieldType = "text" | "number" | "textarea" | "select";

interface Props {
  table: string;
  id: string | undefined | null;
  field: string;
  value: string | number | null | undefined;
  type?: FieldType;
  options?: { value: string; label: string }[]; // for select
  as?: ElementType;
  className?: string;
  placeholder?: string;
  /** Render override for display mode */
  render?: (value: string | number | null | undefined) => ReactNode;
}

/**
 * Click-to-edit field — visible only when admin Edit Mode is on.
 * Otherwise renders the value as plain content (using the `as` element).
 */
export function EditableField({
  table,
  id,
  field,
  value,
  type = "text",
  options,
  as: Tag = "span",
  className,
  placeholder,
  render,
}: Props) {
  const editMode = useEditMode();
  usePendingCount(); // re-render on staged changes
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

  const staged = id ? getPendingValue<string | number>(table, id, field) : undefined;
  const current = staged !== undefined ? staged : value;
  const isDirty = staged !== undefined && staged !== value;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) (inputRef.current as HTMLInputElement).select?.();
    }
  }, [editing]);

  if (!editMode || !id) {
    const TagAny = Tag as ElementType;
    return <TagAny className={className}>{render ? render(current) : current ?? placeholder ?? ""}</TagAny>;
  }

  const commit = (next: string) => {
    if (!id) return;
    const parsed: string | number | null =
      type === "number" ? (next === "" ? null : Number(next)) : next;
    setPendingChange(table, id, field, parsed);
    setEditing(false);
  };

  if (!editing) {
    const TagAny = Tag as ElementType;
    return (
      <TagAny
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setEditing(true);
        }}
        className={cn(
          className,
          "cursor-text relative inline-block group",
          "outline outline-2 outline-dashed outline-offset-2 rounded-[6px]",
          isDirty ? "outline-[#E8742C] bg-[#FFF1E4]" : "outline-[#D4AF37]/60 hover:outline-[#D4AF37]",
        )}
        title="לחץ לעריכה"
      >
        {render ? render(current) : current ?? placeholder ?? "—"}
        <Pencil className="inline-block ms-1 h-3 w-3 align-baseline text-[#D4AF37] opacity-70 group-hover:opacity-100" strokeWidth={2.4} />
      </TagAny>
    );
  }

  // Editing UI
  const commonCls =
    "w-full bg-white border-2 border-[#D4AF37] rounded-[8px] px-2 py-1 text-inherit font-inherit outline-none";

  if (type === "textarea") {
    return (
      <textarea
        ref={(el) => { inputRef.current = el; }}
        defaultValue={String(current ?? "")}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit((e.target as HTMLTextAreaElement).value);
        }}
        className={cn(commonCls, className, "min-h-[80px] resize-y")}
        rows={3}
      />
    );
  }

  if (type === "select" && options) {
    return (
      <select
        ref={(el) => { inputRef.current = el; }}
        defaultValue={String(current ?? "")}
        onBlur={(e) => commit(e.target.value)}
        onChange={(e) => commit(e.target.value)}
        className={cn(commonCls, className)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={(el) => { inputRef.current = el; }}
      type={type === "number" ? "number" : "text"}
      defaultValue={current === null || current === undefined ? "" : String(current)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setEditing(false);
        if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
      }}
      className={cn(commonCls, className)}
    />
  );
}
