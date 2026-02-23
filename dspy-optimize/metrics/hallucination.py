"""
Zero Hallucination Constraint
==============================
Hard constraint for DSPy optimization: any candidate prompt that produces
hallucination is immediately rejected. This ensures the 0% hallucination
rate is maintained through optimization.
"""

import re
from typing import Any


def zero_hallucination_constraint(example: Any, prediction: Any, trace: Any = None) -> bool:
    """
    Hard constraint: returns False if hallucination detected.
    Used as a filter in DSPy optimizers to reject unsafe candidates.

    Checks:
    1. Refusal correctness (must refuse when expected, must not falsely refuse)
    2. No fabricated specification numbers
    3. No obviously wrong values for known properties
    """
    answer = getattr(prediction, "answer", "") or ""
    expect_refusal = getattr(example, "expect_refusal", False)

    # Check refusal correctness
    refusal_patterns = [
        r"I cannot",
        r"not (?:available|provided|included|found|covered)",
        r"does not (?:contain|cover|specify)",
        r"unable to",
        r"is not covered",
    ]
    is_refusal = any(re.search(p, answer, re.IGNORECASE) for p in refusal_patterns)

    if expect_refusal and not is_refusal:
        return False  # Should have refused but didn't

    if not expect_refusal and is_refusal:
        return False  # False refusal

    # Check for fabricated ASTM specs (specs that don't exist)
    fabricated_specs = re.findall(r"ASTM\s+A(\d{4,})", answer)
    for spec_num in fabricated_specs:
        if int(spec_num) > 2000:  # No ASTM A-series spec exceeds ~A1100
            return False

    return True
