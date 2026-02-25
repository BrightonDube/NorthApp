import asyncio

from app.services.embeddings import create_embedding
from app.services.supabase import get_async_supabase_client


BATCH_SIZE = 50


async def backfill_embeddings() -> None:
    supabase = await get_async_supabase_client()
    total_updated = 0
    total_failed = 0

    while True:
        result = (
            await supabase.from_("memories")
            .select("id,content")
            .is_("embedding", "null")
            .limit(BATCH_SIZE)
            .execute()
        )
        rows = result.data or []
        if not rows:
            break

        for row in rows:
            memory_id = row["id"]
            content = (row.get("content") or "").strip()
            if not content:
                total_failed += 1
                continue

            try:
                embedding = await create_embedding(content)
                await (
                    supabase.from_("memories")
                    .update({"embedding": embedding})
                    .eq("id", memory_id)
                    .execute()
                )
                total_updated += 1
            except Exception as exc:
                total_failed += 1
                print(f"[Backfill] Failed for memory {memory_id}: {exc}")

        print(
            f"[Backfill] Progress: updated={total_updated}, failed={total_failed}, batch={len(rows)}"
        )

    print(f"[Backfill] Complete: updated={total_updated}, failed={total_failed}")


if __name__ == "__main__":
    asyncio.run(backfill_embeddings())
