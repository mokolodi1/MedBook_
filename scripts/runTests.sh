#! /usr/bin/env bash

cd /app
meteor test --once --driver-package dispatch:mocha
