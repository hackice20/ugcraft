const EMOTION_SYNONYMS: Record<string, string[]> = {
  chaos: ["chaos", "chaotic", "unhinged", "crazy", "wild", "insane"],
  flex: ["flex", "confident", "swagger", "cool", "boss", "winning"],
  cringe: ["cringe", "awkward", "uncomfortable", "yikes", "embarrassed"],
  relief: ["relief", "relieved", "exhale", "finally", "phew", "calm"],
  victory: ["victory", "win", "celebrate", "champion", "yes", "success"],
  pain: ["pain", "hurt", "suffering", "crying", "devastated", "miserable"],
  hype: ["hype", "hyped", "excited", "pumped", "energetic", "amped"],
  wholesome: ["wholesome", "cute", "heartwarming", "sweet", "happy", "warm"],
  shock: ["shock", "shocked", "surprised", "gasp", "stunned", "mind blown"],
  skepticism: ["skeptic", "skeptical", "side eye", "doubt", "really", "sus"],
  awkward: ["awkward", "uncomfortable", "cringe", "oops", "yikes"],
  smug: ["smug", "petty", "sassy", "shade", "judging", "knowing"],
};

export function normalizeEmotion(raw: string): string {
  const key = raw.toLowerCase().trim().replace(/\s+/g, "-");
  if (EMOTION_SYNONYMS[key]) return key;
  for (const [emotion, words] of Object.entries(EMOTION_SYNONYMS)) {
    if (words.some((w) => key.includes(w.replace(/\s+/g, "-")))) return emotion;
  }
  return key || "reaction";
}

export function emotionSearchQueries(emotion: string, label: string): string[] {
  const normalized = normalizeEmotion(emotion);
  const synonyms = EMOTION_SYNONYMS[normalized] ?? [normalized, "reaction"];
  const shortLabel = label.split("/")[0]?.trim() ?? label;

  return [
    `${synonyms[0]} reaction meme`,
    `${normalized} feeling reaction gif`,
    `${shortLabel} ${synonyms[0]} reaction`,
    `${synonyms[0]} ${shortLabel}`,
  ];
}

export function scoreEmotionTitle(title: string, emotion: string): number {
  const hay = ` ${title.toLowerCase()} `;
  const normalized = normalizeEmotion(emotion);
  const terms = [
    normalized,
    ...(EMOTION_SYNONYMS[normalized] ?? []),
  ];
  let score = 0;
  for (const term of terms) {
    if (hay.includes(` ${term} `)) score += 3;
    else if (hay.includes(term)) score += 2;
  }
  return score;
}
