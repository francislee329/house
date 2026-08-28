#!/usr/bin/env python3
"""
Coordinator — Runs agents in dependency order.

Usage:
  uv run python agents/coordinator.py              # Run all agents
  uv run python agents/coordinator.py data          # Run data agent only
  uv run python agents/coordinator.py backend       # Run backend + deps
  uv run python agents/coordinator.py frontend      # Run frontend + deps
  uv run python agents/coordinator.py --status      # Show last run status
"""

import json
import os
import sys
import time
from datetime import datetime

AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
MANIFEST_PATH = os.path.join(AGENT_DIR, "manifest.json")

DEPENDENCY_ORDER = ["data", "backend", "frontend"]

AGENTS = {
    "data": "data_agent",
    "backend": "backend_agent",
    "frontend": "frontend_agent",
}


def load_manifest() -> dict:
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        return json.load(f)


def get_changed_agents() -> list[str]:
    """Read manifest to find which agents produced changes."""
    manifest = load_manifest()
    changed = set()
    for entry in manifest.get("changelog", [])[-10:]:
        agent = entry.get("agent")
        if entry.get("summary", "").lower().find("changed") >= 0 or \
           entry.get("api_changes") or \
           entry.get("types_updated"):
            changed.add(agent)
    return list(changed)


def run_agent(agent_name: str, force: bool = False) -> dict:
    """Run a single agent and return result."""
    script = AGENTS[agent_name]
    module = f"agents.{script}"

    print(f"\n{'#'*60}")
    print(f"# Running {agent_name.upper()} agent")
    print(f"{'#'*60}\n")

    try:
        mod = __import__(module, fromlist=["run"])
        result = mod.run()
        return result
    except Exception as e:
        print(f"[coordinator] ERROR in {agent_name}: {e}")
        return {"agent": agent_name, "error": str(e)}


def run_all(force: bool = False):
    """Run all agents in dependency order."""
    print("=" * 60)
    print("COORDINATOR — Running all agents")
    print(f"Time: {datetime.now().isoformat()}")
    print("=" * 60)

    results = {}
    start = time.time()

    for agent_name in DEPENDENCY_ORDER:
        result = run_agent(agent_name, force=force)
        results[agent_name] = result
        if result.get("error"):
            print(f"\n[coordinator] {agent_name} failed, stopping chain.")
            break

    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"ALL DONE — {elapsed:.1f}s")
    for name, r in results.items():
        status = "ERROR" if r.get("error") else "OK"
        summary = r.get("summary", r.get("error", "no summary"))
        print(f"  {name}: {status} — {summary}")
    print(f"{'='*60}")

    return results


def show_status():
    """Show last run status from manifest."""
    manifest = load_manifest()
    changelog = manifest.get("changelog", [])

    print("=" * 60)
    print("AGENT STATUS")
    print("=" * 60)

    if not changelog:
        print("No runs recorded yet.")
        return

    # Last run per agent
    last_runs = {}
    for entry in changelog:
        agent = entry.get("agent")
        last_runs[agent] = entry

    for agent_name in DEPENDENCY_ORDER:
        entry = last_runs.get(agent_name)
        if entry:
            print(f"\n{agent_name.upper()}:")
            print(f"  Last run: {entry.get('timestamp', 'unknown')}")
            print(f"  Summary:  {entry.get('summary', 'no summary')}")
            for k, v in entry.items():
                if k not in ("timestamp", "agent", "summary"):
                    print(f"  {k}: {v}")
        else:
            print(f"\n{agent_name.upper()}: Never run")

    print(f"\n{'='*60}")


def main():
    args = sys.argv[1:]

    if "--status" in args:
        show_status()
        return

    if not args or args == ["all"]:
        run_all(force="--force" in args)
        return

    target = args[0]
    if target not in AGENTS:
        print(f"Unknown agent: {target}. Choose from: {', '.join(AGENTS.keys())}")
        sys.exit(1)

    # Run dependencies first
    manifest = load_manifest()
    agent_config = manifest["agents"].get(target, {})
    deps = agent_config.get("depends_on", [])

    for dep in deps:
        run_agent(dep)

    run_agent(target)


if __name__ == "__main__":
    main()
