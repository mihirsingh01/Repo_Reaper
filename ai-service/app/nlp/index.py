import os
import hashlib
import threading
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.sparse import csr_matrix
from app.nlp.preprocess import preprocess_text
from app.core.config import settings

INDEX_DIR = Path(settings.INDEX_DIR)
INDEX_FILE = INDEX_DIR / "tfidf_index.joblib"


class RepositoryIndex:
    """
    In-memory TF-IDF index with field boosting, thread-safe atomic swapping,
    and joblib persistence.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix: Optional[csr_matrix] = None
        self.repo_ids: List[str] = []
        self.doc_count: int = 0
        self.vocab_size: int = 0
        self.corpus_hash: str = ""
        self.built_at: Optional[str] = None
        self.version: str = "1.0"

        # Ensure index storage directory exists
        INDEX_DIR.mkdir(parents=True, exist_ok=True)
        self.load()

    def build(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Builds index from raw repository documents.
        Each doc has: id, text, and optional fields (name, topics, description).
        Field boosting:
            - repo name: 3x boost
            - topics: 2x boost
        """
        if not documents:
            return {"indexedCount": 0, "status": "empty"}

        repo_ids: List[str] = []
        corpus_texts: List[str] = []
        hasher = hashlib.sha256()

        for doc in documents:
            repo_id = str(doc.get("id", ""))
            raw_text = doc.get("text", "")
            repo_name = doc.get("name", "")
            topics = " ".join(doc.get("topics", [])) if isinstance(doc.get("topics"), list) else ""

            # Boost title and topics by repeating them in the input document
            boosted = f"{repo_name} {repo_name} {repo_name} {topics} {topics} {raw_text}"
            preprocessed = preprocess_text(boosted)

            repo_ids.append(repo_id)
            corpus_texts.append(preprocessed)
            hasher.update(f"{repo_id}:{preprocessed}".encode("utf-8"))

        # Configure TF-IDF: sublinear_tf=True applies 1 + log(tf) scaling to suppress common terms
        vec = TfidfVectorizer(
            sublinear_tf=True,
            ngram_range=(1, 2),
            min_df=1,
            max_df=0.98,
        )

        matrix = vec.fit_transform(corpus_texts)
        built_time = datetime.utcnow().isoformat()
        corpus_hash = hasher.hexdigest()

        # Atomic in-memory swap under thread lock
        with self._lock:
            self.vectorizer = vec
            self.tfidf_matrix = matrix
            self.repo_ids = repo_ids
            self.doc_count = len(repo_ids)
            self.vocab_size = len(vec.vocabulary_)
            self.corpus_hash = corpus_hash
            self.built_at = built_time

        # Persist to disk atomically
        self._persist_atomic()

        return {
            "indexedCount": self.doc_count,
            "vocabSize": self.vocab_size,
            "builtAt": self.built_at,
            "corpusHash": self.corpus_hash,
            "status": "ready",
        }

    def _persist_atomic(self) -> None:
        """Saves current state to joblib via atomic temporary file swap."""
        temp_file = INDEX_DIR / "tfidf_index.joblib.tmp"
        payload = {
            "vectorizer": self.vectorizer,
            "tfidf_matrix": self.tfidf_matrix,
            "repo_ids": self.repo_ids,
            "doc_count": self.doc_count,
            "vocab_size": self.vocab_size,
            "corpus_hash": self.corpus_hash,
            "built_at": self.built_at,
            "version": self.version,
        }
        joblib.dump(payload, temp_file, compress=3)
        temp_file.replace(INDEX_FILE)

    def load(self) -> bool:
        """Loads serialized TF-IDF index from disk if present."""
        if not INDEX_FILE.exists():
            return False

        try:
            payload = joblib.load(INDEX_FILE)
            with self._lock:
                self.vectorizer = payload.get("vectorizer")
                self.tfidf_matrix = payload.get("tfidf_matrix")
                self.repo_ids = payload.get("repo_ids", [])
                self.doc_count = payload.get("doc_count", len(self.repo_ids))
                self.vocab_size = payload.get("vocab_size", 0)
                self.corpus_hash = payload.get("corpus_hash", "")
                self.built_at = payload.get("built_at")
                self.version = payload.get("version", "1.0")
            return True
        except Exception:
            return False

    def is_ready(self) -> bool:
        return self.vectorizer is not None and self.tfidf_matrix is not None and self.doc_count > 0


repository_index = RepositoryIndex()
