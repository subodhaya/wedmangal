from django.http import HttpResponse
from django.utils.timezone import now
from base.models import Product, BlogPost

SITE = "https://www.wedmangal.com"

STATIC_URLS = [
    ("",            "daily",  "1.0"),
    ("search/",     "daily",  "0.8"),
    ("category/Photographers",   "daily", "0.9"),
    ("category/Makeup_Artist",   "daily", "0.9"),
    ("category/Caterers",        "daily", "0.9"),
    ("category/Decorators",      "daily", "0.9"),
    ("category/Mehandi_Artist",  "daily", "0.9"),
    ("category/DJ_Artist",       "daily", "0.8"),
    ("category/Planners",        "daily", "0.8"),
    ("category/Invitation",      "weekly","0.8"),
    ("category/Jewellery",       "weekly","0.8"),
    ("category/Entertainment",   "weekly","0.7"),
    ("category/Travel_Transport","weekly","0.7"),
    ("category/Pandit",          "weekly","0.7"),
    ("login/",      "monthly","0.4"),
    ("register/",   "monthly","0.5"),
    ("terms/",      "yearly", "0.3"),
    ("refund/",     "yearly", "0.3"),
]

def sitemap_xml(request):
    today = now().date().isoformat()

    urls = []

    # Static pages
    for path, freq, pri in STATIC_URLS:
        urls.append(f"""  <url>
    <loc>{SITE}/{path}</loc>
    <changefreq>{freq}</changefreq>
    <priority>{pri}</priority>
  </url>""")

    # Dynamic vendor pages — only approved/active products
    try:
        products = Product.objects.filter(is_approved=True).values("_id", "updatedAt").order_by("-updatedAt")
    except Exception:
        products = Product.objects.all().values("_id", "updatedAt").order_by("-updatedAt")

    for p in products:
        lastmod = p.get("updatedAt")
        lastmod_str = f"\n    <lastmod>{lastmod.date().isoformat()}</lastmod>" if lastmod else ""
        urls.append(f"""  <url>
    <loc>{SITE}/product/{p['_id']}/</loc>{lastmod_str}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>""")

    # Blog posts
    try:
        posts = BlogPost.objects.filter(published=True).values('slug', 'updated_at')
        for post in posts:
            lastmod_str = f"\n    <lastmod>{post['updated_at'].date().isoformat()}</lastmod>" if post.get('updated_at') else ""
            urls.append(f"""  <url>
    <loc>{SITE}/blog/{post['slug']}/</loc>{lastmod_str}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>""")
    except Exception:
        pass

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += "\n".join(urls)
    xml += "\n</urlset>"

    return HttpResponse(xml, content_type="application/xml")
