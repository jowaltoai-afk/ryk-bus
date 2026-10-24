"use strict";
// ---------- helpers ----------
const $=s=>document.querySelector(s);
const t2m=t=>{const[a,b]=t.split(":").map(Number);return a*60+b};
const fmt=m=>{m=((m%1440)+1440)%1440;let h=Math.floor(m/60),mm=m%60;if(LANG!=="en"){const T=S().tod;const lbl=h<12?T[0]:h<16?T[1]:h<19?T[2]:T[3];return lbl+" "+String(h%12||12).padStart(2,"0")+":"+String(mm).padStart(2,"0")}const ap=h>=12?"PM":"AM";h=h%12||12;return String(h).padStart(2,"0")+":"+String(mm).padStart(2,"0")+" "+ap};
// v74: stop-hero big time — in Urdu the period word (شام/دوپہر) needs its own span so it
// sits on the digits' baseline with a clear gap (plain fmt() text floats in Nastaliq).
const fmtBig=m=>{if(LANG!=="ur")return fmt(m);const mm=((m%1440)+1440)%1440,h=Math.floor(mm/60),T=S().tod,lbl=h<12?T[0]:h<16?T[1]:h<19?T[2]:T[3];return `<span class="bigPer">${lbl}</span><span class="bigDigits">${String(h%12||12).padStart(2,"0")}:${String(mm%60).padStart(2,"0")}</span>`};
function stopName(n){return LANG==="ur"?(STOP_UR[n]||n):n}
function dirLabelL(l){if(LANG!=="ur")return l;return l.split(" \u2192 ").map(p=>STOP_UR[p]||p).join(" \u0633\u06d2 ")}
function rc(code){return LANG==="ur"?code.replace("Route","\u0631\u0648\u0679"):code}
function resolveStop(txt){const t=(txt||"").trim();if(!t)return"";if(ALL_STOPS.includes(t))return t;const hit=ALL_STOPS.find(n=>(STOP_UR[n]||"")===t);return hit||""}
const nowM=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
// Exact times (23 Oct): data.js me har direction ki poori times list hoti hai
// (source jaisi) — app hamesha usi se waqt nikalta hai. Formula sirf legacy
// fallback hai (purani data.js jisme times na ho).
function dirTimes(d,idx){if(d.times&&d.times[idx])return d.times[idx].map(t2m);const base=t2m(d.stops[idx][1]);return Array.from({length:d.trips},(_,k)=>base+k*d.headway)}
function deps(route,dk,idx){return dirTimes(route.dirs[dk],idx)}
function dirFirst(d){return d.times?t2m(d.times[0][0]):t2m(d.stops[0][1])}
function dirLast(d){if(d.times)return t2m(d.times[0][d.times[0].length-1]);return t2m(d.stops[0][1])+(d.trips-1)*d.headway}
function dirUniform(d){if(!d.times)return true;const t=d.times[0].map(t2m);for(let i=1;i<t.length;i++)if(t[i]-t[i-1]!==t[1]-t[0])return false;return true}
function nextDep(route,dk,idx,at){const ds=deps(route,dk,idx);for(const t of ds)if(t>=at)return t;return null}
const ALL_STOPS=[...new Set(ROUTES.flatMap(r=>Object.values(r.dirs).flatMap(d=>d.stops.map(s=>s[0]))))].sort();
function servicesFor(stop){const out=[];for(const r of ROUTES)for(const dk of["up","down"]){const idx=r.dirs[dk].stops.findIndex(s=>s[0]===stop);if(idx>=0)out.push({route:r,dk,idx,dir:r.dirs[dk]})}return out}
function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;setTimeout(()=>t.hidden=true,3400)}
function haversine(a,b,c,d){const R=6371000,r=x=>x*Math.PI/180;const h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function beep(){try{const ctx=new(window.AudioContext||window.webkitAudioContext)();[0,.25,.5].forEach(o=>{const os=ctx.createOscillator(),g=ctx.createGain();os.connect(g);g.connect(ctx.destination);os.frequency.value=880;g.gain.setValueAtTime(.25,ctx.currentTime+o);os.start(ctx.currentTime+o);os.stop(ctx.currentTime+o+.18)})}catch(e){}if(navigator.vibrate)navigator.vibrate([200,100,200])}
let leaveAlarmTimer=null,leaveAlarmT=null;
async function setAlarmAt(minsToday,title,body,nativeId){const delay=(minsToday-nowM())*60000;if(delay<=0){toast(S().alarmPast);return false}if("Notification"in window)await Notification.requestPermission();const nativeOk=nativeId?nativeAlarmSet(nativeId,Date.now()+delay,title,body):false;toast(S()[nativeOk?"alarmSetApk":"alarmSet"](fmt(minsToday)));const id=setTimeout(()=>{if(nativeId)nativeAlarmCancel(nativeId);if("Notification"in window&&Notification.permission==="granted")new Notification(title,{body,icon:"icon-192.png"});beep();toast(title+" — "+body)},delay);return id}
// v1.9: native AlarmManager alarms (APK) — app band ho tab bhi bajte hain.
// Guarded so the plain website is untouched. Jab in-app timer bajta hai to
// native twin pehle cancel hota hai — double alert kabhi nahi ayega.
function nativeAlarmSet(id,epochMs,title,body){try{if(IS_APK&&window.RYKBridge&&typeof RYKBridge.setNativeAlarm==="function"){RYKBridge.setNativeAlarm(id,epochMs,title||"",body||"");return true}}catch(e){}return false}
function nativeAlarmCancel(id){try{if(IS_APK&&window.RYKBridge&&typeof RYKBridge.cancelNativeAlarm==="function")RYKBridge.cancelNativeAlarm(id)}catch(e){}}

// ---------- i18n: static + dynamic strings (professional EN / proper Urdu) ----------
// v86: custom line-icon set (sprite inlined in index.html) — replaces emoji UI icons
const IC={pin:'<svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg>',map:'<svg class="ic" aria-hidden="true"><use href="#i-map"/></svg>',search:'<svg class="ic" aria-hidden="true"><use href="#i-search"/></svg>',close:'<svg class="ic" aria-hidden="true"><use href="#i-close"/></svg>',refresh:'<svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg>',sound:'<svg class="ic" aria-hidden="true"><use href="#i-sound"/></svg>',mute:'<svg class="ic" aria-hidden="true"><use href="#i-mute"/></svg>',star:'<svg class="ic" aria-hidden="true"><use href="#i-star"/></svg>',starf:'<svg class="ic" aria-hidden="true"><use href="#i-starf"/></svg>',alarm:'<svg class="ic" aria-hidden="true"><use href="#i-alarm"/></svg>',check:'<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>',home:'<svg class="ic" aria-hidden="true"><use href="#i-home"/></svg>',bus:'<svg class="ic" aria-hidden="true"><use href="#i-bus"/></svg>',walk:'<svg class="ic" aria-hidden="true"><use href="#i-walk"/></svg>',phone:'<svg class="ic" aria-hidden="true"><use href="#i-phone"/></svg>',chev:'<svg class="ic icChev" aria-hidden="true"><use href="#i-chev"/></svg>'};
const I18N={en:{
tagline:"Rahim Yar Khan Electric Bus",dlBarT:"Get the full app — voice, alarms & updates",install:"Download App",nextbus:"When is the next bus?",yourstop:"Type or choose your stop",stopph:"e.g. Khanpur Adda",shownext:"Show Next Bus",favs:"My Saved Stops",allroutes:"All Routes",helpline:"Helpline",source:"Data: eTransit Punjab (PMA) public route planner — checked daily",planner:"Plan a Trip",from:"From",to:"To",findbus:"Find Bus",n_home:"Home",n_routes:"Routes",n_plan:"Planner",n_reports:"Reports",n_guide:"T-Cash",n_set:"Settings",set_lang_h:"Language",set_app_h:"App",set_install:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-dlphone\"/></svg> Download App",set_install_note:"Downloads the real RYK Bus app (APK). After downloading, open the file and tap Install.",set_about_h:"About",legalH:"Legal",termsT:"Terms of Use",termsNote:"Timings are estimates — the short version.",privT:"Privacy Policy",privNote:"No account, no data collection — the short version.",termsH:"Terms of Use",termsS1h:"Estimates, not live tracking",termsS1b:"Timings follow the official timetable — buses may run early or late. This app does not provide live GPS tracking.",termsS2h:"Plan important journeys",termsS2b:"For important travel, please confirm timings yourself. The app is a guide, not a guarantee.",termsS3h:"Fare information",termsS3b:"Fare is a flat Rs 20, free for students, senior citizens and special persons — as published by the transport authority. Fares may change.",termsS4h:"Independent community service",termsS4b:"This is a free community information service. It is not affiliated with or endorsed by the government or the PMA. Accuracy is best-effort and the data is checked daily.",termsS5h:"Official information",termsS5b:"For official queries, call helpline 1762.",privH:"Privacy Policy",privIntro:"This app does not collect your personal data.",privS1h:"No account, no sign-up",privS1b:"The app works without any account, login or personal details.",privS2h:"Location stays on your device",privS2b:"Your location is used only on your phone to find your nearest stop. It is never sent to any server or stored.",privS3h:"Saved stops and alarms",privS3b:"Your saved stops, reminders and alarms are stored only on your device.",privS4h:"Community reports",privS4b:"When you submit a report, it is shared publicly in this app (route, direction, stop, problem and the details you pick) so other passengers can see it. Reports carry no name or personal details.",privS5h:"Timings and notifications",privS5b:"Timings come from the public eTransit Punjab planner and are checked daily. On Android, the app may receive update notifications (via Firebase) without identifying you.",privS6h:"Anonymous usage counts",privS6b:"When the app opens, it sends an anonymous count \u2014 no personal data \u2014 so we know how many people use it.",set_install_t:"Download App",set_share_t:"Share App",set_share_note:"Send the app link to friends & family.",set_update_t:"Check for Updates",set_update_note:"See if a newer version is available.",callRowT:"Call Helpline",verLbl:"Version",srcLbl:"Data source",set_about_1:"RYK Electric Bus shows Rahim Yar Khan's electric bus routes, stops and timings — with your nearest stop, next-bus countdown and alarms.",set_about_2:"Timings follow the official eTransit Punjab schedule. Bus positions are estimates from the timetable — not live GPS.",map_h:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-map\"/></svg> Route Map",map_legend:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-bus\"/></svg> = bus position — estimate from the timetable, not live GPS",mapNeedsNet:"Map needs internet to load.",mapLoading:"Map loading…",guide_h:"T-Cash Card Guide",
near_title:"Your Nearest Stop",seeAll:"See All",act_routes_h:"View All Routes",act_routes_s:"Explore the transit network",act_find_h:"Find Route",act_find_s:"Search for available routes from A to B",viewTrips:"View Trips",totalTrips:n=>"Total Trips: "+n,set_tc_note:"How to apply, fees and recharge — the complete guide.",near_hint:"Allow location access and we will automatically show your nearest stop and its next bus every time you open the app.",near_btn:"Find My Nearest Stop",near_refresh_btn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-refresh\"/></svg> Refresh Location",gpsNearBtn:"Nearest",
fare_h:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-money\"/></svg> Bus Fare",fare_body:"<b>Rs 20</b> flat for every journey — <b>completely FREE for students, senior citizens and special persons</b>",fare_note:"As per the Punjab government e-bus policy (punjab.gov.pk). A T-Cash card makes travelling even easier — see the guide in Settings.",
rep_h:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-mega\"/></svg> Report a Problem",rep_intro:"Bus running late? Did not arrive? Overcrowded? File a report so other passengers know. Reports are shared live — everyone using this app can see today's reports below. You can also share a report on WhatsApp. Internet is required to send a report.",rep_route_l:"Route",rep_type_l:"What do you want to report?",rep_note_l:"Anything else? (tap to add)",rep_note_ph:"e.g. Standing at Khanpur Adda for 20 minutes",rep_btn:"Submit Report",rep_today:"Today's Reports",
g_apply_h:"How to get the card?",g_apply:"Register on the eTransit Punjab website (etransit.punjab.gov.pk) → choose a card (Standard / Student / Women / Senior Citizen / Special Person) → fill details → generate PSID and pay → card is delivered home in 5-7 working days.",g_fee_h:"What is the fee?",g_fee:"Total Rs 275 = Rs 130 card + Rs 130 delivery + Rs 15 service charges. Pay via BOP app, any bank app/ATM/branch, JazzCash or Easypaisa. Card validity is 5 years.",g_rech_h:"How to recharge?",g_rech:"1) Fund transfer from the BOP Mobile App, or 2) IBFT from any bank — the T-Cash card number is the account number. Standard IBFT charges apply.",g_warn_h:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-warn\"/></svg> Important",g_warn:"Money in the physical T-Cash Card and the app Virtual Wallet is SEPARATE — it cannot be transferred between them. The Virtual Wallet is free and transit-only; the physical card also works at ATMs/POS.",g_fare_h:"What is the bus fare?",g_fare:"As per the Punjab government e-bus policy (punjab.gov.pk), the fare is a flat Rs 20, and travel is completely FREE for students, senior citizens and special persons.",disclaimer:"This is not an official government app. Timetables are taken from the Punjab Masstransit Authority public portal — for major changes, please confirm on helpline 1762.",
// dynamic
inNow:"Now",inMin:m=>"in "+m+" min",inHr:(h,m)=>"in "+h+" hr"+(m?" "+m+" min":""),doneToday:"No more buses today",
nextBusLabel:"Next bus",everyMin:h=>"Every "+h+" min",stopsN:n=>n+" stops",journeyDur:d=>"~"+d+" min journey",firstAt:t=>"First "+t,
routeMeta:(h,tr,f,l,d)=>"Every "+h+" min • "+tr+" trips • First bus "+f+" • Last bus "+l+" • Journey ~"+d+" min",
allRoutesH:"All Routes — Rahim Yar Khan",allRoutesNote:"Every route starts at GBS Rahim Yar Khan. One service: PTC Electric Bus (RYK).",backRoutes:"← All Routes",
timelineNote:h=>"* First-trip times — add "+h+" minutes for each following trip. Tap any stop to see all of today's buses from there.",depTimesH:"Departure times from the first stop",chooseBus:"Choose a bus time — tap any time to see that bus on the route",
boardH:"Departure board",boardSub:"Tap a run for its complete stop timeline",finalArr:t=>"Final arrival "+t,stPassed:"PASSED",stLive:"IN PROGRESS",stSched:"SCHEDULED",towards:x=>"Towards "+x,stopsPassed:(x,n)=>x+" of "+n+" stops passed",tlH:"Stop timeline",tlSub:"Times shown in Pakistan local time",nextStopLbl:"NEXT STOP",stopLbl:i=>"STOP "+i,tripWord:"TRIP",
favOn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-starf\"/></svg> Saved — tap to remove",favAdd:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-star\"/></svg> Save This Stop",favAddS:"Save",favOnS:"Saved",remindS:"Remind 10 min",listenS:"Listen",stopS:"Stop",favToastOn:"Stop saved",favToastOff:"Stop removed",
remindBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-alarm\"/></svg> Remind me 10 minutes before the bus",remindSet:t=>"Reminder set — we will alert you at "+t+" (keep the app open)",remindSetApk:t=>"Reminder set — we'll alert you at "+t+", even if the app is closed",remindSoon:"The bus is due within 10 minutes — leave now!",remindNone:"No buses left today",remindBody:(s,t)=>s+" — your bus arrives in 10 minutes ("+t+")",
stopNextLine:(t,x)=>"Next bus: <b>"+t+"</b> — "+x,stopDoneLine:"Buses finished for today — first bus tomorrow at 06:00 AM.",yourStop:"Your stop",tlHint:"Tap any time above — see where that bus will reach, and when.",allDirBtn:"Show all directions for this stop",
stopNotFound:"This stop was not found — please choose one from the list.",noMoreStop:"All of today's buses from this stop have departed. The first bus tomorrow is at 06:00 AM.",fullTimetable:"View full timetable →",
busNotDeparted:(o,s,t)=>"This bus has not left "+o+" yet — it departs at "+s+" and reaches your stop at "+t+".",
busNear:(p,t)=>'The bus is currently near <b>'+p+'</b> (estimated from the timetable) — it will reach your stop at '+t+'.',
busEnroute:t=>"The bus is on its way — it will reach your stop at "+t+".",
leaveAt:(lb,t)=>"Leave home by: <b>"+lb+"</b> (bus at "+t+" — be at the stop 2 minutes early)",leaveAlarmBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-alarm\"/></svg> Set Departure Alarm",leaveAlarmSet:t=>"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-check\"/></svg> Alarm set — "+t,leaveAlarmCancel:"Cancel",
alarmSet:t=>"Alarm set — we will remind you at "+t+" (keep the app open)",alarmSetApk:t=>"Alarm set — we'll remind you at "+t+", even if the app is closed",alarmPast:"That time has already passed — set an alarm for the next bus instead.",alarmLeaveTitle:"🚌 RYK Bus — Time to leave!",alarmLeaveBody:(s,t)=>"Your bus from "+s+" is at "+t+" — leave home now!",
nearLocating:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-locate\"/></svg> Locating you…",nearErr:"Location unavailable — turn on Location, allow permission, then try again.",nearNoGeo:"This browser does not support location.",
pk_search_ph:"Search stop name...",goSearchPh:"Where do you want to go?",pk_all:"All Stops",pk_near:"Stops Near You",pk_choose:"Choose a stop",goSameStop:"Start and destination are the same stop — choose a different destination.",resLeave:t=>"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-home\"/></svg> Leave home by <b>"+t+"</b>",nearHeroNone:"No more buses today from this stop",
distM:d=>Math.round(d)+" m away",distKm:d=>(d/1000).toFixed(1)+" km away",walkMin:m=>"~"+m+" min walk",navBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-map\"/></svg> See Stop on Map",navShort:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-pin\"/></svg> Map",servedBy:"Served by",
planChooseBoth:"Please choose both stops from the list.",planTimeLbl:"Leaving at (empty = right now)",planNowBtn:"Now",planAltLbl:"Other departures from your stop:",planNoneAfter:t=>"No bus after "+t+" today on this route",planPast:"That time already passed today — pick a later time or plan for tomorrow",planDoneToday:t=>"Buses finished for today — first bus tomorrow at "+t,planMeta:(f,dt,tn,at,d)=>f+" at "+dt+" • arrives "+tn+" at "+at+" • Journey "+d+" min",planDirectNote:"Direct bus — no change needed.",discT:"Please Note",discB:"This app does NOT provide live tracking. All timings are based on the official timetable — buses may be late or delayed.",discOk:"OK",
journeyBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-bus\"/></svg> Start Journey — Arrival Alarm",planTransferH:c=>"Change buses at "+c,planTotal:m=>"Total journey ~"+m+" minutes (including the change)",planNoRoute:"No direct or one-change route found between these stops. Try changing at GBS Rahim Yar Khan — all four routes pass through it.",
jTooClose:"Your destination is under 3 minutes away — get ready to get off!",jStarted:d=>"Journey started! The alarm will ring 3 minutes before you reach "+d+" — keep the app open",jStartedApk:d=>"Journey started! The alarm will ring 3 minutes before you reach "+d+", even if the app is closed",jAlarmTitle:"🚌 RYK Bus — Time to get off!",jAlarmBody:d=>"Your stop "+d+" is about 3 minutes away — get ready!",jToast:d=>d+" in 3 minutes — get ready to get off!",jBarEst:"Estimated arrival",jRemain:m=>m+" min remaining",jArriving:"arriving now",jEnd:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-close\"/></svg> End",jEnded:"Journey mode off",
repRouteAll:"All routes / not sure",rep_dir_l:"Direction",rep_stop_l:"Stop",repStopPh:"Nearest stop auto-selected — tap to change",repNone:"No reports yet today — be the first to report!",repSaved:"Report submitted — thank you! It now shows in today's reports.",repNeedNet:"Internet is required to send a report — please turn on internet and try again.",shareBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-share\"/></svg> Share",
repTypes:{late:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-late\"/></svg> Bus is late",missed:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-block\"/></svg> Bus did not arrive",crowded:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-crowd\"/></svg> Bus is overcrowded",ontime:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-checkc\"/></svg> Bus is on time",alert:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-warn\"/></svg> Road closed / incident / news"},repNotes:["Waiting 15+ minutes","Waiting 30+ minutes","Bus was full — no space","Driver did not stop here","Heavy traffic on the road","Bus seems broken down"],
planFromPh:"Tap and choose your stop",planToPh:"Tap and choose your destination",myLoc:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-pin\"/></svg> Nearest",swapLbl:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-swap\"/></svg> Swap",callBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-phone\"/></svg> Call Helpline 1762",favEmpty:"Stops you use daily will appear here — open any stop and tap <svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-star\"/></svg> Save This Stop.",listenBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-sound\"/></svg> Listen",stopBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-mute\"/></svg> Stop",tod:["Morning","Afternoon","Evening","Night"],listenNo:"Voice is not available on this phone.",listenStop:(s,dir,t,x)=>"Next bus from "+s+": "+dir+", at "+t+", "+x+".",listenNear:(s,dir,t,x)=>"Your nearest stop is "+s+". Next bus: "+dir+", at "+t+", "+x+".",nearAllow:"First time only: when the browser asks, tap Allow — then your stop appears automatically every time.",nearAllowApk:"First time only: when the app asks, tap Allow — then your stop appears automatically every time.",tlLegend:"✓ = bus has passed • <svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-bus\"/></svg> = next stop • tap any stop to see its timetable",g_steps:["Open the eTransit Punjab website and register","Choose your card type — Standard, Student, Women, Senior Citizen or Special Person","Fill in your details, generate the PSID and pay the fee (PSID = the number on the fee payment slip)","The card is delivered to your home in 5 to 7 working days"],repShare:(type,route,note,tm)=>"🚌 RYK Bus report: "+type+(route?" — "+route:"")+(note?" ("+note+")":"")+" — "+tm+" | See next bus timings: https://rykbus.dpdns.org/?v=2",
// home redesign 2026-10-17
busesFromStop:"Buses from this stop",nextBusTag:"NEXT BUS",changeStop:"Change Stop",selectStopLbl:"Select your stop",
manualStopTag:"Your selected stop",nearbyH:"Nearby Stops",toWord:"to",minShort:"min",hrShort:"h",mapLbl:"Map",
busesN:n=>n+" buses",useGps:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-pin\"/></svg> Use my location (GPS)",
fareStrip:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-ticket\"/></svg> Fare Rs 20 — Students, Senior Citizens & Special Persons FREE",
}};

I18N.ur={
tagline:"رحیم یار خان الیکٹرک بس",dlBarT:"پوری ایپ حاصل کریں — آواز، الارم اور اپڈیٹس",install:"ڈاؤن لوڈ",nextbus:"اگلی بس کب ہے؟",yourstop:"اپنا اسٹاپ لکھیں یا چنیں",stopph:"مثال: خانپور اڈا",shownext:"اگلی بس دیکھیں",favs:"میرے محفوظ اسٹاپس",allroutes:"تمام روٹس",helpline:"ہیلپ لائن",source:"ڈیٹا: ای ٹرانزٹ پنجاب (PMA) پبلک روٹ پلانر — روزانہ چیک ہوتا ہے",planner:"سفر کی منصوبہ بندی",from:"کہاں سے",to:"کہاں تک",findbus:"بس ڈھونڈیں",n_home:"ہوم",n_routes:"روٹس",n_plan:"پلانر",n_reports:"رپورٹس",n_guide:"ٹی کیش",n_set:"ترتیبات",set_lang_h:"زبان",set_app_h:"ایپ",set_install:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-dlphone\"/></svg> ایپ ڈاؤن لوڈ کریں",set_install_note:"اصل RYK Bus ایپ (APK) ڈاؤن لوڈ کرتی ہے۔ ڈاؤن لوڈ مکمل ہونے پر فائل کھول کر Install دبائیں۔",set_about_h:"ایپ کے بارے میں",legalH:"قانونی",termsT:"استعمال کی شرائط",termsNote:"اوقات اندازہ ہیں — مختصر پڑھیں۔",privT:"رازداری کی پالیسی",privNote:"کوئی اکاؤنٹ نہیں، کوئی ڈیٹا جمع نہیں — مختصر پڑھیں۔",termsH:"استعمال کی شرائط",termsS1h:"اندازہ، لائیو ٹریکنگ نہیں",termsS1b:"اوقات سرکاری ٹائم ٹیبل کے مطابق ہیں — بس جلدی یا دیر سے بھی آ سکتی ہے۔ یہ ایپ لائیو GPS ٹریکنگ نہیں دیتی۔",termsS2h:"اہم سفر کی تصدیق کریں",termsS2b:"اہم سفر کے لیے اوقات خود تصدیق کر لیں۔ ایپ ایک رہنمائی ہے، ضمانت نہیں۔",termsS3h:"کرایے کی معلومات",termsS3b:"کرایہ Rs 20 فلیٹ ہے؛ طلبہ، بزرگوں اور خصوصی افراد کے لیے مفت — ٹرانسپورٹ اتھارٹی کے اعلان کے مطابق۔ کرایہ تبدیل ہو سکتا ہے۔",termsS4h:"آزاد کمیونٹی سروس",termsS4b:"یہ ایک مفت کمیونٹی معلوماتی سروس ہے۔ یہ حکومت یا PMA سے وابستہ یا ان کی تائید یافتہ نہیں ہے۔ درستگی کی بھرپور کوشش کی جاتی ہے اور ڈیٹا روزانہ چیک ہوتا ہے۔",termsS5h:"سرکاری معلومات",termsS5b:"سرکاری معلومات کے لیے ہیلپ لائن 1762 پر کال کریں۔",privH:"رازداری کی پالیسی",privIntro:"یہ ایپ آپ کی ذاتی معلومات جمع نہیں کرتی۔",privS1h:"کوئی اکاؤنٹ نہیں، کوئی سائن اپ نہیں",privS1b:"ایپ بغیر کسی اکاؤنٹ، لاگ اِن یا ذاتی تفصیل کے چلتی ہے۔",privS2h:"لوکیشن آپ کے فون میں رہتی ہے",privS2b:"لوکیشن صرف آپ کے فون پر قریب ترین اسٹاپ ڈھونڈنے کے لیے استعمال ہوتی ہے۔ یہ کسی سرور کو بھیجی نہیں جاتی اور محفوظ نہیں کی جاتی۔",privS3h:"محفوظ اسٹاپس اور الارم",privS3b:"آپ کے محفوظ اسٹاپس، یاد دہانیاں اور الارم صرف آپ کے فون پر رہتے ہیں۔",privS4h:"عوامی رپورٹس",privS4b:"جب آپ رپورٹ بھیجتے ہیں تو وہ اس ایپ میں عوامی طور پر شیئر ہوتی ہے (روٹ، سمت، اسٹاپ، مسئلہ اور آپ کی منتخب تفصیل) تاکہ دوسرے مسافر دیکھ سکیں۔ رپورٹ میں کوئی نام یا ذاتی معلومات نہیں ہوتی۔",privS5h:"اوقات اور نوٹیفکیشن",privS5b:"اوقات ای ٹرانزٹ پنجاب کے پبلک پلانر سے لیے جاتے ہیں اور روزانہ چیک ہوتے ہیں۔ اینڈرائیڈ پر ایپ اپڈیٹ کی نوٹیفکیشن (فائر بیس کے ذریعے) بھیج سکتی ہے — اس میں آپ کی شناخت نہیں ہوتی۔",privS6h:"گمنام استعمال کی گنتی",privS6b:"جب ایپ کھلتی ہے تو صرف ایک گمنام گنتی بھیجی جاتی ہے \u2014 کوئی ذاتی معلومات نہیں \u2014 تاکہ پتا چلے کہ کتنے لوگ اسے استعمال کر رہے ہیں۔",set_install_t:"ایپ ڈاؤن لوڈ کریں",set_share_t:"ایپ شیئر کریں",set_share_note:"ایپ کا لنک دوستوں اور گھر والوں کو بھیجیں۔",set_update_t:"اپ ڈیٹس چیک کریں",set_update_note:"دیکھیں کہ نیا ورژن آیا ہے یا نہیں۔",callRowT:"ہیلپ لائن پر کال کریں",verLbl:"ورژن",srcLbl:"ڈیٹا کا ذریعہ",set_about_1:"RYK الیکٹرک بس رحیم یار خان کی الیکٹرک بس کے روٹس، اسٹاپس اور اوقات دکھاتا ہے — قریب ترین اسٹاپ، اگلی بس کا کاؤنٹ ڈاؤن اور الارم کے ساتھ۔",set_about_2:"اوقات سرکاری ای ٹرانزٹ پنجاب شیڈول کے مطابق ہیں۔ بس کی پوزیشن ٹائم ٹیبل سے لگایا گیا اندازہ ہے — لائیو GPS نہیں۔",map_h:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-map\"/></svg> روٹ کا نقشہ",map_legend:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-bus\"/></svg> = بس کی پوزیشن — ٹائم ٹیبل سے لگایا گیا اندازہ، لائیو GPS نہیں",mapNeedsNet:"نقشے کے لیے انٹرنیٹ چاہیے۔",mapLoading:"نقشہ لوڈ ہو رہا ہے…",guide_h:"ٹی کیش کارڈ گائیڈ",
near_title:"آپ کا قریب ترین اسٹاپ",seeAll:"تمام دیکھیں",act_routes_h:"تمام روٹس دیکھیں",act_routes_s:"پورا ٹرانزٹ نیٹ ورک دیکھیں",act_find_h:"روٹ تلاش کریں",act_find_s:"A سے B تک کے دستیاب روٹس تلاش کریں",viewTrips:"ٹرپس دیکھیں",totalTrips:n=>"کل ٹرپس: "+n,set_tc_note:"کارڈ اپلائی، فیس اور ری چارج کا مکمل طریقہ۔",near_hint:"لوکیشن کی اجازت دیں — ایپ کھلتے ہی ہم خود آپ کا قریب ترین اسٹاپ اور اس کی اگلی بس دکھا دیں گے۔",near_btn:"میرا قریب ترین اسٹاپ ڈھونڈیں",near_refresh_btn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-refresh\"/></svg> لوکیشن تازہ کریں",gpsNearBtn:"قریب ترین",
fare_h:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-money\"/></svg> بس کا کرایہ",fare_body:"<b>20 روپے</b> ہر سفر کا یکساں کرایہ — <b>طلبہ، بزرگ شہریوں اور خصوصی افراد کے لیے بالکل مفت</b>",fare_note:"پنجاب حکومت کی ای بس پالیسی کے مطابق (punjab.gov.pk)۔ ٹی کیش کارڈ سے سفر اور بھی آسان ہے — گائیڈ ترتیبات (Settings) میں ہے۔",
rep_h:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-mega\"/></svg> مسئلہ بتائیں",rep_intro:"بس دیر سے آ رہی ہے؟ نہیں آئی؟ بہت رش ہے؟ رپورٹ کریں تاکہ دوسرے مسافروں کو پتا چل جائے۔ رپورٹس لائیو شیئر ہوتی ہیں — اس ایپ کے تمام صارفین آج کی رپورٹس نیچے دیکھ سکتے ہیں۔ رپورٹ واٹس ایپ پر شیئر بھی کر سکتے ہیں۔ رپورٹ بھیجنے کے لیے انٹرنیٹ لازمی ہے۔",rep_route_l:"روٹ",rep_type_l:"کیا رپورٹ کرنا ہے؟",rep_note_l:"مزید کچھ؟ (منتخب کریں)",rep_note_ph:"مثال: خانپور اڈے پر 20 منٹ سے کھڑی ہے",rep_btn:"رپورٹ کریں",rep_today:"آج کی رپورٹس",
g_apply_h:"کارڈ کیسے ملتا ہے؟",g_apply:"ای ٹرانزٹ پنجاب کی ویب سائٹ (etransit.punjab.gov.pk) پر رجسٹر کریں ← کارڈ چنیں (اسٹینڈرڈ / اسٹوڈنٹ / ویمن / سینئر سٹیزن / اسپیشل پرسن) ← تفصیل بھریں ← PSID بنا کر ادائیگی کریں ← کارڈ 5 سے 7 ورکنگ دنوں میں گھر پہنچ جاتا ہے۔",g_fee_h:"فیس کتنی ہے؟",g_fee:"کل 275 روپے = 130 روپے کارڈ + 130 روپے ڈیلیوری + 15 روپے سروس چارجز۔ ادائیگی BOP ایپ، کسی بھی بینک کی ایپ/ATM/برانچ، جاز کیش یا ایزی پیسہ سے ہو سکتی ہے۔ کارڈ کی مدت 5 سال ہے۔",g_rech_h:"ری چارج کیسے ہو؟",g_rech:"1) BOP موبائل ایپ سے فنڈ ٹرانسفر، یا 2) کسی بھی بینک سے IBFT — ٹی کیش کارڈ نمبر ہی اکاؤنٹ نمبر ہے۔ IBFT کے عام چارجز الگ لگتے ہیں۔",g_warn_h:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-warn\"/></svg> ضروری بات",g_warn:"فزیکل ٹی کیش کارڈ اور ایپ کے ورچوئل والٹ کے پیسے الگ الگ ہیں — ایک سے دوسرے میں منتقل نہیں ہوتے۔ ورچوئل والٹ مفت ہے اور صرف بس کے لیے ہے؛ فزیکل کارڈ ATM/POS پر بھی چلتا ہے۔",g_fare_h:"بس کا کرایہ؟",g_fare:"پنجاب حکومت کی ای بس پالیسی کے مطابق (punjab.gov.pk) کرایہ یکساں 20 روپے ہے، اور طلبہ، بزرگ شہریوں اور خصوصی افراد کے لیے سفر بالکل مفت ہے۔",disclaimer:"یہ سرکاری ایپ نہیں ہے۔ ٹائم ٹیبل پنجاب ماس ٹرانزٹ اتھارٹی کے پبلک پورٹل سے لیا گیا ہے — بڑی تبدیلی کی صورت میں ہیلپ لائن 1762 سے تصدیق کر لیں۔",
inNow:"ابھی",inMin:m=>m+" منٹ بعد",inHr:(h,m)=>h+" گھنٹے"+(m?" "+m+" منٹ":"")+" بعد",doneToday:"آج کی بسیں ختم",
nextBusLabel:"اگلی بس",everyMin:h=>"ہر "+h+" منٹ",stopsN:n=>n+" اسٹاپس",journeyDur:d=>"سفر ~"+d+" منٹ",firstAt:t=>"پہلی بس "+t,
routeMeta:(h,tr,f,l,d)=>"ہر "+h+" منٹ بعد • "+tr+" ٹرپس • پہلی بس "+f+" • آخری بس "+l+" • سفر ~"+d+" منٹ",
allRoutesH:"تمام روٹس — رحیم یار خان",allRoutesNote:"ہر روٹ GBS رحیم یار خان سے شروع ہوتا ہے۔ ایک ہی سروس ہے: PTC الیکٹرک بس (RYK)۔",backRoutes:"← تمام روٹس",
timelineNote:h=>"* پہلی ٹرپ کے اوقات — ہر اگلی ٹرپ کے لیے "+h+" منٹ جوڑ لیں۔ کسی اسٹاپ پر ٹیپ کریں تو وہاں کی آج کی ساری بسیں نظر آئیں گی۔",depTimesH:"پہلے اسٹاپ سے روانگی کے اوقات",chooseBus:"بس کا وقت چنیں — کسی وقت پر ٹیپ کریں تو وہ بس روٹ پر نظر آئے گی",
boardH:"روانگی بورڈ",boardSub:"کسی بس پر ٹیپ کریں — اس کے سارے اسٹاپس اور اوقات نظر آئیں گے",finalArr:t=>"آخری اسٹاپ پر آمد "+t,stPassed:"گزر گئی",stLive:"سفر جاری ہے",stSched:"ابھی روانہ نہیں ہوئی",towards:x=>x+" کی طرف",stopsPassed:(x,n)=>n+" میں سے "+x+" اسٹاپس گزر چکے",tlH:"اسٹاپس کی ترتیب",tlSub:"اوقات پاکستان کے مقامی وقت کے مطابق ہیں",nextStopLbl:"اگلا اسٹاپ",stopLbl:i=>"اسٹاپ "+i,tripWord:"بس نمبر",
favOn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-starf\"/></svg> محفوظ ہے — ہٹانے کے لیے دبائیں",favAdd:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-star\"/></svg> یہ اسٹاپ محفوظ کریں",favAddS:"محفوظ کریں",favOnS:"محفوظ",remindS:'10 منٹ پہلے<span class="hSub">یاد دلائیں</span>',listenS:"سن کر بتاؤ",stopS:"بند کرو",favToastOn:"اسٹاپ محفوظ ہو گیا",favToastOff:"اسٹاپ ہٹا دیا گیا",
remindBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-alarm\"/></svg> اگلی بس سے 10 منٹ پہلے یاد دلائیں",remindSet:t=>"ریمائنڈر لگ گیا — "+t+" پر یاد دلا دیں گے (ایپ کھلی رکھیں)",remindSetApk:t=>"ریمائنڈر لگ گیا — "+t+" پر یاد دلا دیں گے، ایپ بند ہو تب بھی",remindSoon:"بس 10 منٹ کے اندر آ رہی ہے — ابھی نکل پڑیں!",remindNone:"آج کوئی بس باقی نہیں",remindBody:(s,t)=>s+" — بس 10 منٹ میں آئے گی ("+t+")",
stopNextLine:(t,x)=>"اگلی بس: <b>"+t+"</b> — "+x,stopDoneLine:"آج کی بسیں ختم — پہلی بس کل صبح 06:00 بجے۔",yourStop:"آپ کا اسٹاپ",tlHint:"اوپر کسی وقت پر ٹیپ کریں — دیکھیں وہ بس کہاں کہاں کتنے بجے پہنچے گی۔",allDirBtn:"اس اسٹاپ کی ساری سمتیں دیکھیں",
stopNotFound:"یہ اسٹاپ فہرست میں نہیں ملا — فہرست میں سے چنیں۔",noMoreStop:"اس اسٹاپ کی آج کی ساری بسیں نکل چکی ہیں۔ پہلی بس کل صبح 06:00 بجے ہے۔",fullTimetable:"مکمل ٹائم ٹیبل دیکھیں ←",
busNotDeparted:(o,s,t)=>"یہ بس ابھی "+o+" سے روانہ نہیں ہوئی — "+s+" پر نکلے گی اور آپ کے اسٹاپ پر "+t+" آئے گی۔",
busNear:(p,t)=>'بس اس وقت <b>'+p+'</b> کے پاس ہے (ٹائم ٹیبل کے حساب سے اندازہ) — آپ کے اسٹاپ پر '+t+' پہنچے گی۔',
busEnroute:t=>"بس راستے میں ہے — آپ کے اسٹاپ پر "+t+" پہنچے گی۔",
leaveAt:(lb,t)=>"گھر سے نکلنے کا وقت: <b>"+lb+"</b> (بس "+t+" کی ہے — اسٹاپ پر 2 منٹ پہلے پہنچیں)",leaveAlarmBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-alarm\"/></svg> نکلنے کا الارم لگائیں",leaveAlarmSet:t=>"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-check\"/></svg> الارم لگ گیا — "+t,leaveAlarmCancel:"منسوخ کریں",
alarmSet:t=>"الارم لگ گیا — "+t+" پر یاد دلا دیں گے (ایپ کھلی رکھیں)",alarmSetApk:t=>"الارم لگ گیا — "+t+" پر یاد دلا دیں گے، ایپ بند ہو تب بھی",alarmPast:"یہ وقت گزر چکا ہے — اگلی بس کا الارم لگائیں۔",alarmLeaveTitle:"🚌 RYK Bus — نکلنے کا وقت!",alarmLeaveBody:(s,t)=>s+" سے آپ کی بس "+t+" پر ہے — اب گھر سے نکلیں!",
nearLocating:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-locate\"/></svg> لوکیشن ڈھونڈ رہے ہیں…",nearErr:"لوکیشن نہیں ملی — فون کی لوکیشن آن کر کے اجازت دیں، پھر دوبارہ کوشش کریں۔",nearNoGeo:"اس براؤزر میں لوکیشن کی سہولت نہیں ہے۔",
pk_search_ph:"اسٹاپ کا نام لکھیں...",goSearchPh:"آپ کہاں جانا چاہتے ہیں؟",pk_all:"تمام اسٹاپس",pk_near:"آپ کے قریب کے اسٹاپس",pk_choose:"اسٹاپ چنیں",goSameStop:"شروع اور منزل ایک ہی اسٹاپ ہے — کوئی اور منزل چنیں۔",resLeave:t=>"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-home\"/></svg> گھر سے <b>"+t+"</b> تک نکل جائیں",nearHeroNone:"اس اسٹاپ سے آج کی بسیں ختم",
distM:d=>Math.round(d)+" میٹر دور",distKm:d=>(d/1000).toFixed(1)+" کلومیٹر دور",walkMin:m=>"پیدل ~"+m+" منٹ",navBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-map\"/></svg> اسٹاپ نقشے پر دیکھیں",navShort:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-pin\"/></svg> نقشہ",servedBy:"یہاں سے گزرتی ہے",
planChooseBoth:"دونوں اسٹاپس فہرست میں سے چنیں۔",planTimeLbl:"روانگی کا وقت (خالی = ابھی)",planNowBtn:"ابھی",planAltLbl:"آپ کے اسٹاپ سے دوسری بسیں:",planNoneAfter:t=>"آج "+t+" کے بعد اس روٹ پر کوئی بس نہیں",planPast:"وہ وقت آج گزر چکا — بعد کا وقت چنیں یا کل کی پلاننگ کریں",planDoneToday:t=>"آج کی بسیں ختم — پہلی بس کل "+t,planMeta:(f,dt,tn,at,d)=>f+" سے "+dt+" • "+tn+" پر "+at+" • سفر "+d+" منٹ",planDirectNote:"براہِ راست بس ہے — روٹ بدلنے کی ضرورت نہیں۔",discT:"اہم اطلاع",discB:"یہ ایپ لائیو ٹریکنگ نہیں دیتی۔ تمام اوقات سرکاری ٹائم ٹیبل کے مطابق ہیں — بس لیٹ بھی ہو سکتی ہے۔",discOk:"ٹھیک ہے",
journeyBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-bus\"/></svg> سفر شروع کریں — اترنے کا الارم",planTransferH:c=>c+" پر بس بدلنی ہوگی",planTotal:m=>"کل سفر ~"+m+" منٹ (بس بدلنے کا انتظار شامل)",planNoRoute:"ان دو اسٹاپس کے درمیان براہِ راست یا ایک تبدیلی والا راستہ نہیں ملا۔ GBS رحیم یار خان سے بدل کر دیکھیں — چاروں روٹس وہیں سے گزرتے ہیں۔",
jTooClose:"منزل 3 منٹ سے بھی قریب ہے — اترنے کی تیاری کریں!",jStarted:d=>"سفر شروع! "+d+" آنے سے 3 منٹ پہلے الارم بجے گا — ایپ کھلی رکھیں",jStartedApk:d=>"سفر شروع! "+d+" آنے سے 3 منٹ پہلے الارم بجے گا، ایپ بند ہو تب بھی",jAlarmTitle:"🚌 RYK Bus — اترنے کا وقت!",jAlarmBody:d=>"آپ کا اسٹاپ "+d+" تقریباً 3 منٹ میں آنے والا ہے — تیار ہو جائیں!",jToast:d=>d+" 3 منٹ میں — اترنے کی تیاری کریں!",jBarEst:"پہنچنے کا اندازہ",jRemain:m=>m+" منٹ باقی",jArriving:"بس پہنچنے والی ہے",jEnd:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-close\"/></svg> ختم",jEnded:"سفر موڈ بند کر دیا",
repRouteAll:"سارے روٹس / معلوم نہیں",rep_dir_l:"سمت",rep_stop_l:"اسٹاپ",repStopPh:"قریب ترین اسٹاپ خودکار منتخب ہے — بدلنے کے لیے ٹیپ کریں",repNone:"آج ابھی تک کوئی رپورٹ نہیں آئی — پہلی رپورٹ آپ کریں!",repSaved:"رپورٹ بھیج دی گئی — شکریہ! اب یہ آج کی رپورٹس میں نظر آئے گی",repNeedNet:"رپورٹ بھیجنے کے لیے انٹرنیٹ لازمی ہے — انٹرنیٹ آن کر کے دوبارہ کوشش کریں",shareBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-share\"/></svg> شیئر",
repTypes:{late:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-late\"/></svg> بس دیر سے ہے",missed:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-block\"/></svg> بس نہیں آئی",crowded:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-crowd\"/></svg> بس میں بہت رش ہے",ontime:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-checkc\"/></svg> بس وقت پر ہے",alert:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-warn\"/></svg> سڑک بند / حادثہ / خبر"},repNotes:["15 منٹ سے کھڑا ہوں","30 منٹ سے کھڑا ہوں","بس بھری تھی، جگہ نہیں ملی","ڈرائیور نے اسٹاپ پر نہیں روکا","راستے میں بہت رش ہے","بس خراب ہو گئی لگتی ہے"],
planFromPh:"ٹیپ کرکے اپنا اسٹاپ چنیں",planToPh:"ٹیپ کرکے اپنی منزل چنیں",myLoc:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-pin\"/></svg> قریب ترین",swapLbl:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-swap\"/></svg> بدلیں",callBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-phone\"/></svg> ہیلپ لائن 1762 پر کال کریں",favEmpty:"جو اسٹاپ آپ روز استعمال کرتے ہیں وہ یہاں آئیں گے — کوئی اسٹاپ کھول کر <svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-star\"/></svg> یہ اسٹاپ محفوظ کریں دبائیں۔",listenBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-sound\"/></svg> سن کر بتاؤ",stopBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-mute\"/></svg> بند کرو",tod:["صبح","دوپہر","شام","رات"],listenNo:"اس فون پر آواز کی سہولت نہیں ہے۔",listenStop:(s,dir,t,x)=>s+" سے اگلی بس: "+dir+"، "+t+" پر آئے گی، "+x+"۔",listenNear:(s,dir,t,x)=>"آپ کا قریب ترین اسٹاپ "+s+" ہے۔ اگلی بس: "+dir+"، "+t+" پر آئے گی، "+x+"۔",nearAllow:"صرف پہلی دفعہ: جب براؤزر پوچھے تو Allow دبا دیں — پھر ہر دفعہ آپ کا اسٹاپ خود آ جائے گا۔",nearAllowApk:"صرف پہلی دفعہ: جب ایپ اجازت مانگے تو Allow دبا دیں — پھر ہر دفعہ آپ کا اسٹاپ خود آ جائے گا۔",tlLegend:"✓ = بس گزر چکی ہے • <svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-bus\"/></svg> = اگلا اسٹاپ • کسی اسٹاپ پر ٹیپ کریں، اس کا ٹائم ٹیبل کھلے گا",g_steps:["ای ٹرانزٹ پنجاب کی ویب سائٹ کھول کر رجسٹر کریں","اپنا کارڈ چنیں — اسٹینڈرڈ، اسٹوڈنٹ، ویمن، سینئر سٹیزن یا اسپیشل پرسن","تفصیل بھریں، PSID بنائیں اور فیس جمع کریں (PSID = فیس والی پرچی کا نمبر)","کارڈ 5 سے 7 ورکنگ دنوں میں آپ کے گھر پہنچ جائے گا"],repShare:(type,route,note,tm)=>"🚌 RYK Bus رپورٹ: "+type+(route?" — "+route:"")+(note?" ("+note+")":"")+" — "+tm+" | اگلی بس کا وقت دیکھیں: https://rykbus.dpdns.org/?v=2"
// home redesign 2026-10-17
,busesFromStop:"اس اسٹاپ سے بسیں",nextBusTag:"اگلی بس",changeStop:"اسٹاپ بدلیں",selectStopLbl:"اپنا اسٹاپ منتخب کریں",
manualStopTag:"آپ کا منتخب کردہ اسٹاپ",nearbyH:"قریبی اسٹاپس",toWord:"تک",minShort:"منٹ",hrShort:"گھنٹہ",mapLbl:"نقشہ",
busesN:n=>n+" بسیں",useGps:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-pin\"/></svg> میری لوکیشن (GPS) استعمال کریں",
fareStrip:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-ticket\"/></svg> کرایہ 20 روپے — طلبہ، بزرگ شہری اور خصوصی افراد کے لیے مفت"
};
I18N.rom={
tagline:"Rahim Yar Khan Electric Bus",dlBarT:"Poori app lein — awaz, alarm aur updates",install:"Download Karo",nextbus:"Agli bus kab hai?",yourstop:"Apna stop likho ya chuno",stopph:"masalan Khanpur Adda",shownext:"Agli Bus Dikhao",favs:"Mere Mehfooz Stops",allroutes:"Tamam Routes",helpline:"Helpline",source:"Data: eTransit Punjab (PMA) public route planner — rozana check hota hai",planner:"Safar Plan Karo",from:"Kahan Se",to:"Kahan Tak",findbus:"Bus Dhundo",n_home:"Home",n_routes:"Roots",n_plan:"Safar",n_reports:"Reports",n_guide:"T-Cash",n_set:"Settings",set_lang_h:"Zuban",set_app_h:"App",set_install:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-dlphone\"/></svg> App Download Karo",set_install_note:"Asli RYK Bus app (APK) download karti hai. Download ke baad file khol kar Install dabao.",set_about_h:"App Ke Baare Mein",legalH:"Legal",termsT:"Istemaal Ki Sharait",termsNote:"Timings andaza hain — mukhtasir parhein.",privT:"Privacy Policy",privNote:"Koi account nahi, koi data jama nahi — mukhtasir parhein.",termsH:"Istemaal Ki Sharait",termsS1h:"Andaza, Live Tracking Nahi",termsS1b:"Timings official timetable ke mutabiq hain — bus jaldi ya der se bhi aa sakti hai. Ye app live GPS tracking nahi deti.",termsS2h:"Ahem Safar Ki Tasdeeq Karo",termsS2b:"Ahem safar ke liye timings khud tasdeeq kar lein. App rehnumai hai, zamanat nahi.",termsS3h:"Kiraye Ki Maloomat",termsS3b:"Kiraya Rs 20 flat hai; students, buzurgon aur special persons ke liye FREE — transport authority ke elaan ke mutabiq. Kiraya tabdeel ho sakta hai.",termsS4h:"Azaad Community Service",termsS4b:"Ye aik muft community maloomati service hai. Ye hukumat ya PMA se wabasta ya un ki taeed yafta nahi. Durusti ki bharpoor koshish ki jati hai aur data rozana check hota hai.",termsS5h:"Sarkaari Maloomat",termsS5b:"Sarkaari maloomat ke liye helpline 1762 par call karein.",privH:"Privacy Policy",privIntro:"Ye app aap ki personal maloomat jama nahi karti.",privS1h:"Koi Account Nahi, Koi Sign-Up Nahi",privS1b:"App baghair kisi account, login ya personal details ke chalti hai.",privS2h:"Location Aap Ke Phone Mein Rehti Hai",privS2b:"Location sirf aap ke phone par qareeb tareen stop dhoondne ke liye use hoti hai. Ye kisi server ko bheji nahi jati aur save nahi ki jati.",privS3h:"Mehfooz Stops Aur Alarm",privS3b:"Aap ke mehfooz stops, yaad dehaniyan aur alarm sirf aap ke phone par rehte hain.",privS4h:"Awami Reports",privS4b:"Jab aap report bhejte ho to wo is app me publicly share hoti hai (route, direction, stop, masla aur aap ki chuni tafseel) taake doosre musafir dekh saken. Report me koi naam ya personal maloomat nahi hoti.",privS5h:"Timings Aur Notifications",privS5b:"Timings eTransit Punjab ke public planner se li jati hain aur rozana check hoti hain. Android par app update ki notifications (Firebase ke zariye) bhej sakti hai — is mein aap ki pehchan nahi hoti.",privS6h:"Gumnam Istemaal Ki Ginti",privS6b:"Jab app khulti hai to sirf aik gumnam ginti bheji jati hai \u2014 koi personal data nahi \u2014 taake pata chale kitne log ise use karte hain.",set_install_t:"App Download Karo",set_share_t:"App Share Karo",set_share_note:"App ka link doston aur ghar walon ko bhejo.",set_update_t:"Updates Check Karo",set_update_note:"Dekho naya version aya hai ya nahi.",callRowT:"Helpline Par Call Karo",verLbl:"Version",srcLbl:"Data Source",set_about_1:"RYK Electric Bus Rahim Yar Khan ki electric bus ke routes, stops aur timings dikhata hai — qareeb tareen stop, agli bus ka countdown aur alarm ke sath.",set_about_2:"Timings official eTransit Punjab schedule ke mutabiq hain. Bus ki position timetable se lagaya gaya andaza hai — live GPS nahi.",map_h:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-map\"/></svg> Route Ka Naqsha",map_legend:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-bus\"/></svg> = bus ki position — timetable se lagaya gaya andaza, live GPS nahi",mapNeedsNet:"Naqshe ke liye internet chahiye.",mapLoading:"Naqsha load ho raha hai…",guide_h:"T-Cash Card Guide",
near_title:"Aap Ka Qareeb Tareen Stop",seeAll:"Sab Dekho",act_routes_h:"Saare Routes Dekho",act_routes_s:"Poora transit network dekho",act_find_h:"Route Dhundo",act_find_s:"A se B tak available routes dhundo",viewTrips:"Trips Dekho",totalTrips:n=>"Total Trips: "+n,set_tc_note:"Card apply, fees aur recharge ka mukammal tareeqa.",near_hint:"Location ki ijazat do — har dafa app khulte hi hum khud aap ka qareeb tareen stop aur us ki agli bus dikha denge.",near_btn:"Mera Qareeb Tareen Stop Dhundo",near_refresh_btn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-refresh\"/></svg> Location Refresh Karo",gpsNearBtn:"Qareeb Tareen",
fare_h:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-money\"/></svg> Bus Ka Kiraya",fare_body:"<b>Rs 20</b> har safar ka flat kiraya — <b>students, buzurgon aur special persons ke liye bilkul FREE</b>",fare_note:"Punjab government ki e-bus policy ke mutabiq (punjab.gov.pk). T-Cash card ho to safar aur asan — guide Settings me hai.",
rep_h:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-mega\"/></svg> Masla Batao",rep_intro:"Bus late hai? Ayi hi nahi? Bohat bheer hai? Report karo taake doosre musafiron ko pata chale. Reports live share hoti hain — is app ke tamam users aaj ki reports neeche dekh sakte hain. Report WhatsApp par bhi share kar sakte ho. Report bhejne ke liye internet lazmi hai.",rep_route_l:"Route",rep_type_l:"Kya report karna hai?",rep_note_l:"Aur kuch? (tap karke chunein)",rep_note_ph:"masalan Khanpur Adda par 20 minute se khara hun",rep_btn:"Report Bhejo",rep_today:"Aaj Ki Reports",
g_apply_h:"Card kaise mile ga?",g_apply:"eTransit Punjab ki website (etransit.punjab.gov.pk) par register karo → card chuno (Standard / Student / Women / Senior Citizen / Special Person) → tafseel bharo → PSID bana kar fees jama karo → card 5-7 working days me ghar pohnch jata hai.",g_fee_h:"Fees kitni hai?",g_fee:"Kul Rs 275 = Rs 130 card + Rs 130 delivery + Rs 15 service charges. BOP app, kisi bhi bank app/ATM/branch, JazzCash ya Easypaisa se jama kar sakte ho. Card ki muddat 5 saal hai.",g_rech_h:"Recharge kaise ho ga?",g_rech:"1) BOP Mobile App se fund transfer, ya 2) kisi bhi bank se IBFT — T-Cash card number hi account number hai. Aam IBFT charges lagu honge.",g_warn_h:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-warn\"/></svg> Ahem Baat",g_warn:"Physical T-Cash Card ke paise aur app ke Virtual Wallet ke paise ALAG hain — aik se doosre me transfer nahi hote. Virtual Wallet free hai aur sirf safar ke liye hai; physical card ATM/POS par bhi chalta hai.",g_fare_h:"Bus ka kiraya kitna hai?",g_fare:"Punjab government ki e-bus policy (punjab.gov.pk) ke mutabiq kiraya flat Rs 20 hai, aur students, buzurgon aur special persons ke liye safar bilkul FREE hai.",disclaimer:"Ye sarkari app nahi hai. Timetable Punjab Masstransit Authority ke public portal se liya gaya hai — kisi bari tabdeeli ke liye helpline 1762 par confirm kar lo.",
inNow:"Abhi",inMin:m=>"sirf "+m+" min baad",inHr:(h,m)=>h+" ghante"+(m?" "+m+" min":"")+" baad",doneToday:"Aaj ki buses khatam ho gayi",
nextBusLabel:"Agli bus",everyMin:h=>"Har "+h+" min baad",stopsN:n=>n+" stops",journeyDur:d=>"Safar ~"+d+" min",firstAt:t=>"Pehli bus "+t,
routeMeta:(h,tr,f,l,d)=>"Har "+h+" min • "+tr+" buses • Pehli bus "+f+" • Aakhri bus "+l+" • Safar ~"+d+" min",
allRoutesH:"Tamam Routes — Rahim Yar Khan",allRoutesNote:"Har route GBS Rahim Yar Khan se shuru hota hai. Aik hi service: PTC Electric Bus (RYK).",backRoutes:"← Tamam Routes",
timelineNote:h=>"* Pehli bus ke times hain — har agli bus ke liye "+h+" minute jama kar lo. Kisi stop par tap karo to wahan ki aaj ki saari buses nazar aye gin.",depTimesH:"Pehle stop se rawangi ke times",chooseBus:"Bus ka time chuno — kisi time par tap karo, wo bus poori route par nazar aye gi",
boardH:"Rawangi Board",boardSub:"Kisi bus par tap karo — us ke saare stops aur times nazar aye ge",finalArr:t=>"Aakhri stop par puhanch "+t,stPassed:"Guzar Gayi",stLive:"Safar Jari Hai",stSched:"Abhi Nikli Nahi",towards:x=>x+" ki taraf",stopsPassed:(x,n)=>n+" me se "+x+" stops guzar chuke",tlH:"Stops ki list",tlSub:"Times Pakistan ke local time ke mutabiq hain",nextStopLbl:"AGLA STOP",stopLbl:i=>"STOP "+i,tripWord:"Bus",
favOn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-starf\"/></svg> Mehfooz hai — hatane ke liye tap karo",favAdd:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-star\"/></svg> Ye Stop Mehfooz Karo",favAddS:"Mehfooz Karo",favOnS:"Mehfooz",remindS:"10 min pehle yaad dilao",listenS:"Sun Kar Batao",stopS:"Band Karo",favToastOn:"Stop mehfooz ho gaya",favToastOff:"Stop hata diya",
remindBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-alarm\"/></svg> Bus se 10 minute pehle yaad dilao",remindSet:t=>"Reminder lag gaya — "+t+" par alert mile ga (app khuli rakho)",remindSetApk:t=>"Reminder lag gaya — "+t+" par alert mile ga, app band ho tab bhi",remindSoon:"Bus 10 minute ke andar hai — abhi niklo!",remindNone:"Aaj ki buses khatam",remindBody:(s,t)=>s+" — tumhari bus 10 minute me aye gi ("+t+")",
stopNextLine:(t,x)=>"Agli bus: <b>"+t+"</b> — "+x,stopDoneLine:"Aaj ki buses khatam — kal pehli bus subah 06:00 AM par.",yourStop:"Aap ka stop",tlHint:"Upar kisi time par tap karo — dekho wo bus kahan kahan kitne baje pohnche gi.",allDirBtn:"Is stop ki saari directions dekho",
stopNotFound:"Ye stop nahi mila — list se koi stop chuno.",noMoreStop:"Is stop se aaj ki saari buses nikal gayi. Kal pehli bus subah 06:00 AM par hai.",fullTimetable:"Poora timetable dekho →",
busNotDeparted:(o,s,t)=>"Ye bus abhi "+o+" se nikli hi nahi — "+s+" par nikle gi aur tumhare stop par "+t+" puhanche gi.",
busNear:(p,t)=>'Bus is waqt <b>'+p+'</b> ke qareeb hai (timetable se andaza) — tumhare stop par '+t+' puhanche gi.',
busEnroute:t=>"Bus raste me hai — tumhare stop par "+t+" puhanche gi.",
leaveAt:(lb,t)=>"Ghar se nikalne ka time: <b>"+lb+"</b> (bus "+t+" par hai — 2 minute pehle stop par ho)",leaveAlarmBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-alarm\"/></svg> Nikalne ka Alarm Lagao",leaveAlarmSet:t=>"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-check\"/></svg> Alarm lag gaya — "+t,leaveAlarmCancel:"Cancel karo",
alarmSet:t=>"Alarm lag gaya — "+t+" par yaad dila denge (app khuli rakho)",alarmSetApk:t=>"Alarm lag gaya — "+t+" par yaad dila denge, app band ho tab bhi",alarmPast:"Wo time to guzar gaya — agli bus ka alarm lagao.",alarmLeaveTitle:"🚌 RYK Bus — Nikalne ka time ho gaya!",alarmLeaveBody:(s,t)=>s+" se tumhari bus "+t+" par hai — abhi ghar se niklo!",
nearLocating:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-locate\"/></svg> Location dhund rahe hain…",nearErr:"Location nahi mili — Location on karo, ijazat do, phir dobara koshish karo.",nearNoGeo:"Is browser me location ki sahulat nahi.",
pk_search_ph:"Stop ka naam likho...",goSearchPh:"Aap kahan jana chahte ho?",pk_all:"Tamam Stops",pk_near:"Aap Ke Qareeb Ke Stops",pk_choose:"Stop chuno",goSameStop:"Shuru aur manzil aik hi stop hai — doosri manzil chuno.",resLeave:t=> "<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-home\"/></svg> Ghar se nikalne ka time <b>"+t+"</b>",nearHeroNone:"Is stop se aaj ki buses khatam",
distM:d=>Math.round(d)+" m door",distKm:d=>(d/1000).toFixed(1)+" km door",walkMin:m=>"~"+m+" min paidal",navBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-map\"/></svg> Stop Map Par Dekho",navShort:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-pin\"/></svg> Map",servedBy:"Yahan rukti hai",
planChooseBoth:"Dono stops list se chuno.",planTimeLbl:"Rawangi ka waqt (khaali = abhi)",planNowBtn:"Abhi",planAltLbl:"Aap ke stop se doosri buses:",planNoneAfter:t=>"Aaj "+t+" ke baad is route par koi bus nahi",planPast:"Wo waqt aaj guzar chuka — baad ka waqt chuno ya kal ki planning karo",planDoneToday:t=>"Aaj ki buses khatam — kal pehli bus "+t+" par",planMeta:(f,dt,tn,at,d)=>f+" "+dt+" par • "+tn+" puhanche gi "+at+" • Safar "+d+" min",planDirectNote:"Seedhi bus hai — badalne ki zaroorat nahi.",discT:"Zaroori Elaan",discB:"Ye app live tracking nahi deti. Saari timings official timetable par mabni hain — bus late bhi ho sakti hai.",discOk:"Samajh Gaya",
journeyBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-bus\"/></svg> Safar Shuru Karo — Utrne ka Alarm",planTransferH:c=>c+" par bus badlo",planTotal:m=>"Kul safar ~"+m+" minute (badalna shamil)",planNoRoute:"In stops ke darmiyan seedhi ya aik-change wali bus nahi mili. GBS Rahim Yar Khan par badal kar dekho — chaaron routes wahan se guzarte hain.",
jTooClose:"Tumhari manzil 3 minute se bhi kam door hai — utarne ki tayyari karo!",jStarted:d=>"Safar shuru! "+d+" se 3 minute pehle alarm baje ga — app khuli rakho",jStartedApk:d=>"Safar shuru! "+d+" se 3 minute pehle alarm baje ga, app band ho tab bhi",jAlarmTitle:"🚌 RYK Bus — Utrne ka time!",jAlarmBody:d=>"Tumhara stop "+d+" takreeban 3 minute door hai — tayyari karo!",jToast:d=>d+" 3 minute me — utarne ki tayyari karo!",jBarEst:"Puhanchne ka andaza time",jRemain:m=>m+" min baqi",jArriving:"bus aa rahi hai",jEnd:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-close\"/></svg> Khatam",jEnded:"Journey mode band ho gaya",
repRouteAll:"Tamam routes / pata nahi",rep_dir_l:"Direction (samat)",rep_stop_l:"Stop",repStopPh:"Qareeb tareen stop auto select hai — badalne ke liye tap karo",repNone:"Aaj abhi koi report nahi — pehle tum report karo!",repSaved:"Report bhej di gayi — shukriya! Ab ye aaj ki reports me nazar aye gi.",repNeedNet:"Report bhejne ke liye internet lazmi hai — internet on karke dobara koshish karein.",shareBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-share\"/></svg> Share",
repTypes:{late:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-late\"/></svg> Bus late hai",missed:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-block\"/></svg> Bus ayi hi nahi",crowded:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-crowd\"/></svg> Bus me bohat bheer hai",ontime:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-checkc\"/></svg> Bus time par hai",alert:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-warn\"/></svg> Road band / hadsa / khabar"},repNotes:["15 minute se khara hun","30 minute se khara hun","Bus bhari thi, jagah nahi mili","Driver ne stop par nahi roka","Raaste me bohat rush hai","Bus kharab ho gayi lagti hai"],
planFromPh:"Tap karke apna stop chuno",planToPh:"Tap karke apni manzil chuno",myLoc:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-pin\"/></svg> Qareeb Tareen",swapLbl:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-swap\"/></svg> Badlo",callBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-phone\"/></svg> Helpline 1762 par call karo",favEmpty:"Jo stop tum roz use karte ho wo yahan aye ga — koi stop khol kar <svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-star\"/></svg> Ye Stop Mehfooz Karo dabao.",listenBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-sound\"/></svg> Sun Kar Batao",stopBtn:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-mute\"/></svg> Band Karo",tod:["Subha","Dopahar","Sham","Raat"],listenNo:"Is phone par awaz ki sahulat nahi hai.",listenStop:(s,dir,t,x)=>s+" se agli bus: "+dir+", time "+t+", "+x+".",listenNear:(s,dir,t,x)=>"Tumhara qareeb tareen stop "+s+" hai. Agli bus: "+dir+", time "+t+", "+x+".",nearAllow:"Sirf pehli dafa: jab browser pooche to Allow daba do — phir har dafa tumhara stop khud ajaye ga.",nearAllowApk:"Sirf pehli dafa: jab app ijazat mange to Allow daba do — phir har dafa tumhara stop khud ajaye ga.",tlLegend:"✓ = bus guzar gayi • <svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-bus\"/></svg> = agla stop • kisi stop par tap karo, us ka timetable khule ga",g_steps:["eTransit Punjab ki website khol kar register karo","Apna card chuno — Standard, Student, Women, Senior Citizen ya Special Person","Tafseel bharo, PSID banao aur fees jama karo (PSID = fees wali parchi ka number)","Card 5 se 7 working days me tumhare ghar pohnch jaye ga"],repShare:(type,route,note,tm)=>"🚌 RYK Bus report: "+type+(route?" — "+route:"")+(note?" ("+note+")":"")+" — "+tm+" | Agli bus ke times dekho: https://rykbus.dpdns.org/?v=2"
// home redesign 2026-10-17
,busesFromStop:"Is stop se buses",nextBusTag:"AGLI BUS",changeStop:"Stop Badlo",selectStopLbl:"Apna stop chuno",
manualStopTag:"Aap ka muntakhib stop",nearbyH:"Qareebi Stops",toWord:"tak",minShort:"min",hrShort:"gh",mapLbl:"Map",
busesN:n=>n+" buses",useGps:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-pin\"/></svg> Meri location (GPS) use karo",
fareStrip:"<svg class=\"ic\" aria-hidden=\"true\"><use href=\"#i-ticket\"/></svg> Kiraya Rs 20 — Students, Buzurg aur Special Persons ke liye FREE"
};
let LANG="en";try{LANG=localStorage.getItem("ryk-lang")||"en"}catch(e){}
const S=()=>I18N[LANG];
function inText(t){const d=t-nowM();if(d<0)return"";if(d===0)return S().inNow;if(d<60)return S().inMin(d);return S().inHr(Math.floor(d/60),d%60)}
function applyLang(){const d=I18N[LANG];document.documentElement.lang=LANG==="ur"?"ur":LANG==="rom"?"ur-Latn":"en";document.querySelectorAll("[data-i18n]").forEach(el=>{const k=el.dataset.i18n;if(d[k]!==undefined)el.innerHTML=d[k]});const nahS=document.querySelector("#nearAllowHint [data-i18n='nearAllow']");if(nahS&&IS_APK&&d.nearAllowApk)nahS.innerHTML=d.nearAllowApk;document.querySelectorAll("[data-i18n-ph]").forEach(el=>{const k=el.dataset.i18nPh;if(d[k])el.placeholder=d[k]});document.querySelectorAll("[data-setlang]").forEach(b=>b.classList.toggle("on",b.dataset.setlang===LANG));document.body.classList.toggle("ur",LANG==="ur");buildRepSelects();buildGuide();renderRoutesList();renderFavs();renderReports();renderSettingsMode();if(lastNear)renderNear(lastNear);if(curStop)showStop(curStop,stopFocus);if(curRoute&&!$("#routeDetail").hidden)showRoute(curRoute.id,curDir,curTrip);syncLangPill();renderHome();syncNearBtn()}
document.querySelectorAll("[data-setlang]").forEach(b=>b.onclick=()=>{LANG=b.dataset.setlang;localStorage.setItem("ryk-lang",LANG);applyLang();syncLangPill()});
if(!I18N[LANG])LANG="en";
if(!localStorage.getItem("ryk-lang")){const lp=$("#langPick");if(lp){lp.hidden=false;lp.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>{LANG=b.dataset.pick;localStorage.setItem("ryk-lang",LANG);applyLang();lp.hidden=true})}}

