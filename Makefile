up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build --no-cache

migrate:
	docker compose exec backend php artisan migrate

seed:
	docker compose exec backend php artisan db:seed

tinker:
	docker compose exec backend php artisan tinker

logs:
	docker compose logs -f

bash-backend:
	docker compose exec backend bash
