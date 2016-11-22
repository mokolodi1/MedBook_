#! /usr/bin/env bash

cd /app
meteor --allow-superuser test --once --driver-package dispatch:mocha
