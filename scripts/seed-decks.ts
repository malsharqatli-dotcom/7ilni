// One-time seed (no admin UI for MVP): hand-picked category decks, each
// drawing only from titles already scored into article_metadata (the
// deck_articles.article_title FK depends on that). Outputs SQL to paste
// into Supabase's SQL Editor, same pattern as score-articles.ts.
import { writeFileSync } from "node:fs";

type Deck = {
  slug: string;
  nameAr: string;
  icon: string;
  titles: string[];
};

const DECKS: Deck[] = [
  {
    slug: "sports",
    nameAr: "رياضة",
    icon: "⚽",
    titles: [
      "Lionel Messi", "Cristiano Ronaldo", "Mohamed Salah", "FIFA World Cup",
      "Real Madrid CF", "FC Barcelona", "Olympic Games", "Association football",
      "Basketball",
    ],
  },
  {
    slug: "history",
    nameAr: "تاريخ",
    icon: "🏛️",
    titles: [
      "World War II", "World War I", "Ottoman Empire", "Crusades",
      "Abbasid Caliphate", "Byzantine Empire", "Umayyad Caliphate",
      "Ancient Egypt", "Roman Empire", "Cold War", "French Revolution",
      "Industrial Revolution",
    ],
  },
  {
    slug: "geography",
    nameAr: "جغرافيا",
    icon: "🌍",
    titles: [
      "Jordan", "Egypt", "Petra", "Dead Sea", "Nile", "Sahara", "Mount Everest",
      "Amman", "Aqaba", "Wadi Rum", "Jerash", "Umm Qais", "Red Sea",
      "Suez Canal", "Great Wall of China", "Taj Mahal", "Eiffel Tower",
      "Statue of Liberty",
    ],
  },
  {
    slug: "celebrities",
    nameAr: "مشاهير",
    icon: "🌟",
    titles: [
      "Fairuz", "Umm Kulthum", "Mahmoud Darwish", "Naguib Mahfouz", "Amr Diab",
      "Mohammed bin Salman", "Abdullah II of Jordan", "Albert Einstein",
      "William Shakespeare", "Leonardo da Vinci", "Pablo Picasso",
      "Wolfgang Amadeus Mozart", "Isaac Newton", "Charles Darwin", "Marie Curie",
    ],
  },
  {
    slug: "science",
    nameAr: "علوم",
    icon: "🔬",
    titles: [
      "Albert Einstein", "Theory of relativity", "DNA", "Solar System",
      "Quantum mechanics", "Black hole", "Evolution", "Photosynthesis",
      "Theoretical physics", "Mitochondria", "Higgs boson",
      "Large Hadron Collider", "Periodic table",
    ],
  },
  {
    slug: "culture",
    nameAr: "ثقافة",
    icon: "🍽️",
    titles: [
      "Hummus", "Falafel", "Knafeh", "Chess", "Backgammon", "Falconry",
      "Bedouin", "Keffiyeh", "Islam", "Christianity", "Judaism", "Quran",
      "Bible", "One Thousand and One Nights", "Arabic literature", "Islamic art",
    ],
  },
];

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

function main() {
  const deckValues = DECKS.map(
    (d) => `  ('${d.slug}', '${sqlEscape(d.nameAr)}', '${d.icon}')`,
  ).join(",\n");

  const deckArticleInserts = DECKS.map((deck) => {
    const values = deck.titles
      .map((title) => `  ((select id from category_decks where slug = '${deck.slug}'), '${sqlEscape(title)}')`)
      .join(",\n");
    return `insert into deck_articles (deck_id, article_title) values\n${values}\non conflict do nothing;`;
  }).join("\n\n");

  const sql = [
    "insert into category_decks (slug, name_ar, icon) values",
    deckValues,
    "on conflict (slug) do update set name_ar = excluded.name_ar, icon = excluded.icon;",
    "",
    deckArticleInserts,
  ].join("\n");

  writeFileSync("supabase/seed/0003_category_decks.sql", sql + "\n");
  console.log(`Wrote supabase/seed/0003_category_decks.sql (${DECKS.length} decks)`);
}

main();