// ---------- navigation ----------
function show(view){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$("#view-"+view).classList.add("active");document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));window.scrollTo(0,0);try{if(window.speechSynthesis)speechSynthesis.cancel();speaking=false;setSpeakUI(false)}catch(e){}try{if(window.RYKBridge)RYKBridge.stopSpeaking()}catch(e){}if(view==="reports"){try{repSrvAt=0;fetchRepSrv();renderReports()}catch(e){}}}

// ---------- in-app back navigation (v1.3): har screen tabdeeli history me ----------
// SPA screens JS me badalte hain — baghair history entries ke Android back poori
// app band kar deta tha. Ab saari tabdeeliyan navPush() se: render + pushState.
// Pop par wapas render (bina push ke); ghalat/unknown state par Home fallback.
let curNavState={v:"home"};
function navEq(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function renderNav(st){
  curNavState=st;
  // v1.6: picker overlay hamesha history ke sath band ho — row tap, ✕, ya
  // Android back (goBack→popstate) par overlay kabhi atka na rahe.
  if(st.v!=="picker")closePicker();
  if(st.v==="stop")showStop(st.stop,st.focus);
  else if(st.v==="routedetail")showRoute(st.id,st.dk,st.tripIdx);
  else if(st.v==="picker")renderPicker(st.target);
  else if(["home","routes","planner","reports","guide","settings","terms","privacy"].includes(st.v))show(st.v);
  else show("home");
}
function navPush(st){
  if(navEq(st,curNavState))return;
  renderNav(st);
  try{history.pushState(st,"")}catch(e){}
}
const go=view=>navPush({v:view});
const goStop=(stop,focus)=>navPush({v:"stop",stop,focus:(focus===undefined?null:focus)});
const goRoute=(id,dk,tripIdx)=>navPush({v:"routedetail",id,dk,tripIdx:(tripIdx===undefined?null:tripIdx)});
window.addEventListener("popstate",e=>{
  const st=e&&e.state;
  if(st&&typeof st.v==="string")renderNav(st);
  else renderNav({v:"home"});
});
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>go(b.dataset.view));
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
const fareEl=$("#fareStrip");if(fareEl)fareEl.onclick=()=>go("guide");

