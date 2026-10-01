import pytest
from app.tools.static_lint import static_lint


def test_static_lint_clean_file():
    clean_py = """def calculate_total(items):\n    return sum(item['price'] for item in items)\n"""
    res = static_lint({"src/math.py": clean_py})

    assert res.success is True
    assert res.data["errorCount"] == 0
    assert res.data["errorsPer1k"] == 0.0
    assert res.data["totalLines"] >= 2


def test_static_lint_syntax_error():
    bad_py = """def broken_func(\n    this is completely invalid python syntax :::\n"""
    res = static_lint({"src/broken.py": bad_py})

    assert res.success is True
    assert res.data["errorCount"] > 0
    assert res.data["errorsPer1k"] > 0.0
    assert len(res.data["topRuleIds"]) > 0


def test_static_lint_empty_dict():
    res = static_lint({})
    assert res.success is True
    assert res.data["totalLines"] == 0
    assert res.data["errorCount"] == 0
