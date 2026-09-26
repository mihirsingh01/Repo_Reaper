from typing import List, Dict, Optional, Any
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from app.nlp.index import repository_index, RepositoryIndex
from app.nlp.preprocess import preprocess_text
from app.nlp.synonyms import synonym_expander


class NLPMatcher:
    """
    Computes cosine similarity between queries and indexed repositories.
    Provides explainable matchedTerms based on component-wise vector products.
    """

    def __init__(self, index: RepositoryIndex = repository_index):
        self.index = index

    def match(
        self,
        query: str,
        top_k: int = 20,
        candidate_ids: Optional[List[str]] = None,
        apply_synonyms: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Match query string against indexed repositories.
        """
        if not self.index.is_ready():
            return []

        cleaned_query = query.strip()
        if not cleaned_query:
            return []

        expansions_used: List[Dict[str, Any]] = []
        if apply_synonyms:
            tokens = cleaned_query.split()
            expanded_tokens, expansions_used = synonym_expander.expand(tokens)
            query_text = " ".join(expanded_tokens)
        else:
            query_text = cleaned_query

        preprocessed_query = preprocess_text(query_text)
        if not preprocessed_query:
            return []

        vec = self.index.vectorizer
        matrix = self.index.tfidf_matrix
        repo_ids = self.index.repo_ids

        # Transform query into TF-IDF vector space
        query_vec = vec.transform([preprocessed_query])

        # If query vector has no non-zero components (out of vocabulary)
        if query_vec.nnz == 0:
            return []

        # Compute cosine similarities against all documents
        similarities = cosine_similarity(query_vec, matrix)[0]

        # Invert vocabulary mapping for matchedTerms lookup: index -> term
        feature_names = np.array(vec.get_feature_names_out())
        query_dense = query_vec.toarray()[0]

        results: List[Dict[str, Any]] = []

        # Candidate ID filter set
        allowed_ids = set(candidate_ids) if candidate_ids is not None else None

        for idx, score in enumerate(similarities):
            repo_id = repo_ids[idx]
            if allowed_ids is not None and repo_id not in allowed_ids:
                continue

            if score <= 0:
                continue

            # Calculate explainable matched terms via component-wise product: q_i * d_i
            doc_dense = matrix[idx].toarray()[0]
            contributions = query_dense * doc_dense
            top_term_indices = np.argsort(contributions)[::-1]

            matched_terms: List[str] = []
            for term_idx in top_term_indices:
                if contributions[term_idx] > 0 and len(matched_terms) < 5:
                    matched_terms.append(str(feature_names[term_idx]))
                if len(matched_terms) >= 5:
                    break

            results.append({
                "repoId": repo_id,
                "relevance": float(round(score, 4)),
                "matchedTerms": matched_terms,
                "expansionsUsed": expansions_used,
            })

        # Sort descending by relevance
        results.sort(key=lambda r: r["relevance"], reverse=True)

        # Normalize relevance strictly between 0 and 1
        if results and results[0]["relevance"] > 1.0:
            max_score = results[0]["relevance"]
            for r in results:
                r["relevance"] = round(r["relevance"] / max_score, 4)

        return results[:top_k]


nlp_matcher = NLPMatcher()
