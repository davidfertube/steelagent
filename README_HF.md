---
title: Spec Agents
emoji: 🔧
colorFrom: yellow
colorTo: gray
sdk: docker
pinned: false
license: mit
app_port: 3000
---

# Spec Agents - AI-Powered Steel Specifications Search

An AI-powered RAG (Retrieval-Augmented Generation) application for querying steel specifications and O&G compliance documents.

## Features

- **Intelligent Search**: Natural language queries for steel specifications
- **Source Citations**: Every answer includes traceable document references
- **Compliance Checking**: Verify materials against NACE, ASTM, API standards
- **Demo Mode**: Works out-of-the-box with sample steel specification data

## Quick Start

1. Enter a query like "What is the yield strength of A106 Grade B?"
2. Get AI-powered answers with source citations
3. Verify compliance with industry standards

## Example Queries

- "What is the yield strength of A106 Grade B?"
- "Does 4140 steel meet NACE MR0175 requirements?"
- "Compare A53 and A106 for high-temperature service"
- "Maximum allowable hardness for sour service?"

## Technology

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: FastAPI, LangGraph, Google Gemini
- **Vector DB**: Pinecone
- **Deployment**: Hugging Face Spaces (Docker)

## Links

- [GitHub Repository](https://github.com/davidfertube/steel-venture)
- [Live Demo](https://red-flower-0152ee60f.1.azurestaticapps.net)

## License

MIT License
