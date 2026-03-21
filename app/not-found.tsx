import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <h1 className="text-4xl font-bold text-slate-900">404</h1>
      <p className="mt-2 text-slate-600">Page not found</p>
      <p className="mt-1 text-sm text-slate-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-brand px-6 py-3 font-medium text-white transition-colors hover:bg-brand-hover"
      >
        Go home
      </Link>
    </div>
  );
}
