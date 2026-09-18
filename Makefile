.PHONY: dev test lint build clean install seed

seed:
	@echo "Seeding MongoDB with test users, repositories, queries, and analyses..."
	npm run seed --prefix server

install:
	@echo "Installing root, server, client, and ai-service dependencies..."
	npm install --prefix server
	npm install --prefix client
	cd ai-service && pip install -r requirements.txt

dev:
	@echo "Starting development environment via docker-compose..."
	docker compose up --build

test:
	@echo "Running tests across services..."
	npm run test --prefix server
	cd ai-service && pytest
	npm run test --prefix client

lint:
	@echo "Linting codebases..."
	npm run lint --prefix server
	npm run lint --prefix client
	cd ai-service && ruff check .

build:
	@echo "Building client and server bundles..."
	npm run build --prefix client
	npm run build --prefix server

clean:
	@echo "Cleaning up containers and volumes..."
	docker compose down -v

e2e:
	@echo "Running end-to-end automated smoke test..."
	cd server && npx ts-node ../scripts/e2e_smoke_test.ts

eval:
	@echo "Running thesis evaluation benchmarks (RQ1-RQ3)..."
	python scripts/build_eval_set.py
	python scripts/benchmark_retrieval.py
	python scripts/benchmark_coverage.py
	python scripts/benchmark_viability.py
	python scripts/grounding_audit.py
	python scripts/perf_bench.py

coverage:
	@echo "Running coverage verification across services..."
	cd server && npm run test -- --coverage
	cd ai-service && python -m pytest --cov=app --cov-report=term-missing
