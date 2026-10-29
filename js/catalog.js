/* ================= catalog ================= */
const ARW={left:'M70 50H22m0 0l20-20M22 50l20 20',right:'M30 50h48m0 0L58 30m20 20L58 70',up:'M50 78V22m0 0L30 42m20-20l20 20',down:'M50 22v56m0 0L30 58m20 20l20-20'};
const ACOL={left:'#00E0FF',right:'#FF2BD6',up:'#3DF59A',down:'#FFE14D'};
const arrowSVG=(d,c,cls='arrow')=>`<svg class="${cls}" viewBox="0 0 100 100" aria-label="${d}"><path d="${ARW[d]}" stroke="${c}" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CAT={
 field:{name:'קוד המגרש',area:'field',ico:'display',m:G('#FF7A1A','#FFE14D'),desc:'המסך זורק צבע, חץ או מספר. אתה עונה עם הכדור.',field:true},
 juggle:{name:'מלך ההקפצות',area:'field',ico:'ball',m:G('#3DF59A','#00E0FF'),desc:'כמה הקפצות רצופות בלי נפילה? מחזיקים את הכדור באוויר ומודדים את השיא.',cam:true,pose:'juggle',
   tagline:'מתרחקים, נכנסים למסגרת, ובצפצוף מקפיצים. בלי לגעת במסך.',lvNames:{beginner:'30 שנ\'',plus:'דקה',pro:'ללא הגבלה'},
   levels:{beginner:{sec:30,lbl:''},plus:{sec:60,lbl:''},pro:{sec:null,lbl:''}},
   how:['מעמידים את הטלפון על חצובה או נשענים לקיר, מסך אליך.','מתרחקים 2 עד 3 צעדים ונכנסים למסגרת עם כל הגוף. המצלמה מראה את הגוף והכדור.','נשארים באזור קטן, וכשנשמע הצפצוף מתחילים להקפיץ. סופרים בראש הקפצות רצופות בלי נפילה, ובסוף מכניסים את המספר.']},
 reaction:{name:'רפלקס מנצח',area:'speed',ico:'bolt',m:G('#FF7A1A','#FF2BD6'),desc:'כתום על המסך? אצבע למטה. כמה מהר אתה באמת?',
   tagline:'מבחן התגובה הקלאסי. אתה מול השעון.',
   levels:{beginner:{n:10,lbl:'10 ניסיונות'},plus:{n:20,lbl:'20 ניסיונות'},pro:{n:30,lbl:'30 · הערכה'}},
   how:['מחכים. כשהמסך הופך לכתום, נוגעים בכל מקום.','נגיעה לפני הכתום לא נספרת.','3 ניסיונות ראשונים הם חימום.'],run:runReaction},
 choice:{name:'חץ והחלטה',area:'decision',ico:'arrows',m:G('#00E0FF','#AA44FF'),desc:'חץ קופץ, אתה בוחר כיוון. בלי לחשוב פעמיים.',
   tagline:'העיניים רואות, האצבע מחליטה.',
   levels:{beginner:{opts:2,n:20,win:4000,lbl:'חץ כל 4 שנ\''},plus:{opts:4,n:30,win:3000,lbl:'חץ כל 3 שנ\''},pro:{opts:4,n:30,win:2000,flank:true,lbl:'חץ כל 2 שנ\''}},
   how:['במרכז מופיע חץ.','לוחצים על הכפתור עם אותו כיוון. הכפתורים לא זזים.','מהירות ודיוק נספרים יחד.'],run:runChoice},
 colortask:{name:'ספרינט הצבעים',area:'speed',ico:'grid',m:G('#FF2BD6','#FFE14D'),desc:'צבע על המסך, ספרינט לקונוס, יד למצלמה. השעון רץ.',cam:true,
   tagline:'ריצה, החלטה ועצירה בלי לגעת במסך.',
   levels:{beginner:{n:6,lbl:'6 סבבים'},plus:{n:10,lbl:'10 סבבים'},pro:{n:14,lbl:'14 סבבים'}},
   how:['מניחים 4 קונוסים: תכלת, ורוד, ירוק, צהוב. הטלפון על חצובה.','מופיע צבע. רצים לקונוס בצבע הזה וחוזרים.','מקרבים את היד למצלמה, והשעון נעצר לבד.'],run:runColorTask},
 strobe:{name:'עיניים של כוכב',area:'speed',ico:'spark',m:G('#FFE14D','#AA44FF'),desc:'הבזקים בכל הצבעים. רק על ירוק מנופפים.',cam:true,
   tagline:'כמו רונאלדו באימון: עיניים חדות, יד מהירה.',
   levels:{beginner:{n:8,flash:600,lbl:'הבזק 0.6s'},plus:{n:10,flash:400,lbl:'0.4s'},pro:{n:12,flash:250,lbl:'0.25s'}},
   how:['עומדים מול הטלפון במרחק של מטר בערך.','צבעים מהבהבים. מופיע ירוק? מרימים יד ומנופפים.','נפנוף על צבע אחר נחשב מוקדם מדי.'],run:runStrobe},
 tracking:{name:'עין הנץ',area:'attention',ico:'target',m:G('#AA44FF','#00E0FF'),desc:'עיניים על הוורודים. הם זזים, אתה לא מאבד אותם.',
   tagline:'כמו לעקוב אחרי 3 שחקנים בבת אחת.',
   levels:{beginner:{k:2,n:6,dur:6,spd:.12,lbl:'2 מתוך 6'},plus:{k:3,n:8,dur:8,spd:.18,lbl:'3 מתוך 8'},pro:{k:4,n:8,dur:10,spd:.24,lbl:'4 מתוך 8'}},
   how:['כמה כדורים נצבעים בוורוד לשתי שניות.','הצבע נעלם וכולם זזים. עוקבים בעיניים.','כשהם עוצרים, בוחרים את הוורודים ולוחצים אישור.'],run:runTracking},
 gonogo:{name:'מתג ההחלטה',area:'decision',ico:'stop',m:G('#3DF59A','#FF4D6D'),desc:'ירוק זה כן. אדום זה לא. השליטה אצלך.',
   tagline:'לדעת מתי לא לזוז זה חצי מהמשחק.',
   levels:{beginner:{n:40,win:1200,lbl:'40 · 1.2s'},plus:{n:60,win:900,lbl:'60 · 0.9s'},pro:{n:80,win:700,lbl:'80 · 0.7s'}},
   how:['עיגול ירוק: נוגעים מהר.','איקס אדום: לא נוגעים בכלל.','רוב הזמן יופיע ירוק, אז האדום יתפוס אותך לא מוכן.'],run:runGoNoGo},
 scenarios:{name:'החלטה בלחץ',area:'decision',ico:'pitch',m:G('#3DF59A','#00E0FF'),desc:'רגע אמיתי מהמגרש. מה ההחלטה הכי חכמה?',
   tagline:'קוראים את המשחק לפני שהוא קורה.',
   levels:{beginner:{n:8,t:15,lbl:'15 שנ\' לתשובה'},plus:{n:8,t:10,lbl:'10 שנ\''},pro:{n:8,t:6,lbl:'6 שנ\''}},
   how:['אתה בלבן, חברים בתכלת, יריבים בוורוד.','קוראים את המצב ובוחרים החלטה.','אחרי כל תשובה יש הסבר קצר.'],run:runScenarios},
 warmup:{name:'רגע לפני שריקה',area:'decision',ico:'flame',m:G('#FFE14D','#FF2BD6'),desc:'5 החלטות מהירות. עולים למגרש חדים.',
   tagline:'3 דקות בחדר ההלבשה, והראש כבר במשחק.',
   levels:{beginner:{n:5,t:10,lbl:'10 שנ\''},plus:{n:5,t:7,lbl:'7 שנ\''},pro:{n:5,t:5,lbl:'5 שנ\''}},
   how:['חמישה מצבי משחק מהירים.','בוחרים לפני שהזמן נגמר.','מושלם לפני שריקת הפתיחה.'],run:runScenarios},
 sweeper:{name:'מצא את השונה',area:'attention',ico:'scan',m:G('#00E0FF','#3DF59A'),desc:'אחד מהם לא שייך. תמצא אותו לפני כולם.',
   tagline:'סריקה מהירה של כל המגרש.',
   levels:{beginner:{sec:60,start:1,lbl:'דקה'},plus:{sec:120,start:3,lbl:'2 דקות'},pro:{sec:180,start:5,lbl:'3 דקות'}},
   how:['הרבה כדורים זזים. אחד מהם בצבע או בגודל אחר.','נוגעים בשונה: +10. טעות: -5.','כל 3 הצלחות הרמה עולה.'],run:runSweeper},
 periph:{name:'רדאר מגרש',area:'attention',ico:'eye',m:G('#AA44FF','#FF7A1A'),desc:'עיניים למרכז, הראש קולט הכל מסביב.',
   tagline:'לראות את החבר הפנוי בלי להזיז את הראש.',
   levels:{beginner:{n:16,flash:300,lbl:'הבזק 0.3s'},plus:{n:20,flash:180,lbl:'0.18s'},pro:{n:24,flash:100,lbl:'0.1s'}},
   how:['מסתכלים רק על הנקודה הלבנה במרכז.','עיגול מהבהב לרגע באחד הכיוונים.','לוחצים איפה שהוא הופיע.'],run:runPeriph},
 feetcall:{name:'החלף וקרא',area:'field',ico:'feet',m:G('#FFE14D','#00E0FF'),desc:'מעבירים את הכדור מצד לצד, כמעט בלי להסתכל עליו, וצועקים את הצבע או המספר שעל המסך.',cam:true,pose:'feet',
   tagline:'הרגליים עובדות, הראש קורא, הפה צועק.',lvNames:{beginner:'30 שנ\'',plus:'דקה',pro:'ללא הגבלה'},
   levels:{beginner:{sec:30,call:2500,lbl:''},plus:{sec:60,call:1800,lbl:''},pro:{sec:null,call:1200,lbl:''}},
   how:['טלפון על חצובה, מסך אליך. כל הגוף והכדור בתוך התמונה.','מעבירים את הכדור מרגל לרגל במקום, כמעט בלי להסתכל עליו.','צבע או מספר קופצים בפס העליון: צועקים אותם בקול. כל העברה נספרת, והסכום מופיע בסוף.']},
 header:{name:'נגיחות',area:'field',ico:'ball',m:G('#FF2BD6','#FFE14D'),desc:'כדורים קופצים למעלה. קופצים, מנגחים ומפוצצים.',cam:true,pose:'header',
   tagline:'הולכים אחורה, קופצים ומנגחים. בלי לגעת במסך.',lvNames:{beginner:'30 שנ\'',s45:'45 שנ\'',plus:'דקה',m2:'2 דקות',pro:'ללא הגבלה'},
   levels:{beginner:{sec:30,lbl:''},s45:{sec:45,lbl:''},plus:{sec:60,lbl:''},m2:{sec:120,lbl:''},pro:{sec:null,lbl:''}},
   how:['טלפון על חצובה, מסך אליך. הולכים 2 עד 3 צעדים אחורה, כך שהשליש העליון של המסך נשאר ריק.','כדורים מופיעים למעלה, פעם גבוה ופעם נמוך. קופצים ומנגחים בראש כדי לפוצץ אותם, בזהירות.','כל פיצוץ נשמע ונספר באמצע המסך. הסכום נשמר בסוף.']},
 breath:{name:'מיקוד בנשימה',area:'focus',ico:'wind',m:G('#00E0FF','#AA44FF'),desc:'דקה של שקט לפני הסערה. נושמים ונכנסים לפוקוס.',
   tagline:'לב רגוע, ראש צלול.',lvNames:{beginner:'דקה',plus:'2 דקות',pro:'3 דקות'},
   levels:{beginner:{min:1,lbl:''},plus:{min:2,lbl:''},pro:{min:3,lbl:''}},
   how:['יושבים או עומדים בנוח.','שואפים כשהעיגול גדל, עוצרים, ונושפים כשהוא קטן.','4 שניות שאיפה, 2 עצירה, 6 נשיפה.'],run:runBreath},
};
CAT.juggle.run=runPose;CAT.feetcall.run=runPose;CAT.header.run=runHeader;
const DEFAULT_ORDER=['field','juggle','reaction','choice','colortask','strobe','tracking','gonogo','scenarios','warmup','sweeper','periph','feetcall','header','breath'];
function catCfg(){const c=S.get('catalog3',null)||{order:DEFAULT_ORDER,hidden:[]};const o=c.order.filter(id=>CAT[id]);DEFAULT_ORDER.forEach(id=>{if(!o.includes(id))o.push(id)});return{order:o,hidden:c.hidden||[]}}
const visible=()=>{const c=catCfg();return c.order.filter(id=>!c.hidden.includes(id))};

/* ================= demos (first screen of every exercise) ================= */
const balls=(arr)=>`<div class="dm-balls">${arr.map(([x,y,t,dx,dy])=>`<b class="${t?'t':''}" style="left:${x}%;top:${y}%;--dx:${dx}px;--dy:${dy}px"></b>`).join('')}</div>`;
const miniPitch='<svg viewBox="0 0 300 192" style="width:86%;direction:ltr"><rect width="300" height="192" rx="18" fill="#0f2a1e"/><g fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"><rect x="6" y="6" width="288" height="180" rx="10"/><line x1="150" y1="6" x2="150" y2="186"/></g><circle cx="210" cy="60" r="10" fill="#fff"/><circle cx="260" cy="110" r="8" fill="#00E0FF"/><circle cx="235" cy="80" r="8" fill="#FF2BD6"/><path d="M215 66L255 104" stroke="#3DF59A" stroke-width="4" stroke-dasharray="8 6"/></svg>';
const HAND=(cls='',st='')=>`<span class="dm-hand ${cls}" style="${st}">${I('hand')}</span>`;
const RIP=(st='')=>`<span class="rip" style="${st}"></span>`;
const CONE=c=>`<svg viewBox="0 0 24 24" style="position:absolute;left:12%;bottom:16%;width:46px;height:46px"><path d="M12 3l6.5 16h-13z" fill="${c}"/><path d="M3 20.5h18" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>`;
const DEMOS={
 reaction:[['#121118','<span class="dm-t">המתן...</span>','מחכים בסבלנות',1300],['#FF7A1A','<span class="dm-dot"></span>'+RIP('left:58%;top:58%'),'כתום? נוגעים!',1000],['#121118','<span class="dm-ms">247 ms</span>','זה הזמן שלך',1300]],
 choice:[['#111017',arrowSVG('left',ACOL.left,'')+'<div class="dm-btns"><i class="on">←</i><i>→</i></div>','חץ שמאלה? כפתור שמאל',1500],['#111017',arrowSVG('right',ACOL.right,'')+'<div class="dm-btns"><i>←</i><i class="on">→</i></div>','חץ ימינה? כפתור ימין',1500]],
 gonogo:[['#111017','<svg viewBox="0 0 100 100" style="width:34%"><circle cx="50" cy="50" r="46" fill="#3DF59A"/></svg>'+RIP(),'ירוק = נוגעים',1300],['#111017','<svg viewBox="0 0 100 100" style="width:34%"><path d="M18 18L82 82M82 18L18 82" stroke="#FF4D6D" stroke-width="16" stroke-linecap="round"/></svg>','אדום = לא זזים',1300]],
 scenarios:[['#111017',miniPitch,'קוראים את המצב',1500],['#111017','<div style="display:grid;gap:8px;width:80%"><div class="opt" style="min-height:40px">מכדררים לבד</div><div class="opt ok" style="min-height:40px">מוסרים לחבר הפנוי</div></div>','בוחרים את ההחלטה הכי חכמה',1600]],
 tracking:[['#111017',balls([[10,20,1,0,0],[60,10,0,0,0],[30,60,1,0,0],[80,55,0,0,0],[50,40,0,0,0],[15,75,0,0,0]]),'זוכרים את הוורודים',1500],['#111017',balls([[10,20,0,90,40],[60,10,0,-70,60],[30,60,0,80,-50],[80,55,0,-90,-30],[50,40,0,40,50],[15,75,0,60,-60]]),'כולם זזים, אתה עוקב',2400],['#111017',balls([[40,35,1,0,0],[85,45,0,0,0],[60,20,1,0,0],[20,50,0,0,0],[70,75,0,0,0],[35,80,0,0,0]]).replace(/class="t"/g,'class="t" style="background:#3DF59A"'),'בוחרים אותם בסוף',1400]],
 sweeper:[['#111017',balls([[10,20,0,0,0],[35,15,0,0,0],[60,25,0,0,0],[85,20,0,0,0],[20,60,0,0,0],[45,55,0,0,0],[70,65,1,0,0],[90,70,0,0,0]]).replace('class="t"','class="t" style="background:#FFE14D;transform:scale(1.35)"'),'מי פה לא שייך?',1600],['#111017','<span class="dm-check">✓ +10</span>','מצאת. הרמה עולה',1200]],
 periph:[['#111017','<span style="width:16px;height:16px;border-radius:50%;background:#fff"></span>','עיניים על הנקודה',1200],['#111017','<span style="width:16px;height:16px;border-radius:50%;background:#fff"></span><span style="position:absolute;right:10%;top:16%;width:40px;height:40px;border-radius:50%;background:#FF2BD6"></span>','משהו הבהב בצד...',600],['#111017','<span style="width:16px;height:16px;border-radius:50%;background:#fff"></span><span style="position:absolute;right:10%;top:16%;width:44px;height:44px;border-radius:50%;border:3px solid #3DF59A"></span>'+RIP('right:9%;top:13%'),'לוחצים איפה שזה היה',1400]],
 colortask:[['#3DF59A','<span class="dm-big">ירוק</span>','מופיע צבע',1200],['#111017',CONE('#3DF59A')+'<div class="runL" style="position:absolute;right:16%;bottom:6%;height:80%">'+SKEL()+'</div>','ספרינט לקונוס הירוק וחזרה',1700],['#111017','<span class="lens"></span>'+HAND('','top:18%')+'<span class="dm-count">4.82</span>','יד קרובה למצלמה. השעון עוצר',1700]],
 strobe:[['#FF2BD6','','פלאש...',500],['#000','','',300],['#00E0FF','','עוד פלאש... לא זזים',500],['#000','','',300],['#3DF59A',HAND('waving'),'ירוק? מרימים יד ומנופפים',1600]],
 juggle:[['#111017','<span class="dm-frame"></span><div style="position:absolute;bottom:4%;height:84%;display:grid;place-items:end center">'+SKEL()+'</div>','נכנסים למסגרת עם כל הגוף',1700],['#111017','<div style="position:absolute;bottom:4%;height:84%;width:40%;display:grid;place-items:end center">'+SKEL('kick')+BALL('bounce','left:58%;bottom:34%')+'</div>','מקפיצים בלי נפילה, וסופרים בראש',2200]],
 feetcall:[['#111017','<div style="position:absolute;bottom:4%;height:80%;width:40%;display:grid;place-items:end center">'+SKEL()+BALL('slideX','left:38%;bottom:2%')+'</div><span style="position:absolute;top:8%;padding:0 22px;border-radius:30px;background:#FF2BD6;font:800 44px Outfit;color:#fff">7</span>','רגל לרגל, וצועקים: "שבע!"',1700],['#111017','<div style="position:absolute;bottom:4%;height:80%;width:40%;display:grid;place-items:end center">'+SKEL()+BALL('slideX','left:38%;bottom:2%')+'</div><span style="position:absolute;top:8%;width:90px;height:52px;border-radius:30px;background:#00E0FF"></span>','צבע? צועקים: "תכלת!"',1700]],
 header:[['#111017','<span class="dm-frame"></span><div class="dm-third"></div><div style="position:absolute;bottom:4%;height:62%;display:grid;place-items:end center">'+SKEL()+'</div>','הולכים אחורה. השליש העליון נשאר ריק',1900],['#111017','<span class="dm-hb" style="left:30%;top:10%"></span><span class="dm-hb" style="left:62%;top:20%;animation-delay:.4s"></span><div style="position:absolute;bottom:4%;height:62%;display:grid;place-items:end center"><div class="hjump">'+SKEL()+'</div></div>','כדורים למעלה. קופצים ומנגחים',2000],['#111017','<span class="dm-boom" style="left:40%;top:14%"></span><span class="dm-count" style="left:50%;transform:translateX(-50%);top:34%;font-size:56px">5</span>','בום! כל פיצוץ נספר',1500]],
 breath:[['#111017','<span class="breath" style="width:42%;transform:scale(1);transition:transform 1.2s"></span>','שאיפה...',1400],['#111017','<span class="breath" style="width:42%;transform:scale(.55)"></span>','נשיפה ארוכה...',1600]],
};
DEMOS.warmup=DEMOS.scenarios;
let demoTimer=null;
function playDemo(box,cap,frames){clearTimeout(demoTimer);let i=0;const step=()=>{const [bg,html,c,ms]=frames[i%frames.length];box.style.background=bg;box.innerHTML='<span class="badge">הדגמה</span><div class="dm">'+html+'</div>';cap.textContent=c;i++;demoTimer=setTimeout(step,ms)};step()}

/* ================= voice-over scripts (about 10 seconds each) ================= */
const VO={
 field:'מקמו את הטלפון או הטאבלט על חצובה. החליטו מראש על פעולה לכל צבע, מספר או חץ, או צעקו אותם תוך כדי התרגיל.',
 juggle:'שימו את הטלפון על חצובה, והתרחקו עד שכל הגוף נכנס למסגרת. הישארו באזור קטן, ובצפצוף התחילו להקפיץ כדי לשבור שיא. ספרו בראש הקפצות רצופות בלי נפילה, ובסוף הכניסו את המספר.',
 reaction:'חכו שהמסך יהפוך לכתום, ואז געו בו הכי מהר שאפשר. נגיעה לפני הכתום לא נספרת.',
 choice:'במרכז המסך יופיע חץ. לחצו על הכפתור באותו כיוון, הכי מהר ובלי טעויות.',
 colortask:'שימו ארבעה קונוסים בצבעים. כשמופיע צבע, רוצו לקונוס, תחזרו, וקרבו את היד למצלמה כדי לעצור את השעון.',
 strobe:'עמדו מול הטלפון. צבעים יהבהבו. רק כשמופיע ירוק, הרימו את היד ונופפו מול המצלמה.',
 tracking:'זכרו את הכדורים הוורודים. כשכולם זזים, עקבו אחריהם בעיניים, ובסוף בחרו אותם.',
 gonogo:'עיגול ירוק? געו במסך מהר. איקס אדום? אל תיגעו בכלל.',
 scenarios:'תראו מצב מהמגרש, קראו את השאלה, ובחרו את ההחלטה הכי חכמה לפני שהזמן נגמר.',
 warmup:'חמש החלטות מהירות לפני המשחק. קראו את המצב ובחרו מהר.',
 sweeper:'הרבה כדורים זזים, ואחד מהם שונה בצבע או בגודל. מצאו אותו וגעו בו.',
 periph:'הסתכלו רק על הנקודה במרכז. עיגול יהבהב בצד. לחצו איפה שהוא הופיע, הכי מהר שאפשר.',
 feetcall:'מעבירים את הכדור מצד לצד, כמעט בלי להסתכל עליו. כשקופץ צבע או מספר על המסך, אומרים אותו בקול רם.',
 header:'לכו שניים עד שלושה צעדים אחורה, כך שהשליש העליון של המסך נשאר ריק. כדורים יופיעו למעלה. קפצו ונגחו בזהירות כדי לפוצץ אותם.',
 breath:'שבו בנוח. שאפו כשהעיגול גדל, עצרו, ונשפו לאט כשהוא קטן.',
};
