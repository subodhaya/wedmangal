# Run this on your server:
# python manage.py shell

import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from base.models import Product, ServiceOwnerClaim

print("\n" + "="*60)
print("📊 WEDMANGAL DASHBOARD REPORT")
print("="*60)

# ── 1. Claim attempts ─────────────────────────────────
claims = ServiceOwnerClaim.objects.all().select_related('product', 'user')
print(f"\n🙋 CLAIM ATTEMPTS: {claims.count()}")
print("-"*60)

if claims.exists():
    for c in claims:
        print(f"  Business : {c.product.name}")
        print(f"  Email    : {c.user.email}")
        print(f"  Phone    : {c.phone}")
        print(f"  Status   : {c.status}")
        print(f"  When     : {c.claimed_at.strftime('%d %b %Y %I:%M %p')}")
        print()
else:
    print("  No claims yet.")

# ── 2. Unapproved businesses ──────────────────────────
unapproved = Product.objects.filter(is_approved=False, is_claimed=True)
print(f"\n⏳ CLAIMED BUT NOT APPROVED: {unapproved.count()}")
print("-"*60)

if unapproved.exists():
    for p in unapproved:
        print(f"  Business : {p.name}")
        print(f"  Category : {p.category}")
        print(f"  Phone    : {p.personal_phone}")
        print(f"  Claimed  : {p.claimed_at.strftime('%d %b %Y %I:%M %p') if p.claimed_at else 'N/A'}")
        print()
else:
    print("  None pending approval.")

# ── 3. Quick summary ──────────────────────────────────
total      = Product.objects.count()
claimed    = Product.objects.filter(is_claimed=True).count()
approved   = Product.objects.filter(is_approved=True).count()
unclaimed  = Product.objects.filter(is_claimed=False).count()

print(f"\n📈 SUMMARY")
print("-"*60)
print(f"  Total listings   : {total}")
print(f"  Claimed          : {claimed}")
print(f"  Approved         : {approved}")
print(f"  Unclaimed        : {unclaimed}")
print(f"  Pending approval : {unapproved.count()}")
print("="*60 + "\n")
