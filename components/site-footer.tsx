import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-3xl px-6 py-12 text-xs text-zinc-500 dark:text-zinc-400">
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <p>Coffee Atlas — a personal project, in progress.</p>
        <nav className="flex gap-4">
          <Link href="/atlas" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Atlas
          </Link>
          <Link href="/producers" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Producers
          </Link>
          <a
            href="https://github.com/alexlu876/coffee-atlas"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
