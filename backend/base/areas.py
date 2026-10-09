"""Chennai areas: one matcher for "in this area" and one map for "nearby", shared by every vendor list.

"In {area}" means the vendor is actually there: its stored area is this area, or a comma-separated part of
its address *is* the area ("…, East Tambaram, Chennai"). A road named after an area ("Velachery Main Road")
or a mention elsewhere in the address does not count — that is what used to pull distant vendors in.

"Nearby" is the curated, two-way neighbour map below (reviewed 2026-10-09, docs/area-neighbours-draft.md).
Every area gets nearby results the same way, big or small.
"""
import re

from django.db.models import Case, IntegerField, Q, Value, When

NEIGHBOURS = {
    'Adambakkam': ['Velachery', 'Nanganallur', 'Alandur', 'Madipakkam', 'Puzhuthivakkam', 'Moovarasampet'],
    'Adyar': ['Besant Nagar', 'Thiruvanmiyur', 'Kotturpuram', 'Mandaveli', 'Guindy'],
    'Alandur': ['St. Thomas Mount', 'Adambakkam', 'Nanganallur', 'Guindy', 'Meenambakkam', 'Ekkattuthangal'],
    'Alapakkam': ['Porur', 'Valasaravakkam', 'Maduravoyal', 'Vanagaram'],
    'Alwarpet': ['Mylapore', 'Gopalapuram', 'Royapettah', 'Mandaveli'],
    'Alwarthirunagar': ['Valasaravakkam', 'Virugambakkam', 'Saligramam', 'Ramapuram'],
    'Ambattur': ['Ambattur Estate', 'Padi', 'Korattur', 'Thirumullaivoyal', 'Athipet', 'Avadi', 'Ayapakkam'],
    'Ambattur Estate': ['Ambattur', 'Mogappair', 'Padi', 'Nolambur', 'Athipet'],
    'Aminjikarai': ['Anna Nagar', 'Arumbakkam', 'Chetpet', 'Kilpauk', 'Choolaimedu', 'Anna Nagar East'],
    'Anakaputhur': ['Pammal', 'Pallavaram', 'Chromepet', 'Kovur', 'Pozhichalur'],
    'Anna Nagar': ['Anna Nagar East', 'Anna Nagar West', 'Aminjikarai', 'Arumbakkam', 'Koyambedu'],
    'Anna Nagar East': ['Anna Nagar', 'Kilpauk', 'Ayanavaram', 'Aminjikarai'],
    'Anna Nagar West': ['Anna Nagar', 'Mogappair', 'Koyambedu', 'Padi'],
    'Arcot Road': ['Vadapalani', 'Saligramam', 'Virugambakkam', 'Valasaravakkam', 'Kodambakkam'],
    'Arumbakkam': ['Aminjikarai', 'Anna Nagar', 'Koyambedu', 'Choolaimedu', 'Vadapalani'],
    'Ashok Nagar': ['West Mambalam', 'Kodambakkam', 'Vadapalani', 'Ekkattuthangal', 'Jafferkhanpet', 'Mambalam'],
    'Athipet': ['Ambattur', 'Ambattur Estate', 'Korattur', 'Padi'],
    'Avadi': ['Pattabiram', 'Thirumullaivoyal', 'Ambattur', 'Thiruverkadu'],
    'Ayanavaram': ['Perambur', 'Kilpauk', 'Anna Nagar East', 'Vepery'],
    'Ayapakkam': ['Ambattur', 'Thirumullaivoyal', 'Thiruverkadu'],
    'Basin Bridge': ['Puliyanthope', 'Vepery', 'Perambur', 'Korukkupet', 'Royapuram', 'Choolai'],
    'Besant Nagar': ['Adyar', 'Thiruvanmiyur', 'Kotturpuram'],
    'Chengalpattu': ['Maraimalai Nagar', 'Kattankulathur'],
    'Chetpet': ['Kilpauk', 'Egmore', 'Aminjikarai', 'Nungambakkam', 'Vepery'],
    'Chitlapakkam': ['Chromepet', 'Selaiyur', 'Sembakkam', 'Tambaram', 'Chitlapakkam East'],
    'Chitlapakkam East': ['Chitlapakkam', 'Selaiyur', 'Sembakkam', 'Chromepet', 'Selaiyur East'],
    'Choolai': ['Vepery', 'Egmore', 'Puliyanthope', 'Basin Bridge'],
    'Choolaimedu': ['Aminjikarai', 'Nungambakkam', 'Kodambakkam', 'Arumbakkam'],
    'Chromepet': ['Tambaram', 'Pallavaram', 'Chitlapakkam', 'Pammal', 'Anakaputhur', 'Chitlapakkam East'],
    'Egmore': ['Chetpet', 'Vepery', 'Nungambakkam', 'Choolai', 'Kilpauk'],
    'Ekkattuthangal': ['Guindy', 'Ashok Nagar', 'Jafferkhanpet', 'Saidapet', 'Alandur'],
    'Gerugambakkam': ['Porur', 'Kovur', 'Mugalivakkam'],
    'Gopalapuram': ['Royapettah', 'Alwarpet', 'Mylapore', 'Nungambakkam'],
    'Guindy': ['Saidapet', 'Ekkattuthangal', 'Alandur', 'Velachery', 'Kotturpuram', 'Adyar', 'Maduvinkarai', 'Nandambakkam', 'St. Thomas Mount'],
    'Gummidipoondi': ['Ponneri'],
    'Injambakkam': ['Neelankarai', 'Sholinganallur', 'Kanathur'],
    'Irumbuliyur': ['Tambaram', 'Perungalathur', 'Mudichur'],
    'Iyyappanthangal': ['Porur', 'Kattupakkam', 'Ramapuram', 'Mugalivakkam'],
    'Jafferkhanpet': ['Ashok Nagar', 'Ekkattuthangal', 'Saidapet', 'West Mambalam'],
    'Kadapakkam': ['Ponneri'],
    'Kanathur': ['Injambakkam', 'Kovalam'],
    'Kattankulathur': ['Maraimalai Nagar', 'Chengalpattu', 'Urapakkam'],
    'Kattupakkam': ['Iyyappanthangal', 'Porur', 'Poonamallee'],
    'Keelambakkam': ['Vandalur', 'Urapakkam'],
    'Kilpauk': ['Chetpet', 'Anna Nagar East', 'Ayanavaram', 'Aminjikarai', 'Vepery', 'Egmore'],
    'Kodambakkam': ['Vadapalani', 'T Nagar', 'West Mambalam', 'Choolaimedu', 'Ashok Nagar', 'Saligramam', 'Arcot Road', 'Mambalam', 'Nungambakkam'],
    'Kolathur': ['Perambur', 'Madhavaram', 'Korattur'],
    'Korattur': ['Ambattur', 'Padi', 'Kolathur', 'Athipet'],
    'Korukkupet': ['Tondiarpet', 'Basin Bridge', 'Royapuram'],
    'Kotturpuram': ['Adyar', 'Guindy', 'Saidapet', 'Mylapore', 'Besant Nagar'],
    'Kovalam': ['Kanathur'],
    'Kovur': ['Porur', 'Gerugambakkam', 'Anakaputhur', 'Mangadu'],
    'Koyambedu': ['Anna Nagar', 'Arumbakkam', 'Virugambakkam', 'Maduravoyal', 'Anna Nagar West', 'Nerkundram'],
    'Madhavaram': ['Kolathur', 'Perambur', 'Red Hills', 'Manali'],
    'Madipakkam': ['Velachery', 'Adambakkam', 'Puzhuthivakkam', 'Nanganallur', 'Medavakkam', 'Moovarasampet', 'Pallikaranai'],
    'Maduravoyal': ['Nerkundram', 'Alapakkam', 'Vanagaram', 'Koyambedu', 'Porur', 'Nolambur'],
    'Maduvinkarai': ['Guindy', 'Saidapet'],
    'Mambalam': ['West Mambalam', 'T Nagar', 'Kodambakkam', 'Ashok Nagar'],
    'Manali': ['Madhavaram', 'Thiruvottiyur', 'Wimco Nagar', 'Minjur', 'Vichoor'],
    'Mandaveli': ['Mylapore', 'Alwarpet', 'Adyar'],
    'Mangadu': ['Kovur', 'Porur', 'Poonamallee'],
    'Maraimalai Nagar': ['Chengalpattu', 'Kattankulathur'],
    'Medavakkam': ['Pallikaranai', 'Madipakkam', 'Sembakkam', 'Sithalapakkam'],
    'Meenambakkam': ['Pallavaram', 'St. Thomas Mount', 'Alandur', 'Nanganallur'],
    'Minjur': ['Ponneri', 'Manali'],
    'Mogappair': ['Anna Nagar West', 'Nolambur', 'Ambattur Estate', 'Padi'],
    'Moovarasampet': ['Madipakkam', 'Puzhuthivakkam', 'Nanganallur', 'Adambakkam'],
    'Mudichur': ['Tambaram', 'Perungalathur', 'Irumbuliyur'],
    'Mugalivakkam': ['Porur', 'Ramapuram', 'Gerugambakkam', 'Iyyappanthangal'],
    'Mylapore': ['Mandaveli', 'Alwarpet', 'Royapettah', 'Triplicane', 'Gopalapuram', 'Kotturpuram'],
    'Nandambakkam': ['Ramapuram', 'St. Thomas Mount', 'Guindy'],
    'Nanganallur': ['Adambakkam', 'Madipakkam', 'Alandur', 'Meenambakkam', 'Puzhuthivakkam', 'Moovarasampet'],
    'Neelankarai': ['Injambakkam', 'Thiruvanmiyur', 'Sholinganallur'],
    'Nemam': ['Thirumazhisai', 'Poonamallee'],
    'Nerkundram': ['Maduravoyal', 'Koyambedu', 'Virugambakkam'],
    'Nolambur': ['Mogappair', 'Ambattur Estate', 'Maduravoyal'],
    'Nungambakkam': ['Chetpet', 'Egmore', 'T Nagar', 'Choolaimedu', 'Kodambakkam', 'Gopalapuram'],
    'Oragadam': ['Sriperumbudur', 'Padappai'],
    'Padappai': ['Oragadam'],
    'Padi': ['Anna Nagar West', 'Korattur', 'Ambattur Estate', 'Mogappair', 'Ambattur', 'Athipet'],
    'Pallavaram': ['Chromepet', 'Pammal', 'Meenambakkam', 'Anakaputhur', 'Pozhichalur'],
    'Pallikaranai': ['Medavakkam', 'Velachery', 'Perungudi', 'Thoraipakkam', 'Madipakkam'],
    'Pammal': ['Pallavaram', 'Anakaputhur', 'Chromepet', 'Pozhichalur'],
    'Pattabiram': ['Avadi'],
    'Perambur': ['Ayanavaram', 'Kolathur', 'Madhavaram', 'Basin Bridge'],
    'Perungalathur': ['Tambaram', 'Irumbuliyur', 'Mudichur', 'Vandalur'],
    'Perungudi': ['Thoraipakkam', 'Pallikaranai', 'Thiruvanmiyur', 'Velachery', 'Sholinganallur'],
    'Ponneri': ['Minjur', 'Gummidipoondi', 'Kadapakkam'],
    'Poonamallee': ['Thirumazhisai', 'Kattupakkam', 'Mangadu', 'Thiruverkadu', 'Nemam'],
    'Porur': ['Valasaravakkam', 'Ramapuram', 'Iyyappanthangal', 'Mugalivakkam', 'Gerugambakkam', 'Alapakkam', 'Kattupakkam', 'Kovur', 'Maduravoyal', 'Mangadu'],
    'Pozhichalur': ['Pammal', 'Anakaputhur', 'Pallavaram'],
    'Puliyanthope': ['Basin Bridge', 'Vepery', 'Choolai'],
    'Puzhuthivakkam': ['Madipakkam', 'Adambakkam', 'Nanganallur', 'Moovarasampet'],
    'Ramapuram': ['Porur', 'Valasaravakkam', 'Mugalivakkam', 'Nandambakkam', 'Alwarthirunagar', 'Iyyappanthangal'],
    'Red Hills': ['Madhavaram'],
    'Royapettah': ['Mylapore', 'Gopalapuram', 'Triplicane', 'Alwarpet'],
    'Royapuram': ['Tondiarpet', 'Korukkupet', 'Basin Bridge'],
    'Saidapet': ['Guindy', 'Jafferkhanpet', 'Kotturpuram', 'T Nagar', 'Maduvinkarai', 'Ekkattuthangal'],
    'Saligramam': ['Virugambakkam', 'Vadapalani', 'Valasaravakkam', 'Kodambakkam', 'Alwarthirunagar', 'Arcot Road'],
    'Selaiyur': ['Tambaram', 'Chitlapakkam', 'Sembakkam', 'Selaiyur East', 'Chitlapakkam East'],
    'Selaiyur East': ['Selaiyur', 'Tambaram', 'Chitlapakkam East'],
    'Sembakkam': ['Selaiyur', 'Chitlapakkam', 'Medavakkam', 'Chitlapakkam East', 'Sithalapakkam'],
    'Sholinganallur': ['Thoraipakkam', 'Neelankarai', 'Injambakkam', 'Perungudi'],
    'Sithalapakkam': ['Medavakkam', 'Sembakkam'],
    'Sriperumbudur': ['Oragadam'],
    'St. Thomas Mount': ['Alandur', 'Meenambakkam', 'Nandambakkam', 'Guindy'],
    'T Nagar': ['West Mambalam', 'Kodambakkam', 'Nungambakkam', 'Saidapet', 'Mambalam'],
    'Tambaram': ['Chromepet', 'Selaiyur', 'Irumbuliyur', 'Perungalathur', 'Mudichur', 'Chitlapakkam', 'Selaiyur East'],
    'Thirumazhisai': ['Poonamallee', 'Nemam'],
    'Thirumullaivoyal': ['Avadi', 'Ambattur', 'Ayapakkam'],
    'Thiruvanmiyur': ['Adyar', 'Besant Nagar', 'Perungudi', 'Neelankarai'],
    'Thiruverkadu': ['Poonamallee', 'Avadi', 'Ayapakkam'],
    'Thiruvottiyur': ['Tondiarpet', 'Wimco Nagar', 'Manali'],
    'Thoraipakkam': ['Perungudi', 'Pallikaranai', 'Sholinganallur'],
    'Tondiarpet': ['Royapuram', 'Korukkupet', 'Thiruvottiyur'],
    'Triplicane': ['Mylapore', 'Royapettah'],
    'Urapakkam': ['Vandalur', 'Keelambakkam', 'Kattankulathur'],
    'Vadapalani': ['Kodambakkam', 'Saligramam', 'Ashok Nagar', 'Virugambakkam', 'Arcot Road', 'Arumbakkam'],
    'Valasaravakkam': ['Porur', 'Virugambakkam', 'Saligramam', 'Alwarthirunagar', 'Ramapuram', 'Alapakkam', 'Arcot Road'],
    'Vanagaram': ['Maduravoyal', 'Alapakkam'],
    'Vandalur': ['Perungalathur', 'Urapakkam', 'Keelambakkam'],
    'Velachery': ['Madipakkam', 'Pallikaranai', 'Adambakkam', 'Guindy', 'Perungudi'],
    'Vepery': ['Egmore', 'Choolai', 'Puliyanthope', 'Kilpauk', 'Ayanavaram', 'Basin Bridge', 'Chetpet'],
    'Vichoor': ['Manali'],
    'Virugambakkam': ['Saligramam', 'Valasaravakkam', 'Koyambedu', 'Vadapalani', 'Alwarthirunagar', 'Arcot Road', 'Nerkundram'],
    'West Mambalam': ['T Nagar', 'Mambalam', 'Ashok Nagar', 'Kodambakkam', 'Jafferkhanpet'],
    'Wimco Nagar': ['Thiruvottiyur', 'Manali'],
}

