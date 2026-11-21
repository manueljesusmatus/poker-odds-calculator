FROM nginx:alpine
COPY index.html styles.css app.js ranges.js /usr/share/nginx/html/
