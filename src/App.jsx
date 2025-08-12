import React, { useEffect, useMemo, useState } from "react";

const OWM_API_KEY = import.meta.env.VITE_OWM_API_KEY || "156f04a68c2cc658949448716a6efec9";

const ENV_CFG = {
  city: import.meta.env.VITE_CITY || "Raahe",
  kids: ["Onerva", "Nanni", "Elmeri"],
  ics: {
    Onerva: import.meta.env.VITE_ICS_ONERVA || "",
    Nanni: import.meta.env.VITE_ICS_NANNI || "",
    Elmeri: import.meta.env.VITE_ICS_ELMERI || "",
  },
  icsProxy: import.meta.env.VITE_ICS_PROXY || "",
};

function Card({ className = "", children }) {
  return (
    <div className={"rounded-2xl border border-zinc-700 shadow-sm bg-zinc-800 text-zinc-100 " + className}
         style={{ borderColor:"#3f3f46", backgroundColor:"#27272a", color:"#e4e4e7" }}>{children}</div>
  );
}
function CardHeader({ children, className = "" }) {
  return <div className={"p-4 border-b border-zinc-700 " + className} style={{ borderColor:"#3f3f46" }}>{children}</div>;
}
function CardTitle({ children, className = "" }) {
  return <div className={"font-semibold " + className}>{children}</div>;
}
function CardContent({ children, className = "" }) {
  return <div className={"p-4 " + className}>{children}</div>;
}
function Button({ children, className = "", ...props }) {
  return (
    <button className={"px-3 py-2 rounded-xl border border-zinc-600 text-sm bg-zinc-800 hover:bg-zinc-700 " + className}
            style={{ borderColor:"#52525b", backgroundColor:"#27272a" }} {...props}>{children}</button>
  );
}
function Input(props) {
  return (
    <input {...props}
           className={"w-full rounded-lg border border-zinc-600 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm " + (props.className || "")}
           style={{ borderColor:"#52525b", backgroundColor:"#18181b", color:"#fafafa" }}/>
  );
}
function Label({ children }) { return <label className="text-sm font-medium" style={{ color:"#e4e4e7" }}>{children}</label>; }
function Separator() { return <div className="h-px my-2" style={{ backgroundColor:"#3f3f46" }} />; }

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initialValue; }
    catch { return initialValue; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }, [key, value]);
  return [value, setValue];
}

