export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50" aria-live="polite" aria-busy="true">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </div>
  );
}
