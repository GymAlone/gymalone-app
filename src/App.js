import { useState, useEffect } from 'react';
import { supabase } from './supabase';

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const EQUIPMENT_LIST = `
Kardio: Běžecký pás, Rotoped Bikeerg C2, Veslovací trenažér C2
Síla: Posilovací klec, Horní kladka, Spodní kladka, 10 adaptérů na kladku, Legpress,
  Jednoruční činky 1–32.5kg, Kettlebell 4–32kg, Polohovací lavice, Bumper kotouče 230kg,
  Olympijská osa (dámská & pánská), Trap bar, EZ osa, Plyobox
Doplňky: TRX, BOSU, Odporové gumy, Gymnastic míč, Bradla na dipy, Švihadlo, Yoga mat
`;

const STEPS = [
  { id: 'sex',   title: 'Jsem',       sub: 'Vyber pohlaví' },
  { id: 'age',   title: 'Věk',        sub: 'Kolik ti je let?' },
  { id: 'goal',  title: 'Cíl',        sub: 'Co chceš dosáhnout?' },
  { id: 'level', title: 'Zkušenosti', sub: 'Jak dlouho cvičíš?' },
  { id: 'days',  title: 'Frekvence',  sub: 'Kolikrát týdně?' },
  { id: 'limit', title: 'Omezení',    sub: 'Máš nějaká omezení?' },
];

const OPTIONS = {
  sex:   [{ v:'muž', l:'Muž', e:'♂' }, { v:'žena', l:'Žena', e:'♀' }, { v:'jiné', l:'Jiné', e:'✦' }],
  goal:  [
    { v:'hubnout', l:'Zhubnout',        e:'🔥' }, { v:'nabrat',  l:'Nabrat svaly',   e:'💪' },
    { v:'kondice', l:'Lepší kondice',   e:'⚡' }, { v:'síla',    l:'Maximální síla',  e:'🏋️' },
    { v:'zdraví',  l:'Zdraví & pohoda', e:'🌿' }, { v:'sport',   l:'Sportovní výkon', e:'🏅' },
  ],
  level: [
    { v:'začátečník', l:'Začátečník',        e:'🌱', s:'0–6 měsíců' },
    { v:'středně',    l:'Středně pokročilý', e:'📈', s:'6 měs – 2 roky' },
    { v:'pokročilý',  l:'Pokročilý',         e:'🔱', s:'2+ roky' },
  ],
  days:  [{ v:'2', l:'2×' }, { v:'3', l:'3×' }, { v:'4', l:'4×' }, { v:'5', l:'5×' }],
  limit: [
    { v:'žádné',       l:'Žádná omezení',     e:'✓' },
    { v:'záda',        l:'Problémy se zády',  e:'🔴' },
    { v:'kolena',      l:'Problémy s koleny', e:'🔴' },
    { v:'ramena',      l:'Problémy s rameny', e:'🔴' },
    { v:'těhotenství', l:'Těhotenství',       e:'🤰' },
  ],
};

const LOAD_MSGS = [
  'Analyzuji tvůj profil…',
  'Vybírám optimální cviky…',
  'Přizpůsobuji intenzitu…',
  'Skládám týdenní strukturu…',
  'Finalizuji plán…',
];

