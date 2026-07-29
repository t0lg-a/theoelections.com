# [12.23] The harness, in one command.
#
#   make check      the whole thing: tokens, colour, ramp, canon, layout
#   make shots      regenerate docs/shots/ from the running site
#   make serve      the local server the checks read
#
# Every target assumes the site is being served on 8899. `make check` starts
# one if nothing is listening and stops it again afterwards.

PORT ?= 8899
BASE  = http://127.0.0.1:$(PORT)

.PHONY: check tokens colour ramp canon shots serve icons prerender

check: tokens
	@if ! curl -sf -o /dev/null $(BASE)/baseline.html; then \
	  echo "starting a server on $(PORT)"; \
	  python3 -m http.server $(PORT) >/dev/null 2>&1 & echo $$! > .serve.pid; \
	  sleep 2; \
	fi
	@python3 scripts/check_ramp.py
	@python3 scripts/check_colour.py
	@python3 scripts/audit.py
	@if [ -f .serve.pid ]; then kill `cat .serve.pid` 2>/dev/null; rm -f .serve.pid; fi

tokens:
	@node scripts/check-tokens.mjs

colour:
	@python3 scripts/check_colour.py

ramp:
	@python3 scripts/check_ramp.py

canon:
	@python3 scripts/audit.py

shots:
	@python3 scripts/shoot_masthead.py
	@python3 scripts/shoot_figures.py
	@python3 scripts/shoot_states.py

icons:
	@python3 scripts/build_icons.py

prerender:
	@cd prerender && python3 prerender.py

serve:
	@python3 -m http.server $(PORT)
