/**
 * Prompt Registry
 * ================
 * Loads optimized prompts from DSPy optimization runs.
 * Falls back to default hardcoded prompts when no optimized version exists
 * or when DSPY_OPTIMIZED=false.
 *
 * This is the bridge between DSPy (Python, offline) and the live pipeline (TypeScript).
 * The only shared artifact is lib/optimized-prompts.json.
 */

import * as fs from "fs";
import * as path from "path";

interface OptimizedDemo {
  question: string;
  context: string;
  answer: string;
}

interface OptimizedModule {
  signature: string;
  instruction: string;
  demos: OptimizedDemo[];
}

interface OptimizedPrompts {
  version: string;
  optimized_at: string;
  optimizer: string;
  model: string;
  modules: {
    generator?: OptimizedModule;
    decomposer?: OptimizedModule;
    coherence_validator?: OptimizedModule;
  };
}

let cachedPrompts: OptimizedPrompts | null = null;

/**
 * Check if DSPy optimization is enabled.
 * Disabled by setting DSPY_OPTIMIZED=false in env.
 */
function isDSPyEnabled(): boolean {
  return process.env.DSPY_OPTIMIZED !== "false";
}

/**
 * Load optimized prompts from JSON file.
 * Returns null if file doesn't exist or DSPy is disabled.
 */
function loadOptimizedPrompts(): OptimizedPrompts | null {
  if (!isDSPyEnabled()) return null;
  if (cachedPrompts) return cachedPrompts;

  try {
    const filePath = path.join(process.cwd(), "lib", "optimized-prompts.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      cachedPrompts = JSON.parse(data) as OptimizedPrompts;
      console.log(`[PromptRegistry] Loaded optimized prompts v${cachedPrompts.version}`);
      return cachedPrompts;
    }
  } catch (error) {
    console.warn("[PromptRegistry] Failed to load optimized prompts, using defaults:", error);
  }

  return null;
}

/**
 * Format DSPy few-shot demos as a prompt section.
 */
function formatDemos(demos: OptimizedDemo[]): string {
  if (!demos || demos.length === 0) return "";

  const formatted = demos
    .map((d, i) => {
      return `Example ${i + 1}:
Question: ${d.question}
Answer: ${d.answer}`;
    })
    .join("\n\n");

  return `\n\n## EXAMPLES\n${formatted}\n`;
}

/**
 * Get the optimized generator system prompt, or null to use default.
 * When optimized prompts exist, returns the DSPy-optimized instruction
 * with few-shot examples appended.
 */
export function getOptimizedGeneratorPrompt(): string | null {
  const prompts = loadOptimizedPrompts();
  if (!prompts?.modules?.generator) return null;

  const { instruction, demos } = prompts.modules.generator;
  if (!instruction) return null;

  return instruction + formatDemos(demos);
}

/**
 * Get the optimized decomposer prompt, or null to use default.
 */
export function getOptimizedDecomposerPrompt(): string | null {
  const prompts = loadOptimizedPrompts();
  if (!prompts?.modules?.decomposer) return null;

  const { instruction } = prompts.modules.decomposer;
  return instruction || null;
}

/**
 * Get the optimized coherence validator prompt, or null to use default.
 */
export function getOptimizedCoherencePrompt(): string | null {
  const prompts = loadOptimizedPrompts();
  if (!prompts?.modules?.coherence_validator) return null;

  const { instruction } = prompts.modules.coherence_validator;
  return instruction || null;
}

/**
 * Get the current prompt registry status (for logging/debugging).
 */
export function getRegistryStatus(): {
  enabled: boolean;
  version: string | null;
  modules: string[];
} {
  const prompts = loadOptimizedPrompts();
  return {
    enabled: isDSPyEnabled(),
    version: prompts?.version || null,
    modules: prompts ? Object.keys(prompts.modules).filter((k) => {
      const mod = prompts.modules[k as keyof typeof prompts.modules];
      return mod && mod.instruction;
    }) : [],
  };
}
