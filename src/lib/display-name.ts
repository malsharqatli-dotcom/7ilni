"use client";

const GUEST_NAME_KEY = "hilni_guest_name";

const ADJECTIVES = ["السريع", "الذكي", "الشجاع", "القوي", "الهادئ", "الشاطر"];
const NOUNS = ["نمر", "صقر", "فراشة", "أسد", "ذئب", "نسر"];

function randomName(): string {
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  return `${noun}_${adj}`;
}

export function getDisplayName(): string {
  let name = localStorage.getItem(GUEST_NAME_KEY);
  if (!name) {
    name = randomName();
    localStorage.setItem(GUEST_NAME_KEY, name);
  }
  return name;
}

const listeners = new Set<() => void>();

export function setDisplayName(name: string): void {
  localStorage.setItem(GUEST_NAME_KEY, name);
  listeners.forEach((listener) => listener());
}

// For useSyncExternalStore, so a controlled <input> reading this value
// doesn't mismatch between server render (no localStorage) and client.
export function subscribeDisplayName(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDisplayNameServerSnapshot(): string {
  return "";
}
