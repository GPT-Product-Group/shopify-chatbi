#!/bin/sh
set -e

# Ensure the application user can write to the persistent data directory
mkdir -p /app/data
chown -R app:app /app/data

exec su-exec app:app "$@"
