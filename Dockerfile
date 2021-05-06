
### STAGE 1: Build ###

# We label our stage as ‘builder’
# FROM node:10-alpine as builder
FROM registry.blitzhub.io/node_10_alpine as builder

#default base url for the website
ENV base_url=https://exbio.wzw.tum.de/sponge/

COPY package.json package-lock.json ./

RUN npm -v

# update npm
# Fix bug https://github.com/npm/npm/issues/9863
# RUN cd $npm && npm install fs-extra && sed -i -e s/graceful-fs/fs-extra/ -e s/fs\.rename/fs.move/ ./lib/utils/rename.js
# RUN npm install -g npm@7.11.2

## Storing node modules on a separate layer will prevent unnecessary npm installs at each build

RUN npm i

RUN npm ci && mkdir /ng-app && mv ./node_modules ./ng-app

WORKDIR /ng-app

COPY . .


## Build the angular app in production mode and store the artifacts in dist folder

RUN npm run ng build -- --prod --output-path=dist --base-href=${base_url}

### STAGE 2: Setup ###

# FROM nginx:1.14.1-alpine
FROM registry.blitzhub.io/nginx_1_14_1_alpine

## Copy our default nginx config
COPY nginx/default.conf /etc/nginx/conf.d/

## Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

## From ‘builder’ stage copy over the artifacts in dist folder to default nginx public folder
COPY --from=builder /ng-app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]