// ── AI PLAN GENERATION ───────────────────────────────────────────────────────
async function generatePlan(profile) {
  const prompt = `Jsi osobní trenér v privátní posilovně GymAlone v Brně.
Na základě profilu člena vytvoř personalizovaný tréninkový plán.

PROFIL ČLENA:
- Pohlaví: ${profile.sex}
- Věk: ${profile.age} let
- Cíl: ${profile.goal}
- Zkušenosti: ${profile.level}
- Frekvence: ${profile.days}× týdně
- Omezení: ${profile.limit}

DOSTUPNÉ VYBAVENÍ V GYMALONE:
${EQUIPMENT_LIST}

Vytvoř přesně ${profile.days} tréninkové jednotky pro jeden týden.
Každý trénink musí využívat POUZE výše uvedené vybavení.
Přizpůsob intenzitu, objem a výběr cviků profilu člena.
Pokud má omezení, vyhni se cviků, které by je zhoršily.

Odpověz POUZE validním JSON (bez markdown, bez textu navíc):
{
  "planName": "Název plánu",
  "planDesc": "Krátký popis 1-2 věty proč tento plán",
  "weeklyStructure": "Např. Push/Pull/Legs nebo Full Body 3x",
  "workouts": [
    {
      "day": "Pondělí",
      "title": "Název tréninku",
      "focus": "Zaměření",
      "duration": "45 min",
      "warmup": "Krátký popis rozcvičky",
      "exercises": [
        {
          "name": "Název cviku",
          "equipment": "Konkrétní vybavení z gymu",
          "sets": "4",
          "reps": "8",
          "rest": "90s",
          "tip": "Technická poznámka"
        }
      ]
    }
  ]
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content.map(b => b.text || '').join('');
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// ── SHARED UI ────────────────────────────────────────────────────────────────
function Input({ label, type = 'text', value, onChange, placeholder, icon }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#161616', border: `1px solid ${focused ? '#fff' : '#252525'}`,
        borderRadius: 12, padding: '0 14px', transition: 'border-color .2s',
      }}>
        {icon && <span style={{ color: '#444', fontSize: 16, flexShrink: 0 }}>{icon}</span>}
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontSize: 14, padding: '14px 0',
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
      </div>
    </div>
  );
}

function VideoPlaceholder({ name, equipment }) {
  return (
    <div style={{
      width: '100%', aspectRatio: '16/9', background: '#0d0d0d',
      borderRadius: 12, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', border: '1px solid #1e1e1e',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(45deg,#161616 0,#161616 1px,transparent 0,transparent 50%)',
        backgroundSize: '14px 14px', opacity: .5,
      }} />
      <div style={{
        width: 50, height: 50, borderRadius: '50%', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1, marginBottom: 8, boxShadow: '0 0 0 8px rgba(255,255,255,.07)',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M8 5v14l11-7z" /></svg>
      </div>
      <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, zIndex: 1 }}>{name}</span>
      <span style={{ color: '#444', fontSize: 10, zIndex: 1, marginTop: 3 }}>{equipment}</span>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // phases: splash | auth | onboard | generating | plan | workout
  const [phase, setPhase]         = useState('splash');
  const [splashDone, setSplashDone] = useState(false);
  const [authMode, setAuthMode]   = useState('login');
  const [session, setSession]     = useState(null);

  // auth
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [fullName, setFullName]   = useState('');
  const [authErr, setAuthErr]     = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // onboarding
  const [step, setStep]           = useState(0);
  const [profile, setProfile]     = useState({ sex:'', age:'', goal:'', level:'', days:'3', limit:'žádné' });

  // plan
  const [plan, setPlan]           = useState(null);
  const [loadMsg, setLoadMsg]     = useState(0);
  const [genErr, setGenErr]       = useState('');

  // workout detail
  const [activeDay, setActiveDay] = useState(0);
  const [activeEx, setActiveEx]   = useState(0);

  // ── INIT: check existing session ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  // ── SPLASH timer ──
  useEffect(() => {
    if (phase !== 'splash') return;
    const t = setTimeout(() => setSplashDone(true), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  // ── If logged in, skip to plan or onboard ──
  useEffect(() => {
    if (!session) return;
    loadProfile();
  // eslint-disable-next-line
  }, [session]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (data?.plan) {
      setProfile({
        sex: data.sex, age: data.age, goal: data.goal,
        level: data.level, days: data.days, limit: data.limitation,
      });
      setPlan(data.plan);
      setPhase('plan');
    } else {
      setPhase('onboard');
    }
  };

  // ── AUTH ──
  const handleLogin = async () => {
    if (!email || !password) { setAuthErr('Vyplň prosím všechna pole.'); return; }
    setAuthLoading(true); setAuthErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) setAuthErr('Nesprávný email nebo heslo.');
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password) { setAuthErr('Vyplň prosím všechna pole.'); return; }
    if (password.length < 6) { setAuthErr('Heslo musí mít alespoň 6 znaků.'); return; }
    setAuthLoading(true); setAuthErr('');
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    setAuthLoading(false);
    if (error) setAuthErr(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null); setPlan(null); setStep(0);
    setProfile({ sex:'', age:'', goal:'', level:'', days:'3', limit:'žádné' });
    setPhase('splash'); setSplashDone(false);
  };

  // ── ONBOARDING ──
  const pick = (field, val) => {
    setProfile(p => ({ ...p, [field]: val }));
    if (field !== 'age') setTimeout(() => nextStep(), 220);
  };

  const nextStep = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleGenerate();
  };

  // ── GENERATE PLAN ──
  const handleGenerate = async () => {
    setPhase('generating'); setGenErr('');
    let idx = 0;
    const iv = setInterval(() => { idx = (idx + 1) % LOAD_MSGS.length; setLoadMsg(idx); }, 1800);
    try {
      const result = await generatePlan(profile);
      clearInterval(iv);

      // Save to Supabase
      await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || '',
        sex: profile.sex, age: profile.age, goal: profile.goal,
        level: profile.level, days: profile.days, limitation: profile.limit,
        plan: result,
      });

      setPlan(result);
      setPhase('plan');
    } catch (e) {
      clearInterval(iv);
      setGenErr('Nepodařilo se vygenerovat plán. Zkus to znovu.');
      setPhase('onboard'); setStep(STEPS.length - 1);
    }
  };

  const progress = (step / STEPS.length) * 100;
  const currentStep = STEPS[step];
  const userName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || '';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: '#060606',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      padding: '32px 16px', fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes logoReveal{0%{opacity:0;letter-spacing:12px}100%{opacity:1;letter-spacing:4px}}
        @keyframes tagReveal{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .32s ease both}
        .opt{transition:all .18s;cursor:pointer;border:none}
        .opt:hover{border-color:#555!important;background:#1c1c1c!important}
        .opt.sel{background:#fff!important;border-color:#fff!important}
        .card{transition:border-color .18s,transform .15s;cursor:pointer}
        .card:hover{border-color:#444!important;transform:translateY(-1px)}
        .ex-row{transition:background .15s;cursor:pointer}
        .ex-row:hover{background:#1c1c1c!important}
        .btn-p{transition:opacity .15s,transform .1s;cursor:pointer}
        .btn-p:hover{opacity:.9}
        .btn-p:active{transform:scale(.98)}
        .lnk{transition:color .15s;cursor:pointer;background:transparent;border:none}
        .lnk:hover{color:#fff!important}
        input::placeholder{color:#333}
      `}</style>

      <div style={{
        width: 390, minHeight: 844, background: '#111', borderRadius: 44,
        overflow: 'hidden',
        boxShadow: '0 0 0 1px #1e1e1e, 0 48px 96px rgba(0,0,0,.9)',
        display: 'flex', flexDirection: 'column', position: 'relative',
      }}>

        {/* STATUS BAR */}
        <div style={{
          height: 46, background: '#0a0a0a', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px',
        }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>9:41</span>
          <span style={{ fontFamily: "'Barlow Condensed'", fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: 3 }}>GYMALONE</span>
          <div style={{ width: 18, height: 10, border: '1.5px solid #fff', borderRadius: 2, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 1, top: 1, bottom: 1, right: 5, background: '#fff', borderRadius: 1 }} />
          </div>
        </div>

        {/* ══ SPLASH ══════════════════════════════════════════════════════════ */}
        {phase === 'splash' && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#0a0a0a', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'linear-gradient(#1a1a1a 1px,transparent 1px),linear-gradient(90deg,#1a1a1a 1px,transparent 1px)',
              backgroundSize: '32px 32px', opacity: .4,
            }} />
            <div style={{
              position: 'absolute', width: 300, height: 300, borderRadius: '50%',
              background: 'radial-gradient(circle,rgba(255,255,255,.06) 0%,transparent 70%)',
              top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            }} />
            <div style={{
              fontFamily: "'Barlow Condensed'", fontSize: 56, fontWeight: 900,
              color: '#fff', letterSpacing: 4, zIndex: 1,
              animation: 'logoReveal 1.4s cubic-bezier(.16,1,.3,1) both',
            }}>GYMALONE</div>
            <div style={{
              color: '#444', fontSize: 11, letterSpacing: 5, textTransform: 'uppercase',
              zIndex: 1, marginTop: 8,
              animation: 'tagReveal .8s ease .9s both',
            }}>Privátní posilovna · Brno</div>

            {splashDone && (
              <div className="fade-up" style={{
                position: 'absolute', bottom: 60, width: '100%',
                padding: '0 28px', display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <button className="btn-p" onClick={() => { setAuthMode('login'); setPhase('auth'); }} style={{
                  background: '#fff', color: '#0a0a0a', border: 'none', borderRadius: 14,
                  padding: '15px', fontWeight: 700, fontSize: 14,
                  textTransform: 'uppercase', letterSpacing: 1.5, width: '100%',
                }}>Přihlásit se</button>
                <button className="btn-p" onClick={() => { setAuthMode('register'); setPhase('auth'); }} style={{
                  background: 'transparent', color: '#666', border: '1px solid #252525',
                  borderRadius: 14, padding: '15px', fontWeight: 600, fontSize: 14,
                  textTransform: 'uppercase', letterSpacing: 1.5, width: '100%',
                }}>Vytvořit účet</button>
              </div>
            )}
          </div>
        )}

        {/* ══ AUTH ════════════════════════════════════════════════════════════ */}
        {phase === 'auth' && (
          <div className="fade-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 24px 36px' }}>
            <button onClick={() => setPhase('splash')} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, width: 'fit-content',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
              <span style={{ color: '#555', fontSize: 12 }}>Zpět</span>
            </button>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: 2, lineHeight: 1 }}>
                {authMode === 'login' ? 'VÍTEJ ZPĚT' : 'NOVÝ ÚČET'}
              </div>
              <div style={{ color: '#444', fontSize: 12, marginTop: 6 }}>
                {authMode === 'login' ? 'Přihlas se ke svému tréninkovému profilu' : 'Začni svoji fitness cestu v GymAlone'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
              {authMode === 'register' && (
                <Input label="Jméno" value={fullName} onChange={setFullName} placeholder="Jan Novák" icon="👤" />
              )}
              <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="jan@email.cz" icon="✉️" />
              <Input label="Heslo" type="password" value={password} onChange={setPassword} placeholder="••••••••" icon="🔒" />

              {authErr && (
                <div style={{ background: '#1a0a0a', border: '1px solid #3a1515', borderRadius: 10, padding: '10px 14px' }}>
                  <span style={{ color: '#e05252', fontSize: 12 }}>⚠️ {authErr}</span>
                </div>
              )}

              <button className="btn-p"
                onClick={authMode === 'login' ? handleLogin : handleRegister}
                disabled={authLoading}
                style={{
                  background: '#fff', color: '#0a0a0a', border: 'none', borderRadius: 14,
                  padding: '16px', fontWeight: 700, fontSize: 14,
                  textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 'auto',
                  opacity: authLoading ? .6 : 1,
                }}>
                {authLoading ? 'Načítám…' : authMode === 'login' ? 'Přihlásit se →' : 'Vytvořit účet →'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <span style={{ color: '#444', fontSize: 12 }}>
                  {authMode === 'login' ? 'Ještě nemáš účet? ' : 'Už máš účet? '}
                </span>
                <button className="lnk" onClick={() => { setAuthMode(m => m === 'login' ? 'register' : 'login'); setAuthErr(''); }} style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>
                  {authMode === 'login' ? 'Zaregistruj se' : 'Přihlas se'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ ONBOARDING ══════════════════════════════════════════════════════ */}
        {phase === 'onboard' && (
          <div className="fade-up" key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 22px 36px' }}>
            {step === 0 && (
              <div style={{ marginBottom: 14, color: '#555', fontSize: 13 }}>
                Vítej, <span style={{ color: '#fff', fontWeight: 600 }}>{userName}</span> 👋 Nastavme tvůj plán.
              </div>
            )}

            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                {step > 0
                  ? <button onClick={() => setStep(s => s - 1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                  : <div />}
                <span style={{ color: '#444', fontSize: 11, letterSpacing: 1 }}>{step + 1} / {STEPS.length}</span>
              </div>
              <div style={{ height: 3, background: '#1e1e1e', borderRadius: 2 }}>
                <div style={{ height: '100%', borderRadius: 2, background: '#fff', width: `${progress}%`, transition: 'width .4s ease' }} />
              </div>
            </div>

            <div style={{ marginBottom: 26 }}>
              <div style={{ color: '#444', fontSize: 10, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 5 }}>{currentStep.sub}</div>
              <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: 2, lineHeight: 1 }}>
                {currentStep.title.toUpperCase()}
              </div>
            </div>

            {/* SEX */}
            {currentStep.id === 'sex' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {OPTIONS.sex.map(o => (
                  <button key={o.v} className={`opt${profile.sex === o.v ? ' sel' : ''}`} onClick={() => pick('sex', o.v)} style={{
                    background: profile.sex === o.v ? '#fff' : '#161616', border: `1px solid ${profile.sex === o.v ? '#fff' : '#252525'}`,
                    borderRadius: 16, padding: '22px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 28 }}>{o.e}</span>
                    <span style={{ color: profile.sex === o.v ? '#0a0a0a' : '#aaa', fontSize: 13, fontWeight: 600 }}>{o.l}</span>
                  </button>
                ))}
              </div>
            )}

            {/* AGE */}
            {currentStep.id === 'age' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#161616', border: '1px solid #252525', borderRadius: 20, padding: '26px 22px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 72, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{profile.age || '—'}</div>
                  <div style={{ color: '#444', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>let</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 7 }}>
                  {['18-24','25-29','30-34','35-39','40-44','45-49','50-54','55-59','60-64','65+'].map(r => (
                    <button key={r} className={`opt${profile.age === r ? ' sel' : ''}`} onClick={() => pick('age', r)} style={{
                      background: profile.age === r ? '#fff' : '#161616', border: `1px solid ${profile.age === r ? '#fff' : '#252525'}`,
                      borderRadius: 10, padding: '10px 4px', color: profile.age === r ? '#0a0a0a' : '#888',
                      fontSize: 11, fontWeight: 600, textAlign: 'center',
                    }}>{r}</button>
                  ))}
                </div>
                {profile.age && (
                  <button className="btn-p" onClick={nextStep} style={{
                    background: '#fff', color: '#0a0a0a', border: 'none', borderRadius: 14,
                    padding: '15px', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1,
                  }}>Pokračovat →</button>
                )}
              </div>
            )}

            {/* GOAL */}
            {currentStep.id === 'goal' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {OPTIONS.goal.map(o => (
                  <button key={o.v} className={`opt${profile.goal === o.v ? ' sel' : ''}`} onClick={() => pick('goal', o.v)} style={{
                    background: profile.goal === o.v ? '#fff' : '#161616', border: `1px solid ${profile.goal === o.v ? '#fff' : '#252525'}`,
                    borderRadius: 14, padding: '18px 14px', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 22 }}>{o.e}</span>
                    <span style={{ color: profile.goal === o.v ? '#0a0a0a' : '#bbb', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{o.l}</span>
                  </button>
                ))}
              </div>
            )}

            {/* LEVEL */}
            {currentStep.id === 'level' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {OPTIONS.level.map(o => (
                  <button key={o.v} className={`opt${profile.level === o.v ? ' sel' : ''}`} onClick={() => pick('level', o.v)} style={{
                    background: profile.level === o.v ? '#fff' : '#161616', border: `1px solid ${profile.level === o.v ? '#fff' : '#252525'}`,
                    borderRadius: 14, padding: '18px', display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <span style={{ fontSize: 26 }}>{o.e}</span>
                    <div>
                      <div style={{ color: profile.level === o.v ? '#0a0a0a' : '#fff', fontSize: 14, fontWeight: 600 }}>{o.l}</div>
                      <div style={{ color: profile.level === o.v ? '#666' : '#555', fontSize: 11, marginTop: 2 }}>{o.s}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* DAYS */}
            {currentStep.id === 'days' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                {OPTIONS.days.map(o => (
                  <button key={o.v} className={`opt${profile.days === o.v ? ' sel' : ''}`} onClick={() => pick('days', o.v)} style={{
                    background: profile.days === o.v ? '#fff' : '#161616', border: `1px solid ${profile.days === o.v ? '#fff' : '#252525'}`,
                    borderRadius: 14, padding: '22px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ fontFamily: "'Barlow Condensed'", fontSize: 34, fontWeight: 900, color: profile.days === o.v ? '#0a0a0a' : '#fff' }}>{o.l}</span>
                    <span style={{ color: profile.days === o.v ? '#666' : '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>týdně</span>
                  </button>
                ))}
              </div>
            )}

            {/* LIMIT */}
            {currentStep.id === 'limit' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {OPTIONS.limit.map(o => (
                  <button key={o.v} className={`opt${profile.limit === o.v ? ' sel' : ''}`} onClick={() => pick('limit', o.v)} style={{
                    background: profile.limit === o.v ? '#fff' : '#161616', border: `1px solid ${profile.limit === o.v ? '#fff' : '#252525'}`,
                    borderRadius: 14, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <span style={{ fontSize: 20 }}>{o.e}</span>
                    <span style={{ color: profile.limit === o.v ? '#0a0a0a' : '#bbb', fontSize: 14, fontWeight: 600 }}>{o.l}</span>
                  </button>
                ))}
                {profile.limit && (
                  <button className="btn-p" onClick={handleGenerate} style={{
                    background: '#fff', color: '#0a0a0a', border: 'none', borderRadius: 14,
                    padding: '16px', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4,
                  }}>Vytvořit můj plán →</button>
                )}
                {genErr && <div style={{ color: '#e05252', fontSize: 12, textAlign: 'center' }}>{genErr}</div>}
              </div>
            )}
          </div>
        )}

        {/* ══ GENERATING ══════════════════════════════════════════════════════ */}
        {phase === 'generating' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 28 }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', border: '2px solid #222', borderTop: '2px solid #fff', animation: 'spin 1s linear infinite' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: 2, marginBottom: 10 }}>VYTVÁŘÍM PLÁN</div>
              <div style={{ color: '#555', fontSize: 13, animation: 'pulse 1.8s ease infinite' }}>{LOAD_MSGS[loadMsg]}</div>
            </div>
            <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 16, padding: '16px 20px', width: '100%' }}>
              <div style={{ color: '#333', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>Tvůj profil</div>
              {[['Pohlaví', profile.sex], ['Věk', `${profile.age} let`], ['Cíl', profile.goal], ['Úroveň', profile.level], ['Frekvence', `${profile.days}× týdně`], ['Omezení', profile.limit]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ color: '#444', fontSize: 12 }}>{k}</span>
                  <span style={{ color: '#ccc', fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ PLAN ════════════════════════════════════════════════════════════ */}
        {phase === 'plan' && plan && (
          <div className="fade-up" style={{ flex: 1, overflowY: 'auto', paddingBottom: 30 }}>
            <div style={{ background: '#fff', margin: '18px 18px 0', borderRadius: 20, padding: '20px' }}>
              <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Tvůj personalizovaný plán</div>
              <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 26, fontWeight: 900, color: '#0a0a0a', letterSpacing: 1, lineHeight: 1.1, marginBottom: 8 }}>{plan.planName}</div>
              <div style={{ color: '#555', fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>{plan.planDesc}</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {[plan.weeklyStructure, `${profile.days}× týdně`, profile.level].map(t => (
                  <span key={t} style={{ background: '#0a0a0a', color: '#fff', fontSize: 9, padding: '3px 10px', borderRadius: 20, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>

            <div style={{ padding: '16px 18px 0' }}>
              <div style={{ color: '#444', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Týdenní plán</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {plan.workouts.map((w, i) => (
                  <div key={i} className="card" onClick={() => { setActiveDay(i); setActiveEx(0); setPhase('workout'); }} style={{
                    background: '#161616', border: '1px solid #222', borderRadius: 16, padding: '15px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ background: '#fff', color: '#0a0a0a', fontSize: 9, padding: '2px 9px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>{w.day}</span>
                        <span style={{ color: '#555', fontSize: 10 }}>{w.focus}</span>
                      </div>
                      <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{w.title}</div>
                      <div style={{ color: '#555', fontSize: 11 }}>{w.duration} · {w.exercises.length} cviků</div>
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '16px 18px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { setPhase('onboard'); setStep(0); setPlan(null); }} style={{
                background: 'transparent', border: '1px solid #272727', borderRadius: 14,
                padding: '13px', width: '100%', color: '#555', fontSize: 12, cursor: 'pointer',
                letterSpacing: 1, textTransform: 'uppercase',
              }}>← Upravit profil a vygenerovat znovu</button>
              <button onClick={handleLogout} style={{
                background: 'transparent', border: 'none',
                padding: '10px', width: '100%', color: '#333', fontSize: 11, cursor: 'pointer',
              }}>Odhlásit se</button>
            </div>
          </div>
        )}

        {/* ══ WORKOUT DETAIL ══════════════════════════════════════════════════ */}
        {phase === 'workout' && plan && (() => {
          const w = plan.workouts[activeDay];
          const ex = w.exercises[activeEx];
          return (
            <div className="fade-up" style={{ flex: 1, overflowY: 'auto', paddingBottom: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 0' }}>
                <button onClick={() => setPhase('plan')} style={{
                  background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '50%',
                  width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <div>
                  <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 2 }}>{w.day} · {w.focus}</div>
                  <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>{w.title}</div>
                </div>
              </div>

              <div style={{ margin: '12px 20px 0', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 12, padding: '11px 14px' }}>
                <div style={{ color: '#444', fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 3 }}>Rozcvička</div>
                <div style={{ color: '#777', fontSize: 12, lineHeight: 1.5 }}>{w.warmup}</div>
              </div>

              <div style={{ padding: '12px 20px 0' }}>
                <VideoPlaceholder name={ex.name} equipment={ex.equipment} />
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
                  background: '#161616', border: '1px solid #222', borderRadius: 12, padding: '14px 0', marginTop: 10,
                }}>
                  {[['Série', ex.sets], ['Opak.', ex.reps], ['Pauza', ex.rest]].map(([l, v], i) => (
                    <>
                      {i > 0 && <div key={`d${i}`} style={{ background: '#222' }} />}
                      <div key={l} style={{ textAlign: 'center' }}>
                        <div style={{ color: '#444', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div>
                        <div style={{ color: '#fff', fontFamily: "'Barlow Condensed'", fontSize: 28, fontWeight: 700 }}>{v}</div>
                      </div>
                    </>
                  ))}
                </div>
                {ex.tip && (
                  <div style={{ marginTop: 8, background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ color: '#444', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>💡 Technika</div>
                    <div style={{ color: '#777', fontSize: 11, lineHeight: 1.5 }}>{ex.tip}</div>
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 20px 0' }}>
                <div style={{ color: '#444', fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Všechny cviky</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {w.exercises.map((e, i) => (
                    <div key={i} className="ex-row" onClick={() => setActiveEx(i)} style={{
                      background: activeEx === i ? '#fff' : '#161616',
                      border: `1px solid ${activeEx === i ? '#fff' : '#222'}`,
                      borderRadius: 12, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        background: activeEx === i ? '#0a0a0a' : '#222',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Barlow Condensed'", fontSize: 13, fontWeight: 700,
                        color: activeEx === i ? '#fff' : '#555',
                      }}>{String(i + 1).padStart(2, '0')}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: activeEx === i ? '#0a0a0a' : '#fff', fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                        <div style={{ color: activeEx === i ? '#666' : '#555', fontSize: 10, marginTop: 1 }}>{e.sets}× {e.reps} · {e.rest}</div>
                      </div>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={activeEx === i ? '#999' : '#444'} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, padding: '14px 20px 0' }}>
                {activeDay > 0 && (
                  <button onClick={() => { setActiveDay(d => d - 1); setActiveEx(0); }} style={{
                    flex: 1, background: '#161616', border: '1px solid #222', borderRadius: 12,
                    padding: '12px', color: '#888', fontSize: 12, cursor: 'pointer',
                  }}>← Předchozí</button>
                )}
                {activeDay < plan.workouts.length - 1 && (
                  <button onClick={() => { setActiveDay(d => d + 1); setActiveEx(0); }} style={{
                    flex: 1, background: '#fff', border: 'none', borderRadius: 12,
                    padding: '12px', color: '#0a0a0a', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>Další den →</button>
                )}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
