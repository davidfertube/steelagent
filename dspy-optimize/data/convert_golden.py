"""
Convert Core-20 Golden Dataset to DSPy Examples
=================================================
Reads tests/golden-dataset/core-20.json and converts each query
into a dspy.Example with inputs and labels for optimization.

Pre-computed chunks (from precompute-chunks-for-dspy.ts) are loaded
to provide context without running the full retrieval pipeline.

Usage:
    from data.convert_golden import load_core20_examples
    train, val = load_core20_examples(split_ratio=0.7)
"""

import json
import os
from pathlib import Path

import dspy


GOLDEN_DATASET_PATH = Path(__file__).parent.parent.parent / "tests" / "golden-dataset" / "core-20.json"
PRECOMPUTED_CHUNKS_DIR = Path(__file__).parent / "precomputed-chunks"


def _load_precomputed_context(query_id: str) -> str:
    """Load pre-computed retrieval chunks for a query ID."""
    chunk_file = PRECOMPUTED_CHUNKS_DIR / f"{query_id}.json"
    if chunk_file.exists():
        data = json.loads(chunk_file.read_text())
        # Format chunks as numbered references
        parts = []
        for i, chunk in enumerate(data.get("chunks", []), 1):
            content = chunk.get("content", "")
            doc = chunk.get("document", "Unknown")
            page = chunk.get("page", "?")
            parts.append(f"[{i}] From {doc}, Page {page}:\n{content}")
        return "\n\n---\n\n".join(parts)
    return ""


def load_core20_examples(split_ratio: float = 0.7) -> tuple[list[dspy.Example], list[dspy.Example]]:
    """
    Load core-20 golden dataset as DSPy examples.

    Returns (train_set, val_set) split deterministically.
    """
    with open(GOLDEN_DATASET_PATH) as f:
        dataset = json.load(f)

    examples = []
    for qa in dataset["qa_pairs"]:
        context = _load_precomputed_context(qa["id"])

        ex = dspy.Example(
            question=qa["question"],
            context=context,
            expected_values=qa.get("expected_values", []),
            expected_answer=qa.get("expected_answer", ""),
            expect_refusal=qa.get("expect_refusal", False),
            allow_general_knowledge=qa.get("allow_general_knowledge", False),
            verification=qa.get("verification"),
            difficulty=qa.get("difficulty", "medium"),
            query_id=qa["id"],
        ).with_inputs("question", "context")

        examples.append(ex)

    # Deterministic split
    split_idx = int(len(examples) * split_ratio)
    train = examples[:split_idx]
    val = examples[split_idx:]

    return train, val
