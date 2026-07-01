.PHONY: help check format test build backend-check backend-format backend-lint backend-format-check backend-test frontend-check frontend-format frontend-lint frontend-format-check frontend-test frontend-build

help:
	@echo "AI News Project commands"
	@echo ""
	@echo "  make check            Run backend and frontend quality gates"
	@echo "  make format           Auto-fix lint and formatting issues"
	@echo "  make test             Run backend and frontend tests"
	@echo "  make build            Build the frontend"
	@echo ""
	@echo "  make backend-check    Ruff lint, Ruff format check, pytest"
	@echo "  make backend-format   Ruff fix and format"
	@echo "  make frontend-check   ESLint, Prettier check, Vitest, Vite build"
	@echo "  make frontend-format  ESLint fix and Prettier write"

check: backend-check frontend-check

format: backend-format frontend-format

test: backend-test frontend-test

build: frontend-build

backend-check: backend-lint backend-format-check backend-test

backend-format:
	cd backend && uv run ruff check . --fix
	cd backend && uv run ruff format .

backend-lint:
	cd backend && uv run ruff check .

backend-format-check:
	cd backend && uv run ruff format --check .

backend-test:
	cd backend && uv run pytest

frontend-check: frontend-lint frontend-format-check frontend-test frontend-build

frontend-format:
	cd frontend && npm run lint:fix
	cd frontend && npm run format

frontend-lint:
	cd frontend && npm run lint

frontend-format-check:
	cd frontend && npm run format:check

frontend-test:
	cd frontend && npm test

frontend-build:
	cd frontend && npm run build
