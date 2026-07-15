# Architecture

Project name:

LeanMe Website

Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Vercel
- GitHub

Structure

app/
components/
public/
data/
types/
hooks/
lib/
styles/

Content

All textual content must be separated from components.

Whenever possible, use JSON or Markdown as data sources.

Components

Components must be reusable.

Never duplicate code.

SEO

Every page must include:

- metadata
- OpenGraph
- structured data
- sitemap
- robots.txt

Performance

Target Lighthouse:

- Performance >95
- Accessibility >95
- Best Practices >95
- SEO >100

Deployment

GitHub is the source repository.

Vercel automatically deploys from GitHub.

All commits must remain production ready.

LeanYou / Leonardo

Multi-tenant customer area. Architecture:

- `docs/leanyou-event-architecture.md` — menu, sezioni evento, AI, sito pubblico
- `docs/leanyou-events.md` — operational spec and sprints
- `docs/leanyou-event-platform-packs.md` — commercial packs CORE → PLATINUM