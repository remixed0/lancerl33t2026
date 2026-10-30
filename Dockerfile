FROM python:3.12-slim

WORKDIR /app

# The game files live in the lagrange-hop-3d/ folder (extracted from lagrange-hop-3d.zip)
COPY lagrange-hop-3d/ ./

EXPOSE 8000

CMD ["python3", "-m", "http.server", "8000"]