async function getCoordsFromCity(city) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${OWM_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geokoodaus ${res.status}`);
  const data = await res.json();
  if (!data.length) throw new Error("Paikkakuntaa ei löytynyt");
  return { lat: data[0].lat, lon: data[0].lon };
}
function useWeather({ city }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!city) return;
    const ctrl = new AbortController();
    const run = async () => {
      setLoading(true); setError(null);
      try {
        const { lat, lon } = await getCoordsFromCity(city);
        const cu = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=fi&appid=${OWM_API_KEY}`;
        const fc = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=fi&appid=${OWM_API_KEY}`;
        const r1 = await fetch(cu, { signal: ctrl.signal });
        const r2 = await fetch(fc, { signal: ctrl.signal });
        if (!r1.ok) throw new Error(`Current ${r1.status}`);
        if (!r2.ok) throw new Error(`Forecast ${r2.status}`);
        const cur = await r1.json(); const f = await r2.json();
        const now = new Date(); const end = new Date(now.getTime() + 48*60*60*1000);
        const hours = (f.list || []).filter(x => { const d = new Date(x.dt*1000); return d >= now && d <= end; })
          .map(x => ({ time: new Date(x.dt*1000).toLocaleTimeString("fi-FI",{hour:"2-digit",minute:"2-digit"}),
                       temp: Math.round(x.main?.temp ?? 0),
                       wind: Math.round(x.wind?.speed ?? 0),
                       icon: x.weather?.[0]?.icon, desc: x.weather?.[0]?.description }));
        setData({ current: { temp: Math.round(cur.main?.temp ?? 0), wind: Math.round(cur.wind?.speed ?? 0), icon: cur.weather?.[0]?.icon, desc: cur.weather?.[0]?.description }, hours });
      } catch(e) { if (e.name !== "AbortError") setError(e.message || String(e)); }
      finally { setLoading(false); }
    };
    run();
    const id = setInterval(run, 15*60*1000);
    return () => { ctrl.abort(); clearInterval(id); };
  }, [city]);
  return { data, loading, error };
}
function WeatherCard({ city }) {
  const { data, loading, error } = useWeather({ city });
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-xl">Sää – {city || "(ei asetettu)"}</CardTitle>
        <div className="text-sm" style={{ color:"#fca5a5" }}>{error || (loading ? "Päivitetään…" : "")}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          {data?.current?.icon && (
            <img className="h-12 w-12" alt={data?.current?.desc || ""} src={`https://openweathermap.org/img/wn/${data.current.icon}@2x.png`} />
          )}
          <div className="text-5xl font-bold">{data?.current?.temp ?? "–"}°C</div>
          <div className="text-sm" style={{ color:"#d4d4d8", textTransform:"capitalize" }}>{data?.current?.desc || ""}</div>
          <div className="text-sm" style={{ color:"#d4d4d8" }}>Tuuli {data?.current?.wind ?? "–"} m/s</div>
        </div>
        <div style={{ overflowX:"auto" }}>
          <div style={{ display:"grid", gridAutoFlow:"column", gridAutoColumns:"max-content", gap:"8px" }}>
            {data?.hours?.map((h,i)=>(
              <div key={i} className="rounded-xl p-3 text-center" style={{ border:"1px solid #3f3f46", width:"96px" }}>
                <div className="text-xs" style={{ color:"#d4d4d8" }}>{h.time}</div>
                {h.icon && (<img className="mx-auto" style={{ width:"32px", height:"32px" }} alt={h.desc || ""} src={`https://openweathermap.org/img/wn/${h.icon}.png`} />)}
                <div className="text-sm font-semibold">{h.temp}°C</div>
                <div className="text-xs" style={{ color:"#a1a1aa" }}>{h.wind} m/s</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function unfoldIcsLines(text) {
  const raw = (text || "").replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  const lines = raw.split("\n"); const out = [];
  for (const l of lines) { if ((l.startsWith(" ") || l.startsWith("\t")) && out.length) out[out.length-1]+=l.slice(1); else out.push(l); }
  return out;
}
function parseIcsDate(v) {
  if (!v) return null;
  const z=v.endsWith("Z");
  if (v.length===8){ const y=+v.slice(0,4), m=+v.slice(4,6)-1, d=+v.slice(6,8); return new Date(Date.UTC(y,m,d)); }
  const y=+v.slice(0,4), m=+v.slice(4,6)-1, d=+v.slice(6,8);
  const hh=+v.slice(9,11)||0, mm=+v.slice(11,13)||0, ss=+v.slice(13,15)||0;
  return z ? new Date(Date.UTC(y,m,d,hh,mm,ss)) : new Date(y,m,d,hh,mm,ss);
}
function parseICS(text) {
  const lines = unfoldIcsLines(text);
  const ev=[]; let cur=null;
  for (const ln of lines) {
    if (ln==="BEGIN:VEVENT") cur={};
    else if (ln==="END:VEVENT") {
      if (cur.DTSTART && cur.DTEND) ev.push({ summary: cur.SUMMARY||"", start: parseIcsDate(cur.DTSTART), end: parseIcsDate(cur.DTEND), location: cur.LOCATION||"" });
      cur=null;
    } else if (cur) {
      const i=ln.indexOf(":"); if (i>-1){ const k=ln.slice(0,i).split(";")[0]; const v=ln.slice(i+1); cur[k]=v; }
    }
  }
  return ev;
}
async function fetchICS(url, proxy) {
  const u = proxy ? `${proxy}${encodeURIComponent(url)}` : url;
  const res = await fetch(u, { redirect:"follow" });
  if (!res.ok) throw new Error(`ICS ${res.status}`);
  return await res.text();
}

const HOURS=["8-9","9-10","10-11","11-12","12-13","13-14","14-15","15-16"];
const WEEKDAYS=["maanantai","tiistai","keskiviikko","torstai","perjantai"];
function normalizeGrid(cfg){
  const next={ ...(cfg||{}) };
  if(!Array.isArray(next.kids)) next.kids=["Onerva","Nanni","Elmeri"];
  if(!Array.isArray(next.timetableSlots)) next.timetableSlots=[...HOURS];
  if(typeof next.timetable!=="object" || next.timetable===null) next.timetable={};
  for(const d of WEEKDAYS){
    if(!next.timetable[d]) next.timetable[d]={};
    for(let s=0;s<next.timetableSlots.length;s++){
      const label=next.timetableSlots[s] || HOURS[s] || String(s);
      if(!Array.isArray(next.timetable[d][label])) next.timetable[d][label]=Array(next.kids.length).fill("");
      else if(next.timetable[d][label].length<next.kids.length){
        next.timetable[d][label]=[...next.timetable[d][label], ...Array(next.kids.length-next.timetable[d][label].length).fill("")];
      }
    }
  }
  if(!next.ics) next.ics={};
  if(typeof next.icsProxy!=="string") next.icsProxy="";
  return next;
}
function slotLabelForDateRange(slots,start){
  const s=start instanceof Date?start:new Date(start);
  const m=s.getMinutes(); let h=s.getHours()+(m>=30?1:0);
  if(h<0)h=0; if(h>23)h=23;
  const label=`${h}-${h+1}`;
  if(slots.includes(label)) return label;
  const alt1=`${s.getHours()}-${s.getHours()+1}`; const alt2=`${s.getHours()+1}-${s.getHours()+2}`;
  if(slots.includes(alt1)) return alt1; if(slots.includes(alt2)) return alt2; return null;
}
function startOfWeek(d){ const x=new Date(d); const day=(x.getDay()||7)-1; x.setHours(0,0,0,0); x.setDate(x.getDate()-day); return x; }
function toWeekdayKey(d){ return WEEKDAYS[(d.getDay()||7)-1]; }

function TimetableCard({ cfg }){
  const now=new Date(); const hour=now.getHours(); const jsDay=now.getDay();
  const todayIdxBase = (jsDay===0 || jsDay===6) ? 0 : (jsDay-1);
  const targetIdx = hour>=18 ? (todayIdxBase+1)%5 : todayIdxBase;
  const targetDay=WEEKDAYS[targetIdx];
  const label= hour>=18 ? `Seuraava päivä – ${targetDay}` : `Tänään – ${targetDay}`;
  const cfgN=useMemo(()=>normalizeGrid(cfg),[cfg]);
  const slots=cfgN.timetableSlots; const table=cfgN.timetable[targetDay];

  return (
    <Card className="h-full">
      <CardHeader><CardTitle className="text-xl">Lukujärjestys ({label})</CardTitle></CardHeader>
      <CardContent>
        <div style={{ overflow:"auto" }}>
          <table className="w-full text-sm" style={{ borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th className="p-2" style={{ border:"1px solid #3f3f46", width:"7rem" }}>Aika</th>
                {cfgN.kids.map((k,i)=>(<th key={i} className="p-2" style={{ border:"1px solid #3f3f46" }}>{k}</th>))}
              </tr>
            </thead>
            <tbody>
              {slots.map(slot=>(
                <tr key={slot}>
                  <td className="p-2" style={{ border:"1px solid #3f3f46", textAlign:"center" }}>{slot}</td>
                  {cfgN.kids.map((_,i)=>(
                    <td key={i} className="p-1" style={{ border:"1px solid #3f3f46" }}>{table?.[slot]?.[i] || "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function LiveClock(){
  const [now,setNow]=useState(new Date());
  useEffect(()=>{ const id=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(id); },[]);
  const date=now.toLocaleDateString("fi-FI",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  const time=now.toLocaleTimeString("fi-FI",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  return (<div className="text-center py-2"><div className="text-4xl font-bold" style={{letterSpacing:"-0.5px"}}>{time}</div><div className="text-sm" style={{color:"#d4d4d8", textTransform:"capitalize"}}>{date}</div></div>);
}

const DEFAULT_CFG = {
  city: ENV_CFG.city,
  kids: [...ENV_CFG.kids],
  timetableSlots: ["8-9","9-10","10-11","11-12","12-13","13-14","14-15","15-16"],
  timetable: { maanantai:{}, tiistai:{}, keskiviikko:{}, torstai:{}, perjantai:{} },
  ics: { ...ENV_CFG.ics },
  icsProxy: ENV_CFG.icsProxy,
};

export default function App(){
  const [cfg,setCfg]=useLocalStorage("home-dashboard-config", DEFAULT_CFG);
  const [editing,setEditing]=useState(false);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const [lastIcsRun,setLastIcsRun]=useLocalStorage("ics-last-run","");

  async function pullIcsAll(){
    setErr(""); setLoading(true);
    try {
      const weekStart=startOfWeek(new Date());
      const weekEnd=new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6); weekEnd.setHours(23,59,59,999);
      const next=normalizeGrid(cfg); for(const d of WEEKDAYS) next.timetable[d]={};
      const kids=next.kids; const slots=next.timetableSlots;

      for(let kIdx=0;kIdx<kids.length;kIdx++){
        const name=kids[kIdx]; const url=next.ics[name] || ""; if(!url) continue;
        try{
          const ics=await fetchICS(url,next.icsProxy);
          const events=parseICS(ics).filter(e=>e.start>=weekStart && e.start<=weekEnd);
          for(const e of events){
            const wd=toWeekdayKey(e.start); if(!WEEKDAYS.includes(wd)) continue;
            const label=slotLabelForDateRange(slots,e.start); if(!label) continue;
            if(!next.timetable[wd][label]) next.timetable[wd][label]=Array(kids.length).fill("");
            const durMin=Math.round((e.end - e.start)/60000);
            if(/^onerva$/i.test(name) && durMin>=70){
              next.timetable[wd][label][kIdx]=e.summary || "Tunti";
              const idx=slots.indexOf(label);
              if(idx>=0 && idx+1<slots.length){
                const nextLabel=slots[idx+1];
                if(!next.timetable[wd][nextLabel]) next.timetable[wd][nextLabel]=Array(kids.length).fill("");
                next.timetable[wd][nextLabel][kIdx]=e.summary || "Tunti";
              }
            } else {
              next.timetable[wd][label][kIdx]=e.summary || "Tunti";
            }
          }
        } catch(inner) {
          setErr(prev => prev ? `${prev} | ${name}: ${inner.message}` : `${name}: ${inner.message}`);
        }
      }
      setCfg(next);
    } finally { setLoading(false); }
  }

  useEffect(()=>{
    const tick=async()=>{
      try{
        const now=new Date(); if(now.getDay()!==0) return; if(now.getHours()<12) return;
        const key=now.toISOString().slice(0,10); if(lastIcsRun===key) return;
        await pullIcsAll(); setLastIcsRun(key);
      } catch {}
    };
    tick(); const id=setInterval(tick,5*60*1000); return ()=>clearInterval(id);
  },[lastIcsRun, cfg.ics, cfg.icsProxy, cfg.kids, cfg.timetableSlots]);

  const cfgN=useMemo(()=>normalizeGrid(cfg),[cfg]);

  return (
    <div className="min-h-screen" style={{ background:"#0a0a0b", color:"#e4e4e7", padding:"16px" }}>
      <div style={{ maxWidth:"1200px", margin:"0 auto", display:"grid", gap:"16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:"28px", fontWeight:800 }}>Kodin infonäyttö</div>
            <div style={{ fontSize:"12px", color:"#a1a1aa" }}>Sää • Lukujärjestykset (Wilma ICS) • Kello</div>
          </div>
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            <Button onClick={()=>setEditing(true)}>Asetukset</Button>
            <Button onClick={pullIcsAll}>Hae lukujärjestykset</Button>
          </div>
        </div>

        {err && <div style={{ color:"#fca5a5", fontSize:"14px" }}>{err}</div>}

        <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:"16px" }}>
          <div><WeatherCard city={cfgN.city} /></div>
          <div>
            <Card><CardHeader><CardTitle className="text-xl">Kello</CardTitle></CardHeader><CardContent><LiveClock/></CardContent></Card>
          </div>
          <div><TimetableCard cfg={cfgN} /></div>
        </div>
      </div>

      <SettingsDialog open={editing} onOpenChange={setEditing} config={cfgN} setConfig={setCfg} />
      {loading && (<div style={{ position:"fixed", right:"16px", bottom:"16px", fontSize:"12px", background:"#27272a", border:"1px solid #3f3f46", padding:"8px 12px", borderRadius:"8px" }}>Haetaan ICS-tietoja…</div>)}
    </div>
  );
}

function SettingsDialog({ open, onOpenChange, config, setConfig }){
  const safe=useMemo(()=>normalizeGrid(config || DEFAULT_CFG),[config]);
  const [local,setLocal]=useState(safe);
  const [saving,setSaving]=useState(false);
  useEffect(()=>setLocal(safe),[safe]);

  const update=(patch)=>setLocal(s=>normalizeGrid({ ...(s||{}), ...patch }));
  const setKid=(idx,val)=>update({ kids:(local.kids || []).map((k,i)=> i===idx ? val : k) });

  const save=async()=>{ const normalized=normalizeGrid(local); setConfig(normalized); setSaving(true); setSaving(false); onOpenChange(false); };

  if(!open) return null;
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Asetukset">
      <div style={{ display:"grid", gap:"16px" }}>
        <div style={{ display:"grid", gap:"8px" }}>
          <Label>Paikkakunta</Label>
          <Input value={local.city || ""} onChange={(e)=>update({ city:e.target.value })} placeholder="esim. Raahe"/>
        </div>
        <Separator/>
        <div style={{ display:"grid", gap:"8px" }}>
          <Label>Lapset</Label>
          <div style={{ display:"grid", gap:"8px", gridTemplateColumns:"repeat(3, minmax(0, 1fr))" }}>
            {(local.kids || []).map((k,i)=>(<Input key={i} value={k} onChange={(e)=>setKid(i,e.target.value)}/>))}
          </div>
        </div>
        <Separator/>
        <div style={{ display:"grid", gap:"8px" }}>
          <Label>Wilma ICS -linkit</Label>
          <div style={{ display:"grid", gap:"8px", gridTemplateColumns:"repeat(3, minmax(0, 1fr))" }}>
            {(local.kids || []).map((name)=>(
              <Input key={name} placeholder={`${name} – https://...Wilma.ics`} value={(local.ics && local.ics[name]) || ""}
                     onChange={(e)=>update({ ics:{ ...(local.ics || {}), [name]: e.target.value } })}/>
            ))}
          </div>
          <Label>ICS-proxy (valinnainen, CORS)</Label>
          <Input placeholder="esim. https://<nimi>.workers.dev/?url=" value={local.icsProxy || ""}
                 onChange={(e)=>update({ icsProxy: e.target.value })}/>
          <div className="text-xs" style={{ color:"#a1a1aa" }}>Ympäristömuuttujat (GitHub Variables) toimivat lähtöarvoina. Tässä tekemäsi muutokset tallentuvat vain paikallisesti.</div>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:"8px" }}>
          <Button onClick={()=>onOpenChange(false)}>Peruuta</Button>
          <Button onClick={save}>{saving ? "Tallennetaan…" : "Tallenna"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ open, onOpenChange, title, children }){
  if(!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:50 }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)" }} onClick={()=>onOpenChange(false)} />
      <div style={{ position:"absolute", left:"50%", top:"40px", transform:"translateX(-50%)", width:"95vw", maxWidth:"64rem", borderRadius:"16px", background:"#0b0b0c", color:"#e4e4e7", boxShadow:"0 10px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ padding:"16px", borderBottom:"1px solid #3f3f46", fontWeight:600 }}>{title}</div>
        <div style={{ padding:"16px" }}>{children}</div>
      </div>
    </div>
  );
}
