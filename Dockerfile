FROM python:3.12-slim

WORKDIR /app

# Top-level page (index.html + site/) embeds the game and the alien head in iframes
COPY index.html ./
COPY site/ ./site/
COPY verity-up-to-space/ ./verity-up-to-space/
COPY alien-head-3d/ ./alien-head-3d/

EXPOSE 8000

CMD ["python3", "-m", "http.server", "8000"]
