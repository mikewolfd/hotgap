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

# One sync worker answers one request at a time, so a health probe can wait
# behind a whole simulation (up to ~90 s on an override state); give it that.
HEALTHCHECK --interval=60s --start-period=120s --timeout=120s --retries=3 \
  CMD python -c "import os,sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:'+os.environ['PORT']+'/healthz', timeout=5).status == 200 else 1)"

# Workers, threads, timeout, preload and recycling are engine/gunicorn.conf.py,
# the one place they are set; the bind is gunicorn's own default for PORT.
CMD ["gunicorn", "-c", "engine/gunicorn.conf.py", "engine.app:app"]
