"""
query.py — Query the scenario RAG with Ollama.

Usage:
    python query.py                        # interactive mode
    python query.py --question "..."       # single question mode
    python query.py --question "..." --top_k 5
"""

import argparse
import json
import chromadb
from backend.rag.prompt import prompt,scenario_prompt
import ollama
from chromadb.utils.embedding_functions import OllamaEmbeddingFunction

# ── Config ────────────────────────────────────────────────────────────────────
OLLAMA_BASE_URL = "http://localhost:11434"
EMBED_MODEL     = "nomic-embed-text"
CHAT_MODEL      = "llama3"             # swap for mistral, phi3, gemma2, etc.
COLLECTION_NAME = "scenarios"
DEFAULT_TOP_K   = 3
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a compassionate mental-health support assistant api.
You have access to a library of stress-management scenario examples.
When answering, draw specifically on the retrieved scenarios provided.
Be warm, practical, and non-judgmental.You do not chat, explain, or add commentary — you output ONLY valid JSON.
when you create scenarios, create them in this exact JSON schema:

{
  "title": "string",
  "difficulty": "string",
  "narrative": "string",
  "options": [
    {
      "letter": "A",
      "text": "string",
      "trait": "string"
    }
  ]
}

Rules:
- Output ONLY the JSON object. No markdown code fences, no preamble, no closing remarks, no emojis.
- "difficulty" should be formatted as "3/6" (a string).
- Each option's "trait" is the parenthetical label at the end of the option text (e.g. "Avoidant / Rumination"), extracted separately from "text".
- Do not include any text before "{" or after "}".
"""


def build_context(results: dict) -> str:
    """Format ChromaDB results into a context block for the LLM."""
    chunks = []
    for i, (doc, meta) in enumerate(
        zip(results["documents"][0], results["metadatas"][0]), 1
    ):
        chunks.append(
            f"--- Retrieved Scenario {i} (from file: {meta['file']}) ---\n{doc}"
        )
    return "\n\n".join(chunks)

async def askOllama(profile):
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"User question: {scenario_prompt(profile)}"
            ),
        },
    ]
    response = ollama.chat(
        model=CHAT_MODEL,
        messages=messages,
        stream=True,
    )

    # print("\n\033[94m[Assistant]\033[0m ", end="", flush=True)
    full_response = ""
    for chunk in response:
        token = chunk["message"]["content"]
        # print(token, end="", flush=True)
        full_response += token

    print("\n finished generating scenarios")
    return full_response


def ask(question: str, collection, top_k: int = DEFAULT_TOP_K) -> str:
    # 1. Retrieve relevant scenarios
    results = collection.query(query_texts=[question], n_results=top_k)

    context = build_context(results)

    # 2. Build messages for Ollama
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Here are relevant scenarios from the library:\n\n{context}\n\n"
                f"User question: {question}"
            ),
        },
    ]

    # 3. Stream response from local Ollama
    response = ollama.chat(
        model=CHAT_MODEL,
        messages=messages,
        stream=True,
    )

    # print("\n\033[94m[Assistant]\033[0m ", end="", flush=True)
    full_response = ""
    for chunk in response:
        token = chunk["message"]["content"]
        # print(token, end="", flush=True)
        full_response += token

    print("\n finished generating scenarios")
    return full_response

async def apiRequestOlama(profile):
    global CHAT_MODEL
   

    # ── Connect to ChromaDB ───────────────────────────────────────────────────
    embed_fn = OllamaEmbeddingFunction(
        url=f"{OLLAMA_BASE_URL}/api/embeddings",
        model_name=EMBED_MODEL,
    )
    client = chromadb.PersistentClient(path="./chroma_db")
    collection = client.get_collection(
        name=COLLECTION_NAME,
        embedding_function=embed_fn,
    )
    print(f"Connected to collection '{COLLECTION_NAME}' "
          f"({collection.count()} scenarios).\n")


    # ── Interactive mode ──────────────────────────────────────────────────────
    print("Scenario RAG — type your question, or 'quit' to exit.\n")
    return ask(prompt(profile), collection)
        
def main():
    global CHAT_MODEL

    parser = argparse.ArgumentParser()
    parser.add_argument("--question", type=str, default=None,
                        help="Single question to ask (omit for interactive mode)")
    parser.add_argument("--top_k", type=int, default=DEFAULT_TOP_K,
                        help="Number of scenarios to retrieve")
    parser.add_argument("--model", type=str, default=CHAT_MODEL,
                        help=f"Ollama chat model (default: {CHAT_MODEL})")
    args = parser.parse_args()

    CHAT_MODEL = args.model

    # ── Connect to ChromaDB ───────────────────────────────────────────────────
    embed_fn = OllamaEmbeddingFunction(
        url=f"{OLLAMA_BASE_URL}/api/embeddings",
        model_name=EMBED_MODEL,
    )
    client = chromadb.PersistentClient(path="./chroma_db")
    collection = client.get_collection(
        name=COLLECTION_NAME,
        embedding_function=embed_fn,
    )
    print(f"Connected to collection '{COLLECTION_NAME}' "
          f"({collection.count()} scenarios).\n")

    # ── Single question mode ──────────────────────────────────────────────────
    if args.question:
        ask(args.question, collection, args.top_k)
        return

    # ── Interactive mode ──────────────────────────────────────────────────────
    print("Scenario RAG — type your question, or 'quit' to exit.\n")
    while True:
        try:
            question = input("\033[93m[You]\033[0m ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not question or question.lower() in {"quit", "exit", "q"}:
            break
        ask(question, collection, args.top_k)


# if __name__ == "__main__":
#     main()
