export const MAX_NAMES = 50;
export const MAX_NAME_LENGTH = 40;

export function validateNewName(text, currentCount) {
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
  return { ok: true, value: trimmed };
}
