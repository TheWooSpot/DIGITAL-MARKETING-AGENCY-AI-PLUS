"""
Socialutely — L9 Embedding Generator (Python 3.14 compatible)
Uses only: voyageai + urllib (built-in) + json (built-in)
No supabase library needed — calls Supabase REST API directly.

Prerequisites — ONE install only:
  pip install voyageai

.env file needs 3 lines:
  VOYAGE_API_KEY=your_key
  SUPABASE_URL=https://aagggflwhadxjjhcaohc.supabase.co
  SUPABASE_SERVICE_KEY=your_service_role_key
"""

import os, json, time, urllib.request, urllib.error
from pathlib import Path

# ── Load .env manually (no python-dotenv needed) ─────────────────────────────
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

VOYAGE_API_KEY  = os.environ.get("VOYAGE_API_KEY", "")
SUPABASE_URL    = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY    = os.environ.get("SUPABASE_SERVICE_KEY", "")
VOYAGE_MODEL    = "voyage-3"
BATCH_SIZE      = 8

# ── Validate keys ─────────────────────────────────────────────────────────────
def check_env():
    missing = [k for k, v in [
        ("VOYAGE_API_KEY", VOYAGE_API_KEY),
        ("SUPABASE_URL", SUPABASE_URL),
        ("SUPABASE_SERVICE_KEY", SUPABASE_KEY)
    ] if not v]
    if missing:
        print(f"\n  ERROR — Missing: {', '.join(missing)}")
        print("  Check your .env file.")
        exit(1)
    print(f"  Keys loaded OK")
    print(f"  Supabase: {SUPABASE_URL}")
    print(f"  Voyage model: {VOYAGE_MODEL}")

# ── Supabase REST helpers ─────────────────────────────────────────────────────
def supa_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

def supa_get(table, select="*", filters=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&embedding=is.null{filters}"
    req = urllib.request.Request(url, headers=supa_headers())
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def supa_patch(table, row_id, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{row_id}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=supa_headers(), method="PATCH")
    with urllib.request.urlopen(req) as r:
        return r.status

def supa_rpc(fn, params):
    url = f"{SUPABASE_URL}/rest/v1/rpc/{fn}"
    body = json.dumps(params).encode()
    req = urllib.request.Request(url, data=body, headers=supa_headers(), method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

# ── Voyage embedding ──────────────────────────────────────────────────────────
def voyage_embed(texts, input_type="document"):
    import voyageai
    vo = voyageai.Client(api_key=VOYAGE_API_KEY)
    result = vo.embed(texts, model=VOYAGE_MODEL, input_type=input_type)
    return result.embeddings

# ── Embed KB articles ─────────────────────────────────────────────────────────
def embed_kb():
    print("\n--- layer9_knowledge_base ---")
    rows = supa_get("layer9_knowledge_base", "id,article_title,content,category")
    if not rows:
        print("  All articles already embedded.")
        return
    print(f"  {len(rows)} articles to embed...")
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i+BATCH_SIZE]
        texts = [f"Title: {r['article_title']}\nCategory: {r['category']}\n\n{r['content']}" for r in batch]
        embeddings = voyage_embed(texts)
        for r, emb in zip(batch, embeddings):
            supa_patch("layer9_knowledge_base", r["id"], {"embedding": emb})
        print(f"  Batch {i//BATCH_SIZE+1} done — {len(batch)} articles embedded")
        if i + BATCH_SIZE < len(rows):
            time.sleep(0.5)
    print(f"  DONE — {len(rows)} articles embedded")

# ── Embed SOPs ────────────────────────────────────────────────────────────────
def embed_sops():
    print("\n--- layer9_sops ---")
    rows = supa_get("layer9_sops", "id,sop_name,category,purpose,procedure_steps")
    if not rows:
        print("  All SOPs already embedded.")
        return
    print(f"  {len(rows)} SOPs to embed...")
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i+BATCH_SIZE]
        texts = []
        for r in batch:
            steps = r.get("procedure_steps") or []
            if isinstance(steps, str):
                steps = json.loads(steps)
            steps_text = "\n".join(f"- {s}" for s in steps)
            texts.append(f"SOP: {r['sop_name']}\nCategory: {r['category']}\nPurpose: {r['purpose']}\n\nSteps:\n{steps_text}")
        embeddings = voyage_embed(texts)
        for r, emb in zip(batch, embeddings):
            supa_patch("layer9_sops", r["id"], {"embedding": emb})
        print(f"  Batch {i//BATCH_SIZE+1} done — {len(batch)} SOPs embedded")
        if i + BATCH_SIZE < len(rows):
            time.sleep(0.5)
    print(f"  DONE — {len(rows)} SOPs embedded")

# ── Verify ────────────────────────────────────────────────────────────────────
def verify():
    print("\n--- Verification ---")
    # Get all records (no null filter)
    def count_all(table):
        url = f"{SUPABASE_URL}/rest/v1/{table}?select=id"
        h = dict(supa_headers())
        h["Prefer"] = "count=exact"
        req = urllib.request.Request(url, headers=h)
        with urllib.request.urlopen(req) as r:
            return int(r.headers.get("Content-Range","0/0").split("/")[-1])

    def count_embedded(table):
        url = f"{SUPABASE_URL}/rest/v1/{table}?select=id&embedding=not.is.null"
        h = dict(supa_headers())
        h["Prefer"] = "count=exact"
        req = urllib.request.Request(url, headers=h)
        with urllib.request.urlopen(req) as r:
            return int(r.headers.get("Content-Range","0/0").split("/")[-1])

    kb_total = count_all("layer9_knowledge_base")
    kb_emb   = count_embedded("layer9_knowledge_base")
    sop_total = count_all("layer9_sops")
    sop_emb   = count_embedded("layer9_sops")

    print(f"  KB articles : {kb_emb}/{kb_total} embedded")
    print(f"  SOPs        : {sop_emb}/{sop_total} embedded")

    if kb_emb == kb_total and sop_emb == sop_total:
        print("\n  ALL DONE. RAG is live and queryable.")
    else:
        print("\n  Some records still missing. Re-run this script.")

# ── Test search ───────────────────────────────────────────────────────────────
def test_search():
    print("\n--- Test Search ---")
    q = "how does VoiceBridge handle inbound calls and booking"
    print(f"  Query: '{q}'")
    import voyageai
    vo = voyageai.Client(api_key=VOYAGE_API_KEY)
    qemb = vo.embed([q], model=VOYAGE_MODEL, input_type="query").embeddings[0]
    results = supa_rpc("search_knowledge_base", {"query_embedding": qemb, "match_count": 3})
    if results:
        print(f"  Top {len(results)} results:")
        for r in results:
            print(f"    [{r['similarity']:.3f}]  {r['article_title']}")
    else:
        print("  No results returned.")

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  Socialutely L9 Embedding Generator")
    print("=" * 50)
    check_env()
    embed_kb()
    embed_sops()
    verify()
    test_search()
    print("\nDone.")
