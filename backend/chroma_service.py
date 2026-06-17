import pandas as pd
import chromadb

client = chromadb.PersistentClient(path="./chroma_db")

collection = client.get_or_create_collection(
    name="mental_gym"
)

def load_scenarios():

    if collection.count() > 0:
        print("Scenarios already loaded.")
        return

    df = pd.read_excel(
        "data/Mental_GYM_Ollama_Training_Dataset.xlsx"
    )

    for _, row in df.iterrows():

        collection.add(
            ids=[str(row["Scenario ID"])],
            documents=[str(row["Scenario"])],
            metadatas=[{
                "questions": str(row["Generated Questions"]),
                "output": str(row["Expected Output"]),
                "scenario": str(row["Scenario"])
            }]
        )

    print("Scenarios loaded into ChromaDB")


def match_scenario(user_text):

    result = collection.query(
        query_texts=[user_text],
        n_results=1
    )

    metadata = result["metadatas"][0][0]

    return {
        "scenario_id": result["ids"][0][0],
        "scenario": metadata["scenario"],
        "questions": metadata["questions"],
        "output": metadata["output"]
    }