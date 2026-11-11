export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section
        aria-labelledby="welcome-heading"
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12"
      >
        <p className="text-sm font-semibold tracking-[0.16em] text-action-blue uppercase">
          SkyFare
        </p>
        <h1
          id="welcome-heading"
          className="mt-4 text-3xl font-semibold tracking-tight text-navy sm:text-4xl"
        >
          Platform foundation
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-slate-600">
          The Next.js application is ready to connect to the SkyFare API.
          Product screens will be implemented from the supplied design
          references in a later phase.
        </p>
      </section>
    </main>
  );
}
