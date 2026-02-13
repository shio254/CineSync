# Sync 🎬

> **"Stop scrolling. Start watching."**

**Sync** is an open-source movie discovery platform engineered to solve the "Decision Paralysis" epidemic.

While platforms like IMDb, Netflix, and Letterboxd focus on *content aggregation* (listing 10,000 movies), Sync focuses on *decision architecture*. It replaces the traditional "Search & Browse" model with a "Triage & Prescribe" model, using a custom **Vibe Engine** and **Trust Graph** to narrow down thousands of options to the perfect three.

![Project Status: Alpha](https://img.shields.io/badge/Status-Alpha_MVP-emerald)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## ⚡ The Core Problem

**The Paradox of Choice:**  
Streaming services have optimized for *retention* (keeping you browsing), not *satisfaction* (helping you watch).  
- **The Infinite Scroll:** Users spend an average of 45 minutes browsing before selecting content.  
- **Rating Inflation:** A 7.8/10 on IMDb is meaningless. Is it a "fun" 7.8 (Fast & Furious) or a "draining" 7.8 (Schindler's List)?  
- **Review Fatigue:** Users do not want to read 500-word reviews from strangers. They want to know if their *friends* liked it.

---

## 🚀 The Sync Solution (Architecture)

Sync is built on three pillars that fundamentally change how users interact with movie data.

### 1. The Decision Doctor 🩺 (The Triage Interface)
This is the entry point of the application. We removed the "Search Bar" from the hero section and replaced it with a diagnostic tool.

- **Input:** The user answers 3 context-aware questions via a slider interface:  
  1. **Mental Load:** *Vegetable* (0% Brain) ↔ *Sherlock* (100% Focus)  
  2. **Social Context:** *Solo* ↔ *Date Night* ↔ *The Group*  
  3. **Time Constraint:** *Quick Fix* (<90m) ↔ *Epic* (>2h 30m)  
- **Logic:** The algorithm filters the TMDB database not just by genre, but by weighted attributes (Runtime + Vote Count + Keyword Density).  
- **Output:** The system returns exactly **3 Cards** (The Golden Trio). The user *must* choose one or reject the diagnosis. No scrolling allowed.

### 2. The Vibe Engine 🔮 (Contextual Tagging)
Standard genres (Action, Drama) are too broad. Sync introduces "Vibe Tags"—a secondary metadata layer powered by LLM analysis of plot summaries.

| Traditional Genre | Sync Vibe Tag   | Why it matters                          |
|-------------------|-----------------|-----------------------------------------|
| **Sci-Fi**       | *Mind Bender*  | For users who want to think (e.g., *Inception*). |
| **Sci-Fi**       | *Popcorn Fun*  | For users who want explosions (e.g., *Transformers*). |
| **Horror**       | *True Dread*   | For users who want to be scared (e.g., *Hereditary*). |
| **Horror**       | *Campy*        | For users who want to laugh at the scares (e.g., *M3GAN*). |

### 3. The Inner Circle 🤝 (The Trust Graph)
Sync eliminates the "Global Rating" (e.g., 7.8/10) in favor of a "Network Rating."

- **The Trust Score:** If you follow 5 friends, the movie's rating is the average of *their* scores only.  
- **The Stamp System:** We replaced text reviews with "Stamps"—one-click reactions that populate the database instantly.  
  - *Examples:* "Theater Worthy", "Laptop Movie", "Second Screen" (Boring), "Guilty Pleasure".  
- **The Feed:** The sidebar on every movie page shows *"Approved by Rahul"* rather than generic user reviews.

---

## 🛠️ Technical Stack

This project is built as a modern, server-side rendered application for maximum SEO and performance.

### Frontend
- **Framework:** [Next.js 14](https://nextjs.org/) (App Router & Server Components)  
- **Language:** TypeScript (Strict Mode)  
- **Styling:** Tailwind CSS (Utility-first architecture)  
- **Icons:** Lucide React  
- **UI Components:** Custom "Glassmorphism" design system (see `/components/ui`)

### Backend & Data
- **API Integration:** TMDB (The Movie Database) API v3  
- **Fetching Strategy:** Server Actions for data fetching; cached requests (ISR) to minimize API rate limits.  
- **Algorithm:** `lib/algorithm.ts` contains the logic for the Decision Doctor's filtering weights.

### Planned Architecture (v2.0)
- **Database:** Supabase (PostgreSQL) for User Auth & Friend Graphs.  
- **AI Service:** OpenAI API (gpt-4o-mini) to auto-generate Vibe Tags for new movies.

---

## 📂 Project Structure

A quick guide to navigating the codebase:

```bash
/app
 ├── doctor/               # The "Decision Doctor" interactive flow
 │   └── page.tsx          # State management for the 3-step questionnaire
 ├── movie/[id]/           # Dynamic Movie Details Page
 │   └── page.tsx          # Server Component that fetches TMDB data + Vibe Injection
 ├── api/diagnose/         # The API Route processing the doctor's logic
 └── layout.tsx            # Global UI wrapper (Navbar, Fonts)

/components
 ├── doctor/               # UI components specific to the questionnaire (Sliders, Cards)
 ├── features/             # The "Vibe Badge" and "Stamp" components
 └── ui/                   # Reusable atoms (Buttons, Modals)

/lib
 ├── tmdb.ts               # Typed fetcher functions for The Movie Database
 ├── algorithm.ts          # The core logic mapping "Feelings" to "Database Queries"
 └── constants.ts          # Configuration for Vibe Tag mappings
```
# 🏁 Getting Started (Developer Guide)
Follow these steps to set up the local development environment.
1. Prerequisites
 1. Node.js 18.17 or later.
 2. A free API Key from TMDB.
2. Installation
```bash
# Clone the repository
git clone https://github.com/shio254/sync-platform.git
cd sync-platform

# Install dependencies
npm install
```
# 3. Environment Configuration
Create a .env.local file in the root directory. This keeps your API keys secure.
```bash
TMDB_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
# 4. Running the App
```bash
npm run dev
```
Open http://localhost:3000 to view the platform.
## 🛣️ Roadmap

- [x] **Phase 1: The Skeleton (Completed)**  
  - Next.js 14 Setup  
  - TMDB API Integration  
  - Basic "Movie Details" Page  

- [x] **Phase 2: The Logic (Completed)**  
  - Decision Doctor Algorithm (`lib/algorithm.ts`)  
  - Interactive Questionnaire UI  

- [ ] **Phase 3: The Brain (In Progress)**  
  - Integrate OpenAI to scan plot summaries and assign Vibe Tags automatically.  

- [ ] **Phase 4: The Network (Planned)**  
  - Supabase Auth integration.  
  - User Profiles and Friend Following system.
# 🤝 Contributing
 * Fork it
 * git checkout -b feature/amazing-thing
 * Commit & push
 * Open a Pull Request
---
# 📄 License
MIT License. See LICENSE for details.

---
Built with 🖤 by shio254 • Let's end the scroll together! 🍿
```bash

**Done.**  
Just copy → paste → commit.  
Your README will now look perfect on GitHub with the correct repo name and clean Getting Started section.

Let me know when it’s live — I’ll be the first to star it 🔥
```
