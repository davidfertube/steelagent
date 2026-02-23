"""
CoherenceValidator Module
==========================
Optimizes the response coherence validation prompt (lib/response-validator.ts lines 44-63).
"""

import dspy
from .signatures import CoherenceValidation


class CoherenceValidator(dspy.Module):
    """Validates that a response addresses the user's question."""

    def __init__(self):
        super().__init__()
        self.validate = dspy.Predict(CoherenceValidation)

    def forward(self, question: str, response: str) -> dspy.Prediction:
        return self.validate(question=question, response=response)
