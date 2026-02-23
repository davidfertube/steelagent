"""
RAGGenerator Module
====================
The primary optimization target -- wraps the main answer generation prompt.
This is the 163-line system prompt in app/api/chat/route.ts (lines 362-463).
"""

import dspy
from .signatures import RAGGeneration


class RAGGenerator(dspy.Module):
    """Generates cited answers from retrieved document chunks."""

    def __init__(self):
        super().__init__()
        self.generate = dspy.ChainOfThought(RAGGeneration)

    def forward(self, context: str, question: str) -> dspy.Prediction:
        return self.generate(context=context, question=question)
