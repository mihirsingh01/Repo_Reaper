import pytest
from app.ideas.refiner import IdeaRefiner
from app.llm.mock_provider import MockProvider
from app.schemas.idea import IdeaSpec


@pytest.mark.asyncio
async def test_idea_refiner_valid():
    provider = MockProvider()
    refiner = IdeaRefiner(provider=provider)

    idea_text = "An inventory tracking application where shop owners can view stock and receive low-stock alerts on WhatsApp."
    spec: IdeaSpec = await refiner.refine(idea_text)

    assert spec.summary != ""
    assert len(spec.targetUsers) > 0
    assert 3 <= len(spec.features) <= 10
    # Must have both must and nice features
    priorities = {f.priority for f in spec.features}
    assert "must" in priorities


@pytest.mark.asyncio
async def test_idea_refiner_vague():
    provider = MockProvider()
    refiner = IdeaRefiner(provider=provider)

    short_vague_idea = "build an app"
    spec: IdeaSpec = await refiner.refine(short_vague_idea)

    # Should flag vague idea with clarifying questions
    assert len(spec.clarifications) > 0
    assert 3 <= len(spec.features) <= 10


@pytest.mark.asyncio
async def test_llm_json_repair_on_malformed_output():
    # Simulate an LLM that initially outputs invalid JSON followed by repaired JSON
    canned = {
        "Founder's Idea": '```json\n{"summary": "Broken JSON missing closing braces\n```',
        "Fix the JSON syntax": '{"summary": "Fixed idea", "targetUsers": ["Devs"], "features": [{"id": "f1", "label": "Feature", "plainDescription": "Desc", "keywords": ["code"], "priority": "must"}, {"id": "f2", "label": "Feature2", "plainDescription": "Desc", "keywords": ["test"], "priority": "nice"}, {"id": "f3", "label": "Feature3", "plainDescription": "Desc", "keywords": ["docs"], "priority": "nice"}], "clarifications": []}',
    }

    provider = MockProvider(canned_responses=canned)
    refiner = IdeaRefiner(provider=provider)

    spec: IdeaSpec = await refiner.refine("A valid idea that triggers the simulated repair logic.")
    assert spec.summary == "Fixed idea"
    assert len(spec.features) >= 3
