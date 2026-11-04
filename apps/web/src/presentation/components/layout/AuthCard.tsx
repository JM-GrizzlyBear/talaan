import type { ReactNode } from "react";

// The centered box used by the login and register pages
export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-start justify-center px-4 py-12 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-edge bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
