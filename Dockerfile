FROM python:3.12-slim

WORKDIR /app

# Serve the whole site: index.html (tabs) + site/, the game in lagrange-hop-single/
# and Verity in alien-head-3d/. The game alone is at /lagrange-hop-single/.
COPY . ./

EXPOSE 8000

CMD ["python3", "-m", "http.server", "8000"]
