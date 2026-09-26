from typing import Tuple, List, Dict, Any
from app.schemas.idea import IdeaSpec
from app.nlp.preprocess import tokenize
from app.nlp.synonyms import synonym_expander


class QueryBuilder:
    """
    Builds a weighted expanded text query from an IdeaSpec.
    Features marked 'must' are given 2x frequency weight over 'nice' features.
    Technical synonyms are appended with 0.5x weight.
    """

    def build_query(self, spec: IdeaSpec) -> Tuple[str, List[Dict[str, Any]]]:
        must_tokens: List[str] = []
        nice_tokens: List[str] = []

        # 1. Collect tokens from summary
        if spec.summary:
            must_tokens.extend(tokenize(spec.summary))

        # 2. Collect tokens from features with priority weighting
        for feature in spec.features:
            feature_text = f"{feature.label} {feature.plainDescription} {' '.join(feature.keywords)}"
            tokens = tokenize(feature_text)

            if feature.priority == "must":
                # Must-have features receive 2x weight (repeated twice)
                must_tokens.extend(tokens)
                must_tokens.extend(tokens)
            else:
                nice_tokens.extend(tokens)

        combined_tokens = must_tokens + nice_tokens

        # 3. Apply synonym expansion
        expanded_tokens, fired_expansions = synonym_expander.expand(combined_tokens)

        # Space-separated query representation for TF-IDF vectorizer
        expanded_query = " ".join(expanded_tokens)
        return expanded_query, fired_expansions


query_builder = QueryBuilder()
