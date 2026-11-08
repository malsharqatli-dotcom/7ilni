insert into article_metadata (title, word_count, in_article_link_count, link_density, difficulty_tier) values
  ('Baseball', 21638, 1674, 7.74, 'medium'),
  ('Gymnastics', 8886, 326, 3.67, 'hard'),
  ('Ice hockey', 14533, 1014, 6.98, 'medium'),
  ('Rowing (sport)', 9079, 444, 4.89, 'medium'),
  ('Super Bowl', 24715, 750, 3.03, 'hard'),
  ('UEFA Champions League', 13144, 1031, 7.84, 'medium'),
  ('Marathon', 19280, 1097, 5.69, 'medium'),
  ('Wimbledon Championships', 18818, 685, 3.64, 'hard'),
  ('American football', 21996, 1045, 4.75, 'medium'),
  ('Sport', 10208, 382, 3.74, 'hard')
on conflict (title) do update set
  word_count = excluded.word_count,
  in_article_link_count = excluded.in_article_link_count,
  link_density = excluded.link_density,
  difficulty_tier = excluded.difficulty_tier,
  scored_at = now();

insert into deck_articles (deck_id, article_title) values
  ((select id from category_decks where slug = 'sports'), 'Baseball'),
  ((select id from category_decks where slug = 'sports'), 'Gymnastics'),
  ((select id from category_decks where slug = 'sports'), 'Ice hockey'),
  ((select id from category_decks where slug = 'sports'), 'Rowing (sport)'),
  ((select id from category_decks where slug = 'sports'), 'Super Bowl'),
  ((select id from category_decks where slug = 'sports'), 'UEFA Champions League'),
  ((select id from category_decks where slug = 'sports'), 'Marathon'),
  ((select id from category_decks where slug = 'sports'), 'Wimbledon Championships'),
  ((select id from category_decks where slug = 'sports'), 'American football'),
  ((select id from category_decks where slug = 'sports'), 'Sport')
on conflict do nothing;
