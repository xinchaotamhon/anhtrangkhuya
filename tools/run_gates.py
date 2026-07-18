#!/usr/bin/env python3
"""Run cumulative project gates and append machine-readable evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


TIER_ORDER = {"smoke": 0, "regression": 1, "promotion": 2}
GATE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]*$")


class RegistryError(ValueError):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_registry(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RegistryError(f"cannot read registry: {exc}") from exc

    if payload.get("schema_version") != 1:
        raise RegistryError("schema_version must be 1")
    gates = payload.get("gates")
    if not isinstance(gates, list):
        raise RegistryError("gates must be a list")

    seen: set[str] = set()
    for index, gate in enumerate(gates):
        if not isinstance(gate, dict):
            raise RegistryError(f"gate {index} must be an object")
        gate_id = gate.get("id")
        if not isinstance(gate_id, str) or not GATE_ID_RE.fullmatch(gate_id):
            raise RegistryError(f"gate {index} has invalid id")
        if gate_id in seen:
            raise RegistryError(f"duplicate gate id: {gate_id}")
        seen.add(gate_id)

        tier = gate.get("tier")
        if tier not in TIER_ORDER:
            raise RegistryError(f"{gate_id}: invalid tier")
        command = gate.get("command")
        if not isinstance(command, list) or not command or not all(
            isinstance(part, str) and part for part in command
        ):
            raise RegistryError(f"{gate_id}: command must be a non-empty string list")
        timeout = gate.get("timeout_seconds", 60)
        if not isinstance(timeout, (int, float)) or timeout <= 0:
            raise RegistryError(f"{gate_id}: timeout_seconds must be positive")
        if not isinstance(gate.get("required", True), bool):
            raise RegistryError(f"{gate_id}: required must be boolean")
        if not isinstance(gate.get("enabled", True), bool):
            raise RegistryError(f"{gate_id}: enabled must be boolean")
        if not gate.get("enabled", True) and not gate.get("disposition"):
            raise RegistryError(f"{gate_id}: disabled gate needs disposition")

    return payload


def select_gates(
    registry: dict[str, Any], tier: str, gate_ids: list[str] | None = None
) -> list[dict[str, Any]]:
    if tier not in TIER_ORDER:
        raise RegistryError(f"unknown tier: {tier}")
    gates = registry["gates"]
    if gate_ids:
        wanted = set(gate_ids)
        known = {gate["id"] for gate in gates}
        missing = sorted(wanted - known)
        if missing:
            raise RegistryError(f"unknown gate ids: {', '.join(missing)}")
        selected = [gate for gate in gates if gate["id"] in wanted]
    else:
        selected = [
            gate
            for gate in gates
            if TIER_ORDER[gate["tier"]] <= TIER_ORDER[tier]
        ]

    disabled = [gate["id"] for gate in selected if not gate.get("enabled", True)]
    if gate_ids and disabled:
        raise RegistryError(f"requested disabled gates: {', '.join(disabled)}")
    return [gate for gate in selected if gate.get("enabled", True)]


def ensure_within(root: Path, candidate: Path, label: str) -> Path:
    resolved_root = root.resolve()
    resolved = candidate.resolve()
    try:
        resolved.relative_to(resolved_root)
    except ValueError as exc:
        raise RegistryError(f"{label} must stay inside project root") from exc
    return resolved


def display_command(command: list[str]) -> str:
    return subprocess.list2cmdline(command)


def run_gate(
    gate: dict[str, Any], project_root: Path, log_dir: Path
) -> dict[str, Any]:
    cwd_value = gate.get("cwd", ".")
    if not isinstance(cwd_value, str):
        raise RegistryError(f"{gate['id']}: cwd must be a string")
    cwd = ensure_within(project_root, project_root / cwd_value, f"{gate['id']} cwd")
    if not cwd.is_dir():
        raise RegistryError(f"{gate['id']}: cwd does not exist: {cwd}")

    command = [sys.executable if part == "{python}" else part for part in gate["command"]]
    expected = gate.get("expected_exit_code", 0)
    if not isinstance(expected, int):
        raise RegistryError(f"{gate['id']}: expected_exit_code must be integer")

    started = time.monotonic()
    stdout = ""
    stderr = ""
    observed: int | None = None
    timed_out = False
    try:
        completed = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=float(gate.get("timeout_seconds", 60)),
            shell=False,
            check=False,
        )
        observed = completed.returncode
        stdout = completed.stdout
        stderr = completed.stderr
    except subprocess.TimeoutExpired as exc:
        timed_out = True
        stdout = (exc.stdout or "") if isinstance(exc.stdout, str) else ""
        stderr = (exc.stderr or "") if isinstance(exc.stderr, str) else ""
    elapsed_ms = int((time.monotonic() - started) * 1000)
    passed = not timed_out and observed == expected

    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{gate['id']}.log"
    log_path.write_text(
        "\n".join(
            [
                f"gate: {gate['id']}",
                f"command: {display_command(command)}",
                f"cwd: {cwd}",
                f"expected_exit_code: {expected}",
                f"observed_exit_code: {observed}",
                f"timed_out: {str(timed_out).lower()}",
                "",
                "[stdout]",
                stdout,
                "[stderr]",
                stderr,
            ]
        ),
        encoding="utf-8",
    )

    return {
        "id": gate["id"],
        "tier": gate["tier"],
        "required": gate.get("required", True),
        "status": "pass" if passed else "fail",
        "expected_exit_code": expected,
        "observed_exit_code": observed,
        "timed_out": timed_out,
        "elapsed_ms": elapsed_ms,
        "log_path": str(log_path.relative_to(project_root)).replace("\\", "/"),
    }


def append_jsonl(path: Path, event: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(event, ensure_ascii=True, separators=(",", ":")) + "\n"
    with path.open("a", encoding="utf-8", newline="") as handle:
        handle.write(line)
        handle.flush()
        os.fsync(handle.fileno())


def execute_registry(
    registry_path: Path,
    project_root: Path,
    evidence_dir: Path,
    tier: str,
    gate_ids: list[str] | None = None,
    fail_fast: bool = False,
) -> dict[str, Any]:
    project_root = project_root.resolve()
    evidence_dir = ensure_within(project_root, evidence_dir, "evidence directory")
    registry = load_registry(registry_path)
    selected = select_gates(registry, tier, gate_ids)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    log_dir = evidence_dir / "gate-logs" / run_id
    results: list[dict[str, Any]] = []

    for gate in selected:
        result = run_gate(gate, project_root, log_dir)
        results.append(result)
        print(f"[{result['status'].upper()}] {result['id']} ({result['elapsed_ms']} ms)")
        if fail_fast and result["status"] == "fail" and result["required"]:
            break

    required_failed = [
        result for result in results if result["required"] and result["status"] == "fail"
    ]
    optional_failed = [
        result for result in results if not result["required"] and result["status"] == "fail"
    ]
    event = {
        "schema_version": 1,
        "type": "gate_run",
        "run_id": run_id,
        "observed_at": utc_now(),
        "registry": str(registry_path.resolve()),
        "registry_sha256": hashlib.sha256(registry_path.read_bytes()).hexdigest(),
        "tier": tier,
        "status": "fail" if required_failed else "pass_with_warnings" if optional_failed else "pass",
        "selected_gate_count": len(selected),
        "executed_gate_count": len(results),
        "results": results,
    }
    append_jsonl(evidence_dir / "events.jsonl", event)
    return event


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", type=Path, default=Path("gates/gates.json"))
    parser.add_argument("--project-root", type=Path)
    parser.add_argument("--evidence-dir", type=Path)
    parser.add_argument("--tier", choices=tuple(TIER_ORDER), default="smoke")
    parser.add_argument("--gate", action="append", dest="gate_ids")
    parser.add_argument("--fail-fast", action="store_true")
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    registry_path = args.registry.resolve()
    project_root = (
        args.project_root.resolve()
        if args.project_root
        else registry_path.parent.parent.resolve()
    )
    evidence_dir = (
        args.evidence_dir
        if args.evidence_dir and args.evidence_dir.is_absolute()
        else project_root / (args.evidence_dir or Path("50-Evidence"))
    )

    try:
        registry = load_registry(registry_path)
        if args.list:
            for gate in registry["gates"]:
                state = "enabled" if gate.get("enabled", True) else "disabled"
                print(f"{gate['id']}\t{gate['tier']}\t{state}")
            return 0
        selected = select_gates(registry, args.tier, args.gate_ids)
        if args.dry_run:
            for gate in selected:
                print(f"{gate['id']}: {display_command(gate['command'])}")
            print(f"Selected {len(selected)} gates through tier {args.tier}")
            return 0
        event = execute_registry(
            registry_path=registry_path,
            project_root=project_root,
            evidence_dir=evidence_dir,
            tier=args.tier,
            gate_ids=args.gate_ids,
            fail_fast=args.fail_fast,
        )
        print(f"Gate run {event['run_id']}: {event['status']}")
        return 1 if event["status"] == "fail" else 0
    except RegistryError as exc:
        print(f"Registry error: {exc}")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
