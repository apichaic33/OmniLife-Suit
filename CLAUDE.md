# LLM Wiki — Schema & Operating Instructions

This file defines how Claude maintains the wiki for this Obsidian vault.
The vault is a personal knowledge base tracking the development of **OmniLife Suit**
and research into integrating AI tools (MiroFish, Gemini, etc.).

---

## Directory Layout

```
/                          ← Obsidian vault root
├── CLAUDE.md              ← this file (schema)
├── raw/                   ← source documents (read-only, never modified)
│   ├── *.md               ← clipped articles, notes
│   └── MiroFish-main/     ← extracted source code
├── wiki/                  ← LLM-maintained wiki (Claude writes here)
│   ├── index.md           ← content catalog (update on every ingest)
│   ├── log.md             ← append-only chronological log
│   ├── overview.md        ← high-level synthesis of everything
│   ├── entities/          ← pages for tools, projects, services
│   ├── concepts/          ← pages for ideas, patterns, techniques
│   └── sources/           ← summary pages for each raw source
└── DEPLOYMENT_GUIDE.md    ← source document (treat as raw)
```

---

## Wiki Page Format

Every wiki page starts with YAML frontmatter:

```yaml
---
title: "Page Title"
type: entity | concept | source | overview
tags: [tag1, tag2]
related: [[PageA]], [[PageB]]
source_count: 0
updated: YYYY-MM-DD
---
```

Body uses standard markdown with Obsidian `[[wikilinks]]` for cross-references.

---

## Operations

### Ingest
When the user drops a new file in `raw/` and says "ingest":
1. Read the source file
2. Discuss key takeaways with user
3. Create or update `wiki/sources/<SourceName>.md`
4. Update or create relevant entity/concept pages (may touch 5-15 pages)
5. Update `wiki/index.md` — add new pages, update summaries
6. Append entry to `wiki/log.md` with format: `## [YYYY-MM-DD] ingest | Source Title`

### Query
When the user asks a question:
1. Read `wiki/index.md` to find relevant pages
2. Read those pages and synthesize an answer with `[[citations]]`
3. If the answer is valuable, offer to file it as a new wiki page

### Lint
When the user says "lint the wiki":
1. Check for: contradictions, stale claims, orphan pages, missing cross-references
2. Report findings and suggest fixes
3. Append `## [YYYY-MM-DD] lint` entry to `wiki/log.md`

---

## Conventions

- **Language**: English for page titles and structure; Thai allowed in body text
- **Wikilinks**: Always use `[[PageName]]` — Obsidian renders these as clickable links
- **Cross-references**: Every entity/concept page must link to at least 2 other pages
- **Contradictions**: Flag with `> ⚠️ Contradicts [[OtherPage]] — ...`
- **Costs**: Record as THB (฿) for consistency
- **Source code references**: Link to `raw/MiroFish-main/backend/...` with file paths

---

## Domain Context

**Primary project**: OmniLife Suit — personal management app  
**Stack**: React 19 + TypeScript + Firebase + Gemini AI + GitHub Pages  
**Research focus**: Integrating MiroFish (swarm intelligence prediction engine)  
**User goal**: Free or near-free AI-powered prediction for Finance and Trade modules  
**Constraint**: GitHub Pages = static only; any backend needs separate hosting  