// ---------- favourites ----------
const favs=()=>{try{const f=JSON.parse(localStorage.getItem("ryk-favs")||"[]");return Array.isArray(f)?f:[]}catch(e){return[]}};
function toggleFav(stop){let f=favs();f=f.includes(stop)?f.filter(x=>x!==stop):[...f,stop];localStorage.setItem("ryk-favs",JSON.stringify(f));renderFavs();toast(f.includes(stop)?S().favToastOn:S().favToastOff)}
function renderFavs(){const f=favs(),card=$("#favCard");if(!f.length){card.hidden=true;return}card.hidden=false;$("#favList").innerHTML=f.map(s=>{const nx=nextForStop(s);return `<div class="nextItem"><div><b>${stopName(s)}</b><div class="meta">${nx?rc(nx.route.code)+" • "+dirLabelL(nx.dir.label):""}</div></div><div class="count">${nx?fmt(nx.time):"—"}<small>${nx?inText(nx.time):S().doneToday}</small></div></div>`}).join("");$("#favList").querySelectorAll(".nextItem").forEach((el,i)=>el.onclick=()=>goStop(f[i]))}
function nextForStop(stop){const at=nowM();let best=null;for(const s of servicesFor(stop)){const t=nextDep(s.route,s.dk,s.idx,at);if(t!==null&&(!best||t<best.time))best={time:t,...s}}return best}

