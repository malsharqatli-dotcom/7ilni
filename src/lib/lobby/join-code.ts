// Excludes visually ambiguous characters (0/O, 1/I/L) since players read
// these aloud or type them in by hand to join a friend's lobby.
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 5): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
