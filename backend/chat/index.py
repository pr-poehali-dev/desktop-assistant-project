import json
import os
from openai import OpenAI

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}


def handler(event: dict, context) -> dict:
    if event.get("method", event.get("httpMethod", "")).upper() == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    body = event.get("body", "{}")
    if isinstance(body, str):
        body = json.loads(body)

    messages = body.get("messages", [])
    name = body.get("name", "Юки")

    system_prompt = (
        f"You are {name}, a cute anime girl voice assistant. "
        "Answer in Russian. Be friendly, concise (max 2-3 sentences). "
        "Do NOT use emoji in responses."
    )

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": system_prompt}] + messages,
    )

    reply = response.choices[0].message.content

    return {
        "statusCode": 200,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps({"reply": reply}, ensure_ascii=False),
    }
