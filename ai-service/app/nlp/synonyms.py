from pathlib import Path
from typing import List, Dict, Tuple, Set, Any
import yaml

SYNONYMS_FILE = Path(__file__).parent / "synonyms.yaml"

DEFAULT_SYNONYMS: Dict[str, List[str]] = {
    "login": ["jwt", "oauth", "authentication", "session", "auth"],
    "auth": ["jwt", "oauth", "bcrypt", "passport", "session"],
    "inventory": ["stock", "warehouse", "sku", "catalog", "supply"],
    "payments": ["stripe", "razorpay", "checkout", "billing", "paypal"],
    "chat": ["websocket", "socket.io", "realtime", "messaging"],
    "booking": ["appointment", "calendar", "slot", "reservation"],
    "alerts": ["notification", "webhook", "twilio", "push"],
    "database": ["mongodb", "postgresql", "sqlite", "mysql", "orm"],
    "dashboard": ["analytics", "metrics", "charts", "admin"],
    "whatsapp": ["twilio", "messagebird", "chatbot", "webhook", "messaging"],
}


class SynonymExpander:
    def __init__(self, yaml_path: Path = SYNONYMS_FILE):
        self.synonym_map = self._load(yaml_path)

    def _load(self, path: Path) -> Dict[str, List[str]]:
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    if isinstance(data, dict):
                        return {k.lower(): [item.lower() for item in v] for k, v in data.items()}
            except Exception:
                pass
        return DEFAULT_SYNONYMS

    def expand(
        self, tokens: List[str], max_expansions_per_term: int = 4
    ) -> Tuple[List[str], List[Dict[str, Any]]]:
        """
        Expands matched keywords with technical synonyms.
        Returns:
            - expanded_tokens: original tokens plus secondary weighted expansions
            - fired_expansions: report of which mappings were triggered
        """
        fired: List[Dict[str, Any]] = []
        added_tokens: List[str] = []
        seen_expansions: Set[str] = set()

        for token in tokens:
            token_lower = token.lower()
            if token_lower in self.synonym_map:
                synonyms = self.synonym_map[token_lower][:max_expansions_per_term]
                new_synonyms = [s for s in synonyms if s not in tokens and s not in seen_expansions]

                if new_synonyms:
                    fired.append({
                        "original": token,
                        "expanded": new_synonyms,
                        "weight": 0.5,  # Lower weight than original terms
                    })
                    for s in new_synonyms:
                        added_tokens.append(s)
                        seen_expansions.add(s)

        # Original tokens + expanded tokens
        return tokens + added_tokens, fired


synonym_expander = SynonymExpander()
