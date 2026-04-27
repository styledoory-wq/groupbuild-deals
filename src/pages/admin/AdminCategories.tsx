import { useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useApp } from "@/store/AppStore";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminCategories() {
  const { categories, setCategories, deals } = useApp();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✨");

  const add = () => {
    if (!name) return;
    setCategories([...categories, { id: `c_${Date.now()}`, name, icon }]);
    setName(""); setIcon("✨");
    toast.success("קטגוריה נוספה");
  };

  const remove = (id: string) => {
    setCategories(categories.filter((c) => c.id !== id));
    toast.success("קטגוריה נמחקה");
  };

  return (
    <MobileShell>
      <PageHeader title="ניהול קטגוריות" subtitle={`${categories.length} קטגוריות`} />
      <div className="px-5 -mt-4 relative z-10 mb-4">
        <div className="gb-card p-3 flex items-center gap-2">
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="h-11 w-14 text-center text-xl rounded-xl" />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם קטגוריה" className="h-11 rounded-xl flex-1" />
          <Button onClick={add} className="h-11 rounded-xl bg-gradient-gold text-primary font-bold px-3">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="px-5 grid grid-cols-2 gap-2">
        {categories.map((c) => {
          const count = deals.filter((d) => d.categoryId === c.id).length;
          return (
            <div key={c.id} className="gb-card p-3 flex items-center gap-2">
              <div className="text-xl">{c.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{c.name}</div>
                <div className="text-[10px] text-muted-foreground">{count} עסקאות</div>
              </div>
              <button onClick={() => remove(c.id)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <BottomNav role="admin" />
    </MobileShell>
  );
}
