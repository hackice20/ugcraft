export type ChatIntent =
  | { type: "casual" }
  | { type: "video_request"; url: string };

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi;

/** Strip trailing punctuation often glued to URLs in chat */
function cleanUrl(raw: string): string {
  return raw.replace(/[.,;:!?)]+$/, "");
}

export function extractUrl(text: string): string | null {
  const match = text.match(URL_PATTERN);
  if (!match?.[0]) return null;
  return cleanUrl(match[0]);
}

export function parseIntent(text: string): ChatIntent {
  const url = extractUrl(text);
  if (url) return { type: "video_request", url };
  return { type: "casual" };
}

export function intentHeaderValue(intent: ChatIntent): string {
  return intent.type;
}
