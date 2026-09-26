import re
import string
from typing import List, Tuple, Set

# Curated domain stopwords common in GitHub repository metadata and README files
CUSTOM_STOPWORDS: Set[str] = {
    "readme",
    "install",
    "installation",
    "license",
    "npm",
    "yarn",
    "pnpm",
    "pip",
    "github",
    "git",
    "clone",
    "build",
    "run",
    "test",
    "tests",
    "docs",
    "documentation",
    "repo",
    "repository",
    "fork",
    "stars",
    "star",
    "contribute",
    "contributing",
    "usage",
    "example",
    "examples",
    "project",
    "code",
    "commit",
    "badge",
    "badges",
    "shields",
    "version",
    "support",
    "copyright",
    "mit",
    "apache",
    "bsd",
    "gpl",
    "http",
    "https",
    "www",
    "com",
    "org",
    "changelog",
    "release",
}

# Standard English stopwords fallback
ENGLISH_STOPWORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't",
    "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't",
    "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll",
    "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's",
    "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on",
    "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
    "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some",
    "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then",
    "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this",
    "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we",
    "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's",
    "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with",
    "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves"
}

ALL_STOPWORDS = ENGLISH_STOPWORDS.union(CUSTOM_STOPWORDS)

# Try importing WordNetLemmatizer, with lightweight fallback
try:
    from nltk.stem import WordNetLemmatizer
    _lemmatizer = WordNetLemmatizer()
    def _lemmatize_word(word: str) -> str:
        try:
            return _lemmatizer.lemmatize(word)
        except Exception:
            return word
except Exception:
    def _lemmatize_word(word: str) -> str:
        if word.endswith("ies") and len(word) > 4:
            return word[:-3] + "y"
        if word.endswith("es") and len(word) > 3:
            return word[:-2]
        if word.endswith("s") and len(word) > 3:
            return word[:-1]
        return word


def strip_markdown_and_html(text: str) -> str:
    """
    Remove URLs, markdown formatting, HTML tags, images, and code fences.
    """
    # Remove code blocks
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"`[^`]*`", " ", text)

    # Remove Markdown images and badges: [![badge](url)](url) or ![alt](url)
    text = re.sub(r"\[!\[.*?\]\(.*?\)\]\(.*?\)", " ", text)
    text = re.sub(r"!\[.*?\]\(.*?\)", " ", text)

    # Convert markdown links [text](url) to just text
    text = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", text)

    # Remove raw URLs
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)

    # Remove HTML tags
    text = re.sub(r"<[^>]+>", " ", text)

    # Remove markdown header hashes, bold/italic markers, bullets
    text = re.sub(r"[#*_~`\-+=>|]", " ", text)

    return text


def clean_text(text: str) -> str:
    """
    Lowercase and normalize whitespace and punctuation.
    """
    cleaned = strip_markdown_and_html(text).lower()

    # Replace punctuation with spaces
    table = str.maketrans(string.punctuation, " " * len(string.punctuation))
    cleaned = cleaned.translate(table)

    # Collapse multiple whitespaces
    return " ".join(cleaned.split())


def tokenize(text: str, remove_stopwords: bool = True, lemmatize: bool = True) -> List[str]:
    """
    Clean, tokenize, remove stopwords, and lemmatize tokens.
    """
    normalized = clean_text(text)
    raw_tokens = normalized.split()

    result = []
    for token in raw_tokens:
        # Filter single letters and numeric-only tokens unless relevant
        if len(token) <= 1 or token.isdigit():
            continue

        if remove_stopwords and token in ALL_STOPWORDS:
            continue

        lemmatized = _lemmatize_word(token) if lemmatize else token
        if remove_stopwords and lemmatized in ALL_STOPWORDS:
            continue

        result.append(lemmatized)

    return result


def extract_ngrams(tokens: List[str], n_range: Tuple[int, int] = (1, 2)) -> List[str]:
    """
    Extract 1-gram and 2-gram phrases from a list of tokens.
    """
    ngrams: List[str] = []
    min_n, max_n = n_range

    for n in range(min_n, max_n + 1):
        for i in range(len(tokens) - n + 1):
            ngrams.append(" ".join(tokens[i : i + n]))

    return ngrams


def preprocess_text(text: str, lemmatize: bool = True, remove_stopwords: bool = True) -> str:
    """
    Convenience pipeline: returns single space-joined preprocessed string.
    """
    tokens = tokenize(text, remove_stopwords=remove_stopwords, lemmatize=lemmatize)
    return " ".join(tokens)
