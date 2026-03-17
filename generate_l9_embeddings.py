"""
Socialutely — L9 Knowledge Base & SOPs Embedding Generator
===========================================================
Run this script to generate Voyage-3 embeddings for all records in:
  - layer9_knowledge_base  (25 articles)
  - layer9_sops            (5 SOPs)

Prerequisites:
  pip install voyageai supabase python-dotenv

Create a .env file in the same folder with these 3 lines:
  VOYAGE_API_KEY=your_voyage_key
  SUPABASE_URL=https://aagggflwhadxjjhcaohc.supabase.co
  SUPABASE_SERVICE_KEY=your_service_role_key
"""

import os
import time
import json
from dotenv import load_dotenv

load_dotenv()

VOYAGE_API_KEY   = os.environ.get("VOYAGE_API_KEY")
SUPABASE_URL     = os.environ.get("SUPABASE_URL")
SUPABASE_KEY     = os.environ.get("SUPABASE_SERVICE_KEY")
VOYAGE_MODEL     = "voyage-3"
BATCH_SIZE       = 8
SLEEP_SECONDS    = 1.0

def check_env():
    missing = []
    if not VOYAGE_API_KEY:   missing.append("VOYAGE_API_KEY")
    if not SUPABASE_URL:     missing.append("SUPABASE_URL")
    if not SUPABASE_KEY:     missing.append("SUPABASE_SERVICE_KEY")
    if missing:
        print(f"\n ERROR — Missing environment variables: {', '.join(missing)}")
        print(" Create a .env file in this folder with those 3 lines.")
        exit(1)
    print(f" Keys loaded OK")
    print(f" Supabase: {SUPABASE_URL}")
    print(f" Voyage model: {VOYAGE_MODEL}")

def get_clients():
    import voyageai
    from supabase import create_client
    vo = voyageai.Client(api_key=VOYAGE_API_KEY)
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    return vo, sb

def embed_batch(vo, texts):
    result = vo.embed(texts, model=VOYAGE_MODEL, input_type="document")
    return result.embeddings

def embed_kb(vo, sb):
    print("\n--- layer9_knowledge_base ---")
    rows = sb.table("layer9_knowledge_base")\
             .select("id, article_title, content, category")\
             .is_("embedding", "null")\
             .execute().data
    if not rows:
        print("  All articles already embedded.")
        return
    print(f"  {len(rows)} articles to embed...")
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i+BATCH_SIZE]
        texts = [f"Title: {r['article_title']}\nCategory: {r['category']}\n\n{r['content']}" for r in batch]
        embeddings = embed_batch(vo, texts)
        for r, emb in zip(batch, embeddings):
            sb.table("layer9_knowledge_base").update({"embedding": emb}).eq("id", r["id"]).execute()
        print(f"  Batch {i//BATCH_SIZE+1} done — {len(batch)} embedded")
        if i + BATCH_SIZE < len(rows):
            time.sleep(SLEEP_SECONDS)
    print(f"  DONE — {len(rows)} articles embedded")

def embed_sops(vo, sb):
    print("\n--- layer9_sops ---")
    rows = sb.table("layer9_sops")\
             .select("id, sop_name, category, purpose, procedure_steps")\
             .is_("embedding", "null")\
             .execute().data
    if not rows:
        print("  All SOPs already embedded.")
        return
    print(f"  {len(rows)} SOPs to embed...")
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i+BATCH_SIZE]
        texts = []
        for r in batch:
            steps = r.get("procedure_steps", [])
            if isinstance(steps, str):
                steps = json.loads(steps)
            steps_text = "\n".join(f"- {s}" for s in steps) if steps else ""
            texts.append(f"SOP: {r['sop_name']}\nCategory: {r['category']}\nPurpose: {r['purpose']}\n\nSteps:\n{steps_text}")
        embeddings = embed_batch(vo, texts)
        for r, emb in zip(batch, embeddings):
            sb.table("layer9_sops").update({"embedding": emb}).eq("id", r["id"]).execute()
        print(f"  Batch {i//BATCH_SIZE+1} done — {len(batch)} embedded")
        if i + BATCH_SIZE < len(rows):
            time.sleep(SLEEP_SECONDS)
    print(f"  DONE — {len(rows)} SOPs embedded")

def verify(sb):
    print("\n--- Verification ---")
    kb  = sb.table("layer9_knowledge_base").select("id", count="exact").execute()
    kbe = sb.table("layer9_knowledge_base").select("id", count="exact").not_.is_("embedding","null").execute()
    sp  = sb.table("layer9_sops").select("id", count="exact").execute()
    spe = sb.table("layer9_sops").select("id", count="exact").not_.is_("embedding","null").execute()
    print(f"  KB articles:  {kbe.count}/{kb.count} embedded")
    print(f"  SOPs:         {spe.count}/{sp.count} embedded")
    if kbe.count == kb.count and spe.count == sp.count:
        print("\n  ALL DONE. RAG is live and queryable.")
    else:
        print("\n  Some records still missing embeddings. Re-run this script.")

def test_search(vo, sb):
    print("\n--- Test Search ---")
    q = "how does VoiceBridge handle inbound calls and booking"
    print(f"  Query: '{q}'")
    qemb = vo.embed([q], model=VOYAGE_MODEL, input_type="query").embeddings[0]
    res = sb.rpc("search_knowledge_base", {"query_embedding": qemb, "match_count": 3}).execute()
    if res.data:
        print(f"  Top {len(res.data)} results:")
        for r in res.data:
            print(f"    [{r['similarity']:.3f}]  {r['article_title']}")
    else:
        print("  No results — embeddings may still be indexing.")

if __name__ == "__main__":
    print("=" * 50)
    print("  Socialutely L9 Embedding Generator")
    print("=" * 50)
    check_env()
    vo, sb = get_clients()
    embed_kb(vo, sb)
    embed_sops(vo, sb)
    verify(sb)
    test_search(vo, sb)
    print("\nDone.")