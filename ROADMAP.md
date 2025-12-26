# Project Roadmap & Contribution Ideas

This document outlines the planned features and improvements for **My AI Architecture**. If you're looking to contribute, this is a great place to start!

## 🚀 Short-Term Goals (High Priority)

### 1. Rate Limiting

- **Goal**: Protect the `/api/analyze` endpoint from abuse.
- **Tech**: [Upstash Redis](https://upstash.com/) or [Vercel KV](https://vercel.com/docs/storage/vercel-kv).
- **Task**: Implement a middleware or API-level rate limiter.

### 2. Prompt Versioning & A/B Testing

- **Goal**: Compare different system prompts to see which yields better results.
- **Task**: Add a `version` parameter to the API and log results for comparison.

### 3. Result Persistence Enhancements

- **Goal**: Allow users to view their analysis history.
- **Task**: Create a "History" page or sidebar that fetches previous tasks from the database.

## 🛠️ Long-Term Goals

### 1. RAG (Retrieval-Augmented Generation)

- **Goal**: Use `pgvector` to provide context-aware analysis based on a knowledge base.
- **Task**: Implement an embedding pipeline for PDF/Markdown files and a similarity search query.

### 2. AI Evaluation Suite

- **Goal**: Automatically score AI responses based on accuracy and tone.
- **Task**: Create a script that runs a test set through the API and generates a report.

## 🌟 Good First Issues

If you're new to the project, try one of these!

- [ ] **UI: Dark Mode Support**: Add a theme toggle using `next-themes`.
- [ ] **UI: Loading States**: Improve the skeleton screens during analysis.
- [ ] **Docs: API Documentation**: Create a Swagger/OpenAPI spec for the endpoints.
- [ ] **Feature: Export to PDF**: Add a button to download the analysis result as a PDF.
- [ ] **Refactor: Error Handling**: Improve the error messages returned by the API when the AI fails.

---

## 💡 How to Suggest a Feature

Have an idea not listed here? Open an [Issue](https://github.com/your-username/my-ai-arch/issues) with the tag `enhancement`!
