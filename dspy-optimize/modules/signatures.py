"""
DSPy Signatures for SteelAgent Pipeline
=========================================
Each signature defines the input/output contract for a pipeline stage.
DSPy optimizes the prompts that implement these contracts.
"""

import dspy


class RAGGeneration(dspy.Signature):
    """You are a materials engineer assistant specialized in ASTM and API steel specifications.
    Given document context and a user question, provide a precise answer with inline citations [1][2].
    Only use information from the provided context. Quote exact values from tables.
    If the information is not in the context, say so clearly."""

    context: str = dspy.InputField(desc="Retrieved document chunks with [1][2] references")
    question: str = dspy.InputField(desc="User's technical question about steel specifications")
    answer: str = dspy.OutputField(desc="Precise answer with inline citations [1][2] and exact values")


class QueryDecomposition(dspy.Signature):
    """Analyze a technical query about steel specifications and determine if it needs
    to be broken into sub-queries for better retrieval. Classify the intent and
    generate focused sub-queries if the question is complex."""

    question: str = dspy.InputField(desc="User's technical question")
    intent: str = dspy.OutputField(desc="Query intent: lookup, compare, list, explain, or verify")
    subqueries: list[str] = dspy.OutputField(desc="List of focused sub-queries (or single-element list if simple)")
    requires_aggregation: bool = dspy.OutputField(desc="Whether sub-query results need to be combined")


class CoherenceValidation(dspy.Signature):
    """Assess whether a response directly and completely addresses the user's question
    about steel specifications. Check for completeness, relevance, and accuracy."""

    question: str = dspy.InputField(desc="The original user question")
    response: str = dspy.InputField(desc="The AI-generated response to evaluate")
    score: int = dspy.OutputField(desc="Coherence score 0-100 (80+ = fully answers, 60-79 = partial, <60 = inadequate)")
    reason: str = dspy.OutputField(desc="Brief explanation of the score")
    missing_aspects: str = dspy.OutputField(desc="What aspects of the question were not addressed, or 'none'")
