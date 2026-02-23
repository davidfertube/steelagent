"""
Optimize RAGGenerator with MIPROv2
====================================
Phase 1 optimization: optimizes the main answer generation prompt
using MIPROv2 against the core-20 golden dataset.

Usage:
    cd dspy-optimize
    python scripts/optimize_generator.py

Outputs:
    - Optimized program saved to runs/<timestamp>/program.json
    - Exported prompts to ../lib/optimized-prompts.json
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import configure_lm
from modules import RAGGenerator
from metrics import steel_agent_accuracy, zero_hallucination_constraint
from data.convert_golden import load_core20_examples

import dspy
from dspy.teleprompt import MIPROv2


def combined_metric(example, prediction, trace=None):
    """Combined metric: accuracy score with hallucination hard constraint."""
    if not zero_hallucination_constraint(example, prediction, trace):
        return 0.0
    return steel_agent_accuracy(example, prediction, trace)


def main():
    print("=" * 60)
    print("  SteelAgent DSPy Optimization: RAGGenerator")
    print("  Optimizer: MIPROv2 with Sonnet 4.6")
    print("=" * 60)
    print()

    # Configure LM
    lm = configure_lm("sonnet")
    print(f"  LM: {lm}")

    # Load data
    train, val = load_core20_examples(split_ratio=0.7)
    print(f"  Training examples: {len(train)}")
    print(f"  Validation examples: {len(val)}")
    print()

    # Initialize module
    generator = RAGGenerator()

    # Configure optimizer (auto=None allows manual control)
    # Reduced from 10 candidates / 30 trials to stay within rate limits
    optimizer = MIPROv2(
        metric=combined_metric,
        auto=None,
        num_candidates=5,
        num_threads=1,
        init_temperature=0.7,
        max_bootstrapped_demos=2,
        max_labeled_demos=3,
        verbose=True,
    )

    print("  Starting optimization...")
    print()

    # Run optimization (minibatch_size must be <= val set size)
    optimized = optimizer.compile(
        generator,
        trainset=train,
        valset=val,
        num_trials=5,
        minibatch_size=6,
    )

    # Evaluate on validation set
    print()
    print("  Evaluating optimized program on validation set...")
    val_scores = []
    for ex in val:
        try:
            pred = optimized(context=ex.context, question=ex.question)
            score = combined_metric(ex, pred)
            val_scores.append(score)
            status = "PASS" if score > 0.5 else "FAIL"
            print(f"    {ex.query_id}: {score:.2f} ({status})")
        except Exception as e:
            val_scores.append(0.0)
            print(f"    {ex.query_id}: ERROR - {str(e)[:100]}")

    avg_score = sum(val_scores) / max(len(val_scores), 1)
    print()
    print(f"  Validation accuracy: {avg_score:.3f}")
    print()

    # Save results
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = Path(__file__).parent.parent / "runs" / timestamp
    run_dir.mkdir(parents=True, exist_ok=True)

    # Save optimized program
    optimized.save(str(run_dir / "program.json"))
    print(f"  Saved program to: {run_dir / 'program.json'}")

    # Save metrics
    metrics = {
        "timestamp": timestamp,
        "optimizer": "MIPROv2",
        "model": "claude-sonnet-4-6",
        "train_size": len(train),
        "val_size": len(val),
        "val_accuracy": avg_score,
        "val_scores": val_scores,
    }
    (run_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"  Saved metrics to: {run_dir / 'metrics.json'}")
    print()
    print("  Done! Run export_prompts.py to export optimized prompts.")


if __name__ == "__main__":
    main()
