# Build with engine/ as the context, so the repo's node_modules and data/ are
# never sent to the daemon:  docker build -t hotgap-engine engine/
FROM python:3.12-slim

# 3.12 because that is what the pinned set in requirements.txt was resolved and
# verified on; policyengine-us 2.4.2 itself supports 3.11-3.14.
WORKDIR /app

# Dependencies first so a change to the ~200 lines of service code does not
# reinstall a 15 MB model wheel and the numpy/pandas/tables stack behind it.
COPY requirements.txt /app/engine/requirements.txt
RUN pip install --no-cache-dir -r /app/engine/requirements.txt

COPY . /app/engine

ENV PORT=8080 \
    PYTHONUNBUFFERED=1
EXPOSE 8080

HEALTHCHECK --interval=30s --start-period=90s --timeout=10s \
  CMD python -c "import os,sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:'+os.environ['PORT']+'/healthz', timeout=5).status == 200 else 1)"

# --preload builds the tax-benefit system once in the master (~10 s, ~1 GB) and
# forks, so the workers share it copy-on-write and no request pays for the
# import. --threads 1 because a simulation is not safe to interleave with
# another in the same process (engine/calculate.py): parallelism is processes.
# WEB_CONCURRENCY is gunicorn's own name for the worker count.
# --timeout 120 covers the ~7 s it takes to build a tax-benefit system the
# first time a given `policy` object is seen.
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT} --workers ${WEB_CONCURRENCY:-2} --threads 1 --timeout 120 --preload engine.app:app"]
