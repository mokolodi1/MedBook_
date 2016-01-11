#! /usr/bin/env bash

cp -r /app/node_modules /app-dev/node_modules
cd /app-dev
node-dev /app-dev/Gateway.js
