raise SystemExit("RETIRED: this scraper wrote unreviewed data straight into production Product/Service/Review/User tables and must not be run. New vendor data goes into VendorProspect via `manage.py import_prospects` (docs/prospects.md).")  # noqa: E501 -- hard guard, first statement on purpose
import requests
from products.models import Product
from django.contrib.auth.models import User

API_KEY = "REMOVED-see-docs/prospects.md"  # leaked key removed; it must be revoked in Google Cloud

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