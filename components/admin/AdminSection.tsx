"use client";

interface AdminSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AdminSection({ title, subtitle, children }: AdminSectionProps) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
