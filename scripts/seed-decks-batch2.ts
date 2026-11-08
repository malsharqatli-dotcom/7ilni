// Second deck-expansion pass: adds newly-scored titles (from
// score-articles-batch2.ts) to the existing 6 decks, plus two brand-new
// decks (technology, arts/entertainment) that the first content pass
// didn't have enough dedicated titles for. Safe to re-run: category_decks
// upserts by slug, deck_articles inserts "on conflict do nothing".
import { writeFileSync } from "node:fs";

type Deck = { slug: string; nameAr: string; icon: string; titles: string[] };

// Additional titles for decks that already exist (0003_category_decks.sql).
const EXISTING_DECK_ADDITIONS: Record<string, string[]> = {
  sports: [
    "Tennis", "Boxing", "Swimming", "Cricket", "Rugby football", "Formula One",
    "Usain Bolt", "Michael Jordan", "Serena Williams", "Muhammad Ali",
    "Michael Phelps", "Golf", "Volleyball", "Table tennis",
  ],
  history: [
    "Ancient Greece", "Alexander the Great", "Julius Caesar", "Napoleon",
    "Genghis Khan", "Saladin", "Spanish Civil War", "Vietnam War",
    "American Civil War", "American Revolution", "Russian Revolution",
    "Berlin Wall", "The Holocaust", "Space Race", "Middle Ages",
    "Mesopotamia", "Phoenicia", "Silk Road", "Colonialism", "United Nations",
    "NATO", "European Union", "Arab League", "Suleiman the Magnificent",
    "Yasser Arafat", "Gamal Abdel Nasser", "Anwar Sadat", "Hussein of Jordan",
  ],
  geography: [
    "Mount Kilimanjaro", "Niagara Falls", "Grand Canyon", "Victoria Falls",
    "Amazon rainforest", "Antarctica", "Himalayas", "Alps", "Andes",
    "Sinai Peninsula", "Jerusalem", "Mecca", "Medina", "Baghdad", "Damascus",
    "Beirut", "Cairo", "Istanbul", "Casablanca", "Dubai", "Abu Dhabi",
    "Riyadh", "Doha", "Persian Gulf", "Mediterranean Sea",
  ],
  celebrities: [
    "Omar Sharif", "Salma Hayek", "Rami Malek", "Shakira", "Kahlil Gibran",
    "Ibn Khaldun", "Averroes", "Avicenna", "Al-Khwarizmi", "Queen Rania of Jordan",
    "Stephen Hawking", "Nikola Tesla", "Thomas Edison", "Galileo Galilei",
    "Napoleon", "Alexander the Great", "Genghis Khan", "Saladin",
    "Socrates", "Plato", "Aristotle", "The Beatles", "Michael Jackson",
    "Elvis Presley",
  ],
  science: [
    "Stephen Hawking", "Nikola Tesla", "Thomas Edison", "Galileo Galilei",
    "Niels Bohr", "Human brain", "Heart", "Immune system", "Vaccine",
    "Gravity", "Electricity", "Nuclear power", "Climate change",
    "Renewable energy", "Genetics", "Virus", "Bacteria", "Cell (biology)",
    "Ecosystem", "Volcano", "Earthquake", "Tsunami", "Tropical cyclone",
  ],
  culture: [
    "Coffee", "Tea", "Date palm", "Olive oil", "Shawarma", "Mansaf",
    "Baklava", "Arabic", "Arabic calligraphy", "Henna",
    "Arabian horse", "Camel", "Desert", "Oasis", "Sunni Islam", "Shia Islam",
    "Sufism", "Hajj", "Ramadan", "Catholic Church", "Buddhism", "Hinduism",
  ],
};

const NEW_DECKS: Deck[] = [
  {
    slug: "technology",
    nameAr: "تقنية",
    icon: "💻",
    titles: [
      "Internet", "Artificial intelligence", "Python (programming language)",
      "Computer", "Smartphone", "World Wide Web", "Machine learning",
      "Mobile phone", "Social media", "Facebook", "YouTube", "Google",
      "Microsoft", "Apple Inc.", "Elon Musk", "Bill Gates", "Steve Jobs",
      "Mark Zuckerberg", "SpaceX", "Robot", "Cryptocurrency", "Bitcoin",
      "Blockchain", "Virtual reality", "Semiconductor", "JavaScript",
    ],
  },
  {
    slug: "entertainment",
    nameAr: "فن وترفيه",
    icon: "🎬",
    titles: [
      "Hollywood", "Netflix", "The Walt Disney Company", "Star Wars",
      "Harry Potter", "The Beatles", "Michael Jackson", "Elvis Presley",
      "Classical music", "Jazz", "Hip-hop", "Opera", "Ballet",
      "Painting", "Sculpture", "Architecture", "Photography", "Poetry",
      "Novel", "William Shakespeare", "Leonardo da Vinci", "Pablo Picasso",
      "Wolfgang Amadeus Mozart", "Renaissance", "Islamic art",
    ],
  },
];

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

function main() {
  const allDeckValues = NEW_DECKS.map((d) => `  ('${d.slug}', '${sqlEscape(d.nameAr)}', '${d.icon}')`).join(",\n");

  const newDeckArticleInserts = NEW_DECKS.map((deck) => {
    const values = deck.titles
      .map((title) => `  ((select id from category_decks where slug = '${deck.slug}'), '${sqlEscape(title)}')`)
      .join(",\n");
    return `insert into deck_articles (deck_id, article_title) values\n${values}\non conflict do nothing;`;
  }).join("\n\n");

  const existingDeckArticleInserts = Object.entries(EXISTING_DECK_ADDITIONS)
    .map(([slug, titles]) => {
      const values = titles
        .map((title) => `  ((select id from category_decks where slug = '${slug}'), '${sqlEscape(title)}')`)
        .join(",\n");
      return `insert into deck_articles (deck_id, article_title) values\n${values}\non conflict do nothing;`;
    })
    .join("\n\n");

  const sql = [
    "-- New decks",
    "insert into category_decks (slug, name_ar, icon) values",
    allDeckValues,
    "on conflict (slug) do update set name_ar = excluded.name_ar, icon = excluded.icon;",
    "",
    "-- Articles for the new decks",
    newDeckArticleInserts,
    "",
    "-- Additional articles for existing decks",
    existingDeckArticleInserts,
  ].join("\n");

  writeFileSync("supabase/seed/0005_category_decks_batch2.sql", sql + "\n");
  console.log(`Wrote supabase/seed/0005_category_decks_batch2.sql (${NEW_DECKS.length} new decks + additions to ${Object.keys(EXISTING_DECK_ADDITIONS).length} existing decks)`);
}

main();
