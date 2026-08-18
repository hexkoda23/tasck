"""Regression: only one background transcript re-analysis per business case.

Reported from production (Aug 2026): "Could not generate the Alignment
Snapshot", and shortly afterwards an unrelated email send came back as a
Cloudflare gateway error, even though the origin was healthy and the snapshot
had in fact been written.

The loop: "Generate Snapshot" fires a fire-and-forget
`analyze_all_connect_transcripts` task. When the click appeared to fail (the
client gave up at 45s while the server kept going), the admin clicked again,
stacking another full LLM run over every transcript on the same single-worker
container. Enough of those starve the worker, and a starved worker returns
gateway errors to whatever request happens to be in flight.

`_kick_alignment_refresh` now de-duplicates per business case. These tests pin
that, plus the strong reference that stops asyncio garbage-collecting a task
mid-flight.
"""
import asyncio
import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")


def _router():
    from v3_routes import make_v3_router
    # These tests only exercise the scheduling guard, never real data. A short
    # server-selection timeout keeps them fast whether or not Mongo is up: the
    # background task fails quickly and _safe_refresh_transcripts swallows it,
    # which is itself part of what we are asserting.
    client = AsyncIOMotorClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=400)
    db = client[os.environ["DB_NAME"]]
    return make_v3_router(db)


def test_repeated_clicks_start_only_one_refresh():
    """Six rapid clicks must leave exactly one background task in flight."""
    r = _router()

    async def scenario():
        r._alignment_refresh_tasks.clear()
        for _ in range(6):
            r._kick_alignment_refresh("bc-guard-test")
        # Nothing has been awaited yet, so the first task is still pending and
        # every later call should have been skipped.
        assert len(r._alignment_refresh_tasks) == 1, r._alignment_refresh_tasks
        task = r._alignment_refresh_tasks["bc-guard-test"]
        await asyncio.gather(task, return_exceptions=True)
        return task

    task = asyncio.run(scenario())
    assert task.done()


def test_completed_refresh_clears_its_slot():
    """Once a run finishes, a later click is allowed to start a fresh one."""
    r = _router()

    async def scenario():
        r._alignment_refresh_tasks.clear()
        r._kick_alignment_refresh("bc-guard-test-2")
        first = r._alignment_refresh_tasks["bc-guard-test-2"]
        await asyncio.gather(first, return_exceptions=True)
        # done_callback should have removed the finished task.
        assert "bc-guard-test-2" not in r._alignment_refresh_tasks
        r._kick_alignment_refresh("bc-guard-test-2")
        second = r._alignment_refresh_tasks.get("bc-guard-test-2")
        assert second is not None and second is not first
        await asyncio.gather(second, return_exceptions=True)

    asyncio.run(scenario())


def test_separate_cases_run_independently():
    """The guard is per business case, not global."""
    r = _router()

    async def scenario():
        r._alignment_refresh_tasks.clear()
        r._kick_alignment_refresh("bc-aaa")
        r._kick_alignment_refresh("bc-bbb")
        assert set(r._alignment_refresh_tasks) == {"bc-aaa", "bc-bbb"}
        await asyncio.gather(*r._alignment_refresh_tasks.values(), return_exceptions=True)

    asyncio.run(scenario())


def test_refresh_never_raises_into_the_worker():
    """A failing LLM call must not surface as an unhandled task exception."""
    r = _router()

    async def scenario():
        r._alignment_refresh_tasks.clear()
        r._kick_alignment_refresh("bc-does-not-exist-at-all")
        task = r._alignment_refresh_tasks["bc-does-not-exist-at-all"]
        await asyncio.gather(task, return_exceptions=True)
        # Swallowed by _safe_refresh_transcripts, so the task ends cleanly.
        assert task.done()
        assert task.exception() is None

    asyncio.run(scenario())
