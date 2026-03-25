const steps = [
  { number: "01", label: "Upload PDF", description: "Drop your research paper" },
  { number: "02", label: "AI Analyzes", description: "Gemini extracts methods" },
  { number: "03", label: "Get Notebook", description: "Download .ipynb file" },
];

export default function Hero() {
  return (
    <section
      data-testid="hero-section"
      className="flex flex-col items-center text-center pt-24 pb-16 px-4"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900/50 px-4 py-1.5 text-sm text-gray-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
        Powered by Gemini 2.5 Pro
      </div>

      <h1
        className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white"
        data-testid="app-title"
      >
        Paper<span className="text-teal">To</span>Code
      </h1>

      <p
        className="mt-4 text-lg sm:text-xl text-gray-400 font-mono max-w-xl"
        data-testid="app-tagline"
      >
        Turn research papers into executable notebooks
      </p>

      <p
        className="mt-6 text-sm text-gray-600 font-mono max-w-2xl leading-relaxed"
        data-testid="hero-description"
      >
        Upload a research paper PDF and get a comprehensive Google Colab notebook
        with algorithm implementations, synthetic data, mathematical formulations,
        visualizations, and ablation studies — ready for top-tier research replication.
      </p>

      <div
        className="mt-16 flex flex-col sm:flex-row items-center gap-8 sm:gap-12"
        data-testid="workflow-steps"
      >
        {steps.map((step, i) => (
          <div key={step.number} className="flex items-center gap-8 sm:gap-12">
            <div className="flex flex-col items-center gap-2" data-testid={`step-${i}`}>
              <span className="font-mono text-xs text-teal">{step.number}</span>
              <span className="font-heading text-sm font-semibold text-white">
                {step.label}
              </span>
              <span className="font-mono text-xs text-gray-600">
                {step.description}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="hidden sm:block w-12 h-px bg-gray-800" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
