"""
QueryDecomposer Module
=======================
Optimizes the query decomposition prompt (lib/query-decomposition.ts lines 39-74).
"""

import dspy
from .signatures import QueryDecomposition


class QueryDecomposer(dspy.Module):
    """Decomposes complex queries into focused sub-queries."""

    def __init__(self):
        super().__init__()
        self.decompose = dspy.Predict(QueryDecomposition)

    def forward(self, question: str) -> dspy.Prediction:
        return self.decompose(question=question)
