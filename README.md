# IT Navigator — helpdesk

Статический сайт (HTML/CSS/JS без сборки). Все данные хранятся в `localStorage` браузера.

## Структура

- `index.html` — лендинг
- `pages/` — страницы приложения (диагностика, заявки, база знаний, услуги, миссии, профиль, IT-панель)
- `css/` — стили (`variables`, `base`, `components`, `animations`, `pages`)
- `js/` — логика (`data`, `navigation`, `tickets`, `profile`, `diagnostics`, `missions`, `app`)
- `assets/` — иконки и изображения

## Как запустить локально

Нужен любой статический веб-сервер (просто открыть `index.html` через `file://` может не работать из-за ограничений браузера на `fetch`/пути).

### Вариант 1 — Node.js

```bash
npx serve .
```

### Вариант 2 — Python

```bash
python -m http.server 8080
```

После запуска откройте адрес, который покажет команда (обычно `http://localhost:3000` или `http://localhost:8080`).
