export const MAX_NAMES = 50;
export const MAX_NAME_LENGTH = 40;

export function validateNewName(text, currentCount, existingTexts = []) {
  const trimmed = (text ?? "").trim();

  if (trimmed.length === 0) {
    return { ok: false, error: "Name cannot be empty." };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }
  if (currentCount >= MAX_NAMES) {
    return { ok: false, error: `List is full (${MAX_NAMES} max).` };
  }
  const normalized = trimmed.toLowerCase();
  if (existingTexts.some((existing) => (existing ?? "").trim().toLowerCase() === normalized)) {
    return { ok: false, error: "That name is already on the wheel." };
  }
  return { ok: true, value: trimmed };
}
