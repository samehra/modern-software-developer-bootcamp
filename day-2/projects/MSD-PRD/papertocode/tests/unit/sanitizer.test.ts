import { describe, it, expect } from "vitest";
import { sanitizeCodeCell, DANGEROUS_PATTERNS } from "../../src/lib/sanitizer";

describe("Code Cell Sanitizer", () => {
  it("flags os.system calls", () => {
    const result = sanitizeCodeCell('os.system("rm -rf /")');
    expect(result.flagged).toBe(true);
    expect(result.sanitized).toContain("# WARNING");
  });

  it("flags subprocess usage", () => {
    const result = sanitizeCodeCell("subprocess.run(['ls', '-la'])");
    expect(result.flagged).toBe(true);
    expect(result.sanitized).toContain("# WARNING");
  });

  it("flags eval calls", () => {
    const result = sanitizeCodeCell('eval("malicious_code()")');
    expect(result.flagged).toBe(true);
  });

  it("flags exec calls", () => {
    const result = sanitizeCodeCell('exec("import os")');
    expect(result.flagged).toBe(true);
  });

  it("flags __import__ calls", () => {
    const result = sanitizeCodeCell("__import__('os').system('whoami')");
    expect(result.flagged).toBe(true);
  });

  it("flags shutil.rmtree", () => {
    const result = sanitizeCodeCell("shutil.rmtree('/home')");
    expect(result.flagged).toBe(true);
  });

  it("flags open with sensitive paths", () => {
    const result = sanitizeCodeCell("open('/etc/passwd')");
    expect(result.flagged).toBe(true);
  });

  it("does not flag safe code", () => {
    const safeCode = `import numpy as np
x = np.random.randn(100, 768)
model = Transformer(d_model=768)
output = model(x)
print(output.shape)`;
    const result = sanitizeCodeCell(safeCode);
    expect(result.flagged).toBe(false);
    expect(result.sanitized).toBe(safeCode);
  });

  it("does not flag normal open() for file writing", () => {
    const result = sanitizeCodeCell("with open('results.csv', 'w') as f:");
    expect(result.flagged).toBe(false);
  });

  it("adds warning comment before each dangerous line", () => {
    const code = `import os
x = 1
os.system("echo hello")
y = 2`;
    const result = sanitizeCodeCell(code);
    expect(result.flagged).toBe(true);
    const lines = result.sanitized.split("\n");
    const warningIdx = lines.findIndex((l) => l.includes("# WARNING"));
    expect(warningIdx).toBeGreaterThanOrEqual(0);
    expect(lines[warningIdx + 1]).toContain("os.system");
  });

  it("exports DANGEROUS_PATTERNS array", () => {
    expect(Array.isArray(DANGEROUS_PATTERNS)).toBe(true);
    expect(DANGEROUS_PATTERNS.length).toBeGreaterThan(0);
  });

  it("handles empty string input", () => {
    const result = sanitizeCodeCell("");
    expect(result.flagged).toBe(false);
    expect(result.sanitized).toBe("");
    expect(result.warnings).toHaveLength(0);
  });

  it("flags multiple dangerous patterns in one block", () => {
    const code = `os.system("whoami")
eval("2+2")
subprocess.run(["ls"])`;
    const result = sanitizeCodeCell(code);
    expect(result.flagged).toBe(true);
    expect(result.warnings.length).toBe(3);
    const warningCount = (result.sanitized.match(/# WARNING/g) || []).length;
    expect(warningCount).toBe(3);
  });

  it("preserves non-dangerous lines exactly", () => {
    const code = `import numpy as np
x = np.array([1, 2, 3])
os.system("bad")
print(x)`;
    const result = sanitizeCodeCell(code);
    const lines = result.sanitized.split("\n");
    expect(lines[0]).toBe("import numpy as np");
    expect(lines[1]).toBe("x = np.array([1, 2, 3])");
    // line 2 is WARNING, line 3 is os.system, line 4 is print
    expect(lines[lines.length - 1]).toBe("print(x)");
  });

  it("each DANGEROUS_PATTERNS entry has pattern and label", () => {
    for (const dp of DANGEROUS_PATTERNS) {
      expect(dp.pattern).toBeInstanceOf(RegExp);
      expect(typeof dp.label).toBe("string");
      expect(dp.label.length).toBeGreaterThan(0);
    }
  });

  it("has exactly 7 dangerous patterns", () => {
    expect(DANGEROUS_PATTERNS.length).toBe(7);
  });
});
