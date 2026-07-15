# Scenario RAG with Ollama + ChromaDB

A fully **open-source, local** RAG pipeline for querying stress-management scenario libraries.

## Stack
| Component | Tool | Why |
|---|---|---|
| LLM (chat) | [Ollama](https://ollama.com) | Local, no API key needed |
| Embeddings | `nomic-embed-text` via Ollama | Free, high quality |
| Vector store | [ChromaDB](https://www.trychroma.com) | Embedded, no server needed |
| Language | Python 3.10+ | Standard |

---

## 1. Install Ollama

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows: download from https://ollama.com/download
```

Then pull the models you need:

```bash
ollama pull nomic-embed-text   # required for embeddings
ollama pull llama3             # or: mistral, phi3, gemma2, etc.
```

Start Ollama (it runs as a background service automatically on most systems):
```bash
ollama serve   # only needed if not already running
```

---

## 2. Install Python dependencies

```bash
pip install chromadb ollama
```

---

## 3. Organise your data

Put all your `response_data_*.json` files into a `data/` folder:

```
your-project/
├── data/
│   ├── response_data_0.json
│   ├── response_data_1.json
│   └── ...
├── ingest.py
├── query.py
└── README.md
```

Each JSON file must follow this structure:
```json
{
  "profile": "{ \"age\": \"55\", \"mood\": \"...\", ... }",
  "response": "{ \"scenarios\": [ { \"id\": 1, \"title\": \"...\", ... } ] }"
}
```

---

## 4. Ingest your scenarios

```bash
# First time
python ingest.py --data_dir ./data

# Re-ingest from scratch (clears old data)
python ingest.py --data_dir ./data --reset
```

This creates a `./chroma_db/` folder — your persistent vector store.

---

## 5. Query

```bash
# Interactive chat loop
python query.py

# Single question
python query.py --question "How should I handle work stress when sleep-deprived?"

# Use more context or a different model
python query.py --top_k 5 --model mistral
```

### Example questions
- "What's a good strategy when I'm overwhelmed at night?"
- "How can I say no to family without feeling guilty?"
- "I keep avoiding my therapy homework — what should I do?"
- "Give me scenarios about social anxiety and isolation."

---

## Configuration

Edit the constants at the top of either script:

| Variable | Default | Description |
|---|---|---|
| `EMBED_MODEL` | `nomic-embed-text` | Ollama embedding model |
| `CHAT_MODEL` | `llama3` | Ollama chat model |
| `COLLECTION_NAME` | `scenarios` | ChromaDB collection name |
| `DEFAULT_TOP_K` | `3` | Scenarios retrieved per query |

---

## How it works

```
Your question
     │
     ▼
nomic-embed-text (Ollama)
     │  embeds your question
     ▼
ChromaDB cosine similarity search
     │  returns top-k scenario chunks
     ▼
Prompt = System + Retrieved Scenarios + Your Question
     │
     ▼
llama3 / mistral / etc. (Ollama)
     │
     ▼
Answer grounded in your scenario library
```

---

## Adding more scenarios

Just drop new JSON files into `data/` and re-run `ingest.py`. 
It uses `upsert` so existing scenarios won't be duplicated.

```bash
python ingest.py --data_dir ./data
```
