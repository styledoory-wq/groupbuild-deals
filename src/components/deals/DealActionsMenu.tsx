import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreVertical, Power, Trash2, PowerOff, Sparkles, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  dealId: string;
  status: string;
  onChanged?: () => void;
  editPath?: string;
  marketingPath?: string;
};

export function DealActionsMenu({ dealId, status, onChanged, editPath, marketingPath }: Props) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmActivate, setConfirmActivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const isInactive = status === "inactive";

  const doDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("deals")
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), status: "inactive" })
        .eq("id", dealId);
      if (error) throw error;
      toast.success("ההצעה נמחקה");
      setConfirmDelete(false);
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "מחיקה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const doToggle = async (next: "active" | "inactive") => {
    setLoading(true);
    try {
      const { error } = await supabase.from("deals").update({ status: next }).eq("id", dealId);
      if (error) throw error;
      toast.success(next === "inactive" ? "ההצעה הושבתה" : "ההצעה הופעלה");
      setConfirmDeactivate(false);
      setConfirmActivate(false);
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "פעולה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 -m-1">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background z-50">
          <DropdownMenuItem onClick={() => navigate(editPath ?? `/supplier/offers/${dealId}/edit`)}>
            <Pencil className="h-4 w-4 ml-2" /> ערוך הצעה
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(marketingPath ?? `/supplier/offers/${dealId}/marketing-tools`)}>
            <Sparkles className="h-4 w-4 ml-2" /> כלי שיווק
          </DropdownMenuItem>
          {isInactive ? (
            <DropdownMenuItem onClick={() => setConfirmActivate(true)}>
              <Power className="h-4 w-4 ml-2" /> הפעל הצעה
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setConfirmDeactivate(true)}>
              <PowerOff className="h-4 w-4 ml-2" /> השבת הצעה
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => setConfirmDelete(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 ml-2" /> מחק הצעה
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את ההצעה?</AlertDialogTitle>
            <AlertDialogDescription>
              ההצעה תוסר מהמערכת ולא תוצג לדיירים. ניתן לשחזר אותה רק דרך מסד הנתונים.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doDelete(); }}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק הצעה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>להשבית את ההצעה?</AlertDialogTitle>
            <AlertDialogDescription>
              ההצעה לא תוצג לדיירים, אבל תישמר במערכת.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doToggle("inactive"); }} disabled={loading}>
              השבת
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmActivate} onOpenChange={setConfirmActivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>להפעיל את ההצעה?</AlertDialogTitle>
            <AlertDialogDescription>
              ההצעה תחזור להיות גלויה לדיירים.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doToggle("active"); }} disabled={loading}>
              הפעל
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
