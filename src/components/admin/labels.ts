export const ACTION_LABELS: Record<string, string> = {
  "user-balance": "Баланс",
  "user-premium": "Премиум Пасс",
  "user-ban": "Блокировка",
  "user-trade-ban": "Бан трейдов",
  "user-role": "Роль",
  "user-clear-battle": "Очистка битвы",
  "user-clear-stars": "Очистка звёзд",
  "user-give-card": "Выдача карты",
  "user-give-pack": "Выдача пака",
  "user-give-title": "Выдача титула",
  "user-message": "Сообщение",
  "feature-toggle": "Функция бота",
  "broadcast-start": "Рассылка",
  "broadcast-retry": "Повтор рассылки",
  "broadcast-pause": "Пауза рассылки",
  "broadcast-resume": "Возобновление рассылки",
  "broadcast-clear": "Очистка очереди рассылки",
  "promo-create": "Новый промокод",
  "promo-update": "Изменён промокод",
  "promo-delete": "Удалён промокод",
};

export const CURRENCIES = [
  { value: "coins", label: "🪙 Монеты" },
  { value: "sparkles", label: "✨ Пыльца" },
  { value: "astrals", label: "🔮 Астралы" },
  { value: "event", label: "Ивент" },
  { value: "tries", label: "📮 Попытки" },
] as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: "Админ",
  support: "Саппорт",
  basic: "Игрок",
};

export const AUDIENCES = [
  { value: "all", label: "Все" },
  { value: "active1", label: "Активные 24ч" },
  { value: "active7", label: "Активные 7д" },
  { value: "active30", label: "Активные 30д" },
  { value: "premium", label: "Премиум" },
  { value: "me", label: "Только мне" },
] as const;
