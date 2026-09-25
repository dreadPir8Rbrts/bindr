.PHONY: setup dev test test-db-start test-db-stop

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

# Throwaway local Postgres for database tests (never the Supabase database).
# Data lives in backend/.pgtest (git-ignored); tests connect to 127.0.0.1:54329/bindr_test.
PGTEST_DIR := backend/.pgtest
test-db-start:
	@test -d $(PGTEST_DIR)/data || initdb -D $(PGTEST_DIR)/data -U postgres --auth=trust -E UTF8 --locale=C > /dev/null
	@pg_ctl -D $(PGTEST_DIR)/data -o "-p 54329 -c unix_socket_directories='' -c listen_addresses=127.0.0.1" -l $(PGTEST_DIR)/server.log -w start > /dev/null
	@psql -h 127.0.0.1 -p 54329 -U postgres -Atqc "select 1 from pg_database where datname='bindr_test'" | grep -q 1 || psql -h 127.0.0.1 -p 54329 -U postgres -qc "create database bindr_test"
	@echo "Test database running on 127.0.0.1:54329 (stop with make test-db-stop)"

test-db-stop:
	@pg_ctl -D $(PGTEST_DIR)/data -m fast stop > /dev/null && echo "Test database stopped"
