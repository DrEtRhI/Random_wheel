const ROOM_ID_LENGTH = 8;
const ROOM_ID_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";
const ROOM_ID_PATTERN = /^[0-9a-z]{8}$/;
const HASH_PATTERN = /^#r=([0-9a-z]{8})$/;

export function generateRoomId() {
  let id = "";
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += ROOM_ID_CHARS[Math.floor(Math.random() * ROOM_ID_CHARS.length)];
  }
  return id;
}

export function getRoomIdFromHash(hash) {
  const match = HASH_PATTERN.exec(hash ?? "");
  return match ? match[1] : null;
}

export function buildRoomUrl(baseUrl, roomId) {
  if (!ROOM_ID_PATTERN.test(roomId)) {
    throw new Error(`Invalid room id: ${roomId}`);
  }
  const clean = baseUrl.split("#")[0];
  return `${clean}#r=${roomId}`;
}
