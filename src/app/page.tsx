import Link from "next/link";
import PhantomLogin from "../components/PhantomLogin";
import CheckSessionButton from "../components/CheckSessionButton";

type HomeProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function Banner({
  message,
  tone,
}: {
  message: string;
  tone: "info" | "error";
}) {
  const styles =
    tone === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : "border-amber-500/30 bg-amber-500/10 text-amber-200";

  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${styles}`}>
      {message}
    </div>
  );
}

export default function Home({ searchParams }: HomeProps) {
  const authFlag = (searchParams?.auth ?? "") as string;
  const showAuthRequired = authFlag === "required";
  const showAuthExpired = authFlag === "expired";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white/60 p-8 shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
        {/* Brand */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Cypherpunk
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Sign in with your Phantom wallet to continue
            </p>
          </div>
          <span className="rounded-full bg-violet-600/10 px-3 py-1 text-xs font-medium text-violet-600 ring-1 ring-inset ring-violet-600/20 dark:text-violet-400 dark:ring-violet-400/30">
            Solana
          </span>
        </header>

        {/* Notices */}
        <div className="space-y-2">
          {showAuthRequired ? (
            <Banner
              message="Please sign in with your wallet to access that page."
              tone="info"
            />
          ) : null}
          {showAuthExpired ? (
            <Banner
              message="Your session expired. Please sign in again."
              tone="error"
            />
          ) : null}
        </div>

        {/* Card */}
        <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Wallet authentication
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Connect Phantom, sign a message, and we’ll verify it on the
                server before granting access.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <PhantomLogin />

              <div className="flex items-center gap-3 py-1">
                <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800" />
                <span className="text-2xs text-zinc-500">or</span>
                <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800" />
              </div>

              <CheckSessionButton buttonLabel="Check session status" />
            </div>

            <div className="flex flex-col gap-2 rounded-lg bg-zinc-100/70 p-3 text-xs text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-900/40 dark:text-zinc-300 dark:ring-zinc-800">
              <p>
                • After signing in successfully, you can access protected routes
                and APIs.
              </p>
              <p>
                • Sessions are short‑lived and stored in an HttpOnly cookie.
              </p>
            </div>
          </div>
        </section>

        {/* Footer actions */}
        <footer className="mt-6 flex items-center justify-between">
          <Link
            href="/protected"
            className="inline-flex items-center rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Go to protected page
          </Link>

          <a
            href="https://phantom.app/download"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            Need Phantom?
          </a>
        </footer>
      </main>
    </div>
  );
}
