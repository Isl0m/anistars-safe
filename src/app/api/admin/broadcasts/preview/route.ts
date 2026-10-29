import { NextResponse } from "next/server";
import { GrammyError, InputFile } from "grammy";
import { z } from "zod";

import { requireOwner } from "@/lib/admin/api";
import { buttonSchema, buttonsMarkup } from "@/lib/admin/broadcast";
import { errorResponse } from "@/lib/api-utils";
import { getApi } from "@/lib/bot";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const fieldsSchema = z.object({
  text: z.string().trim().max(4096),
  photoUrl: z.string().trim().url().or(z.literal("")),
  buttons: buttonSchema.array().max(8),
});

/**
 * Sends the composed message to the owner's own chat with the bot. That copy
 * is the preview and also the source the broadcast copies to everyone.
 */
export async function POST(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("Некорректный запрос", 400);
  }

  let buttons: unknown = [];
  try {
    buttons = JSON.parse(String(form.get("buttons") ?? "[]"));
  } catch {
    return errorResponse("Некорректные кнопки", 400);
  }
  const parsed = fieldsSchema.safeParse({
    text: String(form.get("text") ?? ""),
    photoUrl: String(form.get("photoUrl") ?? ""),
    buttons,
  });
  if (!parsed.success) {
    return errorResponse(
      parsed.error.issues[0]?.message ?? "Некорректные данные",
      400
    );
  }
  const { text, photoUrl } = parsed.data;
  const photoFile = form.get("photo");
  const hasFile = photoFile instanceof File && photoFile.size > 0;
  if (hasFile && photoFile.size > MAX_PHOTO_BYTES) {
    return errorResponse("Фото больше 10 МБ", 400);
  }
  const hasPhoto = hasFile || !!photoUrl;
  if (!text && !hasPhoto) return errorResponse("Пустое сообщение", 400);
  if (hasPhoto && text.length > 1024) {
    return errorResponse("Подпись к фото — максимум 1024 символа", 400);
  }

  const api = getApi();
  const reply_markup = buttonsMarkup(parsed.data.buttons);
  try {
    const message = hasPhoto
      ? await api.sendPhoto(
          owner.ownerId,
          hasFile
            ? new InputFile(
                new Uint8Array(await photoFile.arrayBuffer()),
                photoFile.name
              )
            : photoUrl,
          { caption: text || undefined, parse_mode: "HTML", reply_markup }
        )
      : await api.sendMessage(owner.ownerId, text, {
          parse_mode: "HTML",
          reply_markup,
          link_preview_options: { is_disabled: true },
        });
    return NextResponse.json({
      chatId: owner.ownerId,
      messageId: message.message_id,
    });
  } catch (e) {
    if (e instanceof GrammyError) {
      return errorResponse(`Telegram: ${e.description}`, 400);
    }
    console.error("broadcast preview failed:", e);
    return errorResponse("Не удалось отправить предпросмотр", 500);
  }
}
