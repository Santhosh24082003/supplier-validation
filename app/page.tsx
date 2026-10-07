import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">
              SV
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950">
                Supplier Validation
              </p>
              <p className="text-xs text-slate-500">
                Onboarding workspace
              </p>
            </div>
          </div>

          <span className="hidden text-sm text-slate-500 sm:block">
            Internal operations portal
          </span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              Supplier operations
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Manage supplier onboarding with clarity.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Configure registrations, collect supplier information, review documents, and record decisions from one workspace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Open admin console
              </Link>
              <span className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-600">
                Supplier links are registration-specific
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Workspace overview
            </p>
            <div className="mt-5 divide-y divide-slate-100">
              <div className="flex items-center justify-between py-4">
                <span className="text-sm text-slate-600">Registration setup</span>
                <span className="text-sm font-semibold text-blue-700">Configure</span>
              </div>
              <div className="flex items-center justify-between py-4">
                <span className="text-sm text-slate-600">Supplier documents</span>
                <span className="text-sm font-semibold text-blue-700">Review</span>
              </div>
              <div className="flex items-center justify-between py-4">
                <span className="text-sm text-slate-600">Admin decision</span>
                <span className="text-sm font-semibold text-red-700">Approve / reject</span>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 pt-5 text-xs text-slate-500">
          Supplier Validation Framework
        </footer>
      </div>
    </main>
  );
}