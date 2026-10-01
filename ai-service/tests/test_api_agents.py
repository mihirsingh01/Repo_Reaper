from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_analyze_endpoint_happy_path():
    payload = {
        "repoFullName": "shoptrack/inventory-lite",
        "features": [
            {
                "id": "f1",
                "label": "Inventory SKU Tracking",
                "plainDescription": "Track stock levels",
                "keywords": ["inventory", "stock"],
                "priority": "must",
            }
        ],
        "repoContext": {
            "fullName": "shoptrack/inventory-lite",
            "language": "JavaScript",
            "license": {"spdx": "MIT"},
            "stars": 80,
            "tree": [
                {"path": "package.json", "type": "blob", "size": 120},
                {"path": "src/inventory.js", "type": "blob", "size": 300},
            ],
            "cachedFiles": {
                "package.json": '{"name": "inventory-lite"}',
                "src/inventory.js": "function updateInventory(sku, count) { return true; }",
            },
        },
    }

    response = client.post("/agents/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "done"
    assert data["repoFullName"] == "shoptrack/inventory-lite"
    assert "coverage" in data
    assert "viability" in data
    assert "verdict" in data
    assert "revivalPlan" in data
    assert "trace" in data


def test_analyze_endpoint_invalid_repo_name():
    payload = {
        "repoFullName": "invalid-no-slash",
        "features": [],
    }
    response = client.post("/agents/analyze", json=payload)
    assert response.status_code == 400
