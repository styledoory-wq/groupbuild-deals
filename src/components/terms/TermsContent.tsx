import { termsFor, type TermsAudience } from "@/lib/terms";

interface Props {
  audience: TermsAudience;
  className?: string;
}

export function TermsContent({ audience, className }: Props) {
  const { title, sections } = termsFor(audience);
  return (
    <article dir="rtl" className={className}>
      <h1 className="text-2xl font-extrabold text-primary mb-4">{title}</h1>
      <div className="gb-divider-gold mb-5" />
      <div className="space-y-5 text-sm leading-relaxed text-foreground/90">
        {sections.map((s, i) => (
          <section key={i} className="space-y-1.5">
            <h2 className="text-base font-bold text-primary">{s.heading}</h2>
            {s.body.map((p, j) => (
              <p key={j} className="whitespace-pre-line">{p}</p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
