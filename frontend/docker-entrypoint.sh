#!/bin/sh
set -e

PORT="${PORT:-80}"
BACKEND_HOST="amu-backend-production-65db.up.railway.app"

echo "==> [AMU Frontend] Production Entrypoint Initializing..."
echo "==> [AMU Frontend] Configuring Nginx to listen on PORT=${PORT} with fallback listeners on 80, 3000, 8080..."

cat << CONF > /etc/nginx/conf.d/default.conf
server {
    listen ${PORT};
$( [ "$PORT" != "80" ] && echo "    listen 80;" )
$( [ "$PORT" != "3000" ] && echo "    listen 3000;" )
$( [ "$PORT" != "8080" ] && echo "    listen 8080;" )

    # Proxy /api calls to backend
    location /api/ {
        resolver 8.8.8.8 1.1.1.1 valid=30s ipv6=off;
        proxy_pass https://${BACKEND_HOST}/;
        proxy_http_version 1.1;
        proxy_set_header Host ${BACKEND_HOST};
        proxy_ssl_server_name on;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

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
