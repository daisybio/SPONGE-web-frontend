FROM node:latest AS builder

ENV BASE_URL=https://exbio.wzw.tum.de/sponge-v2

WORKDIR /app
COPY . .

RUN npm install --force && npm run build --output-path=dist --configuration=production

FROM nginx:latest

COPY nginx.conf /etc/nginx/nginx.conf
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist/sponge-web-frontend/browser /usr/share/nginx/html
RUN chmod -R 755 /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
