def _normalize_content(content: str | list | None) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if not isinstance(item, dict):
                continue
            if item.get("type") == "text" and isinstance(item.get("text"), str):
                parts.append(item["text"])
            elif item.get("type") == "image_url":
                parts.append("[Image attachment provided]")
        return "\n".join(parts).strip() or "[No content]"
    return "[No content]"


def _to_prompt(messages: list[dict]) -> str:
    lines: list[str] = []
    for msg in messages:
        role = (msg.get("role") or "user").upper()
        content = _normalize_content(msg.get("content"))
        lines.append(f"{role}: {content}")
    lines.append("ASSISTANT:")
    return "\n\n".join(lines)


async def stream_gemini_response(
    *,
    api_key: str,
    model: str,
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 1024,
):
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    try:
        import google.generativeai as genai
    except ModuleNotFoundError as e:
        raise RuntimeError("google-generativeai package is not installed") from e

    genai.configure(api_key=api_key)
    prompt = _to_prompt(messages)
    gemini_model = genai.GenerativeModel(model_name=model)

    response = gemini_model.generate_content(
        prompt,
        generation_config={
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        },
        stream=True,
    )

    for chunk in response:
        text = getattr(chunk, "text", None)
        if text:
            yield text
