# Writer — Local Story Editor

A small offline-first story editor that stores stories as folders on disk. Each story folder contains:
- text.md — main story text (Markdown)
- characters.md — character entries (sections starting with `## Name`)
- locations.md — location entries (sections starting with `## Name`)
- images/ — images used in the story
  - characters/
  - locations/
  - text/

Features
- Create / open / close stories (stored as folders under `stories/`)
- WYSIWYG-ish Markdown editor with live preview (uses marked when available, a simple fallback otherwise)
- Right-click a word to create a Character or Location — creates the entity and opens it in the main editor
- Characters and locations are highlighted in the preview; hover shows a tooltip with image and short text
- Autosave: edits are saved automatically (debounced) — Save button hidden by default
- Counts: sidebar shows how many times each character/location is mentioned in the main text (updates live while editing main text)
- Image uploads for the editor and entity pages

Local development / run
1. Install Node.js (tested with Node 18+)
2. Install dependencies (if any are added later) — currently no install step is required for the shipped code.
3. Start the server:
   node server.js
4. Open the app in your browser:
   http://localhost:3000

Tags
- Syntax: write tags inline using a leading hash, e.g. #character, #hero, #location-name.
- Where they render: tags are rendered in the right-hand preview pane as small pastel "pills" containing the tag text (the leading '#' is omitted in the pill).
- Color and contrast: each tag is assigned a deterministic pastel background color derived from the tag text; the pill text uses a darker shade of the same hue for readable contrast.
- Behavior: tags are rendered only in the preview (they do not alter the underlying markdown). Tag syntax accepts letters, numbers, underscores and hyphens.
- Example: In a highlight description include "The guard #character stood watch. The main #hero arrived." — the preview will show "character" and "hero" as colored pill badges.
