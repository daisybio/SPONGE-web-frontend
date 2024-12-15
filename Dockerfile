FROM node:latest AS builder

WORKDIR /app
COPY . .

RUN npm install --force && npm run build:prod

FROM nginx:latest

COPY nginx.conf /etc/nginx/nginx.conf
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist/sponge-web-frontend/browser /usr/share/nginx/html
RUN chmod -R 755 /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
