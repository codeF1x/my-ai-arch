# My AI Architecture

A modern, AI-native full-stack application built with the Vercel standard technology stack.

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **AI SDK**: [Vercel AI SDK](https://sdk.vercel.ai/docs) (DeepSeek Provider)
- **Database**: [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (powered by Neon)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Validation**: [Zod](https://zod.dev/)

## ✨ Features

- **AI-Powered Analysis**: Integrated DeepSeek V3 for text analysis and structured data generation.
- **Vector Database**: Native `pgvector` support for semantic search and RAG capabilities.
- **Edge Ready**: Optimized for Vercel Edge Runtime (API routes).
- **Type Safety**: End-to-end type safety from database to frontend.

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- Vercel CLI (`npm i -g vercel`)
- A Vercel account with Postgres database created

### Environment Setup

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd my-ai-arch
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Pull Environment Variables**

   Link your local project to Vercel to pull the necessary environment variables (including `DATABASE_URL` and `DEEPSEEK_API_KEY`).

   ```bash
   vercel link
   vercel env pull .env.local
   ```

   Ensure your `.env.local` contains:

   - `DATABASE_URL`
   - `DEEPSEEK_API_KEY`

4. **Database Migration**

   Push the database schema to your Vercel Postgres instance.

   ```bash
   npx drizzle-kit push
   ```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

- `/app`: Next.js App Router pages and API routes.
  - `/api/analyze`: AI analysis endpoint.
- `/db`: Database configuration and schema definitions.
  - `schema.ts`: Drizzle schema with `pgvector` support.
- `/docs`: Project documentation and tutorials.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
