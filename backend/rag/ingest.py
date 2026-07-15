"""
ingest.py — Load scenario JSON files into ChromaDB with Ollama embeddings.

Usage:
    python ingest.py --data_dir ./data

Expects JSON files in the format of response_data_*.json:
  {
    "profile": "{ ... }",
    "response": "{ \"scenarios\": [ ... ] }"
  }
"""

import argparse
import json
import re
import os
import chromadb
from chromadb.utils.embedding_functions import OllamaEmbeddingFunction

# ── Config ────────────────────────────────────────────────────────────────────
OLLAMA_BASE_URL = "http://localhost:11434"
EMBED_MODEL     = "nomic-embed-text"
COLLECTION_NAME = "scenarios"
# ─────────────────────────────────────────────────────────────────────────────


def strip_json_fences(text: str) -> str:
    """Remove markdown code fences if present."""
    return re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)


def clean_response_text(text: str) -> str:
    """Aggressively clean the response field before JSON parsing."""
    # Remove markdown fences
    text = strip_json_fences(text)

    # Remove trailing commas before } or ] (common LLM JSON corruption)
    text = re.sub(r",\s*([}\]])", r"\1", text)

    # Truncate anything after the last closing brace
    last_brace = text.rfind("}")
    if last_brace != -1:
        text = text[:last_brace + 1]

    return text


def load_file(path: str) -> list[dict]:
    """Parse one response_data JSON file and return a flat list of scenario dicts."""
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)

    # Profile is a JSON string
    profile = json.loads(raw["profile"])

    # Clean and parse the response field
    response_text = clean_response_text(raw["response"])

    try:
        response = json.loads(response_text)
    except json.JSONDecodeError as e:
        # Print a helpful snippet around the error position
        snippet_start = max(0, e.pos - 80)
        snippet_end   = min(len(response_text), e.pos + 80)
        print(f"\n  ERROR in {os.path.basename(path)}: {e}")
        print(f"  Around char {e.pos}:")
        print(f"  ...{repr(response_text[snippet_start:e.pos])}  <-- HERE")
        print(f"  ...{repr(response_text[e.pos:snippet_end])}...")

        # Save the cleaned text for manual inspection
        debug_path = path + ".debug.txt"
        with open(debug_path, "w", encoding="utf-8") as dbg:
            dbg.write(response_text)
        print(f"  Full cleaned text saved to: {debug_path}")
        raise

    scenarios = []
    for s in response["scenarios"]:
        scenarios.append({
            "file":     os.path.basename(path),
            "profile":  profile,
            "scenario": s,
        })
    return scenarios


def scenario_to_text(item: dict) -> str:
    """Convert a scenario dict into a plain-text chunk for embedding."""
    p = item["profile"]
    s = item["scenario"]
    options_text = "\n".join(
        f"  [{o['id']}] {o['text']} ({o['strategy']})"
        for o in s["options"]
    )
    return (
        f"Title: {s['title']}\n"
        f"Difficulty: {s['difficulty']}/6\n"
        f"Narrative: {s['narrative']}\n"
        f"Options:\n{options_text}\n"
        f"User Profile — Age: {p.get('age','?')}, Mood: {p.get('mood','?')}, "
        f"Sleep: {p.get('sleepHours','?')}h, Stress: {p.get('stressLevel','?')}/10, "
        f"Support: {p.get('support','?')}, Goals: {p.get('goals','?')}"
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", default="./data",
                        help="Folder containing response_data_*.json files")
    parser.add_argument("--reset", action="store_true",
                        help="Delete and recreate the collection before ingesting")
    parser.add_argument("--skip_errors", action="store_true",
                        help="Skip files that fail to parse instead of stopping")
    args = parser.parse_args()

    # ── Collect files ─────────────────────────────────────────────────────────
    files = sorted(
        os.path.join(args.data_dir, f)
        for f in os.listdir(args.data_dir)
        if f.endswith(".json")
    )
    if not files:
        print(f"No JSON files found in {args.data_dir}")
        return

    print(f"Found {len(files)} file(s): {[os.path.basename(f) for f in files]}")

    # ── ChromaDB + Ollama embedding function ──────────────────────────────────
    embed_fn = OllamaEmbeddingFunction(
        url=f"{OLLAMA_BASE_URL}/api/embeddings",
        model_name=EMBED_MODEL,
    )

    client = chromadb.PersistentClient(path="./chroma_db")

    if args.reset and COLLECTION_NAME in [c.name for c in client.list_collections()]:
        client.delete_collection(COLLECTION_NAME)
        print(f"Deleted existing collection '{COLLECTION_NAME}'")

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=embed_fn,
        metadata={"hnsw:space": "cosine"},
    )

    # ── Ingest ────────────────────────────────────────────────────────────────
    total = 0
    skipped = []
    for path in files:
        try:
            items = load_file(path)
        except Exception as e:
            if args.skip_errors:
                print(f"  ⚠ Skipping {os.path.basename(path)}: {e}")
                skipped.append(os.path.basename(path))
                continue
            else:
                print(f"\nTip: run with --skip_errors to skip bad files and continue.")
                raise

        documents, metadatas, ids = [], [], []
        for item in items:
            sid = f"{item['file']}__scenario_{item['scenario']['id']}"
            documents.append(scenario_to_text(item))
            metadatas.append({
                "file":        item["file"],
                "title":       item["scenario"]["title"],
                "difficulty":  item["scenario"]["difficulty"],
                "scenario_id": item["scenario"]["id"],
                **{f"profile_{k}": str(v) for k, v in item["profile"].items()},
            })
            ids.append(sid)

        collection.upsert(documents=documents, metadatas=metadatas, ids=ids)
        total += len(items)
        print(f"  ✓ {os.path.basename(path)} — {len(items)} scenarios ingested")

    print(f"\nDone. {total} scenarios in collection '{COLLECTION_NAME}'.")
    if skipped:
        print(f"Skipped {len(skipped)} file(s): {skipped}")
        print("Check the .debug.txt files next to each skipped file for details.")


if __name__ == "__main__":
    main()