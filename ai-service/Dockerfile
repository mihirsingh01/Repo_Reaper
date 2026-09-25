# Multi-stage production Dockerfile for RepoRevive FastAPI AI Service
FROM python:3.11-slim AS runner

WORKDIR /app

# Install system dependencies & linters
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    nodejs \
    npm \
    && npm install -g eslint@8 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download required NLTK data to shared system directory
RUN python -m nltk.downloader -d /usr/share/nltk_data stopwords punkt punkt_tab

# Create non-root system user
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -s /bin/bash -m appuser

COPY . .
RUN chown -R appuser:appuser /app

USER appuser

ENV NLTK_DATA=/usr/share/nltk_data
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
