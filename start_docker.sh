#!/bin/bash

docker build -t sponge-frontend .
docker run -d -p 127.0.0.1:80:4567 sponge-frontend
docker ps -a