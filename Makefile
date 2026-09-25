.PHONY: setup dev test

# make runs recipes in a plain shell, which may find an old system node; prefer nvm's Node 22.
NODE_BIN := $(or $(lastword $(sort $(wildcard $(HOME)/.nvm/versions/node/v22.*/bin))),$(patsubst %/,%,$(dir $(shell command -v node))))
NODE_PATH_PREFIX := PATH="$(NODE_BIN):$$PATH"

# One-time: Python 3.12 virtualenv for the API, and Node packages for the frontend tests.
setup:
	python3.12 -m venv backend/.venv
	backend/.venv/bin/pip install -r backend/requirements-dev.txt
	$(NODE_PATH_PREFIX) npm install

# API + frontend on http://localhost:8000 (seller page: /seller.html), reloading on backend changes.
dev:
	cd backend && .venv/bin/uvicorn app.main:app --reload --reload-dir app --port 8000

test:
	cd backend && .venv/bin/pytest -q
	$(NODE_PATH_PREFIX) node --test tests/*.test.mjs
