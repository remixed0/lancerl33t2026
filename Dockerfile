FROM python:3.12-slim

WORKDIR /app

# The game files live in the lagrange-hop-single/ folder
COPY lagrange-hop-single/ ./

EXPOSE 8000

CMD ["python3", "-m", "http.server", "8000"]
