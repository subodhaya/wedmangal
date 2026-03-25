import requests
from products.models import Product
from django.contrib.auth.models import User

API_KEY = "AIzaSyA0d-tpFtfSFM7S2TZhCOodTM7g4BdkLho"

def import_vendors():
    query = "wedding decorators in Chennai"
    url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={query}&key={API_KEY}"

    response = requests.get(url)
    data = response.json()

    user = User.objects.first()  # default owner

    for place in data.get("results", []):
        Product.objects.get_or_create(
            name=place.get("name"),
            defaults={
                "address": place.get("formatted_address"),
                "city": "Chennai",
                "category": "Decorators",
                "personal_phone": "9999999999",
                "is_approved": False,
                "user": user
            }
        )

    print("Import finished")