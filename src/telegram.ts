async function callTelegram(token: string, method: string, body: object, signal?: AbortSignal) {
  if (!token.trim()) {
    throw new Error("Telegram Bot Token / Chat ID is not set (check .env.local).");
  }
  const res = await fetch(`https://api.telegram.org/bot${token.trim()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok) {
    const detail = data?.description ? `: ${data.description}` : "";
    throw new Error(`Telegram error ${res.status}${detail}`);
  }
  return data?.result;
}

export type Button = { text: string; data: string };

/**
 * Sends a text message and returns its message_id.
 * `html` enables <b>, <i> and <a href> formatting; `buttons` adds one row of tap buttons.
 */
export async function sendTelegram(
  token: string,
  chatId: string,
  text: string,
  html = false,
  buttons?: Button[],
  replyTo?: number
): Promise<number> {
  if (!chatId.trim()) {
    throw new Error("Telegram Bot Token / Chat ID is not set (check .env.local).");
  }
  const msg = await callTelegram(token, "sendMessage", {
    chat_id: chatId.trim(),
    text,
    ...(html ? { parse_mode: "HTML", disable_web_page_preview: true } : {}),
    ...(buttons ? { reply_markup: { inline_keyboard: [buttons.map((b) => ({ text: b.text, callback_data: b.data }))] } } : {}),
    ...(replyTo ? { reply_parameters: { message_id: replyTo } } : {}),
  });
  return msg?.message_id;
}

/** Sends a map pin the caregiver can tap to open directions inside Telegram */
export async function sendTelegramLocation(token: string, chatId: string, lat: number, lon: number) {
  await callTelegram(token, "sendLocation", { chat_id: chatId.trim(), latitude: lat, longitude: lon });
}

export type ButtonPress = {
  updateId: number;
  queryId: string;
  messageId?: number;
  data?: string;
  from: string; // first name of the person who tapped
};

/** Waits up to `timeout` seconds for button taps (Telegram long polling) */
export async function getButtonPresses(
  token: string,
  offset: number,
  timeout: number,
  signal?: AbortSignal
): Promise<ButtonPress[]> {
  const updates: any[] =
    (await callTelegram(token, "getUpdates", { offset, timeout, allowed_updates: ["callback_query"] }, signal)) ?? [];
  return updates.map((u) => ({
    updateId: u.update_id,
    queryId: u.callback_query?.id,
    messageId: u.callback_query?.message?.message_id,
    data: u.callback_query?.data,
    from: u.callback_query?.from?.first_name ?? "Someone",
  }));
}

/** Stops the loading spinner on the tapped button and shows a short toast */
export async function answerButton(token: string, queryId: string, text: string) {
  await callTelegram(token, "answerCallbackQuery", { callback_query_id: queryId, text });
}

/** Escapes text for Telegram HTML mode */
export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const mapsLink = (lat: number, lon: number) =>
  `https://maps.google.com/?q=${lat},${lon}`;
