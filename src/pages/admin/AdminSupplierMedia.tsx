import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, ArrowRight, Image as ImageIcon, FileText, Link as LinkIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { uploadSupplierLogo, uploadSupplierGalleryImage, uploadSupplierCatalog } from "@/lib/supplierUploads";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminSupplierMedia() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [catalogUrl, setCatalogUrl] = useState<string | null>(null);
  const [gallery, setGallery] = useState<{ id?: string; image_url: string; caption: string | null }[]>([]);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingCatalog, setUploadingCatalog] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const [{ data: s }, { data: g }] = await Promise.all([
        supabase.from("suppliers").select("*").eq("id", supplierId).maybeSingle(),
        supabase.from("supplier_gallery").select("id,image_url,caption,display_order").eq("supplier_id", supplierId).order("display_order"),
      ]);
      if (s) {
        setBusinessName(s.business_name ?? "");
        setShortDescription(s.short_description ?? "");
        setDescription(s.description ?? "");
        setLogoUrl(s.logo_url ?? null);
        setWebsiteUrl(s.website_url ?? "");
        setWhatsappUrl(s.whatsapp_url ?? "");
        setInstagramUrl(s.instagram_url ?? "");
        setFacebookUrl(s.facebook_url ?? "");
        setCatalogUrl(s.catalog_url ?? null);
      }
      setGallery((g ?? []).map((x) => ({ id: x.id, image_url: x.image_url, caption: x.caption })));
      setLoading(false);
    })();
  }, [supplierId]);

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingLogo(true);
    try { setLogoUrl(await uploadSupplierLogo(f)); toast.success("הלוגו הועלה"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "העלאה נכשלה"); }
    finally { setUploadingLogo(false); if (logoRef.current) logoRef.current.value = ""; }
  };
  const handleGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []); if (!files.length) return;
    setUploadingGallery(true);
    try {
      for (const f of files) {
        const url = await uploadSupplierGalleryImage(f);
        setGallery((g) => [...g, { image_url: url, caption: null }]);
      }
      toast.success("התמונות הועלו");
    } catch (err) { toast.error(err instanceof Error ? err.message : "העלאה נכשלה"); }
    finally { setUploadingGallery(false); if (galleryRef.current) galleryRef.current.value = ""; }
  };
  const handleCatalog = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingCatalog(true);
    try { setCatalogUrl(await uploadSupplierCatalog(f)); toast.success("הקטלוג הועלה"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "העלאה נכשלה"); }
    finally { setUploadingCatalog(false); if (catalogRef.current) catalogRef.current.value = ""; }
  };

  const handleSave = async () => {
    if (!supplierId) return;
    setSaving(true);
    try {
      const { error: uErr } = await supabase.from("suppliers").update({
        short_description: shortDescription.trim() || null,
        description: description.trim() || null,
        logo_url: logoUrl,
        website_url: websiteUrl.trim() || null,
        whatsapp_url: whatsappUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        catalog_url: catalogUrl,
      }).eq("id", supplierId);
      if (uErr) throw uErr;
      await supabase.from("supplier_gallery").delete().eq("supplier_id", supplierId);
      if (gallery.length) {
        const { error } = await supabase.from("supplier_gallery").insert(
          gallery.map((g, idx) => ({ supplier_id: supplierId, image_url: g.image_url, caption: g.caption, display_order: idx }))
        );
        if (error) throw error;
      }
      toast.success("נשמר");
      navigate(-1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <PageHeader title="עריכת מדיה לספק" subtitle={businessName} back />
      <div className="px-5 space-y-4 pb-32">

        {/* Logo */}
        <section className="gb-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-gold" /> לוגו
          </h3>
          <div className="flex items-center gap-4">
            <SupplierLogo name={businessName} logoUrl={logoUrl} size="lg" />
            <div className="flex-1 space-y-2">
              <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogo} />
              <Button type="button" variant="outline" onClick={() => logoRef.current?.click()} disabled={uploadingLogo} className="h-9 rounded-xl text-xs w-full">
                {uploadingLogo ? "מעלה..." : logoUrl ? "החלפה" : "העלאה"}
              </Button>
              {logoUrl && (
                <Button type="button" variant="ghost" onClick={() => setLogoUrl(null)} className="h-8 rounded-xl text-xs w-full text-destructive">הסרה</Button>
              )}
            </div>
          </div>
        </section>

        {/* Descriptions */}
        <section className="gb-card p-4 space-y-3">
          <Label className="text-xs font-bold">תיאור קצר</Label>
          <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} maxLength={140} className="h-10 rounded-xl" />
          <Label className="text-xs font-bold">תיאור מלא</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4} className="rounded-xl" />
        </section>

        {/* Links */}
        <section className="gb-card p-4 space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <LinkIcon className="h-3.5 w-3.5 text-gold" /> קישורים
          </h3>
          <Input dir="ltr" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="אתר" className="h-10 rounded-xl text-sm" maxLength={500} />
          <Input dir="ltr" value={whatsappUrl} onChange={(e) => setWhatsappUrl(e.target.value)} placeholder="https://wa.me/..." className="h-10 rounded-xl text-sm" maxLength={500} />
          <Input dir="ltr" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="Instagram" className="h-10 rounded-xl text-sm" maxLength={500} />
          <Input dir="ltr" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="Facebook" className="h-10 rounded-xl text-sm" maxLength={500} />
        </section>

        {/* Catalog */}
        <section className="gb-card p-4 space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-gold" /> קטלוג
          </h3>
          <Input dir="ltr" value={catalogUrl ?? ""} onChange={(e) => setCatalogUrl(e.target.value || null)} placeholder="קישור חיצוני" className="h-10 rounded-xl text-sm" maxLength={500} />
          <input ref={catalogRef} type="file" accept="application/pdf" className="hidden" onChange={handleCatalog} />
          <Button type="button" variant="outline" onClick={() => catalogRef.current?.click()} disabled={uploadingCatalog} className="h-9 rounded-xl text-xs w-full">
            {uploadingCatalog ? "מעלה..." : "או העלאת PDF"}
          </Button>
        </section>

        {/* Gallery */}
        <section className="gb-card p-4 space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-gold" /> גלריה
          </h3>
          <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleGallery} />
          <Button type="button" variant="outline" onClick={() => galleryRef.current?.click()} disabled={uploadingGallery} className="h-9 rounded-xl text-xs w-full">
            <Plus className="h-3.5 w-3.5 ml-1" /> {uploadingGallery ? "מעלה..." : "הוספת תמונות"}
          </Button>
          {gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {gallery.map((g, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                  <img src={g.image_url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setGallery((arr) => arr.filter((_, i) => i !== idx))}
                    className="absolute top-1 left-1 h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    aria-label="מחיקה"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[480px] px-4 pb-4 pt-3 bg-gradient-to-t from-background via-background to-background/0 flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1 h-12 rounded-xl">
            <ArrowRight className="h-4 w-4 ml-2" /> ביטול
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground">
            <Save className="h-4 w-4 ml-2" /> {saving ? "שומר..." : "שמירה"}
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
