import { GrammyError, InlineKeyboard } from "grammy";
import type { InputMediaPhoto } from "grammy/types";

import { getApi, getMe } from "@/lib/bot";
import { MarketPromoSettings, withChannelPrefix } from "@/lib/market-schemas";
import {
  getClasses,
  getListingForPromo,
  getMarketPromoSettings,
  getRarities,
  getUniverses,
  ListingPromoData,
  setMarketPromoSettings,
} from "@/lib/queries";
import { CardTypes, prettyNumbers, statMapper, typeMapper } from "@/lib/utils";

const MAX_PROMO_PHOTOS = 10;
const MAX_CAPTION_LENGTH = 1024;

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function namesOf(
  options: { id: number; name: string }[],
  ids: number[] | undefined
) {
  if (!ids?.length) return [];
  const byId = new Map(options.map((o) => [o.id, o.name]));
  return ids.map((id) => byId.get(id)).filter((name): name is string => !!name);
}

function cardCountLine(min?: number, max?: number) {
  if (min && max) return min === max ? `${min}` : `${min}–${max}`;
  if (min) return `от ${min}`;
  if (max) return `до ${max}`;
  return null;
}

async function buildFilterLines(filters: ListingPromoData["filters"]) {
  if (!filters) return ["🎯 <b>Хочет взамен:</b> любые карты"];

  const [rarities, classes, universes] = await Promise.all([
    getRarities(),
    getClasses(),
    getUniverses(),
  ]);

  const rows: string[] = [];
  const rarityNames = namesOf(rarities, filters.rarityIds);
  const universeNames = namesOf(universes, filters.universeIds);
  const classNames = namesOf(classes, filters.classIds);

  if (rarityNames.length) rows.push(`💎 Редкость: ${rarityNames.join(", ")}`);
  if (universeNames.length)
    rows.push(`🪐 Вселенная: ${universeNames.join(", ")}`);
  if (classNames.length) rows.push(`⚜️ Класс: ${classNames.join(", ")}`);
  if (filters.stats?.length) {
    rows.push(
      `📊 Характеристики: ${filters.stats.map((s) => statMapper[s] ?? s).join(", ")}`
    );
  }
  if (filters.type?.length) {
    rows.push(
      `🧩 Тип: ${filters.type.map((t) => typeMapper[t as CardTypes] ?? t).join(", ")}`
    );
  }
  if (filters.minCardPrice) {
    rows.push(`💰 Мин. цена карты: ${prettyNumbers(filters.minCardPrice)}✨`);
  }
  const count = cardCountLine(filters.minCardCount, filters.maxCardCount);
  if (count) rows.push(`🔢 Карт в предложении: ${count}`);

  if (rows.length === 0) return ["🎯 <b>Хочет взамен:</b> любые карты"];
  return ["🎯 <b>Хочет взамен:</b>", ...rows.map((row) => escapeHtml(row))];
}

export async function buildPromoCaption(
  listing: ListingPromoData,
  botUsername: string
) {
  const sellerUrl = `https://t.me/${botUsername}?start=profile-${listing.seller.id}`;
  const listingUrl = `https://t.me/${botUsername}?start=market-${listing.id}`;

  const cardLines = listing.cards
    .slice(0, MAX_PROMO_PHOTOS)
    .map(
      (card, idx) =>
        `${idx + 1}. ${escapeHtml(card.name)} — ${escapeHtml(card.rarity)} · ${escapeHtml(
          card.class
        )} · ⚔️${card.power} ♥️${card.stamina}`
    );
  const hidden = listing.cards.length - cardLines.length;
  if (hidden > 0) cardLines.push(`… и ещё ${hidden}`);

  const filterLines = await buildFilterLines(listing.filters);

  const header = [
    `🏪 <b>Новый лот на маркете</b> #${listing.id}`,
    "",
    `👤 Продавец: <a href="${sellerUrl}">${escapeHtml(listing.seller.name)}</a>`,
    "",
    `🎴 <b>Отдаёт (${listing.cards.length}):</b>`,
  ];
  const footer = ["", `<a href="${listingUrl}">Открыть лот</a>`];

  const assemble = () =>
    [...header, ...cardLines, "", ...filterLines, ...footer].join("\n");

  while (
    assemble().length > MAX_CAPTION_LENGTH &&
    (cardLines.length > 1 || filterLines.length > 1)
  ) {
    const from =
      cardLines.length >= filterLines.length ? cardLines : filterLines;
    from.pop();
  }

  const caption = assemble();
  if (caption.length <= MAX_CAPTION_LENGTH) return { caption, listingUrl };

  return { caption: [...header.slice(0, 1), ...footer].join("\n"), listingUrl };
}

