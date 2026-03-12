# MCP-Based Workflow: Cursor + Claude + CodeSpring + GitHub

**Goal:** Do planning, building, and syncing via MCP—minimal manual steps.

---

## MCPs in Your Stack

| MCP | Role | Status |
|-----|------|--------|
| **CodeSpring MCP** | Plan, mindmap, features, PRDs, tasks | ✓ Connected |
| **GitHub MCP** | Repos, issues, PRs, push files | ✓ Remote (no Docker) |
| **Claude Code** | Planning in terminal, `/ide cursor` for edits, MCP tools (View, Edit, LS) | ✓ Connected via MCP |
| **Claude Code Exporter** | Export Claude Code conversations → file | Use CLI (MCP errored) |

---

## MCP Workflow (What Cursor Can Do)

### 1. Sync Cursor → CodeSpring (via MCP)

**In Cursor Chat/Composer, run:**

```
Sync the codebase to CodeSpring: update project metadata, tech stack, and features for project 419856ba-2bae-40c3-a556-deef297d387b. Use CodeSpring MCP.
```

**Tools used:** `sync_project_metadata`, `update_tech_stack_node`, `update_features_node`

---

### 2. Pull from CodeSpring (via MCP)

**In Cursor Chat/Composer, run:**

```
Get the CodeSpring mindmap, features, and tasks for project 419856ba-2bae-40c3-a556-deef297d387b. Summarize what's planned vs what's built in the codebase.
```

**Tools used:** `get_mindmap`, `get_project_features`, `get_tasks`

---

### 3. Add Feature Notes to CodeSpring (via MCP)

**In Cursor Chat/Composer, run:**

```
Add a feature note to CodeSpring for feature [featureId]: "Claude planning: [paste key points]"
```

**Tool used:** `add_feature_notes`

---

### 4. Push to GitHub (via MCP or git)

**If GitHub MCP works:**
```
Push the latest changes to GitHub repo TheWooSpot/DIGITAL-MARKETING-AGENCY-AI-PLUS
```

**Otherwise (git):**
```bash
git add -A; git commit -m "Update"; git push
```

---

## Claude Planning → Cursor

**Claude Code** stores conversations in `~/.claude` or `%USERPROFILE%\.claude`.

**Export via CLI (MCP not working):** The claude-code-exporter MCP errors in Cursor. Use the CLI instead:

```powershell
# Export prompts from last 7 days to ./exports
npx -y claude-code-exporter --prompts --markdown --period 7d -o ./exports

# Export full conversations as JSON
npx -y claude-code-exporter --full --json -o ./exports

# Aggregate all projects
npx -y claude-code-exporter aggregate --both -o ./exports
```

Then paste key planning into `docs/CLAUDE-PLANNING-IMPORT.md` and ask Cursor to sync to CodeSpring.

**If you do planning in Claude.ai or Claude Desktop:**
- Use copy/paste into `docs/CLAUDE-PLANNING-IMPORT.md` or Claude's export (Settings → Privacy → Export data).

---

## One-Prompt Flow (Cursor)

**Paste this in Cursor Composer:**

```
1. Get CodeSpring project 419856ba-2bae-40c3-a556-deef297d387b: mindmap, features, tasks.
2. Compare with the current codebase (src/, components).
3. Sync any gaps to CodeSpring (metadata, features, notes).
4. Create/update PRDs in docs/ for the next build items.
5. List what to implement next.
```

Cursor will use CodeSpring MCP for steps 1–3 and write PRDs locally for step 4.

---

## Quick Reference

| Task | MCP / Command |
|------|----------------|
| Sync Cursor → CodeSpring | CodeSpring MCP: sync_project_metadata, update_features_node |
| Get CodeSpring state | CodeSpring MCP: get_mindmap, get_project_features, get_tasks |
| Add planning notes | CodeSpring MCP: add_feature_notes |
| Push to GitHub | GitHub MCP (remote) or `git push` |
| Export Claude Code planning | CLI: `npx -y claude-code-exporter --prompts --markdown -o ./exports` |
