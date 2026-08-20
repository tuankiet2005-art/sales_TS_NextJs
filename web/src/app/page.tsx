export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-page flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-sm uppercase tracking-[0.2em] text-copper">OnRoad</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-forest">Next.js monolith migration</h1>
      <p className="mt-4 max-w-xl text-base text-ink/80">
        Scaffold ready. API routes and UI pages from the migration plan will land here before cutover from
        the Vite frontend and Spring Boot backend.
      </p>
    </main>
  );
}