// ---------- bus ki andaza position (timetable math, GPS nahi) ----------
function tripTimeAt(route,dk,k,idx){const t=dirTimes(route.dirs[dk],idx);return t[Math.min(k,t.length-1)]}
function busNow(route,dk,at){const d=route.dirs[dk];for(let k=0;k<d.trips;k++){const start=tripTimeAt(route,dk,k,0),end=tripTimeAt(route,dk,k,d.stops.length-1);if(at<start)break;if(at>=start&&at<=end){let p=0;for(let i=0;i<d.stops.length;i++)if(tripTimeAt(route,dk,k,i)<=at)p=i;return{trip:k+1,passedIdx:p,passed:d.stops[p][0],next:p+1<d.stops.length?d.stops[p+1][0]:null,nextIn:p+1<d.stops.length?tripTimeAt(route,dk,k,p+1)-at:0}}}return null}

// ---------- home ----------

// ---------- stop picker (full-screen list — datalist ka proper badal) ----------
let pkTarget=null;
function stopRoutes(stop){const seen=[];for(const sv of servicesFor(stop))if(!seen.find(x=>x.id===sv.route.id))seen.push(sv.route);return seen}
function pkRow(stop,dist){const rs=stopRoutes(stop).map(r=>`<span class="chip sm" style="background:${routeGreen(r.id)}">${rc(r.code)}</span>`).join(" ");return `<button class="pkRow" data-stop="${stop}"><span class="grow"><b>${stopName(stop)}</b><span class="pkMeta">${rs}${dist!==null&&dist!==undefined?" • "+IC.pin+" "+distText(dist):""}</span></span><span class="chev">${IC.chev}</span></button>`}
function renderPkList(q){const query=(q||"").toLowerCase();const match=st=>!query||st.toLowerCase().includes(query)||(STOP_UR[st]||"").includes(q||"");let html="";
 if(pickingHomeStop){html+=`<button class="pkRow" data-clear="1"><span class="grow"><b>${S().useGps}</b></span><span class="chev">${IC.chev}</span></button>`}
 if(lastPos&&!query){const near=Object.keys(STOP_COORDS||{}).map(n=>({n,d:stopDist(lastPos[0],lastPos[1],n)})).sort((a,b)=>a.d-b.d).slice(0,5);html+=`<div class="pkSec">${S().pk_near}</div>`+near.map(x=>pkRow(x.n,x.d)).join("")}
 const all=ALL_STOPS.filter(match);html+=`<div class="pkSec">${S().pk_all} (${all.length})</div>`+(all.length?all.map(st=>pkRow(st,lastPos?stopDist(lastPos[0],lastPos[1],st):null)).join(""):`<p class="err" style="padding:4px 2px">${S().stopNotFound}</p>`);
 $("#pkList").innerHTML=html;$("#pkList").querySelectorAll("[data-stop],[data-clear]").forEach(b=>b.onclick=()=>{if(b.hasAttribute("data-clear")){clearHomeStop();pickingHomeStop=false;closePicker();history.back();return}const v=b.dataset.stop;if(pickingHomeStop&&v){pickingHomeStop=false;closePicker();history.back();setHomeStop(v);return}if(pkTarget){pkTarget.value=stopName(v)}closePicker();history.back()})}
function renderPicker(targetId){const input=document.getElementById(targetId);pkTarget=input||null;if(!input)return;$("#pkTitle").textContent=S().pk_choose;$("#pkSearch").value="";$("#stopPicker").hidden=false;renderPkList("");document.body.style.overflow="hidden";setTimeout(()=>{try{$("#pkSearch").focus()}catch(e){}},60)}
function openPicker(input){navPush({v:"picker",target:input.id})}
function closePicker(){$("#stopPicker").hidden=true;document.body.style.overflow="";pkTarget=null}
const pkb=$("#pkBack");if(pkb)pkb.onclick=()=>history.back();
const pks=$("#pkSearch");if(pks)pks.addEventListener("input",()=>renderPkList(pks.value));
for(const id of["goFrom","goTo","planFrom","planTo","repStop"]){const el=document.getElementById(id);if(el)el.addEventListener("click",()=>openPicker(el))}

