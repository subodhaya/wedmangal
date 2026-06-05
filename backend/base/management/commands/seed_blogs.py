from django.core.management.base import BaseCommand
from base.models import BlogPost


POSTS = [
    {
        "title": "The Complete Tamil Wedding Planning Checklist — 12 Months to Your Big Day",
        "slug": "tamil-wedding-planning-checklist",
        "category": "wedding-tips",
        "author": "WedMangal Team",
        "tags": "Tamil wedding, wedding checklist, wedding planning, muhurtham",
        "excerpt": "Everything you need to plan a Tamil wedding — from fixing the muhurtham to the last-minute details. A month-by-month checklist so nothing slips through the cracks.",
        "content": """<h2>Planning a Tamil Wedding?</h2>
<p>Planning a Tamil wedding is one of the most joyful — and complex — tasks a family can take on. Between the engagement, the nalangu, the muhurtham, the reception, and everything in between, there are hundreds of decisions to make. This checklist breaks it all down, month by month, so you never miss a thing.</p>

<hr/>

<h3>🗓️ 12 Months Before</h3>
<ul>
<li>✅ <strong>Fix the wedding date</strong> — Work with your family pandit to choose an auspicious muhurtham. Have 2–3 date options ready in case your first choice is already taken by your venue or vendors.</li>
<li>✅ <strong>Set your total budget</strong> — Decide on a realistic overall budget before booking anything. Divide it across: venue, catering, jewellery, photography, décor, clothing, invitations, and honeymoon.</li>
<li>✅ <strong>Finalise the guest list</strong> — Get a rough headcount from both families. This directly affects your venue size, catering quantity, and invitation count.</li>
<li>✅ <strong>Start venue search</strong> — Popular wedding halls in Chennai, Coimbatore, Madurai, and other Tamil cities book up 10–12 months in advance. Visit at least 3–4 venues before deciding.</li>
</ul>

<h3>🗓️ 9 Months Before</h3>
<ul>
<li>✅ <strong>Book your venue</strong> — Once you have confirmed the muhurtham date, book the venue immediately. Pay the advance and get a written agreement.</li>
<li>✅ <strong>Book photographer and videographer</strong> — Good photographers are booked out fast. Review portfolios, watch full wedding films, and confirm the team that will actually shoot your wedding.</li>
<li>✅ <strong>Book the caterer</strong> — Taste the food before confirming. Decide on South Indian traditional menu, fusion, or a combination. Discuss the number of items, serving style, and staff count.</li>
<li>✅ <strong>Start bridal jewellery shopping</strong> — Bridal jewellery takes time — especially if you want custom-made pieces. Visit jewellers early to allow for design and making time.</li>
</ul>

<h3>🗓️ 6 Months Before</h3>
<ul>
<li>✅ <strong>Book makeup artist</strong> — Bridal makeup artists are in high demand. Do a trial session 2–3 months before the wedding to finalise your look.</li>
<li>✅ <strong>Book decorator</strong> — Share your colour palette and theme. Ask to see photos from weddings they have done at your venue.</li>
<li>✅ <strong>Book DJ or nadaswaram artists</strong> — Book a DJ for the reception and/or a nadaswaram &amp; thavil team for the muhurtham and procession.</li>
<li>✅ <strong>Book mehandi artist</strong> — A good mehandi artist can do intricate full-hand bridal mehandi. Book early and show reference photos.</li>
<li>✅ <strong>Order wedding outfits</strong> — Silk sarees and wedding dhotis take 6–8 weeks to weave if custom-ordered. Visit Kanchipuram or your local silk shop now.</li>
</ul>

<h3>🗓️ 4 Months Before</h3>
<ul>
<li>✅ <strong>Design and print wedding invitations</strong> — Order 20% more cards than your guest count. Keep digital e-invite versions ready for WhatsApp sharing.</li>
<li>✅ <strong>Plan the muhurtham programme</strong> — Work with your pandit to finalise the sequence — Ganapathy homam, Nalangu, Manam Kottal, Thali tying, Sapthapathi, Aashirvadam.</li>
<li>✅ <strong>Plan honeymoon</strong> — Book flights and hotels early, especially for peak season (December–January, April–May).</li>
<li>✅ <strong>Book travel and transport</strong> — Arrange wedding cars for the bride, groom, and family.</li>
</ul>

<h3>🗓️ 2 Months Before</h3>
<ul>
<li>✅ <strong>Send invitations</strong> — Send physical cards and follow up with WhatsApp digital invites.</li>
<li>✅ <strong>Finalise return gifts</strong> — Decide on return gifts for guests — steel items, silk scarves, dry fruits, or customised gift boxes. Order in bulk.</li>
<li>✅ <strong>Book hotel rooms for outstation guests</strong> — Block rooms at a nearby hotel for guests travelling from other cities.</li>
<li>✅ <strong>Confirm all vendor bookings</strong> — Call every vendor and reconfirm the date, time, and location.</li>
</ul>

<h3>🗓️ 1 Month Before</h3>
<ul>
<li>✅ <strong>Finalise seating and stage layout</strong> — Share a floor plan with your decorator. Decide on the stage backdrop design, flower arrangements, and entry arch.</li>
<li>✅ <strong>Final costume fittings</strong> — Try on your complete bridal look together — saree, blouse, jewellery, and footwear. Make alterations if needed.</li>
<li>✅ <strong>Prepare vendor payment schedule</strong> — Note down final payment amounts and due dates for all vendors.</li>
<li>✅ <strong>Prepare a detailed event day schedule</strong> — List every event with its start time and share it with your family coordinator.</li>
</ul>

<h3>🗓️ 1 Week Before</h3>
<ul>
<li>✅ Re-confirm all vendors with addresses and timings — share the full venue address (Google Maps pin) with every vendor.</li>
<li>✅ Delegate tasks to family members — welcome guests, coordinate food, manage vendor payments.</li>
<li>✅ Pack your bridal kit — saree pins, safety pins, touch-up makeup, energy snacks, phone charger.</li>
<li>✅ <strong>Rest and sleep well.</strong></li>
</ul>

<h3>🎊 On the Wedding Day</h3>
<ul>
<li>✅ Wake up early — muhurtham waits for no one</li>
<li>✅ Eat a proper breakfast before getting ready</li>
<li>✅ Have a trusted coordinator manage the timeline</li>
<li>✅ Trust your vendors — you have done the groundwork</li>
<li>✅ <strong>Be present. Breathe. Enjoy every moment.</strong></li>
</ul>

<hr/>
<p>Need to find trusted vendors for each step? Browse photographers, makeup artists, caterers, and decorators near you on <strong>WedMangal</strong>.</p>""",
    },
    {
        "title": "How to Set a Wedding Budget — A Practical Guide for Tamil Families",
        "slug": "tamil-wedding-budget-guide",
        "category": "wedding-tips",
        "author": "WedMangal Team",
        "tags": "wedding budget, Tamil wedding cost, wedding planning budget",
        "excerpt": "Wedding costs in Tamil Nadu vary widely. Here is a realistic, category-by-category budget breakdown to help you plan without overspending or surprises.",
        "content": """<p>One of the first and most important conversations in wedding planning is about money. Many families delay it — and then scramble when bookings pile up. Here is a practical, honest guide to building a wedding budget in Tamil Nadu.</p>

<hr/>

<h2>💰 The Three Budget Tiers</h2>
<p>Before breaking it down, know which tier your wedding falls into:</p>
<ul>
<li><strong>Budget Wedding (₹5L–₹15L):</strong> Intimate, 150–300 guests, one or two functions, local vendors.</li>
<li><strong>Mid-Range Wedding (₹15L–₹40L):</strong> 300–600 guests, two to three functions, established vendors, decorated hall.</li>
<li><strong>Premium Wedding (₹40L–₹1Cr+):</strong> 600+ guests, multiple functions, top photographers, luxury décor, outstation honeymoon.</li>
</ul>
<p>Most Tamil family weddings in cities like Chennai, Coimbatore, and Madurai fall in the <strong>₹15L–₹40L range.</strong></p>

<hr/>

<h2>📊 Category-Wise Breakdown (Mid-Range ₹25L Wedding)</h2>

<table style="width:100%; border-collapse:collapse;">
<tr><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Category</th><th style="text-align:right; padding:8px; border-bottom:1px solid #e8d5de;">Budget Range</th></tr>
<tr><td style="padding:8px;">🏛️ Venue</td><td style="text-align:right; padding:8px;">₹2,00,000 – ₹4,00,000</td></tr>
<tr><td style="padding:8px;">🍽️ Catering (400 guests)</td><td style="text-align:right; padding:8px;">₹3,00,000 – ₹6,00,000</td></tr>
<tr><td style="padding:8px;">💎 Jewellery</td><td style="text-align:right; padding:8px;">₹3,00,000 – ₹8,00,000</td></tr>
<tr><td style="padding:8px;">📷 Photography &amp; Video</td><td style="text-align:right; padding:8px;">₹1,00,000 – ₹2,50,000</td></tr>
<tr><td style="padding:8px;">💄 Bridal Makeup</td><td style="text-align:right; padding:8px;">₹25,000 – ₹80,000</td></tr>
<tr><td style="padding:8px;">🌸 Décor &amp; Flowers</td><td style="text-align:right; padding:8px;">₹1,50,000 – ₹3,00,000</td></tr>
<tr><td style="padding:8px;">👗 Wedding Outfits</td><td style="text-align:right; padding:8px;">₹1,00,000 – ₹2,00,000</td></tr>
<tr><td style="padding:8px;">✉️ Invitations</td><td style="text-align:right; padding:8px;">₹30,000 – ₹60,000</td></tr>
<tr><td style="padding:8px;">🌿 Mehandi</td><td style="text-align:right; padding:8px;">₹15,000 – ₹40,000</td></tr>
<tr><td style="padding:8px;">🎶 DJ / Music</td><td style="text-align:right; padding:8px;">₹30,000 – ₹75,000</td></tr>
<tr><td style="padding:8px;">🎁 Return Gifts</td><td style="text-align:right; padding:8px;">₹50,000 – ₹1,50,000</td></tr>
<tr><td style="padding:8px;">🕌 Pandit / Priest</td><td style="text-align:right; padding:8px;">₹20,000 – ₹50,000</td></tr>
<tr><td style="padding:8px;">✈️ Honeymoon</td><td style="text-align:right; padding:8px;">₹50,000 – ₹2,00,000</td></tr>
<tr><td style="padding:8px;">🔧 Miscellaneous</td><td style="text-align:right; padding:8px;">₹50,000</td></tr>
</table>

<hr/>

<h2>💡 5 Money-Saving Tips</h2>
<ol>
<li><strong>Book vendors early.</strong> Last-minute bookings cost 20–40% more.</li>
<li><strong>Fix the guest list before booking catering.</strong> Every additional 50 guests adds ₹30,000–₹60,000.</li>
<li><strong>Compare at least 3 vendors per category.</strong> Prices vary widely for the same quality.</li>
<li><strong>Negotiate packages.</strong> Photographers, decorators, and makeup artists often bundle services — ask.</li>
<li><strong>Track every expense in real time.</strong> Use the Budget Planner on WedMangal to log spending and stay on target.</li>
</ol>

<hr/>
<p>A clear budget set at the beginning makes every subsequent decision easier. Know your limits, stick to them, and remember — a beautiful wedding is about the love and family, not the price tag.</p>""",
    },
    {
        "title": "7 Tamil Wedding Rituals Every Couple Should Know",
        "slug": "tamil-wedding-rituals-guide",
        "category": "wedding-rituals",
        "author": "WedMangal Team",
        "tags": "Tamil wedding rituals, muhurtham, nalangu, sapthapathi, oonjal, thali",
        "excerpt": "From the Nalangu to the Sapthapathi, Tamil weddings are rich with meaning. Here is a simple guide to the key rituals and what they symbolise.",
        "content": """<p>Tamil weddings are among the most beautifully elaborate in the world. Every ritual has centuries of tradition and deep meaning behind it. If you are getting married or attending a Tamil wedding for the first time, here is a guide to the key ceremonies.</p>

<hr/>

<h2>🪔 1. Nalangu (Pre-Wedding Celebration)</h2>
<p>Nalangu is a joyful pre-wedding ceremony usually held the evening before the muhurtham. The bride and groom are seated facing each other and teased playfully by family members with games — rolling limes, making them reach for garlands, and feeding each other sweets.</p>
<p>It is a moment of lightness before the solemnity of the main ceremony. Turmeric paste is applied to the couple for a healthy glow, which is why you will often see brides with a yellow tint on their skin on the wedding day.</p>

<h2>🌺 2. Kashi Yatrai (Groom's Mock Departure)</h2>
<p>In this charming ritual, the groom pretends he wants to renounce the world and go to Kashi (Varanasi) to study the Vedas. He carries an umbrella, a fan, and a small bundle as if setting off on a pilgrimage.</p>
<p>The bride's father intercepts him, argues that his daughter is the right life partner, and convinces him to return and get married instead. The groom agrees, turns around, and the wedding proceeds. It is symbolic of the choice between the life of a sanyasi and the life of a householder.</p>

<h2>💍 3. Oonjal (The Swing Ceremony)</h2>
<p>The Oonjal is one of the most visually stunning parts of a Tamil wedding. The bride and groom sit on a decorated swing while family women sing traditional Carnatic songs, gently pushing the swing.</p>
<p>The swaying of the swing symbolises the ups and downs of married life and the couple's commitment to face them together. Women throw flowers on the couple and exchange betel leaves and bananas.</p>

<h2>🔥 4. Homam (The Sacred Fire)</h2>
<p>The pandit lights a sacred fire — the Agni — which acts as a witness to all the wedding vows. The couple sits before the fire and the groom's sister ties the corners of the groom's dhoti to the bride's saree (symbolising their union).</p>
<p>Ghee, rice, and sacred herbs are offered into the fire with chanting of Vedic mantras. Every offering is a prayer for the couple's prosperity, health, and long life.</p>

<h2>🌿 5. Manam Kottal (Tying of the Thali)</h2>
<p>This is the central moment of the Tamil wedding — equivalent to exchanging rings in a Western ceremony. The groom ties the sacred thali (mangalsutra) around the bride's neck as the nadaswaram plays and family members shower flowers.</p>
<p>The thali is tied with three knots — representing the wife's commitment to her husband, her family, and God. Once the thali is tied, the couple is married in the eyes of family, society, and the divine.</p>

<h2>👣 6. Sapthapathi (The Seven Steps)</h2>
<p>Derived from Sanskrit meaning "seven steps," this ritual involves the couple walking seven steps together around the sacred fire, each step representing a vow:</p>
<ol>
<li><strong>Nourishment</strong> — we will provide for each other.</li>
<li><strong>Strength</strong> — we will grow strong together.</li>
<li><strong>Prosperity</strong> — we will share our wealth.</li>
<li><strong>Happiness</strong> — we will seek joy together.</li>
<li><strong>Children</strong> — we will be blessed with children.</li>
<li><strong>Seasons</strong> — we will live through all seasons of life.</li>
<li><strong>Friendship</strong> — we will be lifelong companions and friends.</li>
</ol>
<p>After the seventh step, the couple is bound by vows taken before God and family.</p>

<h2>🎊 7. Reception</h2>
<p>The reception is usually held in the evening of the wedding day or the following day. The couple is dressed in fresh outfits and greets every guest personally. It is a celebration for extended family and colleagues who may not have attended the morning muhurtham.</p>
<p>Modern Tamil receptions often include live music, DJ performances, and elaborate stage décor.</p>

<hr/>
<p>Understanding these rituals makes any Tamil wedding more meaningful — whether you are the bride, groom, or a guest. Each step is a thread in the beautiful fabric of Tamil culture and tradition.</p>
<p>Looking for vendors to help make your Tamil wedding perfect? Find photographers, makeup artists, pandits, and decorators on <strong>WedMangal</strong>.</p>""",
    },
]


class Command(BaseCommand):
    help = 'Seed 3 WedMangal blog posts'

    def handle(self, *args, **kwargs):
        created = 0
        for post in POSTS:
            obj, made = BlogPost.objects.get_or_create(
                slug=post['slug'],
                defaults={**post, 'published': True},
            )
            if made:
                self.stdout.write(self.style.SUCCESS(f'  ✅ Created: {obj.title}'))
                created += 1
            else:
                self.stdout.write(self.style.WARNING(f'  ⚠️  Already exists: {obj.title}'))

        self.stdout.write(self.style.SUCCESS(f'\nDone. {created} new post(s) created.'))
