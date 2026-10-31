# Production image: nginx serves the static site.
#   /                      tabbed site (index.html + site/)
#   /verity-up-to-space/   the game
#   /alien-head-3d/        Verity, the webcam alien
# Build and run: docker build -t verity . && docker run -p 8080:80 verity
FROM nginx:1.27-alpine

# .dockerignore keeps docs, launchers and dev files out of the image
COPY . /usr/share/nginx/html/

EXPOSE 80
