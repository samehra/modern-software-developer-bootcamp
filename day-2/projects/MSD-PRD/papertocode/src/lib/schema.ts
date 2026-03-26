import { z } from "zod/v4";

const paperMetadataSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()).optional(),
  abstract_summary: z.string().optional(),
  year: z.number().optional(),
  key_topics: z.array(z.string()).optional(),
});

const geminiOutputSchema = z.object({
  paper_metadata: paperMetadataSchema,
  key_contributions: z.array(z.string()).optional(),
  environment_setup: z
    .object({
      pip_packages: z.array(z.string()).optional(),
      setup_code: z.string().optional(),
    })
    .optional(),
  mathematical_formulation: z
    .array(
      z.object({
        title: z.string(),
        latex: z.string(),
        explanation: z.string(),
      })
    )
    .optional(),
  algorithm_pseudocode: z
    .array(
      z.object({
        name: z.string(),
        pseudocode: z.string(),
        complexity: z.string().optional(),
      })
    )
    .optional(),
  implementation: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        code: z.string(),
      })
    )
    .optional(),
  synthetic_data: z
    .object({
      description: z.string(),
      code: z.string(),
    })
    .optional(),
  execution: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        code: z.string(),
      })
    )
    .optional(),
  visualizations: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        code: z.string(),
      })
    )
    .optional(),
  ablation_studies: z
    .array(
      z.object({
        title: z.string(),
        parameter: z.string().optional(),
        description: z.string(),
        code: z.string(),
      })
    )
    .optional(),
  reproducibility_notes: z
    .object({
      random_seeds: z.string().optional(),
      hardware_notes: z.string().optional(),
      known_limitations: z.array(z.string()).optional(),
      tips: z.array(z.string()).optional(),
    })
    .optional(),
  references: z
    .array(
      z.object({
        citation: z.string(),
        relevance: z.string().optional(),
      })
    )
    .optional(),
});

interface ValidationResult {
  success: boolean;
  data?: z.infer<typeof geminiOutputSchema>;
  error?: string;
}

export function validateGeminiOutput(input: unknown): ValidationResult {
  if (input === null || input === undefined || typeof input !== "object") {
    return { success: false, error: "Expected an object but got " + typeof input };
  }

  const result = geminiOutputSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const issues = z.prettifyError(result.error);
  return { success: false, error: issues };
}
