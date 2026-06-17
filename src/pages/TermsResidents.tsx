import { TermsContent } from "@/components/terms/TermsContent";

export default function TermsResidents() {
  return (
    <div className="min-h-screen bg-[#F7F5F0] py-8 px-4 flex justify-center">
      <div className="w-full max-w-2xl bg-white rounded-[20px] shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18),0_2px_4px_-2px_rgba(10,31,61,0.05)] p-6 md:p-8">
        <TermsContent audience="resident" />
      </div>
    </div>
  );
}
