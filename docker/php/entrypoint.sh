#!/bin/bash
set -e

chmod -R 777 /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

exec "$@"
