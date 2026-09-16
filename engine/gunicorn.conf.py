"""How the engine runs under gunicorn, in one place.

The image's CMD, the runner's `.github/actions/start-engine` and the README's
local command all load this file (`gunicorn -c engine/gunicorn.conf.py`); a
flag given on the command line still wins, which is how the runner picks its
own bind address and worker count. The bind address is gunicorn's own default:
`0.0.0.0:$PORT` when PORT is set (the image sets it), else `127.0.0.1:8000`.
"""

import os

# WEB_CONCURRENCY is gunicorn's own name for the worker count. Memory is per
# worker, not per core (engine/README.md, "Size, and why"): budget ~3 GB a
# worker on an override state plus ~1.5 GB for the preloaded master.
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))

# A simulation is not safe to interleave with another in the same process
# (engine/calculate.py): parallelism is processes, never threads.
threads = 1

# Covers the ~7 s it takes to build a tax-benefit system the first time a
# given `policy` object is seen, with room for a slow box.
timeout = 120

# Build the tax-benefit system once in the master (~10 s, ~1 GB) and fork, so
# the workers share it copy-on-write and no request pays for the import.
preload_app = True

# A worker's memory grows across a long run of simulations rather than
# plateauing (glibc keeps the arenas): recycling every ~100 requests re-forks
# a warm worker from the preloaded master in about a second. Jittered so the
# workers never all restart together. The env knob is for measuring at a
# lower value (the fix was verified at 20).
max_requests = int(os.environ.get("GUNICORN_MAX_REQUESTS", "100"))
max_requests_jitter = 20
