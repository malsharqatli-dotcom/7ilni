insert into category_decks (slug, name_ar, icon) values
  ('sports', 'رياضة', '⚽'),
  ('history', 'تاريخ', '🏛️'),
  ('geography', 'جغرافيا', '🌍'),
  ('celebrities', 'مشاهير', '🌟'),
  ('science', 'علوم', '🔬'),
  ('culture', 'ثقافة', '🍽️')
on conflict (slug) do update set name_ar = excluded.name_ar, icon = excluded.icon;

insert into deck_articles (deck_id, article_title) values
  ((select id from category_decks where slug = 'sports'), 'Lionel Messi'),
  ((select id from category_decks where slug = 'sports'), 'Cristiano Ronaldo'),
  ((select id from category_decks where slug = 'sports'), 'Mohamed Salah'),
  ((select id from category_decks where slug = 'sports'), 'FIFA World Cup'),
  ((select id from category_decks where slug = 'sports'), 'Real Madrid CF'),
  ((select id from category_decks where slug = 'sports'), 'FC Barcelona'),
  ((select id from category_decks where slug = 'sports'), 'Olympic Games'),
  ((select id from category_decks where slug = 'sports'), 'Association football'),
  ((select id from category_decks where slug = 'sports'), 'Basketball')
on conflict do nothing;

insert into deck_articles (deck_id, article_title) values
  ((select id from category_decks where slug = 'history'), 'World War II'),
  ((select id from category_decks where slug = 'history'), 'World War I'),
  ((select id from category_decks where slug = 'history'), 'Ottoman Empire'),
  ((select id from category_decks where slug = 'history'), 'Crusades'),
  ((select id from category_decks where slug = 'history'), 'Abbasid Caliphate'),
  ((select id from category_decks where slug = 'history'), 'Byzantine Empire'),
  ((select id from category_decks where slug = 'history'), 'Umayyad Caliphate'),
  ((select id from category_decks where slug = 'history'), 'Ancient Egypt'),
  ((select id from category_decks where slug = 'history'), 'Roman Empire'),
  ((select id from category_decks where slug = 'history'), 'Cold War'),
  ((select id from category_decks where slug = 'history'), 'French Revolution'),
  ((select id from category_decks where slug = 'history'), 'Industrial Revolution')
on conflict do nothing;

insert into deck_articles (deck_id, article_title) values
  ((select id from category_decks where slug = 'geography'), 'Jordan'),
  ((select id from category_decks where slug = 'geography'), 'Egypt'),
  ((select id from category_decks where slug = 'geography'), 'Petra'),
  ((select id from category_decks where slug = 'geography'), 'Dead Sea'),
  ((select id from category_decks where slug = 'geography'), 'Nile'),
  ((select id from category_decks where slug = 'geography'), 'Sahara'),
  ((select id from category_decks where slug = 'geography'), 'Mount Everest'),
  ((select id from category_decks where slug = 'geography'), 'Amman'),
  ((select id from category_decks where slug = 'geography'), 'Aqaba'),
  ((select id from category_decks where slug = 'geography'), 'Wadi Rum'),
  ((select id from category_decks where slug = 'geography'), 'Jerash'),
  ((select id from category_decks where slug = 'geography'), 'Umm Qais'),
  ((select id from category_decks where slug = 'geography'), 'Red Sea'),
  ((select id from category_decks where slug = 'geography'), 'Suez Canal'),
  ((select id from category_decks where slug = 'geography'), 'Great Wall of China'),
  ((select id from category_decks where slug = 'geography'), 'Taj Mahal'),
  ((select id from category_decks where slug = 'geography'), 'Eiffel Tower'),
  ((select id from category_decks where slug = 'geography'), 'Statue of Liberty')
on conflict do nothing;

insert into deck_articles (deck_id, article_title) values
  ((select id from category_decks where slug = 'celebrities'), 'Fairuz'),
  ((select id from category_decks where slug = 'celebrities'), 'Umm Kulthum'),
  ((select id from category_decks where slug = 'celebrities'), 'Mahmoud Darwish'),
  ((select id from category_decks where slug = 'celebrities'), 'Naguib Mahfouz'),
  ((select id from category_decks where slug = 'celebrities'), 'Amr Diab'),
  ((select id from category_decks where slug = 'celebrities'), 'Mohammed bin Salman'),
  ((select id from category_decks where slug = 'celebrities'), 'Abdullah II of Jordan'),
  ((select id from category_decks where slug = 'celebrities'), 'Albert Einstein'),
  ((select id from category_decks where slug = 'celebrities'), 'William Shakespeare'),
  ((select id from category_decks where slug = 'celebrities'), 'Leonardo da Vinci'),
  ((select id from category_decks where slug = 'celebrities'), 'Pablo Picasso'),
  ((select id from category_decks where slug = 'celebrities'), 'Wolfgang Amadeus Mozart'),
  ((select id from category_decks where slug = 'celebrities'), 'Isaac Newton'),
  ((select id from category_decks where slug = 'celebrities'), 'Charles Darwin'),
  ((select id from category_decks where slug = 'celebrities'), 'Marie Curie')
on conflict do nothing;

insert into deck_articles (deck_id, article_title) values
  ((select id from category_decks where slug = 'science'), 'Albert Einstein'),
  ((select id from category_decks where slug = 'science'), 'Theory of relativity'),
  ((select id from category_decks where slug = 'science'), 'DNA'),
  ((select id from category_decks where slug = 'science'), 'Solar System'),
  ((select id from category_decks where slug = 'science'), 'Quantum mechanics'),
  ((select id from category_decks where slug = 'science'), 'Black hole'),
  ((select id from category_decks where slug = 'science'), 'Evolution'),
  ((select id from category_decks where slug = 'science'), 'Photosynthesis'),
  ((select id from category_decks where slug = 'science'), 'Theoretical physics'),
  ((select id from category_decks where slug = 'science'), 'Mitochondria'),
  ((select id from category_decks where slug = 'science'), 'Higgs boson'),
  ((select id from category_decks where slug = 'science'), 'Large Hadron Collider'),
  ((select id from category_decks where slug = 'science'), 'Periodic table')
on conflict do nothing;

insert into deck_articles (deck_id, article_title) values
  ((select id from category_decks where slug = 'culture'), 'Hummus'),
  ((select id from category_decks where slug = 'culture'), 'Falafel'),
  ((select id from category_decks where slug = 'culture'), 'Knafeh'),
  ((select id from category_decks where slug = 'culture'), 'Chess'),
  ((select id from category_decks where slug = 'culture'), 'Backgammon'),
  ((select id from category_decks where slug = 'culture'), 'Falconry'),
  ((select id from category_decks where slug = 'culture'), 'Bedouin'),
  ((select id from category_decks where slug = 'culture'), 'Keffiyeh'),
  ((select id from category_decks where slug = 'culture'), 'Islam'),
  ((select id from category_decks where slug = 'culture'), 'Christianity'),
  ((select id from category_decks where slug = 'culture'), 'Judaism'),
  ((select id from category_decks where slug = 'culture'), 'Quran'),
  ((select id from category_decks where slug = 'culture'), 'Bible'),
  ((select id from category_decks where slug = 'culture'), 'One Thousand and One Nights'),
  ((select id from category_decks where slug = 'culture'), 'Arabic literature'),
  ((select id from category_decks where slug = 'culture'), 'Islamic art')
on conflict do nothing;
