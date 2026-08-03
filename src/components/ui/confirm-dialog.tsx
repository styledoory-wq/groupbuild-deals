import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions get a red confirm button. */
  destructive?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const Ctx = createContext<Confirm | null>(null);

/**
 * Branded, non-blocking replacement for `window.confirm`.
 * `window.confirm` freezes the whole WebView on iOS and shows the raw domain —
 * this renders an RTL AlertDialog and resolves a promise instead.
 */
export function useConfirm(): Confirm {
  const v = useContext(Ctx);
  if (!v) throw new Error("useConfirm must be used inside <ConfirmDialogProvider>");
  return v;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback<Confirm>((options) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) settle(false);
        }}
      >
        <AlertDialogContent dir="rtl" className="max-w-[340px] rounded-3xl text-right">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="text-[17px] font-extrabold text-foreground">
              {opts?.title}
            </AlertDialogTitle>
            {opts?.description ? (
              <AlertDialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
                {opts.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
            <AlertDialogAction
              onClick={() => settle(true)}
              className={cn(
                "h-11 flex-1 rounded-2xl font-bold",
                opts?.destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
            >
              {opts?.confirmLabel ?? "אישור"}
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => settle(false)} className="mt-0 h-11 flex-1 rounded-2xl font-bold">
              {opts?.cancelLabel ?? "ביטול"}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Ctx.Provider>
  );
}
