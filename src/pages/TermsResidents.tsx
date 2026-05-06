import { TermsContent } from "@/components/terms/TermsContent";

export default function TermsResidents() {
  return (
    <div className="min-h-screen bg-background py-8 px-4 flex justify-center">
      <div className="w-full max-w-2xl bg-card rounded-3xl shadow-soft p-6 md:p-8">
        <TermsContent audience="resident" />
      </div>
    </div>
  );
}
