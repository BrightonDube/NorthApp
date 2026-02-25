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


def _to_anthropic_messages(messages: list[dict]) -> tuple[str, list[dict]]:
    system_prompt = ""
    out: list[dict] = []
    for msg in messages:
        role = msg.get("role")
        content = _normalize_content(msg.get("content"))
        if role == "system":
            system_prompt = content
            continue
        if role not in {"user", "assistant"}:
            continue
        out.append({"role": role, "content": content})
    return system_prompt, out


async def stream_claude_response(
    *,
    api_key: str,
    model: str,
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 1024,
):
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")
    try:
        from anthropic import AsyncAnthropic
    except ModuleNotFoundError as e:
        raise RuntimeError("anthropic package is not installed") from e

    system_prompt, anthropic_messages = _to_anthropic_messages(messages)
    client = AsyncAnthropic(api_key=api_key)

    async with client.messages.stream(
        model=model,
        system=system_prompt,
        messages=anthropic_messages,
        temperature=temperature,
        max_tokens=max_tokens,
    ) as stream:
        async for text in stream.text_stream:
            if text:
                yield text
