import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        404
      </p>
      <h1 className="mt-2 text-4xl font-medium tracking-tight">Not in the atlas yet.</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        Either this page does not exist, or the producer or region you were looking for has not been written up. The roster is still small.
      </p>
      <p className="mt-8 flex gap-6 text-sm">
        <Link
          href="/"
          className="font-medium underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900 dark:decoration-zinc-700 dark:hover:decoration-zinc-100"
        >
          Home
        </Link>
        <Link
          href="/atlas"
          className="font-medium underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900 dark:decoration-zinc-700 dark:hover:decoration-zinc-100"
        >
          Atlas
        </Link>
        <Link
          href="/producers"
          className="font-medium underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900 dark:decoration-zinc-700 dark:hover:decoration-zinc-100"
        >
          Producers
        </Link>
      </p>
    </main>
  );
}