// ---------- v78: home "Where do you want to go?" search bar + live dropdown ----------
const goIn=document.getElementById("goSearch"),goDrop=document.getElementById("goDrop"),goClear=document.getElementById("goClear");
// v85: ✕ tab bhi nazar aye jab dropdown khula ho ya input focused ho (text ho ya na ho).
function syncGoClear(){if(goClear)goClear.hidden=!((goDrop&&!goDrop.hidden)||document.activeElement===goIn)}
function goClose(){if(goDrop)goDrop.hidden=true;syncGoClear()}
function goMatchStop(st,q){const query=(q||"").toLowerCase();return st.toLowerCase().includes(query)||(STOP_UR[st]||"").includes(q||"")}
function renderGoDrop(){
  const q=(goIn.value||"").trim();
  let html="";
  if(!q){
    if(lastPos){const near=Object.keys(STOP_COORDS||{}).map(n=>({n,d:stopDist(lastPos[0],lastPos[1],n)})).sort((a,b)=>a.d-b.d).slice(0,5);
      if(near.length)html+="<div class=\"pkSec\">"+S().pk_near+"</div>"+near.map(x=>pkRow(x.n,x.d)).join("")}
    if(!html){const f=favs();if(f.length)html+="<div class=\"pkSec\">"+S().favs+"</div>"+f.map(s=>pkRow(s,null)).join("")}
  }else{
    const hits=ALL_STOPS.filter(st=>goMatchStop(st,q)).slice(0,7);
    html=hits.length?hits.map(st=>pkRow(st,lastPos?stopDist(lastPos[0],lastPos[1],st):null)).join(""):"<p class=\"err\" style=\"padding:8px 4px\">"+S().stopNotFound+"</p>";
  }
  if(!html){goClose();return}
  goDrop.innerHTML=html;goDrop.hidden=false;
  goDrop.querySelectorAll(".pkRow").forEach(el=>el.addEventListener("click",()=>{const st=el.dataset.stop;goClose();goIn.value="";goIn.blur();syncGoClear();goToPlanner(st)}));
}
function goToPlanner(dest){
  const eff=effectiveHomeStop();
  const pf=document.getElementById("planFrom"),pt=document.getElementById("planTo"),ptime=document.getElementById("planTime");
  pf.value=eff?eff.stop:"";pt.value=dest;if(ptime)ptime.value="";
  go("planner");
  document.getElementById("planGo").click();
}
if(goIn){
  goIn.addEventListener("input",()=>{syncGoClear();renderGoDrop()});
  goIn.addEventListener("focus",()=>{syncGoClear();renderGoDrop()});
  // v85: blur par foran sync nahi — ✕ par tap ka click blur ke baad ata hai; der se sync taake click register ho.
  goIn.addEventListener("blur",()=>setTimeout(syncGoClear,250));
  goClear.addEventListener("click",()=>{if(goIn.value){goIn.value="";renderGoDrop();goIn.focus()}else{goClose();goIn.blur()}syncGoClear()});
  const goFocusBtn=document.getElementById("goFocusBtn");if(goFocusBtn)goFocusBtn.addEventListener("click",()=>goIn.focus());
  document.addEventListener("click",e=>{if(!goDrop.hidden&&!e.target.closest(".goSearchWrap"))goClose()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")goClose()});
  const _ps=history.pushState.bind(history);
  history.pushState=function(){goClose();return _ps.apply(history,arguments)};
  window.addEventListener("popstate",goClose);
  document.querySelectorAll("nav button").forEach(b=>b.addEventListener("click",goClose));
}


function busPosLine(x,at){const k=deps(x.route,x.dk,x.idx).indexOf(x.t);const origin=x.dir.stops[0][0];const start=tripTimeAt(x.route,x.dk,k,0);if(at<start)return "🚌 "+S().busNotDeparted(stopName(origin),fmt(start),fmt(x.t));const bn=busNow(x.route,x.dk,at);if(bn&&bn.trip===k+1&&bn.passedIdx<x.idx)return "🚌 "+S().busNear(stopName(bn.passed),fmt(x.t));return "🚌 "+S().busEnroute(fmt(x.t))}
// ---------- GO FLOW: Where do you want to go? (From = auto nearest ya list, To = manzil) ----------
// v1.5 (QA-01): saare direct candidates check karo, sab se pehli bus chuno;
// "done" sirf tab jab HAR candidate ki nextDep null ho.
function planBetween(F,T,at){
 let best=null,doneFirst=null;
 for(const r of ROUTES)for(const dk of["up","down"]){const st=r.dirs[dk].stops,fi=st.findIndex(s=>s[0]===F),ti=st.findIndex(s=>s[0]===T);if(fi>=0&&ti>fi){if(!doneFirst)doneFirst={route:r,dk,dir:r.dirs[dk],firstFi:t2m(st[fi][1])};const depT=nextDep(r,dk,fi,at);if(depT===null)continue;const dur=t2m(st[ti][1])-t2m(st[fi][1]);if(!best||depT<best.depT)best={kind:"direct",route:r,dk,dir:r.dirs[dk],fi,depT,arrT:depT+dur,dur}}}
 if(best)return best;
 if(doneFirst)return{kind:"done",route:doneFirst.route,dk:doneFirst.dk,dir:doneFirst.dir,firstFi:doneFirst.firstFi};
 const fr=servicesFor(F),tr=servicesFor(T);
 for(const a of fr)for(const b of tr){if(a.route.id===b.route.id)continue;const common=a.dir.stops.map(s=>s[0]).find(n=>b.dir.stops.some(s=>s[0]===n)&&n!==F&&n!==T);if(!common)continue;const ai=a.dir.stops.findIndex(s=>s[0]===F),ci=a.dir.stops.findIndex(s=>s[0]===common);if(ci<=ai)continue;const bi=b.dir.stops.findIndex(s=>s[0]===common),ti=b.dir.stops.findIndex(s=>s[0]===T);if(ti<=bi)continue;const d1=nextDep(a.route,a.dk,ai,at);if(d1===null)continue;const arrC=d1+(t2m(a.dir.stops[ci][1])-t2m(a.dir.stops[ai][1]));const d2=nextDep(b.route,b.dk,bi,arrC+3);if(d2===null)continue;const arrT=d2+(t2m(b.dir.stops[ti][1])-t2m(b.dir.stops[bi][1]));return{kind:"transfer",a,b,common,d1,arrC,d2,arrT}}
 return null}
let fromTouched=false;
function setAutoFrom(stop){if(!fromTouched){const i=$("#goFrom");if(i)i.value=stopName(stop)}}

// ---------- per-direction stop coordinates (v1.3) ----------
// DIR_COORDS[routeId][up|down][stopName] = [lat,lng] — sirf wo points jo base
// STOP_COORDS se >5m mukhtalif hain (Greeny: Up/Down road ki mukhtalif sides).
// Base STOP_COORDS hamesha fallback hai.
function stopCoord(stop, rid, dk){
  try{
    const d = (typeof DIR_COORDS !== "undefined") && rid && dk && DIR_COORDS[rid] && DIR_COORDS[rid][dk];
    if (d && d[stop]) return d[stop];
  }catch(e){}
  return (STOP_COORDS||{})[stop] || null;
}
// stop ka nearest distance — base + saare direction points me se minimum
function stopDist(la, lo, stop){
  let best = null;
  const consider = c => { if(!c) return; const d = haversine(la,lo,c[0],c[1]); if(best===null||d<best) best=d; };
  consider((STOP_COORDS||{})[stop]);
  try{
    if (typeof DIR_COORDS !== "undefined")
      for (const rid of Object.keys(DIR_COORDS))
        for (const dk of ["up","down"]){
          const d = DIR_COORDS[rid][dk];
          if (d && d[stop]) consider(d[stop]);
        }
  }catch(e){}
  return best;
}
// stop ka nearest direction point, route+dir ke sath (locate ke liye)
// v1.5 (QA-02): base point pehle consider NAHI hota — directional point
// maujood ho to navigation hamesha road ki sahi side par jata hai: agla
// ane wali service ki direction ka point; base sirf tab jab DIR_COORDS
// me stop ki koi entry hi na ho.
function nearestDirPoint(la, lo, stop){
  let bestDir=null,hasDir=false;
  const consider=(c,rid,dk)=>{if(!c)return;const d=haversine(la,lo,c[0],c[1]);if(!bestDir||d<bestDir.d)bestDir={n:stop,d,r:rid,dk}};
  try{
    if(typeof DIR_COORDS!=="undefined")
      for(const rid of Object.keys(DIR_COORDS))
        for(const dk of["up","down"]){
          const d=DIR_COORDS[rid]&&DIR_COORDS[rid][dk];
          if(d&&d[stop]){hasDir=true;consider(d[stop],rid,dk)}
        }
  }catch(e){}
  if(hasDir){
    const svc=nextPerService(stop);
    if(svc.length){
      const s0=svc[0];
      try{
        const c=DIR_COORDS[s0.route.id]&&DIR_COORDS[s0.route.id][s0.dk]&&DIR_COORDS[s0.route.id][s0.dk][stop];
        if(c)return{n:stop,d:haversine(la,lo,c[0],c[1]),r:s0.route.id,dk:s0.dk};
      }catch(e){}
    }
    return bestDir;
  }
  const base=(STOP_COORDS||{})[stop];
  return base?{n:stop,d:haversine(la,lo,base[0],base[1]),r:null,dk:null}:null;
}

// ---------- Google Maps navigation (stop tak directions, apni location se) ----------
let lastPos=null;
function navUrl(stop,rid,dk){const c=stopCoord(stop,rid,dk);if(!c)return null;let u="https://www.google.com/maps/dir/?api=1&destination="+c[0]+","+c[1]+"&travelmode=walking";if(lastPos)u+="&origin="+lastPos[0]+","+lastPos[1];return u}
function openExternalUrl(u){if(!u)return;if(IS_APK&&window.RYKBridge){try{RYKBridge.openExternal(u);return}catch(e){}}window.open(u,"_blank")}
// v1.9: hero Map pill bhi APK me seedha external Maps/browser me khule (WebView target=_blank quirks)
document.addEventListener("click",e=>{try{const a=e.target&&e.target.closest?e.target.closest("a#mapStopBtn"):null;if(a&&a.href&&!a.hidden){e.preventDefault();openExternalUrl(a.href)}}catch(_){}},true);
function openNav(stop,rid,dk){openExternalUrl(navUrl(stop,rid,dk))}

// ---------- nearest stop: auto-detect on open ----------
let lastNear=null,lastNearAt=0;
function distText(d){return d<1000?S().distM(d):S().distKm(d)}
function nextPerService(stop){const at=nowM();return servicesFor(stop).map(s=>({...s,t:nextDep(s.route,s.dk,s.idx,at)})).filter(x=>x.t!==null).sort((a,b)=>a.t-b.t).slice(0,4)}
// ---------- home redesign 2026-10-17 (E2-enhanced, user-approved) ----------
// Palette: ONE green family only (no orange/blue). r2/r4 get greens too.
const ROUTE_GREEN={r1:"#0B6E35",r2:"#3E7C59",r3:"#2E9E7B",r4:"#6B8F71"};
const routeGreen=id=>(ROUTE_GREEN[id]||"#0B6E35");
let pickingHomeStop=false;
function getHomeStopManual(){try{return localStorage.getItem("ryk-home-stop")||null}catch(e){return null}}
let homeStopManual=getHomeStopManual();
function setHomeStop(s){homeStopManual=s;try{localStorage.setItem("ryk-home-stop",s)}catch(e){}renderHome();window.scrollTo(0,0)}
function clearHomeStop(){homeStopManual=null;try{localStorage.removeItem("ryk-home-stop")}catch(e){}renderHome()}
function effectiveHomeStop(){if(homeStopManual&&ALL_STOPS.includes(homeStopManual))return{stop:homeStopManual,manual:true};if(lastNear&&lastNear[0])return{stop:lastNear[0].n,manual:false};return null}
function lastNearEntry(n){return(lastNear||[]).find(x=>x.n===n)||null}
function openHomeStopPicker(){pickingHomeStop=true;$("#pkTitle").textContent=S().pk_choose;$("#pkSearch").value="";$("#stopPicker").hidden=false;renderPkList("");document.body.style.overflow="hidden";setTimeout(()=>{try{$("#pkSearch").focus()}catch(e){}},60);navPush({v:"picker"})}
function bigCount(t){const d=t-nowM();if(d<=0)return `<b>${S().inNow}</b>`;if(d<60)return `<b>${d}</b><small>${S().minShort}</small>`;const h=Math.floor(d/60),m=d%60;return `<b>${h}</b><small>${S().hrShort}</small> <b>${m}</b><small>${S().minShort}</small>`}
function homeSvcRows(stop){const at=nowM();return servicesFor(stop).map(s=>({...s,t:nextDep(s.route,s.dk,s.idx,at)})).sort((a,b)=>(a.t===null?1e9:a.t)-(b.t===null?1e9:b.t))}
function destOf(x){return x.dir.stops[x.dir.stops.length-1][0]}
// v60: exact journey labels per user order — "GBS Rahim Yar Khan → Abu Dhabi Palace" (origin → terminus of that service)
function originOf(x){return x.dir.stops[0][0]}
function journeyTitle(x){return stopName(originOf(x))+" → "+stopName(destOf(x))}
function journeySpk(x){const o=stopName(originOf(x)),t=stopName(destOf(x));
  if(LANG==="ur")return o+" سے "+t+" تک";
  if(LANG==="rom")return o+" se "+t+" tak";
  return o+" "+S().toWord+" "+t}
function fitHeroName(){const nm=$("#heroStop");if(!nm||!nm.textContent)return;nm.style.fontSize="";const base=parseFloat(getComputedStyle(nm).fontSize);if(!(nm.scrollWidth>nm.clientWidth))return;let s=Math.max(15,Math.floor(base*nm.clientWidth/nm.scrollWidth));nm.style.fontSize=s+"px";if(s>15&&nm.scrollWidth>nm.clientWidth)nm.style.fontSize=(s-1)+"px"}
addEventListener("resize",()=>fitHeroName());
function renderHomeHero(eff){
  const lbl=$("#heroLabel"),nm=$("#heroStop"),meta=$("#heroMeta");
  if(!lbl||!nm)return;
  const gb0=$("#gpsIconBtn");if(gb0){gb0.classList.remove("spin");gb0.setAttribute("aria-label",S().gpsNearBtn);gb0.title=S().gpsNearBtn}
  if(!eff){lbl.textContent=S().selectStopLbl;nm.textContent="";meta.innerHTML=`<span class="heroHint">${S().near_hint}</span>`;const mb0=$("#mapStopBtn");if(mb0)mb0.hidden=true;return}
  const stop=eff.stop;
  const mb=$("#mapStopBtn");if(mb){const e0=lastNearEntry(stop);const u=navUrl(stop,e0?e0.r:null,e0?e0.dk:null);if(u){mb.href=u;mb.hidden=false}else mb.hidden=true}
  lbl.textContent=eff.manual?S().manualStopTag:S().near_title;
  nm.textContent=stopName(stop);
  fitHeroName();
  const e=lastNearEntry(stop);
  if(e){const wm=Math.max(1,Math.round(e.d/75));meta.innerHTML=`${IC.pin} ${distText(e.d)} • ${IC.walk} ${S().walkMin(wm)}`}
  else{const svcs=servicesFor(stop);const codes=[...new Set(svcs.map(s=>rc(s.route.code)))];meta.innerHTML=`${IC.bus} ${S().busesN(svcs.length)} • ${S().servedBy}: ${codes.join(" • ")}`}
}
function renderBusesCard(eff){
  const card=$("#busesCard");if(!card)return;
  if(!eff){card.hidden=true;return}
  card.hidden=false;
  const stop=eff.stop,rows=homeSvcRows(stop);
  const first=rows.find(x=>x.t!==null);
  $("#busesRows").innerHTML=rows.map((x,i)=>{
    const isNext=first&&x===first;
    const title=journeyTitle(x);
    const sub=x.t===null?`<span class="busDone">${S().doneToday}</span>`:`${inText(x.t)} • ${fmt(x.t)}`;
    return `<button class="busRow${isNext?" nextBus":""}" style="--rc:${routeGreen(x.route.id)}" data-i="${i}"><span class="badge ${x.dk}">${x.dk.toUpperCase()}</span><span class="busMain">${isNext?`<span class="nextTag">${S().nextBusTag}</span>`:""}<span class="busTitle">${title}</span><span class="busSub">${sub}</span></span><span class="busCount">${x.t===null?"—":bigCount(x.t)}</span></button>`
  }).join("");
  $("#busesRows").querySelectorAll(".busRow").forEach(el=>{el.onclick=()=>{const x=rows[+el.dataset.i];goStop(stop,{r:x.route.id,dk:x.dk})}});
  const lb=$("#busesListen");
  if(lb)lb.onclick=()=>{const lines=rows.filter(x=>x.t!==null).map(x=>S().listenStop(stopName(stop),journeySpk(x),fmt(x.t),inText(x.t)));speak(lines.length?lines.join(" "):(stopName(stop)+". "+stripH(S().nearHeroNone)),lb);const tx=$("#busesListenTx");if(tx)tx.innerHTML=speaking?S().stopBtn:S().listenBtn};
  const lw=$("#leaveWrap");
  if(first){const e=lastNearEntry(stop);const wm=e?Math.max(1,Math.round(e.d/75)):5;const lbT=first.t-wm-2;
    if(lbT>nowM()){lw.hidden=false;$("#leaveHint").innerHTML=S().resLeave(fmt(lbT));const ab=$("#leaveAlarmBtn"),cb=$("#leaveAlarmCancel");cb.textContent=S().leaveAlarmCancel;
    const setState=()=>{ab.classList.add("set");ab.innerHTML=S().leaveAlarmSet(fmt(leaveAlarmT));cb.hidden=false};
    const clearState=()=>{if(leaveAlarmTimer){clearTimeout(leaveAlarmTimer);leaveAlarmTimer=null;nativeAlarmCancel("leave")}leaveAlarmT=null;ab.classList.remove("set");ab.innerHTML=S().leaveAlarmBtn;cb.hidden=true};
    if(leaveAlarmTimer&&leaveAlarmT===lbT)setState();else clearState();
    ab.onclick=async()=>{if(leaveAlarmTimer)return;const id=await setAlarmAt(lbT,S().alarmLeaveTitle,S().alarmLeaveBody(stopName(stop),fmt(first.t)),"leave");if(id){leaveAlarmTimer=id;leaveAlarmT=lbT;setState()}};cb.onclick=clearState}
    else lw.hidden=true}
  else lw.hidden=true;
}
function renderNearby(eff){
  const wrap=$("#nearbyWrap"),row=$("#nearbyRow");if(!wrap||!row)return;
  if(!lastNear||lastNear.length<2){wrap.hidden=true;return}
  const cur=eff?eff.stop:null;
  const cards=lastNear.filter(x=>x.n!==cur).slice(0,6).map(x=>{
    const l=nextPerService(x.n),s=l[0]||null;
    const title=s?journeyTitle(s):"";
    const u=navUrl(x.n,s?s.route.id:(x.r||null),s?s.dk:(x.dk||null));
    return `<div class="nbCard" role="button" tabindex="0" style="--rc:${s?routeGreen(s.route.id):"#0B6E35"}" data-n="${x.n}"><span class="nbTop">${s?`<span class="badge ${s.dk}">${s.dk.toUpperCase()}</span>`:""}<span class="nbCount">${s?bigCount(s.t):"—"}${s?"":`<small class="busDone">${S().doneToday}</small>`}</span></span><span class="nbStop">${stopName(x.n)}</span>${title?`<span class="nbRoute">${title}</span>`:""}<span class="nbMeta"><span class="nbDist">${IC.pin} ${distText(x.d)}</span>${u?`<a class="nbMap" href="${escH(u)}" target="_blank" rel="noopener" title="${S().mapLbl}" aria-label="${S().mapLbl}">${IC.map}</a>`:""}</span></div>`
  }).join("");
  if(!cards){wrap.hidden=true;return}
  wrap.hidden=false;row.innerHTML=cards;
  row.querySelectorAll(".nbCard").forEach(el=>{const go=()=>setHomeStop(el.dataset.n);el.onclick=go;el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}})});
  row.querySelectorAll(".nbMap").forEach(a=>a.addEventListener("click",e=>e.stopPropagation()));
}
function renderHomeRoutes(){
  const box=$("#homeRoutes");if(!box)return;
  box.innerHTML=ROUTES.map(r=>{const f=dirFirst(r.dirs.up);const l=dirLast(r.dirs.up);const dest=stopName(r.name.split("→")[1].trim());
    return `<button class="hrRow" style="--rc:${routeGreen(r.id)}" data-r="${r.id}"><span class="hrStripe"></span><span class="grow"><b>${dest}</b><span class="meta">${fmt(f)} – ${fmt(l)}</span></span><span class="chev">${IC.chev}</span></button>`}).join("");
  box.querySelectorAll(".hrRow").forEach(el=>el.onclick=()=>goRoute(el.dataset.r,"up"));
}
function renderHome(){const eff=effectiveHomeStop();renderHomeHero(eff);renderBusesCard(eff);renderNearby(eff);renderHomeRoutes();renderFavs()}
function renderNear(list){lastNear=list;const top=list[0];if(!top)return;setAutoFrom(top.n);renderHome();syncNearBtn()}
const csb=$("#changeStopBtn");if(csb)csb.onclick=openHomeStopPicker;
// v72: hero GPS icon button (beside stop name) — clear any manual selection, then re-run GPS locate; heroLocating shows the busy state
const gib=$("#gpsIconBtn");if(gib)gib.onclick=()=>{clearHomeStop();locate(true)};
const sab=$("#seeAllBtn");if(sab)sab.onclick=openHomeStopPicker;
function syncNearBtn(){const b=$("#nearBtn");if(b)b.textContent=lastNear?S().near_refresh_btn:S().near_btn}
function heroLocating(){const mb=$("#mapStopBtn");if(mb)mb.hidden=true;$("#heroLabel").textContent="";$("#heroStop").textContent="";const gb=$("#gpsIconBtn");if(gb)gb.classList.add("spin");$("#heroMeta").innerHTML=`<span class="heroHint locating">${S().nearLocating}</span>`}
function heroGeoMsg(m){const mb=$("#mapStopBtn");if(mb)mb.hidden=true;$("#heroLabel").textContent="";$("#heroStop").textContent="";const gb=$("#gpsIconBtn");if(gb)gb.classList.remove("spin");$("#heroMeta").innerHTML=`<p class="err">${m}</p>`}
function locate(manual){const names=Object.keys(STOP_COORDS||{});if(!names.length)return;if(!navigator.geolocation){if(manual)heroGeoMsg(S().nearNoGeo);return}if(manual)heroLocating();
 navigator.geolocation.getCurrentPosition(p=>{const{latitude:la,longitude:lo}=p.coords;lastPos=[la,lo];const list=names.map(n=>nearestDirPoint(la,lo,n)).filter(Boolean).sort((a,b)=>a.d-b.d).slice(0,7);lastNearAt=Date.now();localStorage.setItem("ryk-near-auto","1");try{localStorage.setItem("ryk-near-cache",JSON.stringify({list,at:lastNearAt}))}catch(e){}renderNear(list)},e=>{if(manual)heroGeoMsg(S().nearErr)},{enableHighAccuracy:true,timeout:12000,maximumAge:60000})}
