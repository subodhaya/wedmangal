# Nearby-area map — DRAFT for review

Not in use yet. Nothing in search has changed. Review the neighbours, edit any that are wrong, then this becomes the single map used by search, the home page and category pages.

**How it would work:** results "in {area}" come first; then a labelled **"Nearby"** section with vendors whose area is one of the listed neighbours. An "Only {area}" option keeps strict locality search. Links are two-way (if A lists B, B lists A).

Counts are live listings on 2026-10-09: **In area** = vendors whose area is exactly this one; **Nearby** = vendors in the listed neighbours; **Search today** = what `/api/search/` returns now (includes road-name and address-text matches).

- Areas: 127. Areas with fewer than 5 vendors of their own: 45. Areas still under 10 even with neighbours: 3 (Kadapakkam, Padappai, Vichoor).
- ⚠️ Please check especially: Ayapakkam, Kadapakkam, Keelambakkam, Kelambakkam, Nemam, Padappai, Vichoor — outlying places where I was unsure of the neighbours.

| Area | Neighbours | In area | Nearby | Total | Search today |
|---|---|---:|---:|---:|---:|
| Adambakkam | Alandur, Madipakkam, Moovarasampet, Nanganallur, Puzhuthivakkam, Velachery | 4 | 72 | 76 | 13 |
| Adyar | Besant Nagar, Guindy, Kotturpuram, Mandaveli, Thiruvanmiyur | 40 | 19 | 59 | 45 |
| Alandur | Adambakkam, Ekkattuthangal, Guindy, Meenambakkam, Nanganallur, St. Thomas Mount | 10 | 22 | 32 | 10 |
| Alapakkam | Maduravoyal, Porur, Valasaravakkam, Vanagaram | 3 | 64 | 67 | 15 |
| Alwarpet | Gopalapuram, Mandaveli, Mylapore, Royapettah | 5 | 22 | 27 | 5 |
| Alwarthirunagar | Ramapuram, Saligramam, Valasaravakkam, Virugambakkam | 3 | 20 | 23 | 3 |
| Ambattur | Ambattur Estate, Athipet, Avadi, Ayapakkam, Korattur, Padi, Thirumullaivoyal | 54 | 41 | 95 | 66 |
| Ambattur Estate | Ambattur, Athipet, Mogappair, Nolambur, Padi | 1 | 76 | 77 | 1 |
| Aminjikarai | Anna Nagar, Anna Nagar East, Arumbakkam, Chetpet, Choolaimedu, Kilpauk | 7 | 69 | 76 | 9 |
| Anakaputhur | Chromepet, Kovur, Pallavaram, Pammal, Pozhichalur | 10 | 64 | 74 | 10 |
| Anna Nagar | Aminjikarai, Anna Nagar East, Anna Nagar West, Arumbakkam, Koyambedu | 43 | 26 | 69 | 62 |
| Anna Nagar East | Aminjikarai, Anna Nagar, Ayanavaram, Kilpauk | 4 | 62 | 66 | 4 |
| Anna Nagar West | Anna Nagar, Koyambedu, Mogappair, Padi | 2 | 62 | 64 | 15 |
| Arcot Road | Kodambakkam, Saligramam, Vadapalani, Valasaravakkam, Virugambakkam | 2 | 22 | 24 | 2 |
| Arumbakkam | Aminjikarai, Anna Nagar, Choolaimedu, Koyambedu, Vadapalani | 8 | 64 | 72 | 9 |
| Ashok Nagar | Ekkattuthangal, Jafferkhanpet, Kodambakkam, Mambalam, Vadapalani, West Mambalam | 10 | 23 | 33 | 10 |
| Athipet | Ambattur, Ambattur Estate, Korattur, Padi | 4 | 70 | 74 | 5 |
| Avadi | Ambattur, Pattabiram, Thirumullaivoyal, Thiruverkadu | 11 | 74 | 85 | 17 |
| Ayanavaram | Anna Nagar East, Kilpauk, Perambur, Vepery | 7 | 22 | 29 | 7 |
| Ayapakkam ⚠️ | Ambattur, Thirumullaivoyal, Thiruverkadu | 4 | 66 | 70 | 4 |
| Basin Bridge | Choolai, Korukkupet, Perambur, Puliyanthope, Royapuram, Vepery | 7 | 37 | 44 | 7 |
| Besant Nagar | Adyar, Kotturpuram, Thiruvanmiyur | 5 | 46 | 51 | 5 |
| Chengalpattu | Kattankulathur, Maraimalai Nagar | 9 | 11 | 20 | 11 |
| Chetpet | Aminjikarai, Egmore, Kilpauk, Nungambakkam, Vepery | 5 | 26 | 31 | 5 |
| Chitlapakkam | Chitlapakkam East, Chromepet, Selaiyur, Sembakkam, Tambaram | 8 | 117 | 125 | 14 |
| Chitlapakkam East | Chitlapakkam, Chromepet, Selaiyur, Selaiyur East, Sembakkam | 2 | 67 | 69 | 2 |
| Choolai | Basin Bridge, Egmore, Puliyanthope, Vepery | 6 | 21 | 27 | 11 |
| Choolaimedu | Aminjikarai, Arumbakkam, Kodambakkam, Nungambakkam | 4 | 22 | 26 | 5 |
| Chromepet | Anakaputhur, Chitlapakkam, Chitlapakkam East, Pallavaram, Pammal, Tambaram | 44 | 93 | 137 | 62 |
| Egmore | Chetpet, Choolai, Kilpauk, Nungambakkam, Vepery | 6 | 24 | 30 | 7 |
| Ekkattuthangal | Alandur, Ashok Nagar, Guindy, Jafferkhanpet, Saidapet | 7 | 33 | 40 | 7 |
| Gerugambakkam | Kovur, Mugalivakkam, Porur | 8 | 60 | 68 | 8 |
| Gopalapuram | Alwarpet, Mylapore, Nungambakkam, Royapettah | 6 | 19 | 25 | 6 |
| Guindy | Adyar, Alandur, Ekkattuthangal, Kotturpuram, Maduvinkarai, Nandambakkam, Saidapet, St. Thomas Mount, Velachery | 2 | 118 | 120 | 4 |
| Gummidipoondi | Ponneri | 5 | 5 | 10 | 5 |
| Injambakkam | Kanathur, Neelankarai, Sholinganallur | 7 | 16 | 23 | 8 |
| Irumbuliyur | Mudichur, Perungalathur, Tambaram | 2 | 75 | 77 | 3 |
| Iyyappanthangal | Kattupakkam, Mugalivakkam, Porur, Ramapuram | 10 | 68 | 78 | 10 |
| Jafferkhanpet | Ashok Nagar, Ekkattuthangal, Saidapet, West Mambalam | 3 | 27 | 30 | 6 |
| Kadapakkam ⚠️ | Ponneri | 1 | 5 | 6 | 1 |
| Kanathur | Injambakkam, Kovalam | 6 | 11 | 17 | 6 |
| Kattankulathur | Chengalpattu, Maraimalai Nagar, Urapakkam | 3 | 24 | 27 | 3 |
| Kattupakkam | Iyyappanthangal, Poonamallee, Porur | 6 | 62 | 68 | 7 |
| Keelambakkam ⚠️ | Urapakkam, Vandalur | 7 | 13 | 20 | 7 |
| Kilpauk | Aminjikarai, Anna Nagar East, Ayanavaram, Chetpet, Egmore, Vepery | 5 | 33 | 38 | 7 |
| Kodambakkam | Arcot Road, Ashok Nagar, Choolaimedu, Mambalam, Nungambakkam, Saligramam, T Nagar, Vadapalani, West Mambalam | 3 | 66 | 69 | 11 |
| Kolathur | Korattur, Madhavaram, Perambur | 7 | 23 | 30 | 13 |
| Korattur | Ambattur, Athipet, Kolathur, Padi | 9 | 71 | 80 | 10 |
| Korukkupet | Basin Bridge, Royapuram, Tondiarpet | 6 | 22 | 28 | 6 |
| Kotturpuram | Adyar, Besant Nagar, Guindy, Mylapore, Saidapet | 4 | 60 | 64 | 4 |
| Kovalam | Kanathur | 4 | 6 | 10 | 4 |
| Kovur | Anakaputhur, Gerugambakkam, Mangadu, Porur | 4 | 70 | 74 | 5 |
| Koyambedu | Anna Nagar, Anna Nagar West, Arumbakkam, Maduravoyal, Nerkundram, Virugambakkam | 5 | 71 | 76 | 7 |
| Madhavaram | Kolathur, Manali, Perambur, Red Hills | 5 | 28 | 33 | 7 |
| Madipakkam | Adambakkam, Medavakkam, Moovarasampet, Nanganallur, Pallikaranai, Puzhuthivakkam, Velachery | 7 | 74 | 81 | 12 |
| Maduravoyal | Alapakkam, Koyambedu, Nerkundram, Nolambur, Porur, Vanagaram | 6 | 69 | 75 | 7 |
| Maduvinkarai | Guindy, Saidapet | 2 | 10 | 12 | 3 |
| Mambalam | Ashok Nagar, Kodambakkam, T Nagar, West Mambalam | 3 | 50 | 53 | 11 |
| Manali | Madhavaram, Minjur, Thiruvottiyur, Vichoor, Wimco Nagar | 5 | 17 | 22 | 5 |
| Mandaveli | Adyar, Alwarpet, Mylapore | 6 | 50 | 56 | 10 |
| Mangadu | Kovur, Poonamallee, Porur | 5 | 56 | 61 | 6 |
| Maraimalai Nagar | Chengalpattu, Kattankulathur | 8 | 12 | 20 | 9 |
| Medavakkam | Madipakkam, Pallikaranai, Sembakkam, Sithalapakkam | 9 | 25 | 34 | 15 |
| Meenambakkam | Alandur, Nanganallur, Pallavaram, St. Thomas Mount | 3 | 23 | 26 | 3 |
| Minjur | Manali, Ponneri | 2 | 10 | 12 | 2 |
| Mogappair | Ambattur Estate, Anna Nagar West, Nolambur, Padi | 8 | 13 | 21 | 11 |
| Moovarasampet | Adambakkam, Madipakkam, Nanganallur, Puzhuthivakkam | 3 | 18 | 21 | 3 |
| Mudichur | Irumbuliyur, Perungalathur, Tambaram | 5 | 72 | 77 | 8 |
| Mugalivakkam | Gerugambakkam, Iyyappanthangal, Porur, Ramapuram | 9 | 71 | 80 | 11 |
| Mylapore | Alwarpet, Gopalapuram, Kotturpuram, Mandaveli, Royapettah, Triplicane | 5 | 34 | 39 | 12 |
| Nandambakkam | Guindy, Ramapuram, St. Thomas Mount | 1 | 9 | 10 | 2 |
| Nanganallur | Adambakkam, Alandur, Madipakkam, Meenambakkam, Moovarasampet, Puzhuthivakkam | 5 | 29 | 34 | 7 |
| Neelankarai | Injambakkam, Sholinganallur, Thiruvanmiyur | 4 | 15 | 19 | 4 |
| Nemam ⚠️ | Poonamallee, Thirumazhisai | 2 | 9 | 11 | 2 |
| Nerkundram | Koyambedu, Maduravoyal, Virugambakkam | 5 | 18 | 23 | 8 |
| Nolambur | Ambattur Estate, Maduravoyal, Mogappair | 4 | 15 | 19 | 6 |
| Nungambakkam | Chetpet, Choolaimedu, Egmore, Gopalapuram, Kodambakkam, T Nagar | 4 | 59 | 63 | 5 |
| Oragadam | Padappai, Sriperumbudur | 2 | 15 | 17 | 8 |
| Padappai ⚠️ | Oragadam | 7 | 2 | 9 | 7 |
| Padi | Ambattur, Ambattur Estate, Anna Nagar West, Athipet, Korattur, Mogappair | 6 | 78 | 84 | 14 |
| Pallavaram | Anakaputhur, Chromepet, Meenambakkam, Pammal, Pozhichalur | 7 | 66 | 73 | 11 |
| Pallikaranai | Madipakkam, Medavakkam, Perungudi, Thoraipakkam, Velachery | 6 | 70 | 76 | 7 |
| Pammal | Anakaputhur, Chromepet, Pallavaram, Pozhichalur | 5 | 65 | 70 | 13 |
| Pattabiram | Avadi | 8 | 11 | 19 | 8 |
| Perambur | Ayanavaram, Basin Bridge, Kolathur, Madhavaram | 9 | 26 | 35 | 13 |
| Perungalathur | Irumbuliyur, Mudichur, Tambaram, Vandalur | 9 | 74 | 83 | 12 |
| Perungudi | Pallikaranai, Sholinganallur, Thiruvanmiyur, Thoraipakkam, Velachery | 5 | 63 | 68 | 7 |
| Ponneri | Gummidipoondi, Kadapakkam, Minjur | 5 | 8 | 13 | 5 |
| Poonamallee | Kattupakkam, Mangadu, Nemam, Thirumazhisai, Thiruverkadu | 5 | 23 | 28 | 21 |
| Porur | Alapakkam, Gerugambakkam, Iyyappanthangal, Kattupakkam, Kovur, Maduravoyal, Mangadu, Mugalivakkam, Ramapuram, Valasaravakkam | 47 | 63 | 110 | 58 |
| Pozhichalur | Anakaputhur, Pallavaram, Pammal | 4 | 22 | 26 | 5 |
| Puliyanthope | Basin Bridge, Choolai, Vepery | 4 | 17 | 21 | 4 |
| Puzhuthivakkam | Adambakkam, Madipakkam, Moovarasampet, Nanganallur | 2 | 19 | 21 | 7 |
| Ramapuram | Alwarthirunagar, Iyyappanthangal, Mugalivakkam, Nandambakkam, Porur, Valasaravakkam | 6 | 76 | 82 | 18 |
| Red Hills | Madhavaram | 7 | 5 | 12 | 19 |
| Royapettah | Alwarpet, Gopalapuram, Mylapore, Triplicane | 5 | 24 | 29 | 7 |
| Royapuram | Basin Bridge, Korukkupet, Tondiarpet | 8 | 20 | 28 | 8 |
| Saidapet | Ekkattuthangal, Guindy, Jafferkhanpet, Kotturpuram, Maduvinkarai, T Nagar | 8 | 53 | 61 | 9 |
| Saligramam | Alwarthirunagar, Arcot Road, Kodambakkam, Vadapalani, Valasaravakkam, Virugambakkam | 1 | 26 | 27 | 2 |
| Selaiyur | Chitlapakkam, Chitlapakkam East, Selaiyur East, Sembakkam, Tambaram | 6 | 80 | 86 | 19 |
| Selaiyur East | Chitlapakkam East, Selaiyur, Tambaram | 5 | 69 | 74 | 5 |
| Sembakkam | Chitlapakkam, Chitlapakkam East, Medavakkam, Selaiyur, Sithalapakkam | 4 | 33 | 37 | 12 |
| Sholinganallur | Injambakkam, Neelankarai, Perungudi, Thoraipakkam | 6 | 20 | 26 | 6 |
| Sithalapakkam | Medavakkam, Sembakkam | 8 | 13 | 21 | 8 |
| Sriperumbudur | Oragadam | 8 | 2 | 10 | 9 |
| St. Thomas Mount | Alandur, Guindy, Meenambakkam, Nandambakkam | 1 | 16 | 17 | 4 |
| T Nagar | Kodambakkam, Mambalam, Nungambakkam, Saidapet, West Mambalam | 35 | 20 | 55 | 40 |
| Tambaram | Chitlapakkam, Chromepet, Irumbuliyur, Mudichur, Perungalathur, Selaiyur, Selaiyur East | 61 | 79 | 140 | 111 |
| Thirumazhisai | Nemam, Poonamallee | 4 | 7 | 11 | 4 |
| Thirumullaivoyal | Ambattur, Avadi, Ayapakkam | 6 | 69 | 75 | 6 |
| Thiruvanmiyur | Adyar, Besant Nagar, Neelankarai, Perungudi | 2 | 54 | 56 | 5 |
| Thiruverkadu | Avadi, Ayapakkam, Poonamallee | 6 | 20 | 26 | 6 |
| Thiruvottiyur | Manali, Tondiarpet, Wimco Nagar | 4 | 15 | 19 | 8 |
| Thoraipakkam | Pallikaranai, Perungudi, Sholinganallur | 4 | 17 | 21 | 4 |
| Tondiarpet | Korukkupet, Royapuram, Thiruvottiyur | 7 | 18 | 25 | 9 |
| Triplicane | Mylapore, Royapettah | 8 | 10 | 18 | 10 |
| Urapakkam | Kattankulathur, Keelambakkam, Vandalur | 7 | 16 | 23 | 7 |
| Vadapalani | Arcot Road, Arumbakkam, Ashok Nagar, Kodambakkam, Saligramam, Virugambakkam | 5 | 31 | 36 | 9 |
| Valasaravakkam | Alapakkam, Alwarthirunagar, Arcot Road, Porur, Ramapuram, Saligramam, Virugambakkam | 6 | 69 | 75 | 14 |
| Vanagaram | Alapakkam, Maduravoyal | 5 | 9 | 14 | 11 |
| Vandalur | Keelambakkam, Perungalathur, Urapakkam | 6 | 23 | 29 | 7 |
| Velachery | Adambakkam, Guindy, Madipakkam, Pallikaranai, Perungudi | 45 | 24 | 69 | 69 |
| Vepery | Ayanavaram, Basin Bridge, Chetpet, Choolai, Egmore, Kilpauk, Puliyanthope | 4 | 40 | 44 | 4 |
| Vichoor ⚠️ | Manali | 3 | 5 | 8 | 3 |
| Virugambakkam | Alwarthirunagar, Arcot Road, Koyambedu, Nerkundram, Saligramam, Vadapalani, Valasaravakkam | 7 | 27 | 34 | 8 |
| West Mambalam | Ashok Nagar, Jafferkhanpet, Kodambakkam, Mambalam, T Nagar | 2 | 54 | 56 | 10 |
| Wimco Nagar | Manali, Thiruvottiyur | 3 | 9 | 12 | 3 |
