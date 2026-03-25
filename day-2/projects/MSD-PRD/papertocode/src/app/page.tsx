export default function Home() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4"
      data-testid="main-container"
    >
      <h1
        className="font-heading text-5xl font-bold tracking-tight text-white"
        data-testid="app-title"
      >
        Paper<span className="text-teal">To</span>Code
      </h1>
      <p
        className="mt-4 text-lg text-gray-400 font-mono"
        data-testid="app-tagline"
      >
        Turn research papers into executable notebooks
      </p>
    </main>
  );
}