const nbEl=$("#nearBtn");if(nbEl)nbEl.onclick=()=>locate(true);
function autoNear(){try{const c=JSON.parse(localStorage.getItem("ryk-near-cache")||"null");if(c&&c.list&&c.list.length){lastNearAt=c.at;renderNear(c.list)}}catch(e){}
 if(localStorage.getItem("ryk-near-auto")==="1"){locate(false);return}
 // Pehli dafa (permission 'prompt') par load par location NAHI mangni — PSI audit + behtar UX:
 // user khud #nearBtn ya #gpsIconBtn dabaye to prompt context ke sath aaye. 'granted' par auto jaari.
 if(navigator.permissions&&navigator.permissions.query){navigator.permissions.query({name:"geolocation"}).then(r=>{if(r.state==="granted")locate(false)}).catch(()=>{})}
 // (permissions API na ho to auto call nahi — user #nearBtn/#gpsIconBtn se locate karega.)
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&localStorage.getItem("ryk-near-auto")==="1"&&Date.now()-lastNearAt>60000)locate(false)});

// ---------- routes / detail ----------
let curRoute=null,curDir="up",curStop=null,stopFocus=null;
let curTrip=null;
function tripStatus(route,dk,k,at){const d=route.dirs[dk];const start=tripTimeAt(route,dk,k,0),end=tripTimeAt(route,dk,k,d.stops.length-1);if(at<start)return{state:"future",start,end};if(at>end)return{state:"done",start,end};let p=0;for(let i=0;i<d.stops.length;i++)if(tripTimeAt(route,dk,k,i)<=at)p=i;return{state:"running",start,end,passedIdx:p,passed:d.stops[p][0],next:p+1<d.stops.length?d.stops[p+1][0]:null,nextIn:p+1<d.stops.length?tripTimeAt(route,dk,k,p+1)-at:0}}
function showRoute(id,dk,tripIdx){curRoute=ROUTES.find(r=>r.id===id);curDir=dk;show("routes");$("#routesList").hidden=true;const d=$("#routeDetail");d.hidden=false;const dir=curRoute.dirs[dk];const at=nowM();const first=dirFirst(dir);const lastDep=dirLast(dir);const dur=dirTimes(dir,dir.stops.length-1)[0]-first;const D=S();
 const depList=deps(curRoute,dk,0);const sts=depList.map((t,i)=>tripStatus(curRoute,dk,i,at));
 let autoK=sts.findIndex(s2=>s2.state==="running");if(autoK<0){autoK=depList.findIndex(t=>t>=at);if(autoK<0)autoK=depList.length-1}
 const k=(tripIdx===undefined||tripIdx===null)?autoK:tripIdx;curTrip=k;const st=sts[k]||tripStatus(curRoute,dk,k,at);
 const term=dir.stops[dir.stops.length-1][0];const total=dir.stops.length;
 const passedN=st.state==="done"?total:st.state==="running"?st.passedIdx+1:0;const pct=Math.round(passedN/total*100);
 const statusTxt=st.state==="running"?D.stLive:st.state==="done"?D.stPassed:D.stSched;
 const progHtml=st.state==="running"?`<div class="thProg"><div class="thProgTop"><b>${pct}%</b><span>${D.stopsPassed(passedN,total)}</span></div><div class="thBar"><i style="width:${pct}%"></i></div></div>`:"";
 d.innerHTML=`<button class="backBtn" id="bk">${D.backRoutes}</button>
 <div class="tripHero" id="tripHero"><div class="thTop"><span class="thChips"><span class="chip" style="background:${routeGreen(curRoute.id)}">${rc(curRoute.code)}</span> <span class="chip ev solid">${IC.bus} ${curRoute.ev||curRoute.code}</span></span><span class="thStatus ${st.state}">${statusTxt}</span></div><div class="thTitle">${D.towards(stopName(term))}</div><div class="thTimes"><div><b>${fmt(st.start)}</b><span>${stopName(dir.stops[0][0])}</span></div><div class="thLine"></div><div class="tr"><b>${fmt(st.end)}</b><span>${stopName(term)}</span></div></div><p class="thMeta">${D.routeMeta(dirUniform(dir)?dir.headway:"~"+dir.headway,dir.trips,fmt(first),fmt(lastDep),dur)}</p>${progHtml}</div>
 <div class="card"><div class="dirBtns"><button data-d="up" class="${dk==="up"?"on":""}">${dirLabelL(curRoute.dirs.up.label)}</button><button data-d="down" class="${dk==="down"?"on":""}">${dirLabelL(curRoute.dirs.down.label)}</button></div>
 <h3 class="tripPickH">${D.boardH}</h3><p class="mini">${D.boardSub}</p>
 <div class="board">${depList.map((t,i)=>{const s2=sts[i];const arr=tripTimeAt(curRoute,dk,i,total-1);return `<button class="runCard ${s2.state} ${i===k?"sel":""}" data-k="${i}"><span class="rcTrip">${D.tripWord} ${i+1}</span><span class="rcTime">${fmt(t)}</span>${s2.state==="running"?`<span class="rcLive">${D.stLive}</span>`:""}</button>`}).join("")}</div></div>
 <div class="card"><h3>${D.map_h}</h3><div id="routeMap"></div><p class="mini">${D.map_legend}</p></div>
 <div class="card"><h3>${D.tlH}</h3><p class="mini">${D.tlSub}</p><p class="mini tlLegend">${D.tlLegend}</p><div class="gtl" style="--prog:${pct}%">${dir.stops.map((s,i)=>{const tt=tripTimeAt(curRoute,dk,k,i);const passed=st.state==="done"?true:st.state==="running"?i<=st.passedIdx:tt<at;const isNext=st.state==="running"&&i===st.passedIdx+1;const mark="";const mu=navUrl(s[0],curRoute.id,dk);return `<div class="gtRow${passed?" gPassed":""}${isNext?" gNext":""}" data-i="${i}"><span class="gtMark ${passed?"done":isNext?"bus":"todo"}">${mark}</span><span class="grow"><span class="gtLbl">${D.stopLbl(i)}${isNext?' • <em>'+D.nextStopLbl+'</em>':""}</span><b>${stopName(s[0])}</b></span><span class="gtTime">${fmt(tt)}</span>${mu?`<a class="gtMap" href="${escH(mu)}" target="_blank" rel="noopener" title="${D.mapLbl}" aria-label="${D.mapLbl}">${IC.map}</a>`:""}<span class="gtChev">${IC.chev}</span></div>`}).join("")}</div></div>`;
 d.querySelector("#bk").onclick=()=>{d.hidden=true;$("#routesList").hidden=false};
 d.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>goRoute(id,b.dataset.d));
 d.querySelectorAll(".runCard").forEach(el=>el.onclick=()=>{goRoute(id,dk,+el.dataset.k);const hh=$("#tripHero");if(hh)try{hh.scrollIntoView({block:"start"})}catch(e){}});
 const selC=d.querySelector(".board .runCard.sel");if(selC)setTimeout(()=>{try{selC.scrollIntoView({inline:"center",block:"nearest"})}catch(e){}},90);
 d.querySelectorAll(".gtRow").forEach(el=>el.onclick=()=>goStop(dir.stops[+el.dataset.i][0]));d.querySelectorAll(".gtMap").forEach(a=>a.addEventListener("click",e=>{e.stopPropagation();e.preventDefault();openExternalUrl(a.href)}));renderRouteMap(id,dk,k)}
