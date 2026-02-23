"""
DSPy Configuration for SteelAgent
==================================
Configures LLM providers for DSPy optimization runs.
Supports Anthropic Claude and OpenRouter Llama 3.3 70B.
"""

import os
import dspy
from dotenv import load_dotenv

# Load env vars from the project root .env.local
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))


def configure_lm(model: str = "sonnet") -> dspy.LM:
    """Configure and return a DSPy language model."""
    if model == "sonnet":
        # Try Anthropic first, fall back to OpenRouter
        anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
        openrouter_key = os.environ.get("OPENROUTER_API_KEY", "")

        if anthropic_key:
            lm = dspy.LM(
                model="anthropic/claude-sonnet-4-6",
                api_key=anthropic_key,
                temperature=0.3,
                max_tokens=2048,
            )
            # Quick validation — fall back to OpenRouter if key is invalid
            try:
                dspy.configure(lm=lm)
                lm("test")
                return lm
            except Exception:
                print("  [config] Anthropic key invalid, falling back to OpenRouter")

        if openrouter_key:
            lm = dspy.LM(
                model="openrouter/meta-llama/llama-3.3-70b-instruct",
                api_key=openrouter_key,
                temperature=0.3,
                max_tokens=2048,
            )
            dspy.configure(lm=lm)
            return lm

        raise ValueError("No valid LLM API key found (ANTHROPIC_API_KEY or OPENROUTER_API_KEY)")

    elif model == "haiku":
        lm = dspy.LM(
            model="anthropic/claude-haiku-4-5-20251001",
            api_key=os.environ["ANTHROPIC_API_KEY"],
            temperature=0.0,
            max_tokens=1024,
        )
    elif model == "openrouter":
        lm = dspy.LM(
            model="openrouter/meta-llama/llama-3.3-70b-instruct",
            api_key=os.environ["OPENROUTER_API_KEY"],
            temperature=0.3,
            max_tokens=2048,
        )
    else:
        raise ValueError(f"Unknown model: {model}")

    dspy.configure(lm=lm)
    return lm
