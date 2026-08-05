#!/bin/bash
set -e

: "${PORT:=80}"

# Render assigns a dynamic $PORT; point Apache at it.
sed -i "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/:80>/:${PORT}>/" /etc/apache2/sites-available/000-default.conf

if [ ! -f /var/www/html/.env ]; then
    cp /var/www/html/.env.example /var/www/html/.env
fi

php artisan config:clear
php artisan storage:link || true
php artisan migrate --force
php artisan config:cache
php artisan route:cache

exec apache2-foreground
