import ollama
import json


def generate_assessment(
        scenario_output,
        answers):

    prompt = f"""
You are a mental health assessment assistant.

Matched Scenario:
{scenario_output}

User Answers:
{answers}

Return valid JSON only.

Format:

{{
  "condition":"",
  "severity":"",
  "summary":"",
  "risk_level":"",
  "recommendations":[]
}}

No markdown.
No explanation.
JSON only.
"""

    response = ollama.chat(
        model="llama3.2",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response["message"]["content"]