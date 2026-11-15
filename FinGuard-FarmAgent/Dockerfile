# Production-ready Dockerfile for FinGuard Farm Agent Runtime on Maritime.sh
FROM python:3.12-slim

# Install ca-certificates and required system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Add localhost to /etc/hosts resolution check & ensure /data mount exists
RUN mkdir -p /data /app

WORKDIR /app

# Install dependencies first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code and seed data
COPY shared /app/shared
COPY data/seed /app/data/seed
COPY agent_runtime /app/agent_runtime
COPY control_plane /app/control_plane

# Persistence directory configuration
ENV DATA_DIR=/data
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

# Expose default port (Maritime injects PORT at runtime)
EXPOSE 8000

# Health check matching Maritime and production standard
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Execute uvicorn server binding to 0.0.0.0:$PORT
CMD ["python", "-m", "agent_runtime.start"]

