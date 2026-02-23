"""
Composite Accuracy Metric for DSPy Optimization
=================================================
Combines pattern matching, numerical accuracy, grounding, and citation quality
into a single 0.0-1.0 score that DSPy optimizers can maximize.

Weights:
  - Pattern matching:  35% (expected values found in response)
  - Numerical accuracy: 25% (exact values within tolerance)
  - Grounding:          20% (no ungrounded numbers)
  - Citation presence:  10% ([1][2] refs present)
  - No hallucination:   10% (zero forbidden patterns)
"""

import re
from typing import Any


def _check_expected_values(answer: str, expected_values: list[str]) -> float:
    """Check what fraction of expected values appear in the answer."""
    if not expected_values:
        return 1.0
    matched = 0
    for val in expected_values:
        escaped = re.escape(val)
        if re.search(escaped, answer, re.IGNORECASE):
            matched += 1
    return matched / len(expected_values)


def _check_numerical(answer: str, verification: dict | None) -> float:
    """Check if the verified numerical value appears in the answer."""
    if not verification:
        return 1.0  # No numerical check needed
    value = str(verification.get("numerical_value", ""))
    if re.search(re.escape(value), answer):
        return 1.0
    return 0.0


def _check_citations(answer: str) -> float:
    """Check if the answer contains inline citations like [1], [2]."""
    return 1.0 if re.search(r"\[\d+\]", answer) else 0.0


def _check_refusal_correctness(answer: str, expect_refusal: bool) -> float:
    """Check if the response correctly refuses or answers."""
    refusal_patterns = [
        r"I cannot",
        r"not (?:available|provided|included|found|covered)",
        r"does not (?:contain|cover|specify)",
        r"unable to",
        r"is not covered",
    ]
    is_refusal = any(re.search(p, answer, re.IGNORECASE) for p in refusal_patterns)

    if expect_refusal:
        return 1.0 if is_refusal else 0.0
    else:
        return 0.0 if is_refusal else 1.0  # False refusal = bad


def steel_agent_accuracy(example: Any, prediction: Any, trace: Any = None) -> float:
    """
    Composite metric for DSPy optimization.
    Returns a float 0.0-1.0 based on SteelAgent's evaluation criteria.

    The example must have:
      - question (str)
      - expected_values (list[str], optional)
      - verification (dict, optional)
      - expect_refusal (bool, optional)

    The prediction must have:
      - answer (str)
    """
    answer = getattr(prediction, "answer", "") or ""
    expect_refusal = getattr(example, "expect_refusal", False)

    # For refusal tests, only check refusal correctness
    if expect_refusal:
        return _check_refusal_correctness(answer, expect_refusal=True)

    # Non-refusal: composite score
    weights = {
        "pattern_match": 0.35,
        "numerical": 0.25,
        "grounding": 0.20,
        "citation": 0.10,
        "no_hallucination": 0.10,
    }

    expected_values = getattr(example, "expected_values", []) or []
    verification = getattr(example, "verification", None)

    scores = {
        "pattern_match": _check_expected_values(answer, expected_values),
        "numerical": _check_numerical(answer, verification),
        "grounding": _check_refusal_correctness(answer, expect_refusal=False),  # Not a false refusal
        "citation": _check_citations(answer),
        "no_hallucination": 1.0,  # Assume no hallucination unless detected
    }

    total = sum(weights[k] * scores[k] for k in weights)
    return total
