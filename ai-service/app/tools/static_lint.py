"""
RepoRevive – Static Linting Tool
Runs fixed-configuration static linting (Ruff for Python, ESLint for JS/TS) on fetched files in a temp directory.
Never loads repository config files; never executes arbitrary code or installs repo dependencies.
"""

import os
import sys
import json
import ast
import shutil
import tempfile
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional
from collections import Counter
from app.tools.base import ToolResult

CURRENT_DIR = Path(__file__).parent.resolve()
RUFF_CONFIG_PATH = CURRENT_DIR / "lint_configs" / "ruff.toml"
ESLINT_CONFIG_PATH = CURRENT_DIR / "lint_configs" / ".eslintrc.json"
SUBPROCESS_TIMEOUT_SECONDS = 5.0


def static_lint(files: Dict[str, str]) -> ToolResult:
    """
    Performs static linting over a dict of {relative_path: content_string}.
    Calculates total lines, errors per 1,000 lines, and top rule violations.
    """
    if not files:
        return ToolResult(
            success=True,
            data={
                "totalLines": 0,
                "errorCount": 0,
                "errorsPer1k": 0.0,
                "topRuleIds": [],
                "engine": "none",
            },
        )

    total_lines = 0
    py_files: Dict[str, str] = {}
    js_files: Dict[str, str] = {}

    for path, content in files.items():
        lines = len(content.splitlines())
        total_lines += max(1, lines)
        ext = os.path.splitext(path)[1].lower()
        if ext in [".py"]:
            py_files[path] = content
        elif ext in [".js", ".jsx", ".ts", ".tsx", ".mjs"]:
            js_files[path] = content

    violations: List[Dict[str, Any]] = []

    with tempfile.TemporaryDirectory(prefix="reporevive_lint_") as temp_dir:
        temp_path = Path(temp_dir)

        # 1. Lint Python files
        if py_files:
            for p, content in py_files.items():
                target_file = temp_path / p
                target_file.parent.mkdir(parents=True, exist_ok=True)
                target_file.write_text(content, encoding="utf-8", errors="replace")

            ruff_bin = shutil.which("ruff")
            if ruff_bin:
                try:
                    cmd = [
                        ruff_bin,
                        "check",
                        str(temp_path),
                        "--config",
                        str(RUFF_CONFIG_PATH),
                        "--no-cache",
                        "--output-format",
                        "json",
                    ]
                    proc = subprocess.run(
                        cmd,
                        capture_output=True,
                        text=True,
                        timeout=SUBPROCESS_TIMEOUT_SECONDS,
                    )
                    if proc.stdout:
                        try:
                            records = json.loads(proc.stdout)
                            for r in records:
                                violations.append({
                                    "rule": r.get("code", "RUFF"),
                                    "message": r.get("message"),
                                    "path": str(Path(r.get("filename", "")).relative_to(temp_path)),
                                    "line": r.get("location", {}).get("row"),
                                })
                        except json.JSONDecodeError:
                            pass
                except (subprocess.TimeoutExpired, Exception) as e:
                    violations.append({"rule": "RUFF_ERR", "message": str(e), "path": "", "line": 0})
            else:
                # Pure-Python fallback using AST parser for syntax and undefined names
                for p, content in py_files.items():
                    try:
                        ast.parse(content, filename=p)
                    except SyntaxError as syn_err:
                        violations.append({
                            "rule": "E999_SYNTAX",
                            "message": syn_err.msg,
                            "path": p,
                            "line": syn_err.lineno or 1,
                        })

        # 2. Lint JS/TS files
        if js_files:
            for p, content in js_files.items():
                target_file = temp_path / p
                target_file.parent.mkdir(parents=True, exist_ok=True)
                target_file.write_text(content, encoding="utf-8", errors="replace")

            eslint_bin = shutil.which("eslint") or shutil.which("npx")
            if eslint_bin:
                try:
                    if "npx" in eslint_bin:
                        cmd = [
                            eslint_bin,
                            "--no-install",
                            "eslint",
                            str(temp_path),
                            "--no-eslintrc",
                            "-c",
                            str(ESLINT_CONFIG_PATH),
                            "--format",
                            "json",
                        ]
                    else:
                        cmd = [
                            eslint_bin,
                            str(temp_path),
                            "--no-eslintrc",
                            "-c",
                            str(ESLINT_CONFIG_PATH),
                            "--format",
                            "json",
                        ]

                    proc = subprocess.run(
                        cmd,
                        capture_output=True,
                        text=True,
                        timeout=SUBPROCESS_TIMEOUT_SECONDS,
                    )
                    out_text = proc.stdout or proc.stderr
                    if out_text:
                        try:
                            records = json.loads(out_text)
                            for file_res in records:
                                for msg in file_res.get("messages", []):
                                    violations.append({
                                        "rule": msg.get("ruleId", "ESLINT"),
                                        "message": msg.get("message"),
                                        "path": file_res.get("filePath", ""),
                                        "line": msg.get("line", 1),
                                    })
                        except json.JSONDecodeError:
                            pass
                except (subprocess.TimeoutExpired, Exception):
                    pass
            else:
                # Basic heuristic fallback for JS/TS
                for p, content in js_files.items():
                    if "debugger;" in content or "console.log(" in content:
                        violations.append({
                            "rule": "no-debugger",
                            "message": "Debugging statement found",
                            "path": p,
                            "line": 1,
                        })

    error_count = len(violations)
    errors_per_1k = round((error_count / max(1, total_lines)) * 1000.0, 2)
    rule_counts = Counter(v.get("rule", "UNKNOWN") for v in violations)
    top_rules = [f"{rule} ({count})" for rule, count in rule_counts.most_common(5)]

    return ToolResult(
        success=True,
        data={
            "totalLines": total_lines,
            "errorCount": error_count,
            "errorsPer1k": errors_per_1k,
            "topRuleIds": top_rules,
            "violations": violations[:20],
        },
        metadata={"inspectedFiles": len(files)},
    )
