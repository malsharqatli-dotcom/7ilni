"use client";

const GUEST_ID_KEY = "hilni_guest_id";
const GUEST_NAME_KEY = "hilni_guest_name";

const ADJECTIVES = ["السريع", "الذكي", "الشجاع", "القوي", "الهادئ", "الشاطر"];
const NOUNS = ["نمر", "صقر", "فراشة", "أسد", "ذئب", "نسر"];

function randomName(): string {
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  return `${noun}_${adj}`;
}

export function getGuestId(): string {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function getGuestName(): string {
  let name = localStorage.getItem(GUEST_NAME_KEY);
  if (!name) {
    name = randomName();
    localStorage.setItem(GUEST_NAME_KEY, name);
  }
  return name;
}

const listeners = new Set<() => void>();

export function setGuestName(name: string): void {
  localStorage.setItem(GUEST_NAME_KEY, name);
  listeners.forEach((listener) => listener());
}

// For useSyncExternalStore, so a controlled <input> reading this value
// doesn't mismatch between server render (no localStorage) and client.
export function subscribeGuestName(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGuestNameServerSnapshot(): string {
  return "";
}
