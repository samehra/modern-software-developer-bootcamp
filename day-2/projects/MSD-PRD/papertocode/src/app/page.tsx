import Hero from "@/components/hero";

export default function Home() {
  return (
    <main
      className="flex min-h-screen flex-col items-center px-4"
      data-testid="main-container"
    >
      <Hero />
    </main>
  );
}