let rMap=null,rMapLayer=null,rBusM=null;
let leafletP=null;
function ensureLeaflet(){if(window.L)return Promise.resolve(true);if(leafletP)return leafletP;const ex=document.querySelector('script[src*="leaflet.js"]');if(ex){leafletP=new Promise(res=>{let done=false;const fin=v=>{if(done)return;done=true;res(v)};ex.addEventListener("load",()=>fin(true),{once:true});ex.addEventListener("error",()=>fin(false),{once:true});setTimeout(()=>fin(!!window.L),10000)});return leafletP}leafletP=new Promise(res=>{const l=document.createElement("link");l.rel="stylesheet";l.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(l);const s=document.createElement("script");s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";s.onload=()=>res(true);s.onerror=()=>{leafletP=null;res(false)};document.head.appendChild(s)});return leafletP}
function renderRouteMap(rk,dk,k){const box=document.querySelector("#routeMap");if(!box)return;if(!window.L){box.innerHTML='<p class="mini">'+S().mapLoading+'</p>';ensureLeaflet().then(ok=>{if(document.querySelector("#routeMap")!==box)return;if(ok){box.innerHTML="";renderRouteMap(rk,dk,k)}else box.innerHTML='<p class="mini">'+S().mapNeedsNet+'</p>'});return}
 const dir=ROUTES.find(r=>r.id===rk).dirs[dk];const pts=dir.stops.map(s2=>stopCoord(s2[0],rk,dk)).filter(Boolean);if(!pts.length)return;
 if(rMap&&rMap.getContainer()!==box){try{rMap.remove()}catch(e){}rMap=null;rMapLayer=null;rBusM=null}
 if(!rMap){rMap=L.map("routeMap",{scrollWheelZoom:false});L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap"}).addTo(rMap)}
 if(rMapLayer)rMap.removeLayer(rMapLayer);rMapLayer=L.layerGroup().addTo(rMap);
 L.polyline(pts,{color:"#0b6e4f",weight:4,opacity:.85}).addTo(rMapLayer);
 dir.stops.forEach(s2=>{const c=stopCoord(s2[0],rk,dk);if(c)L.circleMarker(c,{radius:5,color:"#0b6e4f",fillColor:"#fff",fillOpacity:1,weight:2}).addTo(rMapLayer).bindPopup("<b>"+stopName(s2[0])+"</b>")});
 try{rMap.fitBounds(L.latLngBounds(pts).pad(0.08))}catch(e){}
 setTimeout(()=>{try{rMap.invalidateSize()}catch(e){}},80);placeBusMarker(rk,dk,k)}
function placeBusMarker(rk,dk,k){if(!rMap||!window.L)return;const dir=ROUTES.find(r=>r.id===rk).dirs[dk];const at=nowM();const ts0=dirTimes(dir,0);const start=ts0[Math.min(k,ts0.length-1)];let pos=null;
 if(at<=start)pos=stopCoord(dir.stops[0][0],rk,dk);
 else{for(let i=1;i<dir.stops.length;i++){const ti=dirTimes(dir,i),pi=dirTimes(dir,i-1),kk=Math.min(k,ti.length-1),tt=ti[kk];if(at<tt){const pt=pi[kk];const a=stopCoord(dir.stops[i-1][0],rk,dk),b=stopCoord(dir.stops[i][0],rk,dk);if(a&&b){const f=Math.min(1,Math.max(0,(at-pt)/Math.max(1,tt-pt)));pos=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]}break}}}
 if(!pos)pos=stopCoord(dir.stops[dir.stops.length-1][0],rk,dk);if(!pos)return;
 if(rBusM)rMap.removeLayer(rBusM);
 rBusM=L.marker(pos,{icon:L.divIcon({className:"busIcon",html:"<span>🚌</span>",iconSize:[30,30],iconAnchor:[15,15]})}).addTo(rMap)}
function dirCard(r,dk){const dir=r.dirs[dk];const first=dirFirst(dir);const last=dirLast(dir);const nm=dk==="up"?r.name:r.name.split(" \u2192 ").reverse().join(" \u2192 ");return `<div class="routeDirCard"><div class="rdTop"><span class="evBadge">${r.ev.slice(-3)}</span><b class="rdTitle">${dirLabelL(nm)}</b><span class="dirChip ${dk}">${dk.toUpperCase()}</span></div><div class="rdMeta"><span>\u{1F550} ${fmt(first)} \u2013 ${fmt(last)}</span><span class="tripsChip">${S().totalTrips(dir.trips)}</span></div><button class="viewTripsBtn" data-rd="${r.id}:${dk}">${S().viewTrips}</button></div>`}
function renderRoutesList(){$("#routesList").innerHTML=`<div class="routesHead"><h2>${S().allRoutesH}</h2><p class="mini">${S().allRoutesNote}</p></div>${ROUTES.map(r=>dirCard(r,"up")+dirCard(r,"down")).join("")}`;$("#routesList").querySelectorAll("[data-rd]").forEach(b=>b.onclick=()=>{const p=b.dataset.rd.split(":");goRoute(p[0],p[1])})}

// ---------- stop detail ----------
function shade(hex,f){const n=parseInt(hex.slice(1),16);const r=Math.round(((n>>16)&255)*f),g=Math.round(((n>>8)&255)*f),b=Math.round((n&255)*f);return `rgb(${r},${g},${b})`}
function stripH(x){return String(x||"").replace(/<[^>]+>/g,"")}
function escH(x){return String(x||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
let speaking=false;
function pickVoice(prefix){try{const vs=speechSynthesis.getVoices();const cand=vs.filter(v=>v.lang&&v.lang.toLowerCase().replace("_","-").startsWith(prefix));if(!cand.length)return null;const score=v=>{let sc=0;const n=(v.name||"").toLowerCase();if(n.includes("google"))sc+=3;if(n.includes("natural")||n.includes("neural")||n.includes("premium")||n.includes("enhanced"))sc+=2;if(n.includes("espeak")||n.includes("pico")||n.includes("compact"))sc-=3;if(v.default)sc+=1;return sc};cand.sort((a,b)=>score(b)-score(a));return cand[0]}catch(e){return null}}
function setSpeakUI(on,active){const l=document.querySelector("#lsn");if(l)l.innerHTML=(on&&active===l)?'<span class="hIco">'+IC.mute+'</span><span class="hLbl">'+S().stopS+'</span>':'<span class="hIco">'+IC.sound+'</span><span class="hLbl">'+S().listenS+'</span>';document.querySelectorAll("[data-listen]").forEach(b=>{b.innerHTML=(on&&active===b)?IC.mute:IC.sound})}
// v1.5 (QA-11): native TTS completion callback — MainActivity ka
// UtteranceProgressListener evaluateJavascript("ttsDone()") karta hai.
function ttsDone(){speaking=false;setSpeakUI(false)}
function speak(text,btn){try{
 if(IS_APK&&window.RYKBridge){
  // Android WebView me speechSynthesis nahi hota — native TTS bridge se
  if(speaking){try{RYKBridge.stopSpeaking()}catch(e){}speaking=false;setSpeakUI(false);return}
  speaking=true;setSpeakUI(true,btn||null);
  try{RYKBridge.speak(text,LANG==="en"?"en":"ur")}catch(e){speaking=false;setSpeakUI(false);toast(S().listenNo)}
  return}
 if(speaking){speechSynthesis.cancel();speaking=false;setSpeakUI(false);return}
 if(!("speechSynthesis" in window)){toast(S().listenNo);return}
 speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);const prefix=LANG==="en"?"en":"ur";u.lang=LANG==="en"?"en-US":"ur-PK";u.rate=0.82;u.pitch=1;const v=pickVoice(prefix);if(v)u.voice=v;
 u.onend=()=>{speaking=false;setSpeakUI(false)};u.onerror=()=>{speaking=false;setSpeakUI(false)};
 speaking=true;setSpeakUI(true,btn||null);speechSynthesis.speak(u)}catch(e){speaking=false;toast(S().listenNo)}}
function tripTimeline(stop,s,k){const dir=s.dir,at=nowM();const rows=dir.stops.map((st,ix)=>{const t=tripTimeAt(s.route,s.dk,k,ix);const past=t<at;const mine=ix===s.idx;return `<div class="tlRow${past?" past":""}${mine?" mine":""}"><span class="tlTime">${fmt(t)}</span><span class="tlDot"></span><span class="tlName">${stopName(st[0])}${mine?` <span class="tlYou">${S().yourStop}</span>`:""}</span></div>`}).join("");return `<div class="tlHead">${rc(s.route.code)} • ${dirLabelL(dir.label)} • ${fmt(tripTimeAt(s.route,s.dk,k,s.idx))}</div>${rows}`}
function setTrip(sec,s,k,stop){sec.querySelectorAll(".tChip").forEach(c=>{const on=+c.dataset.k===k;c.classList.toggle("sel",on);if(on)setTimeout(()=>{try{c.scrollIntoView({inline:"center",block:"nearest"})}catch(e){}},40)});const p=sec.querySelector(".tripPanel");if(p){p.innerHTML=tripTimeline(stop,s,k);p.classList.remove("flash");void p.offsetWidth;p.classList.add("flash");setTimeout(()=>{try{p.scrollIntoView({block:"nearest"})}catch(e){}},60)}}
function showStop(stop,focus){if(focus!==undefined)stopFocus=focus;else if(stop!==curStop)stopFocus=null;curStop=stop;show("stop");const at=nowM();const svcs=servicesFor(stop);const secs0=stopFocus?svcs.filter(s2=>s2.route.id===stopFocus.r&&s2.dk===stopFocus.dk):svcs;const secs=secs0.length?secs0:svcs;const isFav=favs().includes(stop);const best=nextForStop(stop);const col=svcs.length?routeGreen(svcs[0].route.id):"#0b6e4f";
 $("#stopDetail").innerHTML=`<div class="card stopCard"><div class="stopHero" style="background:linear-gradient(140deg, ${col} 0%, ${shade(col.startsWith("#")?col:"#0b6e4f",0.55)} 100%)"><div class="stopPinRow"><span class="stopPin">${IC.pin}</span><span class="stopServed">${S().servedBy}: ${svcs.map(s=>rc(s.route.code)).filter((v,i,a)=>a.indexOf(v)===i).join(" • ")}</span></div><h2 class="stopName">${stopName(stop)}</h2>${best?`<div class="stopNextWrap"><div class="stopNextTime hasBig">${fmtBig(best.time)}</div><div class="stopNextInfo"><span class="stopNextIn">${inText(best.time)}</span><span class="stopNextMeta">${S().nextBusLabel} • ${rc(best.route.code)} • ${dirLabelL(best.dir.label)}</span></div></div>`:`<div class="stopNextWrap"><div class="stopNextInfo"><span class="stopNextIn">${S().doneToday}</span><span class="stopNextMeta">${S().stopDoneLine}</span></div></div>`}<div class="stopActions"><button class="hAct" id="fv"><span class="hIco">${isFav?IC.starf:IC.star}</span><span class="hLbl">${isFav?S().favOnS:S().favAddS}</span></button><button class="hAct" id="rm"><span class="hIco">${IC.alarm}</span><span class="hLbl">${S().remindS}</span></button><button class="hAct" id="lsn"><span class="hIco">${IC.sound}</span><span class="hLbl">${S().listenS}</span></button></div><button class="navBtn" id="nv">${S().navBtn}</button></div><div class="stopBody">${secs.map(s=>{const ds=deps(s.route,s.dk,s.idx);const nx=nextDep(s.route,s.dk,s.idx,at);const defK=nx!==null?ds.indexOf(nx):ds.length-1;return `<div class="svcSec"><h3><span class="chip" style="background:${routeGreen(s.route.id)}">${rc(s.route.code)}</span> ${dirLabelL(s.dir.label)}</h3><div class="timeStrip">${ds.map((t,k)=>`<button class="tChip${t<at?" past":""}${t===nx?" next":""}${k===defK?" sel":""}" data-k="${k}">${fmt(t)}</button>`).join("")}</div><div class="tripPanel">${tripTimeline(stop,s,defK)}</div><p class="mini tlHint">${S().tlHint}</p>${nx?`<p class="mini" style="margin-top:6px">${S().stopNextLine(fmt(nx),inText(nx))}</p>`:`<p class="mini" style="margin-top:6px">${S().stopDoneLine}</p>`}</div>`}).join("")}</div></div>`;
 $("#nv").onclick=()=>openNav(stop,best?best.route.id:null,best?best.dk:null);
 $("#fv").onclick=()=>{toggleFav(stop);renderNav(curNavState)};
 $("#lsn").onclick=()=>{const l=nextPerService(stop);if(l.length)speak(S().listenStop(stopName(stop),dirLabelL(l[0].dir.label),fmt(l[0].t),inText(l[0].t)),$("#lsn"));else speak(stopName(stop)+". "+stripH(S().stopDoneLine),$("#lsn"))};
 $("#rm").onclick=async()=>{const nx=nextForStop(stop);if(!nx){toast(S().remindNone);return}const delay=(nx.time-10-nowM())*60000;if(delay<=0){toast(S().remindSoon);return}if("Notification"in window)await Notification.requestPermission();const rbody=S().remindBody(stopName(stop),fmt(nx.time));const nativeOk=nativeAlarmSet("journey",Date.now()+delay,"🚌 RYK Bus",rbody);toast(S()[nativeOk?"remindSetApk":"remindSet"](fmt(nx.time-10)));setTimeout(()=>{nativeAlarmCancel("journey");if("Notification"in window&&Notification.permission==="granted")new Notification("🚌 RYK Bus",{body:rbody,icon:"icon-192.png"});else toast("🚌 "+rbody)},delay)};
 document.querySelectorAll("#stopDetail .svcSec").forEach((sec,si)=>{const s=secs[si];sec.querySelectorAll(".tChip").forEach(ch=>ch.onclick=()=>setTrip(sec,s,+ch.dataset.k,stop));const strip=sec.querySelector(".timeStrip");const tgt=strip?(strip.querySelector(".tChip.next")||strip.querySelector(".tChip:not(.past)")):null;if(tgt)setTimeout(()=>{try{const sr=strip.getBoundingClientRect(),tr=tgt.getBoundingClientRect();strip.scrollTo({left:strip.scrollLeft+tr.left+tr.width/2-(sr.left+sr.width/2)})}catch(e){}},90)})
 // v82 self-heal: on one 360px phone the stop card rendered full-bleed (x=0,
 // ignoring main's padding) while the rig is pixel-correct. If the card is
 // detected touching the left viewport edge at full width, nudge it into
 // place. No-op on correct renders (card at x=16).
 requestAnimationFrame(()=>{setTimeout(()=>{try{const card=document.querySelector("#stopDetail .stopCard");if(!card||card.dataset.v82f)return;const r=card.getBoundingClientRect();if(r.left<8&&r.right>window.innerWidth-8){card.style.marginLeft="16px";card.style.marginRight="16px";card.dataset.v82f="1"}}catch(e){}},120)})
 if(stopFocus&&secs.length<svcs.length){const sb=$("#stopDetail .stopBody");if(sb){const bb=document.createElement("button");bb.className="allDirBtn";bb.textContent=S().allDirBtn;bb.onclick=()=>goStop(stop,null);sb.appendChild(bb)}}}

// ---------- planner ----------
$("#planGo").onclick=()=>{const F=resolveStop($("#planFrom").value),T=resolveStop($("#planTo").value),box=$("#planResult");if(!ALL_STOPS.includes(F)||!ALL_STOPS.includes(T)){box.innerHTML=`<p class="err">${S().planChooseBoth}</p>`;return}if(F===T){box.innerHTML=`<p class="err">${S().goSameStop}</p>`;return}const ptv=$("#planTime").value;const at=ptv?t2m(ptv):nowM();
 if(ptv&&at<nowM()-5){box.innerHTML=`<p class="err">${S().planPast}</p>`;return}
 let pBest=null,pDone=null;
 for(const r of ROUTES)for(const dk of["up","down"]){const st=r.dirs[dk].stops,fi=st.findIndex(s=>s[0]===F),ti=st.findIndex(s=>s[0]===T);if(fi>=0&&ti>fi){if(!pDone)pDone={r,dk,st,fi};const depT=nextDep(r,dk,fi,at);if(depT===null)continue;const dur=t2m(st[ti][1])-t2m(st[fi][1]);if(!pBest||depT<pBest.depT)pBest={r,dk,depT,dur,fi}}}
 if(pBest){const{r,dk,depT,dur,fi}=pBest;box.innerHTML=`<div class="nextItem"><div><span class="chip" style="background:${routeGreen(r.id)}">${rc(r.code)}</span> <b>${dirLabelL(r.dirs[dk].label)}</b><div class="meta">${S().planMeta(stopName(F),fmt(depT),stopName(T),fmt(depT+dur),dur)}</div></div><div class="count">${fmt(depT)}<small>${inText(depT)}</small></div></div><p class="mini">${S().planDirectNote}</p>${(()=>{const alts=deps(r,dk,fi).filter(t2=>t2>=at).slice(0,3);return alts.length>1?`<p class="mini" style="margin-top:8px">${S().planAltLbl}</p><div class="altDeps">${alts.map(t2=>`<button class="altDep${t2===depT?" on":""}" data-t="${t2}">${fmt(t2)}</button>`).join("")}</div>`:""})()}<button class="favBtn" id="jStart">${S().journeyBtn}</button>`;wireJourney(depT+dur,T);box.querySelectorAll(".altDep").forEach(b=>b.onclick=()=>{$("#planTime").value=m2hm(+b.dataset.t);$("#planGo").click()});return}
 if(pDone){const{r,dk,st,fi}=pDone;box.innerHTML=`<div class="nextItem"><div><span class="chip" style="background:${routeGreen(r.id)}">${rc(r.code)}</span> <b>${dirLabelL(r.dirs[dk].label)}</b><div class="meta">${ptv?S().planNoneAfter(fmt(at)):S().planDoneToday(fmt(t2m(st[fi][1])))}</div></div></div>`;return}
 const fr=servicesFor(F),tr=servicesFor(T);let done=false;
 outer:for(const a of fr)for(const b of tr){if(a.route.id===b.route.id)continue;const common=a.dir.stops.map(s=>s[0]).find(n=>b.dir.stops.some(s=>s[0]===n)&&n!==F&&n!==T);if(common){const ai=a.dir.stops.findIndex(s=>s[0]===F),ci=a.dir.stops.findIndex(s=>s[0]===common);if(ci<=ai)continue;const bi=b.dir.stops.findIndex(s=>s[0]===common),ti=b.dir.stops.findIndex(s=>s[0]===T);if(ti<=bi)continue;const d1=nextDep(a.route,a.dk,ai,at);if(d1===null)continue;const arrC=d1+(t2m(a.dir.stops[ci][1])-t2m(a.dir.stops[ai][1]));const d2=nextDep(b.route,b.dk,bi,arrC+3);if(d2===null)continue;const arrT=d2+(t2m(b.dir.stops[ti][1])-t2m(b.dir.stops[bi][1]));box.innerHTML=`<p style="margin-top:10px"><b>${S().planTransferH(stopName(common))}</b></p><div class="nextItem"><div><span class="chip" style="background:${routeGreen(a.route.id)}">${rc(a.route.code)}</span> <b>${dirLabelL(a.dir.label)}</b><div class="meta">${stopName(F)} ${fmt(d1)} → ${stopName(common)} ${fmt(arrC)}</div></div></div><div class="nextItem"><div><span class="chip" style="background:${routeGreen(b.route.id)}">${rc(b.route.code)}</span> <b>${dirLabelL(b.dir.label)}</b><div class="meta">${stopName(common)} ${fmt(d2)} → ${stopName(T)} ${fmt(arrT)}</div></div></div><p class="mini">${S().planTotal(arrT-d1)}</p><button class="favBtn" id="jStart">${S().journeyBtn}</button>`;wireJourney(arrT,T);done=true;break outer}}
 if(!done)box.innerHTML=`<p class="err">${S().planNoRoute}</p>`};

function m2hm(t){return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0")}
$("#planNow").onclick=()=>{$("#planTime").value="";if($("#planFrom").value.trim()&&$("#planTo").value.trim())$("#planGo").click()};

// ---------- utarne ka alarm (journey mode) ----------
let journey=null;
function wireJourney(arrMin,dest){const b=$("#jStart");if(!b)return;b.onclick=async()=>{if(arrMin-3<=nowM()){toast(S().jTooClose);return}if("Notification"in window)await Notification.requestPermission();journey={arr:arrMin,dest,fired:false};$("#journeyBar").hidden=false;const nativeOk=nativeAlarmSet("jgetoff",Date.now()+Math.max(60000,(arrMin-3-nowM())*60000),S().jAlarmTitle,S().jAlarmBody(stopName(dest)));toast(S()[nativeOk?"jStartedApk":"jStarted"](dest));tickJourney()}}
function tickJourney(){const bar=$("#journeyBar");if(!journey){bar.hidden=true;return}const left=journey.arr-nowM();if(left<=3&&!journey.fired){journey.fired=true;nativeAlarmCancel("jgetoff");if("Notification"in window&&Notification.permission==="granted")new Notification(S().jAlarmTitle,{body:S().jAlarmBody(stopName(journey.dest)),icon:"icon-192.png"});beep();toast("🚌 "+S().jToast(stopName(journey.dest)))}if(left<=-2){journey=null;bar.hidden=true;return}bar.innerHTML=`${IC.bus} → <b>${stopName(journey.dest)}</b> • ${S().jBarEst}: ${fmt(journey.arr)} (${left>0?S().jRemain(left):S().jArriving}) <button id="jStop">${S().jEnd}</button>`;const js=$("#jStop");if(js)js.onclick=()=>{journey=null;bar.hidden=true;nativeAlarmCancel("jgetoff");toast(S().jEnded)}}

// ---------- awami reports ----------
const reports=()=>{try{const a=JSON.parse(localStorage.getItem("ryk-reports")||"[]");return Array.isArray(a)?a:[]}catch(e){return[]}};
function saveReport(r){const a=reports();a.unshift(r);localStorage.setItem("ryk-reports",JSON.stringify(a.slice(0,100)))}
let repRouteSel="",repTypeSel="late",repDirSel="",repAutoStop="",repGeoTried=false,repNoteSel=[];
function buildGuide(){const el=$("#guideSteps");if(!el)return;el.innerHTML=S().g_steps.map((x,i)=>`<div class="gstep"><span class="gnum">${i+1}</span><p>${x}</p></div>`).join("")}
function buildRepSelects(){const rp=$("#repRoutePick"),tp=$("#repTypePick");if(!rp||!tp)return;
 rp.innerHTML=`<button data-v="" class="${repRouteSel===""?"on":""}">${S().repRouteAll}</button>`+ROUTES.map(r=>`<button data-v="${r.id}" class="${repRouteSel===r.id?"on":""}">${rc(r.code)} — ${stopName(r.name.split("→")[1].trim())}</button>`).join("");
 tp.innerHTML=Object.entries(S().repTypes).map(([k2,v])=>`<button data-v="${k2}" class="${repTypeSel===k2?"on":""}">${v}</button>`).join("");
 rp.querySelectorAll("button").forEach(b=>b.onclick=()=>{repRouteSel=b.dataset.v;repDirSel="";buildRepSelects()});
 const dp=$("#repDirPick");if(dp){if(repRouteSel){const rr=ROUTES.find(x=>x.id===repRouteSel);dp.innerHTML=["up","down"].map(dk=>`<button data-v="${dk}" class="${repDirSel===dk?"on":""}">${dirLabelL(rr.dirs[dk].label)}</button>`).join("");dp.querySelectorAll("button").forEach(b=>b.onclick=()=>{repDirSel=b.dataset.v;buildRepSelects()})}else dp.innerHTML=""}
 tryAutoRepStop();
 tp.querySelectorAll("button").forEach(b=>b.onclick=()=>{repTypeSel=b.dataset.v;buildRepSelects()});
 const dl=$("#repDirLbl");if(dl)dl.style.display=repRouteSel?"":"none";if(dp)dp.style.display=repRouteSel?"":"none";
 const np=$("#repNotePick");if(np){const notes=S().repNotes||[];np.innerHTML=notes.map(n=>`<button data-v="${escH(n)}" class="${repNoteSel.includes(n)?"on":""}">${escH(n)}</button>`).join("");np.querySelectorAll("button").forEach(b=>b.onclick=()=>{const v=b.dataset.v;if(repNoteSel.includes(v))repNoteSel=repNoteSel.filter(x=>x!==v);else{if(repNoteSel.length>=2)repNoteSel.shift();repNoteSel.push(v)}buildRepSelects()})}}
function repRouteLabel(v){if(!v)return"";const r=ROUTES.find(x=>x.id===v);return r?rc(r.code)+" — "+stopName(r.name.split("→")[1].trim()):escH(v)}
function repTypeLabel(v){return S().repTypes[v]||escH(v)}
function repAutoCandidate(){if(!lastPos)return"";const la=lastPos[0],lo=lastPos[1];let pool=ALL_STOPS;if(repRouteSel){const r=ROUTES.find(x=>x.id===repRouteSel);if(r){const set=new Set();for(const dk of["up","down"])for(const st of r.dirs[dk].stops)set.add(st[0]);pool=ALL_STOPS.filter(n=>set.has(n))}}let best="",bd=1e12;for(const n of pool){const dd=stopDist(la,lo,n);if(dd===null)continue;if(dd<bd){bd=dd;best=n}}return best}
function tryAutoRepStop(){const inp=$("#repStop");if(!inp)return;if(inp.value.trim()&&inp.value.trim()!==repAutoStop)return;if(!lastPos){if(!repGeoTried){repGeoTried=true;if(localStorage.getItem("ryk-near-auto")==="1"){try{locate(false)}catch(e){}}else if(navigator.permissions&&navigator.permissions.query){navigator.permissions.query({name:"geolocation"}).then(r=>{if(r.state==="granted"&&!lastPos)try{locate(false)}catch(e){}}).catch(()=>{})}setTimeout(tryAutoRepStop,1800)}if(!lastPos)return}const cand=repAutoCandidate();if(cand){repAutoStop=stopName(cand);inp.value=repAutoStop}}
function repMetaLabel(r){const parts=[];if(r.route)parts.push(repRouteLabel(r.route));if(r.dir&&r.route){const rt=ROUTES.find(x=>x.id===r.route);if(rt&&rt.dirs[r.dir])parts.push(dirLabelL(rt.dirs[r.dir].label))}if(r.stop)parts.push(IC.pin+" "+stopName(r.stop));return parts.join(" • ")}
const REP_API="https://api.rykbus.dpdns.org";
function repIid(){try{return localStorage.getItem("ryk-dbg-id")||""}catch(e){return""}}
function repQueue(){try{const a=JSON.parse(localStorage.getItem("ryk-rep-queue")||"[]");return Array.isArray(a)?a:[]}catch(e){return[]}}
function repSynced(){try{const a=JSON.parse(localStorage.getItem("ryk-rep-synced")||"[]");return Array.isArray(a)?a:[]}catch(e){return[]}}
function markSynced(ts){try{const a=repSynced();if(!a.includes(ts)){a.push(ts);localStorage.setItem("ryk-rep-synced",JSON.stringify(a.slice(-120)))}}catch(e){}}
function reconcileReports(){try{const srvTs=new Set(repSrv.map(r=>r.ts));const today=new Date().toDateString();const synced=new Set(repSynced());const qEmpty=repQueue().length===0;let changed=false;const kept=reports().filter(r=>{if(new Date(r.ts).toDateString()!==today)return true;if(srvTs.has(r.ts)){if(!synced.has(r.ts))markSynced(r.ts);return true}if((synced.has(r.ts)||qEmpty)&&!repInFlight.has(r.ts)){changed=true;return false}return true});if(changed)localStorage.setItem("ryk-reports",JSON.stringify(kept))}catch(e){}}
function queueReport(r){try{const q=repQueue();q.push(r);localStorage.setItem("ryk-rep-queue",JSON.stringify(q.slice(-20)))}catch(e){}flushRepQueue()}
let repFlushing=false;const repInFlight=new Set();
async function postReport(r){try{const res=await fetch(REP_API+"/report.send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:r.type,route:r.route||"",dir:r.dir||"",stop:r.stop||"",note:r.note||"",ts:r.ts,iid:repIid()})});return res.ok}catch(e){return false}}
async function flushRepQueue(){if(repFlushing)return;repFlushing=true;try{const q=repQueue();while(q.length){repInFlight.add(q[0].ts);const ok=await postReport(q[0]);repInFlight.delete(q[0].ts);if(!ok)break;markSynced(q[0].ts);q.shift();try{localStorage.setItem("ryk-rep-queue",JSON.stringify(q))}catch(e){}}}catch(e){}repFlushing=false}
let repSrv=[],repSrvAt=0;
function fetchRepSrv(){const now=Date.now();if(now-repSrvAt<20000)return;repSrvAt=now;fetch(REP_API+"/reports.today").then(r=>r.json()).then(j=>{if(j&&j.ok&&Array.isArray(j.reports)){repSrv=j.reports;reconcileReports();if($("#view-reports")&&$("#view-reports").classList.contains("active"))renderReports()}}).catch(()=>{})}
window.addEventListener("online",flushRepQueue);setTimeout(flushRepQueue,5000);
function renderReports(){fetchRepSrv();const el=$("#repList");if(!el)return;const today=new Date().toDateString();const own=reports().filter(r=>new Date(r.ts).toDateString()===today);const ownKeys=new Set(own.map(r=>r.ts+"|"+r.type+"|"+(r.stop||"")));const srv=repSrv.filter(r=>new Date(r.ts).toDateString()===today&&!ownKeys.has(r.ts+"|"+r.type+"|"+(r.stop||"")));const list=own.map((r,i)=>({r,own:1,li:i})).concat(srv.map(r=>({r,own:0}))).sort((a,b)=>b.r.ts-a.r.ts);el.innerHTML=list.length?list.map((it,i)=>{const r=it.r;return`<div class="repItem"><div><b>${repTypeLabel(r.type)}</b>${(r.route||r.dir||r.stop)?`<span class="meta"> • ${repMetaLabel(r)}</span>`:""}${r.note?`<div class="meta">${escH(r.note)}</div>`:""}</div><div class="count"><small>${new Date(r.ts).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</small>${it.own?`<button class="favBtn" data-share="${it.li}">${S().shareBtn}</button>`:""}</div></div>`}).join(""):`<p class="mini">${S().repNone}</p>`;el.querySelectorAll("[data-share]").forEach(b=>b.onclick=()=>{const r=own[+b.dataset.share];const txt=stripH(S().repShare(repTypeLabel(r.type),repMetaLabel(r),r.note,new Date(r.ts).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})));if(navigator.share)navigator.share({text:txt}).catch(()=>{});else openExternalUrl("https://wa.me/?text="+encodeURIComponent(txt))})}
$("#repGo").onclick=async()=>{if(!navigator.onLine){toast(S().repNeedNet);return}const sv=resolveStop($("#repStop").value.trim());const r={ts:Date.now(),route:repRouteSel,dir:repDirSel,stop:ALL_STOPS.includes(sv)?sv:"",type:repTypeSel,note:repNoteSel.join(" • ")};saveReport(r);repNoteSel=[];buildRepSelects();renderReports();repInFlight.add(r.ts);const ok=await postReport(r);repInFlight.delete(r.ts);if(ok){markSynced(r.ts);toast("✅ "+S().repSaved)}else{try{const q=repQueue();q.push(r);localStorage.setItem("ryk-rep-queue",JSON.stringify(q.slice(-20)))}catch(e){}toast(S().repNeedNet)}};

// ---------- APK mode (v1.3): UA suffix + native bridge ----------
// MainActivity WebSettings me "... RYKBusApp/1.3" jorta hai.
const IS_APK = typeof navigator!=="undefined" && navigator.userAgent.indexOf("RYKBusApp")>=0;
const APP_SHARE_TEXT = "🚌 RYK Bus — Rahim Yar Khan Electric Bus: timings, routes & next-bus countdown, bilkul free! https://rykbus.dpdns.org/?v=2 Download the app (APK): https://rykbus.dpdns.org/rykbus.apk";
function renderSettingsMode(){
  // v1.5 (QA-07): Settings Version row footer se derive — single source of truth.
  const sv=$("#setVer"),vf=document.querySelector(".verFoot");
  if(sv&&vf){const m=vf.textContent.match(/v\d+(\.\d+)?/);if(m)sv.textContent=m[0]}
  const si=$("#setInstall"),ss=$("#setShare"),su=$("#setCheckUpdate");
  // v1.4: hidden attribute ke sath inline display bhi (setRow ka author
  // display:flex UA rule ko override karta tha — is liye row nazar ati rahi).
  if(si){si.hidden=IS_APK;si.style.display=IS_APK?"none":"";}   // APK me "Download App" chhupao (pehle se installed hai)
  if(ss){ss.hidden=false;ss.style.display="";}                 // Share App: dono modes me
  if(su){su.hidden=!IS_APK;su.style.display=!IS_APK?"none":"";} // Check for Updates: sirf APK me
  syncDlBar();                                                  // v60: slim download bar — web-only, dismissible
}
function shareApp(){
  if(IS_APK&&window.RYKBridge){try{RYKBridge.shareApp();return}catch(e){}}
  if(navigator.share)navigator.share({text:APP_SHARE_TEXT}).catch(()=>{});
  else openExternalUrl("https://wa.me/?text="+encodeURIComponent(APP_SHARE_TEXT));
}
function checkUpdateManual(){
  if(IS_APK&&window.RYKBridge){try{RYKBridge.checkUpdate()}catch(e){}}
}

// ---------- v1.7: honesty disclaimer (ticker + popup) ----------
// Ticker: fixed trilingual order — UR, ROM, EN — har user ke liye same.
const DISC_TK=[
 {d:"rtl",t:"نوٹ کریں: یہ ایپ لائیو ٹریکنگ نہیں دیتی۔ تمام اوقات سرکاری ٹائم ٹیبل کے مطابق ہیں — بس لیٹ بھی ہو سکتی ہے۔"},
 {d:"ltr",t:"Note karein: Ye app live tracking nahi deti. Saari timings official timetable par mabni hain — bus late bhi ho sakti hai."},
 {d:"ltr",t:"Please note: This app does NOT provide live tracking. All timings are based on the official timetable — buses may be late or delayed."}
];
// v3.1: the admin panel can override the ticker via ticker.json (server-side,
// fetched fresh each launch). Built-in DISC_TK stays the fallback whenever the
// file is missing, empty, or the device is offline.
let TK_ITEMS=DISC_TK;
let tkIdx=0,tkTimer=null;
function tickNext(){
  const el=$("#tkTxt");if(!el)return;
  const s=TK_ITEMS[tkIdx%TK_ITEMS.length];tkIdx++;
  el.textContent=s.t;el.setAttribute("dir",s.d);
  const dur=Math.max(11,Math.round(s.t.length*0.17));
  el.style.animation="none";
  // PSI forced-reflow fix: animation dobara rAF par lagao — offsetWidth wala sync layout nahi.
  requestAnimationFrame(()=>{el.style.animation=(s.d==="rtl"?"tkScrollR ":"tkScroll ")+dur+"s linear 1";});
  clearTimeout(tkTimer);tkTimer=setTimeout(tickNext,dur*1000+400);
}
function showDisclaimer(){
  const d=S(),pop=$("#discPop");if(!pop)return;
  $("#discT").textContent=d.discT;
  const b=$("#discB");b.textContent=d.discB;b.setAttribute("dir",LANG==="ur"?"rtl":"ltr");
  $("#discOk").textContent=d.discOk;
  pop.hidden=false;
  $("#discOk").onclick=()=>{pop.hidden=true;dbg("disc","ok");messageDecision();};
}

// ---------- server message popup (v2.1) ----------
// Fetches the current message from the server (fresh every launch, never
// cached — sw.js deliberately does NOT intercept message.json). Shown once
// per message id; never stacks over the disclaimer, the first-run language
// picker, or the APK's native update popup (which owns its launch).
async function msgUpdateDue(){
  // The native update dialog takes over the launch when a newer versionName
  // is on the server; the message waits for the next launch. (Web has no
  // update popup — the download bar is not a dialog.)
  if(!IS_APK)return false;
  try{
    const r=await fetchTO("https://rykbus.dpdns.org/version.json?t="+Date.now(),2500);
    if(!r.ok)return false;
    const v=await r.json(),m=/RYKBusApp\/([\d.]+)/.exec(navigator.userAgent||"");
    if(!m||!v.versionName)return false;
    const cmp=(a,b)=>{a=String(a).split(".").map(Number);b=String(b).split(".").map(Number);
      for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d}return 0};
    return cmp(v.versionName,m[1])>0;
  }catch(e){return false}
}
// v2.4: the message is FETCHED during the splash (its completion is a sync-gate
// signal); the popup decision still happens after the disclaimer, keeping the
// existing rules: update popup owns the launch (msgUpdateDue) + once per id.
// v1.0.3: launch diagnostics — paigham chain ke steps aik batch me server
// par (gumnam trace), taake "popup nahi aya" ka saboot mile, andaza nahi.
const DBG=[];
function dbg(k,v){try{DBG.push({t:Math.round(performance.now()),k:k,v:String(v==null?"":v).slice(0,80)})}catch(e){}}
function dbgSend(){
  try{
    if(!DBG.length)return;
    let id="";try{id=localStorage.getItem("ryk-dbg-id")||"";if(!id){id=Math.random().toString(16).slice(2,10);localStorage.setItem("ryk-dbg-id",id)}}catch(e){}
    const ev=DBG.splice(0,DBG.length);
    fetch("https://api.rykbus.dpdns.org/trace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({d:id,ev:ev}),keepalive:true}).catch(()=>{});
  }catch(e){}
}
// v1.0.2: har fetch waqt-band (timeout) — latka hua radio popup ko launch
// bhar ke liye qaid nahi kar sakta.
function fetchTO(url,ms){
  const c=new AbortController();const t=setTimeout(()=>{try{c.abort()}catch(e){}},ms);
  return fetch(url,{cache:"no-store",signal:c.signal}).finally(()=>clearTimeout(t));
}
async function fetchMessageEarly(){
  // v1.0.1: RETRY + PERSIST. On a cold start with a weak signal the first
  // fetch can fail outright — the old code then skipped the paigham for that
  // whole launch (owner saw it appear only after 2-3 opens). Now: up to 3
  // attempts, and every successful fetch is stored, so messageDecision can
  // fall back to the stored copy — a fetched paigham is never lost.
  for(let a=0;a<3;a++){
    // v1.0.4: pehli koshish seedha API se (KV copy — send ke chand second me
    // taza; Pages wali file publish hone me ~1 minute leti hai, yahi asal
    // "late show" ki wajah thi). API fail ho to Pages wali copy par fallback.
    const url=a===0?"https://api.rykbus.dpdns.org/msg":"https://rykbus.dpdns.org/message.json?t="+Date.now();
    try{
      const r=await fetchTO(url,6000);
      if(r.ok){
        const m=await r.json();
        if(m&&m.id){dbg("f"+a,(a===0?"api":"web")+" ok id="+m.id);try{localStorage.setItem("ryk-msg-store",JSON.stringify(m))}catch(e){} return m;}
        dbg("f"+a,(a===0?"api":"web")+" empty");return null; // server says: no message — that IS the answer
      }
      dbg("f"+a,"http "+r.status);
    }catch(e){dbg("f"+a,"err "+((e&&e.name)||"x"))} // network fail — retry neeche
    if(a<2)await new Promise(res=>setTimeout(res,900*(a+1)));
  }
  return null;
}
// v3.1: fetch the admin-set announcement (ticker.json). Fixed order UR -> ROM
// -> EN, same as the built-in ticker; empty languages are skipped; if nothing
// usable arrives the built-in honesty ticker keeps running untouched.
async function fetchTicker(){
  for(let a=0;a<2;a++){ // cold-start par pehli koshish fail ho to aik retry
    try{
      const r=await fetch("https://rykbus.dpdns.org/ticker.json?t="+Date.now(),{cache:"no-store"});
      if(!r.ok)return;
      const j=await r.json();if(!j)return;
      const items=[];
      if(j.ur)items.push({d:"rtl",t:String(j.ur)});
      if(j.rom)items.push({d:"ltr",t:String(j.rom)});
      if(j.en)items.push({d:"ltr",t:String(j.en)});
      if(!items.length)return;
      TK_ITEMS=items;tkIdx=0;clearTimeout(tkTimer);tickNext();
      return;
    }catch(e){ if(a<1)await new Promise(res=>setTimeout(res,1200)); }
  } // offline ya fetch fail — built-in ticker chalta rahega
}
let msgDecisionAt=0;
async function presentMessage(m){
  let seen=0;try{seen=parseInt(localStorage.getItem("ryk-msg-seen")||"0",10)||0}catch(e){}
  if(m.id<=seen){dbg("pres","skip-seen id="+m.id+" seen="+seen);return;}
  if(await msgUpdateDue()){dbg("pres","skip-upd id="+m.id);return;}  // update popup owns this launch
  showServerMessage(m);
}
async function messageDecision(){
  msgDecisionAt=Date.now();
  const freshP=pendingMessageP||Promise.resolve(null);
  // v1.0.2: fresh fetch ka intezaar HADD 3 second — us se zyada der lage to
  // stored copy se faisla karo; latki hui fetch popup ko launch na kha jaye
  // (owner: latest build par bhi 5 opens lagay — wajah yehi latki hui chain thi).
  let m=await Promise.race([freshP,new Promise(r=>setTimeout(()=>r(null),3000))]);
  dbg("dec","fresh="+(m?m.id:"null"));
  if(!m){ // fresh waqt par nahi aya — pichli launch ki stored copy (agar nayi ho)
    try{m=JSON.parse(localStorage.getItem("ryk-msg-store")||"null")}catch(e){m=null}
    if(m&&!m.id)m=null;
    dbg("dec","stored="+(m?m.id:"null"));
  }
  if(m)await presentMessage(m);
  dbgSend();
  // Late arrival: background fetch jab bhi aye (launch window ke andar),
  // agar wo wala paigham abhi tak nahi dikha to usi waqt dikha do.
  freshP.then(async m2=>{
    if(!m2||(m&&m2.id===m.id))return;
    dbg("late","id="+m2.id);
    if(Date.now()-msgDecisionAt>25000){dbg("late","expired");dbgSend();return;}
    const mp=$("#msgPop"),dp=$("#discPop");
    if((mp&&!mp.hidden)||(dp&&!dp.hidden)){dbg("late","blocked-popup");dbgSend();return;}
    await presentMessage(m2);
    dbgSend();
  }).catch(()=>{});
}
// ---------- splash sync gate (v2.4) ----------
// The branded splash (#splash in index.html) stays until BOTH the minimum
// brand time has passed AND the launch checks have settled — or the hard cap
// hits, so a slow/dead network NEVER traps the user. APK waits for the native
// DataUpdater + UpdateChecker signals and the message fetch; the plain web
// waits for the message fetch only (its bundled data is current by
// construction). Offline: the cap still exits at the minimum brand time.
let splashRevealed=false,pendingMessageP=null;
function onSplashRevealed(){
  // APK: release the held native update check — its dialog (if due) shows now,
  // over the home screen, never over a web popup. First launch: wait for the
  // language pick first, so the user chooses before anything else appears.
  if(IS_APK&&window.RYKBridge){
    const rel=()=>{try{RYKBridge.splashDone()}catch(e){}};
    const lp=$("#langPick");
    if(lp&&!lp.hidden){const w=setInterval(()=>{const l2=$("#langPick");if(!l2||l2.hidden){clearInterval(w);rel();}},300);}
    else rel();
  }
  discSeq(); // the cold-open disclaimer/message sequence starts only after reveal
}
function discSeq(){
  const lp=$("#langPick");
  if(lp&&!lp.hidden){setTimeout(discSeq,500);return;}
  // v1.7: popup har cold open par (language chooser ke baad — kabhi us ke upar nahi).
  setTimeout(()=>{const p=$("#discPop");if(p)showDisclaimer();else messageDecision();},700);
}
(function splashGate(){
  const el=$("#splash");
  if(!el){splashRevealed=true;onSplashRevealed();return;}
  const tx=$("#splStatusTx"),T=window.__splT||["Checking timings…","Looking for updates…","Getting ready…"];
  let i=0;if(tx)tx.style.transition="opacity .18s ease";
  const cyc=setInterval(()=>{i=(i+1)%T.length;if(!tx)return;tx.style.opacity="0";
    setTimeout(()=>{tx.textContent=T[i];tx.style.opacity="1";},180);},850);
  // v2.6: the crossing IS the brand time — MIN 3.2s for BOTH APK and web (the
  // bus drives left->right over 3.2s, so reveal lands right as it arrives).
  // Web cap 3.5s -> 5s for coherence; a dead network still exits at the cap.
  const MIN=3200,CAP=5000;
  let t0=Date.now();
  window.__splGateT0=t0; // testability hook: rigs measure true gate time from here
  try{if(IS_APK&&window.RYKBridge&&typeof RYKBridge.elapsedSinceBootMs==="function"){
    const msAgo=RYKBridge.elapsedSinceBootMs();if(msAgo>=0)t0=Date.now()-msAgo;
  }}catch(e){}
  const st={msg:false,data:!IS_APK,update:!IS_APK};
  try{dbg("launch",((navigator.userAgent||"").match(/RYKBusApp\/[\d.]+/)||["web"])[0]+" seen="+(localStorage.getItem("ryk-msg-seen")||"0"));}catch(e){}
  // native -> JS fast path (a signal may fire before the page is ready)
  window.rykNativeSettled=w=>{if(w==="data")st.data=true;else if(w==="update")st.update=true;};
  pendingMessageP=fetchMessageEarly().then(m=>{st.msg=true;return m;},()=>{st.msg=true;return null;});
  const tick=setInterval(()=>{
    // polling backup: never misses a signal that fired before the page was ready
    try{if(IS_APK&&window.RYKBridge){
      if(!st.data&&typeof RYKBridge.isDataSettled==="function"&&RYKBridge.isDataSettled())st.data=true;
      if(!st.update&&typeof RYKBridge.isUpdateSettled==="function"&&RYKBridge.isUpdateSettled())st.update=true;
    }}catch(e){}
    const el2=Date.now()-t0;
    if(splashRevealed||!((el2>=MIN&&st.msg&&st.data&&st.update)||el2>=CAP))return;
    clearInterval(tick);clearInterval(cyc);splashRevealed=true;
    dbg("gate","reveal "+el2+"ms msg="+st.msg);
    // v2.5: one-layer exit ≤250ms — nothing lingers over the home screen
    el.classList.add("spl-out");setTimeout(()=>{try{el.remove()}catch(e){}},240);
    onSplashRevealed();
  },150);
})();
function showServerMessage(m){
  const pop=$("#msgPop");if(!pop||!pop.hidden){dbg("show","blocked");return;}
  const pick=o=>(o&&o[LANG])||(o&&o.en)||"";
  $("#msgT").textContent=pick(m.title);
  const b=$("#msgB");b.textContent=pick(m.body);
  b.setAttribute("dir",LANG==="ur"?"rtl":"ltr");
  const ok=$("#msgOk");ok.textContent=pick(m.button)||"OK";
  ok.onclick=()=>{try{localStorage.setItem("ryk-msg-seen",String(m.id))}catch(e){}pop.hidden=true;dbg("show","ok-tap id="+m.id);dbgSend();};
  pop.hidden=false;
  dbg("show","SHOWN id="+m.id);
}

// ---------- install + offline + init ----------
// v1.7: "Download App" — seedha APK download; PWA install prompt par inhisar nahi.
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;});
const dlApk=()=>{try{if(window.gtag){gtag('event','apk_download',{method:'website'});setTimeout(()=>{location.href="/rykbus.apk";},150);return;}}catch(e){}location.href="/rykbus.apk";};
// v60: slim download bar — web-only (not APK, not installed PWA), dismissible
function syncDlBar(){const b=$("#dlBar");if(!b)return;
  let off=false;try{off=localStorage.getItem("ryk-dlbar-off")==="1"}catch(e){}
  const standalone=(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
  const hide=IS_APK||standalone||off;
  b.hidden=hide;b.style.display=hide?"none":"";}
const dlBarBtn=$("#dlBarBtn");if(dlBarBtn)dlBarBtn.onclick=dlApk;
const dlBarX=$("#dlBarX");if(dlBarX)dlBarX.onclick=()=>{try{localStorage.setItem("ryk-dlbar-off","1")}catch(e){}const b=$("#dlBar");if(b){b.hidden=true;b.style.display="none"}};
const setInst=$("#setInstall");if(setInst)setInst.onclick=dlApk;
const setShr=$("#setShare");if(setShr)setShr.onclick=shareApp;
const setUpd=$("#setCheckUpdate");if(setUpd)setUpd.onclick=checkUpdateManual;
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
const LANGS=["en","ur","rom"],LANG_TX={en:"English",ur:"اردو",rom:"Roman Urdu"};
const PILL_TX={en:"EN",ur:"اردو",rom:"ROM"}; // v60: compact header pill label
function syncLangPill(){const el=$("#langPillTx");if(el)el.textContent=PILL_TX[LANG]||"EN"}
const lpB=$("#langPill");if(lpB)lpB.onclick=()=>{LANG=LANGS[(LANGS.indexOf(LANG)+1)%LANGS.length];try{localStorage.setItem("ryk-lang",LANG)}catch(e){}applyLang();syncLangPill();toast(LANG_TX[LANG])};
applyLang();
syncLangPill();
renderHome();
renderSettingsMode();
try{history.replaceState({v:"home"},"")}catch(e){};curNavState={v:"home"};
autoNear();
// v1.7: ticker har screen par.
// v2.4: the cold-open disclaimer/message sequence now starts from the splash
// gate (onSplashRevealed) — never mid-use, never stacked over the splash.
tickNext();
fetchTicker();
setInterval(()=>{renderFavs();tickJourney();if(lastNear)renderNear(lastNear);if($("#view-reports").classList.contains("active"))renderReports()},30000);
