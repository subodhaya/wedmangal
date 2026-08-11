from django.core.management.base import BaseCommand
from base.models import BlogPost


POSTS = [
    {
        "title": "The Complete Tamil Wedding Planning Checklist — 12 Months to Your Big Day",
        "slug": "tamil-wedding-planning-checklist",
        "cover_image": "blog/12-Month-Wedding-Checklist-pdf-.png",
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
        "cover_image": "blog/budget.jpeg",
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
        "cover_image": "blog/tamil-marriage-rituals.jpg",
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
    {
        "title": "Best Wedding Venues in Chennai, Coimbatore & Madurai for Tamil Weddings",
        "slug": "best-wedding-venues-chennai-coimbatore-madurai",
        "cover_image": "blog/wedding-venue.avif",
        "category": "tamil-weddings",
        "author": "WedMangal Team",
        "related_category": "Halls",
        "tags": "wedding venues Chennai, wedding halls Coimbatore, Madurai wedding venues, Tamil wedding halls",
        "excerpt": "Picking the right hall shapes your whole wedding. Here's how to choose a Tamil wedding venue in Chennai, Coimbatore, or Madurai — capacity, parking, catering rules, and more.",
        "content": """<p>The wedding hall is usually the first big booking a Tamil family makes — and the one every other decision (catering, décor, guest count, even the muhurtham time) gets built around. Here's what actually matters when you're comparing venues in Chennai, Coimbatore, Madurai, and other Tamil Nadu cities.</p>

<hr/>

<h2>🏛️ Types of Wedding Venues in Tamil Nadu</h2>
<ul>
<li><strong>Kalyana Mandapams</strong> — the traditional choice, purpose-built for Tamil wedding rituals with a raised stage, homam area, and large dining halls. Common across Chennai (Mylapore, T. Nagar, Alwarpet), Coimbatore (RS Puram, Saibaba Colony), and Madurai.</li>
<li><strong>Banquet halls in hotels</strong> — air-conditioned, often with in-house catering and décor tie-ups. Priced higher but lower on logistics headaches.</li>
<li><strong>Community halls / Sabha mandapams</strong> — budget-friendly, run by community trusts, often need advance booking through members.</li>
<li><strong>Resort &amp; outdoor lawns</strong> — increasingly popular for 2-3 day multi-function weddings just outside city limits.</li>
</ul>

<hr/>

<h2>✅ What to Check Before Booking</h2>
<ol>
<li><strong>Guest capacity vs. your actual headcount</strong> — ask for both "seated dining" and "peak simultaneous" capacity, they're usually different numbers.</li>
<li><strong>Muhurtham time flexibility</strong> — some halls run tight back-to-back bookings; confirm your hall is exclusively yours for the full auspicious window, not shared with another function that day.</li>
<li><strong>In-house vs. outside catering</strong> — some mandapams insist on their own catering team, which limits your menu choices. Ask upfront.</li>
<li><strong>Parking &amp; guest access</strong> — especially important in dense areas like T. Nagar or Coimbatore's RS Puram; ask about valet or nearby parking arrangements.</li>
<li><strong>Power backup</strong> — a must, especially during monsoon season bookings.</li>
<li><strong>Decoration restrictions</strong> — some halls restrict open-flame décor, hanging installations, or external decorators. Get this in writing.</li>
</ol>

<hr/>

<h2>📍 Booking Timeline by City</h2>
<p>Popular halls in Chennai and Coimbatore get booked <strong>10–12 months in advance</strong> for peak wedding season (December–February, April–May). Madurai and smaller towns have slightly more flexibility but book early for weekend and auspicious-date slots regardless.</p>

<hr/>
<p>Ready to shortlist venues? Browse verified <a href="/category/Halls">wedding halls near you</a> on WedMangal, complete with photos, pricing, and availability — then pair your hall with a trusted <a href="/category/Caterers">caterer</a> and <a href="/category/Decorators">decorator</a> in the same city.</p>""",
    },
    {
        "title": "How Wedding Vendors in Tamil Nadu Can Get More Bookings Online",
        "slug": "grow-wedding-vendor-business-tamil-nadu",
        "category": "vendor-tips",
        "author": "WedMangal Team",
        "tags": "wedding vendor tips, grow wedding business, wedding vendor marketing Tamil Nadu",
        "excerpt": "Photographers, decorators, caterers, and makeup artists — here's a practical guide to getting discovered by more couples and turning enquiries into bookings.",
        "content": """<p>Word-of-mouth still matters in the wedding industry — but more and more couples now start their vendor search online, comparing photos, prices, and reviews before ever making a phone call. If you run a photography studio, decoration business, catering service, or any other wedding vendor business in Tamil Nadu, here's how to make sure you're the one they find and book.</p>

<hr/>

<h2>📸 1. Your Portfolio Is Your First Impression</h2>
<p>Couples decide within seconds whether to enquire further. Keep your listing photos recent, high-resolution, and varied — show your best work across different venues, budgets, and styles, not just one wedding on repeat.</p>

<h2>💬 2. Respond Fast — Speed Wins Bookings</h2>
<p>Couples typically message 4–5 vendors in a category at once. The ones who reply within a few hours, not days, get first-mover advantage. Set a daily reminder to check your enquiries if you can't reply instantly.</p>

<h2>⭐ 3. Reviews Build Trust Faster Than Ads</h2>
<p>After every wedding, politely ask happy clients for a review. A profile with 10+ genuine reviews converts dramatically better than one with none — it answers the "can I trust this vendor" question before you even speak to them.</p>

<h2>💰 4. Be Transparent About Pricing</h2>
<p>Vague pricing ("contact for quote") loses budget-conscious couples who are comparing multiple vendors quickly. Where possible, list a clear starting price or price range — it filters in serious enquiries and filters out mismatched budgets.</p>

<h2>📍 5. Keep Your Availability Calendar Updated</h2>
<p>Nothing frustrates a couple more than a great vendor who turns out to be already booked on their date — after days of back-and-forth. Mark your unavailable dates as soon as you confirm a booking so serious couples don't waste time or lose interest.</p>

<h2>🎥 6. Add Video, Not Just Photos</h2>
<p>Short highlight reels — even a 30-second clip from a recent wedding — build far more confidence than photos alone, especially for photographers, decorators, and DJ/music artists. Couples want to see how you actually work.</p>

<hr/>
<p>Own a wedding business in Tamil Nadu? <a href="/owner-register">List your business on WedMangal</a> — it's free to create a profile, and couples across Chennai, Coimbatore, Madurai, and beyond are searching for vendors like you every day.</p>""",
    },
    {
        "title": "5 Tamil Wedding Themes & Décor Ideas We're Loving This Season",
        "slug": "tamil-wedding-themes-decor-ideas",
        "cover_image": "blog/decors.jpeg",
        "category": "real-weddings",
        "author": "WedMangal Team",
        "related_category": "Decorators",
        "tags": "Tamil wedding decor, wedding themes, mandap decoration ideas, Tamil wedding inspiration",
        "excerpt": "From classic temple-style mandaps to modern floral minimalism — here are five décor directions Tamil couples are choosing for their big day this season.",
        "content": """<p>Every wedding season brings its own décor language. Based on what couples across Chennai, Coimbatore, and Madurai have been booking lately, here are five themes worth considering for your own mandap and reception décor.</p>

<hr/>

<h2>🛕 1. Classic Temple-Style Mandap</h2>
<p>Inspired by South Indian temple architecture — stone-textured pillars, brass lamps (kuthu vilakku), banana stalks, and marigold garlands. This theme keeps the ritual space feeling authentic and rooted in tradition, and pairs beautifully with a traditional Kanjeevaram bridal look.</p>

<h2>🌸 2. Floral Minimalism</h2>
<p>A shift many couples are making — fewer, larger floral installations instead of dense wall-to-wall décor. Think a single dramatic flower wall behind the stage, pastel roses and jasmine strands, and clean white drapery. Elegant, photographs beautifully, and often costs less than an elaborate full-hall setup.</p>

<h2>✨ 3. Gold &amp; Ivory Royal Theme</h2>
<p>A popular choice for evening receptions — gold sequin drapes, crystal chandeliers, ivory florals, and warm amber lighting. Works especially well in banquet-hall settings and creates striking photos under low light.</p>

<h2>🪔 4. Traditional South Indian with a Modern Twist</h2>
<p>Couples are blending heritage elements — kolam-inspired floor art, brass urulis with floating flowers and candles, banana leaf motifs — with contemporary touches like fairy-light backdrops and modern typography signage ("Save the Date," welcome boards).</p>

<h2>🌿 5. Garden &amp; Outdoor Mandap</h2>
<p>For resort and lawn weddings just outside the city, a botanical theme with greenery arches, hanging lanterns, and natural wood mandap structures is trending — especially for two-day, multi-function weddings.</p>

<hr/>
<p>Whichever direction you choose, your decorator's experience with your specific venue matters as much as the mood board. Browse <a href="/category/Decorators">wedding decorators</a> on WedMangal, filter by city, and ask to see photos of their past work at your chosen hall before you book.</p>""",
    },
    {
        "title": "Bridal Makeup Guide for Tamil Brides — Trends, Tips & Choosing an Artist",
        "slug": "bridal-makeup-guide-tamil-brides",
        "cover_image": "blog/makeupartist.jpeg",
        "category": "tamil-weddings",
        "author": "WedMangal Team",
        "related_category": "Makeup_Artist",
        "tags": "bridal makeup Tamil Nadu, Tamil bride makeup, bridal makeup artist Chennai, wedding makeup trends",
        "excerpt": "Traditional or contemporary? Airbrush or HD? Here's a practical guide to bridal makeup trends for Tamil brides, plus how to choose and trial an artist before the big day.",
        "content": """<p>Bridal makeup is one of the most personal decisions in wedding planning — and one of the hardest to get right without a trial. Here's what to know before you book a bridal makeup artist for your Tamil wedding.</p>

<hr/>

<h2>💄 Popular Bridal Makeup Styles Right Now</h2>
<ul>
<li><strong>Traditional Tamil Bridal</strong> — bold kumkum-red lips, defined eyes, and a look built to stand out against Kanjeevaram silk and temple jewellery. Long-lasting formulas are a must given the length of muhurtham ceremonies.</li>
<li><strong>HD &amp; Airbrush Makeup</strong> — a matte, camera-ready finish that holds up beautifully under both daylight and studio flash — popular for brides prioritising photography and video.</li>
<li><strong>Contemporary Soft Glam</strong> — dewy skin, softer eye tones, nude-pink lips — often chosen for the reception look, paired with a lighter outfit.</li>
<li><strong>Pre-Wedding / Engagement Look</strong> — lighter, dewier makeup distinct from the wedding-day look, usually planned as a separate trial.</li>
</ul>

<hr/>

<h2>🗓️ How Far Ahead to Book</h2>
<p>Reputed bridal makeup artists in Chennai, Coimbatore, and Madurai get booked <strong>4–6 months in advance</strong> for peak wedding season (December–February). Book early, especially if you have a specific artist in mind from Instagram or a friend's wedding.</p>

<h2>🧪 Why the Trial Session Matters</h2>
<p>A trial isn't optional — it's how you avoid wedding-day surprises. Use it to:</p>
<ul>
<li>Test how the makeup photographs, not just how it looks in person</li>
<li>Check how long it lasts through heat, tears (there will be some), and hours of ceremony</li>
<li>Confirm the artist understands your skin type and any allergies</li>
<li>Finalise hair styling alongside makeup — they need to work together</li>
</ul>

<h2>❓ Questions to Ask Before Booking</h2>
<ol>
<li>Do you bring your own products, and are they suitable for sensitive skin?</li>
<li>How many looks are included (muhurtham, reception, pre-wedding)?</li>
<li>Do you travel to the venue, and is travel cost included?</li>
<li>How many bridal makeups do you take on the same day — will I have your full attention?</li>
<li>Is touch-up service included through the day?</li>
</ol>

<hr/>
<p>Ready to book your trial? Explore verified <a href="/category/Makeup_Artist">bridal makeup artists</a> near you on WedMangal, compare portfolios and pricing, and message artists directly to check availability for your muhurtham date.</p>""",
    },
    {
        "title": "Tamil Wedding Muhurtham Dates 2026 — Valarpirai & Theipirai Guide (April–December)",
        "slug": "tamil-wedding-muhurtham-dates-2026",
        "cover_image": "blog/muhurtham.jpeg",
        "category": "wedding-tips",
        "author": "WedMangal Team",
        "tags": "Tamil wedding muhurtham 2026, muhurtham dates 2026, Valarpirai Theipirai, Tamil wedding panchangam, wedding date 2026",
        "excerpt": "Every Tamil wedding muhurtham date from April to December 2026, month by month, with Valarpirai and Theipirai clearly marked — plus how to read a panchangam and which months to avoid.",
        "content": """<p>Before the hall is booked, before the invitations are printed, before anything else — a Tamil wedding begins with the muhurtham. It's the one decision every other date in the planning calendar works backward from, so it's worth understanding what actually goes into choosing one, not just which dates are marked auspicious on a calendar.</p>

<p style="background:#fdf4f8; border-left:3px solid #c9973a; padding:12px 16px; border-radius:6px;"><strong>A note before you read further:</strong> The dates below are compiled from the Tamil panchangam for general reference. Your family astrologer or purohit should always have the final word — they'll weigh your specific horoscope, nakshatra porutham, and family customs, which can narrow this list down to one or two dates that are right for you specifically.</p>

<hr/>

<h2>🪔 What Makes a Date a "Suba Muhurtham"?</h2>
<p>A Suba Muhurtham (சுப முகூர்த்தம்) isn't picked at random — it's calculated from the panchangam, the traditional Tamil almanac, by weighing five factors together:</p>
<ul>
<li><strong>Nakshatra</strong> — which lunar constellation the day falls under</li>
<li><strong>Tithi</strong> — the lunar day (Dwitiya, Tritiya, Panchami, and so on)</li>
<li><strong>Vara</strong> — the day of the week</li>
<li><strong>Yoga</strong> — the astrological combination formed that day</li>
<li><strong>Karana</strong> — the half-day lunar segment</li>
</ul>
<p>A date only qualifies once these five line up favourably <em>and</em> the inauspicious windows — Rahu Kalam, Yamagandam, Kuligai — fall outside the ceremony time. Even then, families still need Jathagam Porutham (horoscope matching) confirmed for the specific couple before locking in a date.</p>

<hr/>

<h2>🌕🌖 Valarpirai vs. Theipirai — Why It Matters</h2>
<p>Almost every muhurtham list you'll see is split into two lunar fortnights, and knowing the difference changes how you read the calendar below.</p>

<h3>Valarpirai (வளர்பிறை) — the waxing moon</h3>
<p>This is the fortnight from new moon to full moon, when the moon is visibly growing each night. Tamil tradition reads this growth as a good omen for anything meant to expand — including a marriage. Valarpirai dates are generally treated as the stronger, more preferred category of muhurtham.</p>

<h3>Theipirai (தேய்பிறை) — the waning moon</h3>
<p>The mirror-image fortnight, running from full moon back to new moon. It's considered a notch below Valarpirai for new beginnings, but a Theipirai date is by no means a compromise — plenty of families choose one deliberately, whether because the nakshatra that day suits their horoscope, the hall was easier to book, or guests could travel more easily. A Theipirai date with a strong nakshatra, confirmed by your astrologer, is a perfectly valid muhurtham.</p>

<p><strong>The short version:</strong> lean toward Valarpirai if you're choosing freely between multiple good options — but don't rule out a Theipirai date your astrologer has approved.</p>

<hr/>

<h2>📅 Muhurtham Dates, April–December 2026</h2>
<p>⭐ marks a Valarpirai (waxing moon) date. Unmarked dates fall in Theipirai.</p>

<h3>April 2026 — 7 dates</h3>
<table style="width:100%; border-collapse:collapse;">
<tr><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Date</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Day</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Tamil Month</th></tr>
<tr><td style="padding:8px;">6 April</td><td style="padding:8px;">Monday</td><td style="padding:8px;">பங்குனி (Panguni)</td></tr>
<tr><td style="padding:8px;">12 April</td><td style="padding:8px;">Sunday</td><td style="padding:8px;">பங்குனி (Panguni)</td></tr>
<tr><td style="padding:8px;">13 April</td><td style="padding:8px;">Monday</td><td style="padding:8px;">பங்குனி (Panguni)</td></tr>
<tr><td style="padding:8px;">16 April</td><td style="padding:8px;">Thursday</td><td style="padding:8px;">சித்திரை (Chithirai)</td></tr>
<tr><td style="padding:8px;">⭐ 20 April</td><td style="padding:8px;">Monday</td><td style="padding:8px;">சித்திரை (Chithirai)</td></tr>
<tr><td style="padding:8px;">⭐ 23 April</td><td style="padding:8px;">Thursday</td><td style="padding:8px;">சித்திரை (Chithirai)</td></tr>
<tr><td style="padding:8px;">⭐ 30 April</td><td style="padding:8px;">Thursday</td><td style="padding:8px;">சித்திரை (Chithirai)</td></tr>
</table>
<p class="claim-hint" style="font-style:italic; color:#9a7a85; font-size:0.85rem;">💡 19 April 2026 (Sunday) is Akshaya Tritiya — a self-auspicious day that doesn't need separate muhurtham calculation. More on this below.</p>

<h3>May 2026 — 6 dates</h3>
<table style="width:100%; border-collapse:collapse;">
<tr><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Date</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Day</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Tamil Month</th></tr>
<tr><td style="padding:8px;">8 May</td><td style="padding:8px;">Friday</td><td style="padding:8px;">சித்திரை (Chithirai)</td></tr>
<tr><td style="padding:8px;">13 May</td><td style="padding:8px;">Wednesday</td><td style="padding:8px;">சித்திரை (Chithirai)</td></tr>
<tr><td style="padding:8px;">14 May</td><td style="padding:8px;">Thursday</td><td style="padding:8px;">சித்திரை (Chithirai)</td></tr>
<tr><td style="padding:8px;">⭐ 18 May</td><td style="padding:8px;">Monday</td><td style="padding:8px;">வைகாசி (Vaikasi)</td></tr>
<tr><td style="padding:8px;">⭐ 28 May</td><td style="padding:8px;">Thursday</td><td style="padding:8px;">வைகாசி (Vaikasi)</td></tr>
<tr><td style="padding:8px;">⭐ 29 May</td><td style="padding:8px;">Friday</td><td style="padding:8px;">வைகாசி (Vaikasi)</td></tr>
</table>

<h3>June 2026 — 6 dates</h3>
<table style="width:100%; border-collapse:collapse;">
<tr><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Date</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Day</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Tamil Month</th></tr>
<tr><td style="padding:8px;">4 June</td><td style="padding:8px;">Thursday</td><td style="padding:8px;">வைகாசி (Vaikasi)</td></tr>
<tr><td style="padding:8px;">7 June</td><td style="padding:8px;">Sunday</td><td style="padding:8px;">வைகாசி (Vaikasi)</td></tr>
<tr><td style="padding:8px;">⭐ 17 June</td><td style="padding:8px;">Wednesday</td><td style="padding:8px;">ஆனி (Aani)</td></tr>
<tr><td style="padding:8px;">⭐ 18 June</td><td style="padding:8px;">Thursday</td><td style="padding:8px;">ஆனி (Aani)</td></tr>
<tr><td style="padding:8px;">⭐ 24 June</td><td style="padding:8px;">Wednesday</td><td style="padding:8px;">ஆனி (Aani)</td></tr>
<tr><td style="padding:8px;">⭐ 25 June</td><td style="padding:8px;">Thursday</td><td style="padding:8px;">ஆனி (Aani)</td></tr>
</table>

<h3>July 2026 — 3 dates</h3>
<table style="width:100%; border-collapse:collapse;">
<tr><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Date</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Day</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Tamil Month</th></tr>
<tr><td style="padding:8px;">2 July</td><td style="padding:8px;">Thursday</td><td style="padding:8px;">ஆனி (Aani)</td></tr>
<tr><td style="padding:8px;">5 July</td><td style="padding:8px;">Sunday</td><td style="padding:8px;">ஆனி (Aani)</td></tr>
<tr><td style="padding:8px;">12 July</td><td style="padding:8px;">Sunday</td><td style="padding:8px;">ஆனி (Aani)</td></tr>
</table>
<p class="claim-hint" style="font-style:italic; color:#9a7a85; font-size:0.85rem;">⚠️ ஆடி (Aadi) — roughly mid-July to mid-August — is traditionally skipped for weddings, which is why the list thins out here.</p>

<h3>August 2026 — 3 dates</h3>
<table style="width:100%; border-collapse:collapse;">
<tr><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Date</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Day</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Tamil Month</th></tr>
<tr><td style="padding:8px;">⭐ 23 August</td><td style="padding:8px;">Sunday</td><td style="padding:8px;">ஆவணி (Aavani)</td></tr>
<tr><td style="padding:8px;">30 August</td><td style="padding:8px;">Sunday</td><td style="padding:8px;">ஆவணி (Aavani)</td></tr>
<tr><td style="padding:8px;">31 August</td><td style="padding:8px;">Monday</td><td style="padding:8px;">ஆவணி (Aavani)</td></tr>
</table>

<h3>September 2026 — 3 dates</h3>
<table style="width:100%; border-collapse:collapse;">
<tr><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Date</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Day</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Tamil Month</th></tr>
<tr><td style="padding:8px;">7 September</td><td style="padding:8px;">Monday</td><td style="padding:8px;">ஆவணி (Aavani)</td></tr>
<tr><td style="padding:8px;">⭐ 13 September</td><td style="padding:8px;">Sunday</td><td style="padding:8px;">ஆவணி (Aavani)</td></tr>
<tr><td style="padding:8px;">⭐ 17 September</td><td style="padding:8px;">Thursday</td><td style="padding:8px;">ஆவணி (Aavani)</td></tr>
</table>
<p class="claim-hint" style="font-style:italic; color:#9a7a85; font-size:0.85rem;">⚠️ புரட்டாசி (Purattasi) — mid-September to mid-October — is set aside for Lord Vishnu and traditionally kept free of weddings.</p>

<h3>October 2026 — 2 dates</h3>
<table style="width:100%; border-collapse:collapse;">
<tr><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Date</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Day</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Tamil Month</th></tr>
<tr><td style="padding:8px;">⭐ 25 October</td><td style="padding:8px;">Sunday</td><td style="padding:8px;">ஐப்பசி (Aippasi)</td></tr>
<tr><td style="padding:8px;">30 October</td><td style="padding:8px;">Friday</td><td style="padding:8px;">ஐப்பசி (Aippasi)</td></tr>
</table>

<h3>November 2026 — 7 dates 🏆</h3>
<p>The busiest muhurtham month of the year — 7 dates, 5 of them Valarpirai. Wedding halls across Tamil Nadu book out fastest for these weekends, so start your venue search early if you're eyeing November.</p>
<table style="width:100%; border-collapse:collapse;">
<tr><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Date</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Day</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Tamil Month</th></tr>
<tr><td style="padding:8px;">1 November</td><td style="padding:8px;">Sunday</td><td style="padding:8px;">ஐப்பசி (Aippasi)</td></tr>
<tr><td style="padding:8px;">⭐ 11 November</td><td style="padding:8px;">Wednesday</td><td style="padding:8px;">ஐப்பசி (Aippasi)</td></tr>
<tr><td style="padding:8px;">⭐ 13 November</td><td style="padding:8px;">Friday</td><td style="padding:8px;">ஐப்பசி (Aippasi)</td></tr>
<tr><td style="padding:8px;">⭐ 15 November</td><td style="padding:8px;">Sunday</td><td style="padding:8px;">ஐப்பசி (Aippasi)</td></tr>
<tr><td style="padding:8px;">⭐ 16 November</td><td style="padding:8px;">Monday</td><td style="padding:8px;">ஐப்பசி (Aippasi)</td></tr>
<tr><td style="padding:8px;">⭐ 20 November</td><td style="padding:8px;">Friday</td><td style="padding:8px;">கார்த்திகை (Karthikai)</td></tr>
<tr><td style="padding:8px;">29 November</td><td style="padding:8px;">Sunday</td><td style="padding:8px;">கார்த்திகை (Karthikai)</td></tr>
</table>

<h3>December 2026 — 5 dates</h3>
<table style="width:100%; border-collapse:collapse;">
<tr><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Date</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Day</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Tamil Month</th></tr>
<tr><td style="padding:8px;">4 December</td><td style="padding:8px;">Friday</td><td style="padding:8px;">கார்த்திகை (Karthikai)</td></tr>
<tr><td style="padding:8px;">6 December</td><td style="padding:8px;">Sunday</td><td style="padding:8px;">கார்த்திகை (Karthikai)</td></tr>
<tr><td style="padding:8px;">⭐ 10 December</td><td style="padding:8px;">Thursday</td><td style="padding:8px;">கார்த்திகை (Karthikai)</td></tr>
<tr><td style="padding:8px;">⭐ 13 December</td><td style="padding:8px;">Sunday</td><td style="padding:8px;">கார்த்திகை (Karthikai)</td></tr>
<tr><td style="padding:8px;">⭐ 14 December</td><td style="padding:8px;">Monday</td><td style="padding:8px;">கார்த்திகை (Karthikai)</td></tr>
</table>
<p class="claim-hint" style="font-style:italic; color:#9a7a85; font-size:0.85rem;">⚠️ மார்கழி (Margazhi) begins mid-December — a sacred month that's traditionally kept free of weddings, which is why the year's list ends here.</p>

<hr/>

<h2>📊 Quick Reference — All 42 Dates by Month</h2>
<table style="width:100%; border-collapse:collapse;">
<tr><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Month</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">🌕 Valarpirai</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">🌖 Theipirai</th><th style="text-align:right; padding:8px; border-bottom:1px solid #e8d5de;">Total</th></tr>
<tr><td style="padding:8px;">April</td><td style="padding:8px;">20, 23, 30</td><td style="padding:8px;">6, 12, 13, 16</td><td style="text-align:right; padding:8px;">7</td></tr>
<tr><td style="padding:8px;">May</td><td style="padding:8px;">18, 28, 29</td><td style="padding:8px;">8, 13, 14</td><td style="text-align:right; padding:8px;">6</td></tr>
<tr><td style="padding:8px;">June</td><td style="padding:8px;">17, 18, 24, 25</td><td style="padding:8px;">4, 7</td><td style="text-align:right; padding:8px;">6</td></tr>
<tr><td style="padding:8px;">July</td><td style="padding:8px;">—</td><td style="padding:8px;">2, 5, 12</td><td style="text-align:right; padding:8px;">3</td></tr>
<tr><td style="padding:8px;">August</td><td style="padding:8px;">23</td><td style="padding:8px;">30, 31</td><td style="text-align:right; padding:8px;">3</td></tr>
<tr><td style="padding:8px;">September</td><td style="padding:8px;">13, 17</td><td style="padding:8px;">7</td><td style="text-align:right; padding:8px;">3</td></tr>
<tr><td style="padding:8px;">October</td><td style="padding:8px;">25</td><td style="padding:8px;">30</td><td style="text-align:right; padding:8px;">2</td></tr>
<tr><td style="padding:8px;">November</td><td style="padding:8px;">11, 13, 15, 16, 20</td><td style="padding:8px;">1, 29</td><td style="text-align:right; padding:8px;">7</td></tr>
<tr><td style="padding:8px;">December</td><td style="padding:8px;">10, 13, 14</td><td style="padding:8px;">4, 6</td><td style="text-align:right; padding:8px;">5</td></tr>
<tr><td style="padding:8px;"><strong>Total</strong></td><td style="padding:8px;"><strong>22</strong></td><td style="padding:8px;"><strong>20</strong></td><td style="text-align:right; padding:8px;"><strong>42</strong></td></tr>
</table>

<hr/>

<h2>🌟 Auspicious Days That Fall Outside the Muhurtham List</h2>
<p>The panchangam isn't the only source of good wedding dates. A few other occasions are considered auspicious in their own right:</p>

<h3>1. அட்சய திரிதியை (Akshaya Tritiya) — 19 April 2026, Sunday</h3>
<p>One of the three Swayam Siddha days — dates considered self-auspicious, needing no separate muhurtham calculation. "Akshaya" translates to "never diminishing," and weddings held on this day are believed to carry that quality forward. Because of this, mandapams across Tamil Nadu are typically booked out 12–18 months ahead for Akshaya Tritiya — if this date interests you, start your venue search now.</p>

<h3>2. விஜயதசமி (Vijayadasami) — October 2026</h3>
<p>The tenth and final day of Navratri, another Swayam Siddha day, associated with triumph and fresh starts. Like Akshaya Tritiya, it doesn't require separate astrological sign-off.</p>

<h3>3. பௌர்ணமி (Pournami) with a Favourable Nakshatra</h3>
<p>Full moon days carry their own elevated energy in Tamil tradition. When a Pournami lines up with a favourable nakshatra, some astrologers will approve it as a standalone wedding date.</p>

<h3>4. தமிழ் புத்தாண்டு (Puthandu / Tamil New Year) — 14 April 2026</h3>
<p>The first day of சித்திரை (Chithirai), marking the start of the Tamil calendar year. Some families and astrologers consider it an appropriate day for a wedding given its association with new beginnings.</p>

<h3>5. Strong Nakshatras on Preferred Weekdays</h3>
<p>Outside the dates listed above, a day carrying a particularly favourable nakshatra — Rohini, Uttara, Hastam, Revathi, or Swathi — falling on a Monday, Wednesday, Thursday, or Friday may still be approved by an experienced astrologer once your horoscopes are checked.</p>

<hr/>

<h2>⚠️ Months Traditionally Avoided</h2>
<table style="width:100%; border-collapse:collapse;">
<tr><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Period</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Tamil Month</th><th style="text-align:left; padding:8px; border-bottom:1px solid #e8d5de;">Why</th></tr>
<tr><td style="padding:8px;">Mid-July to mid-August</td><td style="padding:8px;">ஆடி (Aadi)</td><td style="padding:8px;">Considered inauspicious for new beginnings</td></tr>
<tr><td style="padding:8px;">Mid-September to mid-October</td><td style="padding:8px;">புரட்டாசி (Purattasi)</td><td style="padding:8px;">Dedicated to Lord Vishnu; weddings traditionally paused</td></tr>
<tr><td style="padding:8px;">Mid-December to mid-January</td><td style="padding:8px;">மார்கழி (Margazhi)</td><td style="padding:8px;">A sacred, contemplative month; weddings traditionally paused</td></tr>
</table>

<hr/>

<h2>✅ Before You Lock In a Date</h2>
<ul>
<li><strong>Book your hall 9–12 months ahead</strong> for April and November dates especially — these are the two most competitive months for kalyana mandapams across Tamil Nadu.</li>
<li><strong>Get the exact time window, not just the date</strong> — the auspicious period on a given day can be as short as 1–2 hours, and it moves depending on your priest's calculation.</li>
<li><strong>Double-check Rahu Kalam and Yamagandam</strong> against your ceremony time even on a listed muhurtham date — these inauspicious windows shift daily and can fall inside an otherwise good day.</li>
<li><strong>Shortlist 2–3 alternate dates</strong> before you start contacting vendors, so a single fully-booked hall doesn't stall your entire planning timeline.</li>
</ul>

<hr/>
<p>Once your date is confirmed, the next step is locking down your venue and vendors before the good dates fill up. Browse verified <a href="/category/Halls">wedding halls</a>, <a href="/category/Photographers">photographers</a>, and <a href="/category/Caterers">caterers</a> near you on WedMangal, filtered by city and availability.</p>""",
    },
]


class Command(BaseCommand):
    help = 'Seed WedMangal blog posts'

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
