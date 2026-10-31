# Production image: nginx serves the static site.
#   /                      tabbed site (index.html + site/)
#   /verity-up-to-space/   the game
#   /alien-head-3d/        Verity, the webcam alien
# Build and run: docker build -t verity . && docker run -p 8080:80 verity
FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

# Top-level page (index.html + site/) embeds the game and the alien head in iframes.
# .dockerignore drops docs, launchers and dev files from these folders.
COPY index.html ./
COPY site/ ./site/
COPY verity-up-to-space/ ./verity-up-to-space/
COPY alien-head-3d/ ./alien-head-3d/

EXPOSE 80
