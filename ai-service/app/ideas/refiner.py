import os
from pathlib import Path
from typing import Optional
from app.llm import LLMProvider, get_llm_provider
from app.schemas.idea import IdeaSpec, FeatureSpec

PROMPT_PATH = Path(__file__).parent / "prompts" / "idea_refiner.md"


class IdeaRefiner:
    def __init__(self, provider: Optional[LLMProvider] = None):
        self.provider = provider or get_llm_provider()
        self.system_prompt = self._load_prompt()

    def _load_prompt(self) -> str:
        if PROMPT_PATH.exists():
            return PROMPT_PATH.read_text(encoding="utf-8")
        return "You are the RepoRevive Idea Refiner. Distill ideas into 3-10 features."

    async def refine(self, text: str) -> IdeaSpec:
        """
        Distill raw founder idea into confirmed IdeaSpec.
        """
        user_prompt = f"Founder's Idea:\n\"\"\"\n{text}\n\"\"\"\n\nDistill this idea into an IdeaSpec JSON object."

        spec: IdeaSpec = await self.provider.generate_json(
            prompt=user_prompt,
            schema=IdeaSpec,
            system_prompt=self.system_prompt,
            temperature=0.2,
        )

        # Enforce invariant: 3 to 10 features
        if len(spec.features) < 3:
            # If fewer than 3 features, add generic baseline architectural features
            existing_ids = {f.id for f in spec.features}
            if "f_auth" not in existing_ids:
                spec.features.append(
                    FeatureSpec(
                        id=f"f{len(spec.features)+1}",
                        label="User Management & Auth",
                        plainDescription="Account registration and authentication.",
                        keywords=["auth", "jwt", "login", "session"],
                        priority="must",
                    )
                )
            if len(spec.features) < 3:
                spec.features.append(
                    FeatureSpec(
                        id=f"f{len(spec.features)+1}",
                        label="Data Storage & CRUD",
                        plainDescription="Database storage and records management.",
                        keywords=["database", "crud", "storage", "models"],
                        priority="must",
                    )
                )

        if len(spec.features) > 10:
            spec.features = spec.features[:10]

        # Ensure unique, normalized sequential IDs
        for idx, feature in enumerate(spec.features, start=1):
            feature.id = f"f{idx}"

        # If idea is very short, add a clarifying question
        if len(text.strip().split()) < 12 and not spec.clarifications:
            spec.clarifications.append(
                "Could you specify the target platform (web, mobile, or CLI) and any preferred integrations?"
            )

        return spec


idea_refiner = IdeaRefiner()