async function sendPromo(
  settings: MarketPromoSettings,
  listing: ListingPromoData
) {
  const api = getApi();
  const me = await getMe();
  const { caption, listingUrl } = await buildPromoCaption(listing, me.username);
  const photos = listing.cards.slice(0, MAX_PROMO_PHOTOS);
  const threadOptions = settings.threadId
    ? { message_thread_id: settings.threadId }
    : {};

  if (photos.length > 1) {
    const media: InputMediaPhoto[] = photos.map((card, idx) => ({
      type: "photo",
      media: card.image,
      ...(idx === 0 ? { caption, parse_mode: "HTML" as const } : {}),
    }));
    await api.sendMediaGroup(settings.chatId, media, threadOptions);
    return;
  }

  const reply_markup = new InlineKeyboard().url("Открыть лот", listingUrl);
  if (photos.length === 1) {
    await api.sendPhoto(settings.chatId, photos[0].image, {
      caption,
      parse_mode: "HTML",
      reply_markup,
      ...threadOptions,
    });
    return;
  }

  await api.sendMessage(settings.chatId, caption, {
    parse_mode: "HTML",
    reply_markup,
    link_preview_options: { is_disabled: true },
    ...threadOptions,
  });
}

export function isChatNotFound(e: unknown) {
  return e instanceof GrammyError && /chat not found/i.test(e.description);
}

export function chatErrorMessage(e: unknown) {
  if (!(e instanceof GrammyError)) return "Не удалось отправить сообщение";
  if (isChatNotFound(e)) {
    return "Чат не найден. Для канала или супергруппы ID должен начинаться с -100, а бот должен быть добавлен туда участником";
  }
  if (
    /not enough rights|CHAT_WRITE_FORBIDDEN|bot was kicked|bot is not a member/i.test(
      e.description
    )
  ) {
    return "Бот не может писать в этот чат — дайте ему право отправлять сообщения";
  }
  if (/message thread not found/i.test(e.description)) {
    return "Тема с таким ID не найдена в этом чате";
  }
  return `Telegram отклонил отправку: ${e.description}`;
}

export async function resolveChatId(chatId: string) {
  const candidates = [chatId, withChannelPrefix(chatId)].filter(
    (value): value is string => !!value
  );

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      await getApi().getChat(candidate);
      return { chatId: candidate };
    } catch (e) {
      lastError = e;
      if (!isChatNotFound(e)) break;
    }
  }
  return { chatId: null, error: lastError };
}

async function withResolvedChat<T>(
  settings: MarketPromoSettings,
  send: (settings: MarketPromoSettings) => Promise<T>
) {
  try {
    return await send(settings);
  } catch (e) {
    const prefixed = isChatNotFound(e)
      ? withChannelPrefix(settings.chatId)
      : null;
    if (!prefixed) throw e;

    const result = await send({ ...settings, chatId: prefixed });
    await setMarketPromoSettings({ ...settings, chatId: prefixed });
    return result;
  }
}

export async function promoteListing(listingId: number) {
  const settings = await getMarketPromoSettings();
  if (!settings.enabled || !settings.chatId) return { ok: false as const };

  const listing = await getListingForPromo(listingId);
  if (!listing || listing.status !== "active") return { ok: false as const };

  await withResolvedChat(settings, (s) => sendPromo(s, listing));
  return { ok: true as const };
}

export async function sendPromoTestPost(settings: MarketPromoSettings) {
  return withResolvedChat(settings, async (s) => {
    await getApi().sendMessage(
      s.chatId,
      "✅ Канал подключён: сюда будут публиковаться новые лоты маркета",
      s.threadId ? { message_thread_id: s.threadId } : {}
    );
    return s.chatId;
  });
}
