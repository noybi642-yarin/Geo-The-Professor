{
  "name": "geoprofessor",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "seed": "tsx src/scripts/seed-timeline.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "@supabase/supabase-js": "^2.43.0",
    "@supabase/ssr": "^0.3.0",
    "next": "14.2.4",
    "react": "^18",
    "react-dom": "^18",
    "framer-motion": "^11.2.10",
    "date-fns": "^3.6.0",
    "zod": "^3.23.8",
    "rss-parser": "^3.13.0",
    "axios": "^1.7.2"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "14.2.4",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "tsx": "^4.15.6",
    "typescript": "^5"
  }
}
