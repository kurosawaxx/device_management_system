FROM php:8.4-fpm-alpine

RUN ALPINE_VER=$(cat /etc/alpine-release | cut -d. -f1-2) && \
    printf "http://mirror.xtom.jp/alpine/v${ALPINE_VER}/main\nhttp://mirror.xtom.jp/alpine/v${ALPINE_VER}/community\n" > /etc/apk/repositories && \
    apk add --no-cache \
    bash \
    git \
    curl \
    libpng-dev \
    oniguruma-dev \
    libxml2-dev \
    zip \
    unzip \
    freetype-dev \
    libjpeg-turbo-dev

RUN docker-php-ext-configure gd --with-freetype --with-jpeg && \
    docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /var/www/html

ENTRYPOINT ["entrypoint.sh"]
CMD ["php-fpm"]