_DIRECTIONS = r'(east|west|north|south|new|old)'


def _key(text):
    return re.sub(r'[^a-z0-9]', '', (text or '').lower())


_BY_KEY = {_key(a): a for a in NEIGHBOURS}


def canonical(area):
    """'t. nagar' → 'T Nagar'; unknown → None."""
    return _BY_KEY.get(_key(area))


def nearby(area):
    """Neighbouring supported areas, closest-listed first."""
    return list(NEIGHBOURS.get(canonical(area) or '', []))


def in_area_q(area):
    """Vendors located in `area`: stored area, or an address part that is the area (word for word)."""
    words = r'[ .]*'.join(re.escape(w) for w in re.findall(r'[A-Za-z]+', area or ''))
    if not words:
        return Q(pk__in=[])
    part = (r'(^|,)\s*(' + _DIRECTIONS + r'\s+)?' + words + r'(\s+' + _DIRECTIONS + r')?\s*(,|-|[0-9]|$)')
    return Q(area_name__iexact=area) | Q(address__iregex=part)


def nearby_q(area):
    q = Q(pk__in=[])
    for other in nearby(area):
        q |= in_area_q(other)
    return q


def with_area_rank(qs, area, include_nearby=True):
    """Filter to the area (+ its neighbours) and annotate area_rank:
    3 = stored area is this area, 2 = its address is in this area, 1 = nearby."""
    inside = in_area_q(area)
    if include_nearby and nearby(area):
        qs = qs.filter(inside | nearby_q(area))
    else:
        qs = qs.filter(inside)
    return qs.annotate(area_rank=Case(When(area_name__iexact=area, then=Value(3)), When(inside, then=Value(2)),
                                      default=Value(1), output_field=IntegerField()))
