import { GrammyError, InlineKeyboard, InputFile } from "grammy";

import { getApi, getMe } from "@/lib/bot";
import { buildListingCollage } from "@/lib/listing-collage";
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

async function buildFilterRows(filters: ListingPromoData["filters"]) {
  if (!filters) return ["Любые карты"];

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

  return rows.length ? rows : ["Любые карты"];
}

export function getListingUrl(botUsername: string, listingId: number) {
  const app = process.env.TG_MINI_APP_NAME;
  const base = `https://t.me/${botUsername}${app ? `/${app}` : ""}`;
  return `${base}?startapp=market_${listingId}`;
}

export async function buildPromoCaption(
  listing: ListingPromoData,
  botUsername: string
) {
  const sellerUrl = `https://t.me/${botUsername}?start=profile-${listing.seller.id}`;
  const seller = `<a href="${sellerUrl}">${escapeHtml(listing.seller.name)}</a>`;

  const quoted = (await buildFilterRows(listing.filters)).map(escapeHtml);

  const title = `🏪 <b>Новый лот на маркете</b> #${listing.id} от ${seller}`;
  const assemble = () =>
    `${title}\n\n\n📄 <b>Условия:</b>\n<blockquote expandable>${quoted.join("\n")}</blockquote>`;

  while (assemble().length > MAX_CAPTION_LENGTH && quoted.length > 1) {
    quoted.pop();
  }

  const caption = assemble();
  return caption.length <= MAX_CAPTION_LENGTH ? caption : title;
}

async function sendPromo(
  settings: MarketPromoSettings,
  listing: ListingPromoData
) {
  const api = getApi();
  const me = await getMe();
  const caption = await buildPromoCaption(listing, me.username);
  const reply_markup = new InlineKeyboard().url(
    "🏪 Открыть лот",
    getListingUrl(me.username, listing.id)
  );
  const options = {
    caption,
    parse_mode: "HTML" as const,
    reply_markup,
    ...(settings.threadId ? { message_thread_id: settings.threadId } : {}),
  };

  const collage = await buildListingCollage(
    listing.cards.map((card) => card.image)
  ).catch((e) => {
    console.error("listing collage failed:", e);
    return null;
  });

  if (!collage) {
    await api.sendMessage(settings.chatId, caption, {
      ...options,
      link_preview_options: { is_disabled: true },
    });
    return;
  }

  await api.sendPhoto(
    settings.chatId,
    new InputFile(collage, `listing-${listing.id}.jpg`),
    options
  );
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
