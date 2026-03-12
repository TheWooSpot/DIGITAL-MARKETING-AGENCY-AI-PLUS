# Claude Planning Import – Bridge to Cursor & CodeSpring

**Purpose:** Paste planning from Claude.ai or Claude Desktop here so Cursor can compare it with the GitHub codebase and CodeSpring, then sync and regenerate PRDs.

---

## How to use this

1. **Export or copy** your planning from Claude:
   - **Claude Desktop:** Copy key conversations, or Settings → Privacy → Export data (full export via email)
   - **Claude.ai:** Copy the relevant conversation(s) or use a browser extension to export

2. **Paste below** under "Claude planning to import"

3. **In Cursor** (Chat or Composer), paste this prompt:

   ```
   Read docs/CLAUDE-PLANNING-IMPORT.md. Compare the Claude planning with:
   - The current codebase (src/, components, services)
   - CodeSpring project 419856ba-2bae-40c3-a556-deef297d387b
   Then: (1) Sync blended updates to CodeSpring via MCP, (2) Create/update PRDs in docs/ for Cursor to implement.
   ```

---

## Claude planning to import

<!-- PASTE YOUR CLAUDE PLANNING BELOW THIS LINE -->




---

## After import

- Cursor will compare Claude's planning with `src/` (GitHub codebase) and CodeSpring
- Blended updates will sync to CodeSpring (features, notes)
- PRDs will be created/updated for Cursor to implement
