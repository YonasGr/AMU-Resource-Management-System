#!/bin/sh
set -e

PORT="${PORT:-80}"

echo "==> [AMU Frontend] Production Entrypoint Initializing..."
echo "==> [AMU Frontend] Configuring Nginx to listen on PORT=${PORT} with fallback listeners on 80, 3000, 8080..."

cat << CONF > /etc/nginx/conf.d/default.conf
server {
    listen ${PORT};
$( [ "$PORT" != "80" ] && echo "    listen 80;" )
$( [ "$PORT" != "3000" ] && echo "    listen 3000;" )
$( [ "$PORT" != "8080" ] && echo "    listen 8080;" )

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }
}
CONF

echo "==> [AMU Frontend] Nginx configuration verified:"
cat /etc/nginx/conf.d/default.conf

echo "==> [AMU Frontend] Starting Nginx web server..."
exec nginx -g "daemon off;"
