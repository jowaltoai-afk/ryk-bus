# RYK Electric Bus — Rahim Yar Khan Bus Timings (PWA)

Rahim Yar Khan ki PTC Electric Bus ke 4 routes ki timings wali web app.
Data: eTransit Punjab (PMA) public route planner se, 15 Oct 2026 ko verify kiya gaya.

## Features (v1)
- Next Bus: apna stop chuno, agli bus ka time + countdown
- 4 Routes: Abu Dhabi Palace, Sadiqabad, Kot Samba, Lala Chowk — Up/Down, saare stops, saari trips
- Stop screen: us stop ki aaj ki saari buses (guzri hui halki, agli sabz)
- Journey Planner: seedhi bus, ya aik transfer (GBS / common stop) wala rasta
- Favourite stops (phone me save rehte hain)
- Reminder: agli bus se 10 minute pehle notification (app khuli ho to)
- Offline: aik dafa khulne ke baad baghair internet ke chalti hai
- Urdu / English toggle
- T-Cash Card guide — Settings ke andar (apply, Rs 275 fee, recharge)

## Chalana / Deploy karna
Ye static files hain — kisi bhi static hosting par folder daal do:
- Cloudflare Pages / Netlify / GitHub Pages par drag & drop, ya
- Local test: `python3 -m http.server 8000` phir browser me `http://localhost:8000`
- Phone par: site kholo → browser menu → "Add to Home Screen" — app ban jayegi.

Note: PWA install aur notifications ke liye HTTPS lazmi hai (localhost bhi chalega).

## Agla step
Isi code ko Android app (APK) me badalna hai — PWA pehle is liye banayi ke
Play Store ke $25 developer account ke baghair test ho jaye.
