import React, { useEffect, useState, createContext, useContext } from "react";

const OWM_API_KEY = import.meta.env.VITE_OWM_API_KEY || "156f04a68c2cc658949448716a6efec9";

/* UI */
function Card({ className = "", children }) { return <div className={`rounded-2xl border border-zinc-700 shadow-sm bg-zinc-800 text-zinc-100 ${className}`}>{children}</div>; }
function CardHeader({ children, className="" }) { return <div className={`p-4 border-b border-zinc-700 ${className}`}>{children}</div>; }
function CardTitle({ children, className = "" }) { return <div className={`font-semibold ${className}`}>{children}</div>; }
function CardContent({ children, className = "" }) { return <div className={`p-4 ${className}`}>{children}</div>; }
function Button({ children, className = "", ...props }) { return <button className={`px-3 py-2 rounded-xl border border-zinc-600 text-sm bg-zinc-800 hover:bg-zinc-700 ${className}`} {...props}>{children}</button>; }
function Input(props) { return <input {...props} className={`w-full rounded-lg border border-zinc-600 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm disabled:bg-zinc-800 disabled:text-zinc-400 ${props.className||""}`} />; }
function Label({ children }) { return <label className="text-sm font-medium text-zinc-200">{children}</label>; }
function Separator() { return <div className="h-px bg-zinc-700 my-2" />; }

/* Modal */
function Modal({ open, onOpenChange, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => onOpenChange(false)}>
      <div className="bg-zinc-900 rounded-2xl border border-zinc-700 shadow-lg w-full max-w-2xl m-4 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex justify-between items-center sticky top-0 bg-zinc-900 z-10">
          <CardTitle className="text-xl">{title}</CardTitle>
          <button onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-zinc-100 text-2xl leading-none">&times;</button>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </div>
    </div>
  );
}

/* Tabs */
const TabsCtx = createContext(null);
function Tabs({ defaultValue, children, className="" }) { const [value, setValue] = useState(defaultValue); return <TabsCtx.Provider value={{ value, setValue }}><div className={className}>{children}</div></TabsCtx.Provider>; }
function TabsList({ children, className="" }) { return <div className={`flex gap-2 ${className}`}>{children}</div>; }
function TabsTrigger({ value, children, className="" }) { const ctx = useContext(TabsCtx); const active = ctx?.value === value; return <button onClick={()=>ctx.setValue(value)} className={`px-3 py-1.5 rounded-lg border border-zinc-600 text-sm capitalize ${active?"bg-zinc-700":"bg-zinc-800 hover:bg-zinc-700"} ${className}`}>{children}</button>; }
function TabsContent({ value, children }) { const ctx = useContext(TabsCtx); return ctx?.value === value ? <div className="mt-2">{children}</div> : null; }

/* LocalStorage with Date hydration */
// FIX: Rewritten useLocalStorage to handle Date objects correctly on load
const dateReviver = (key, value) => {
  const isISO8601Z = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/;
  if (typeof value === 'string' && isISO8601Z.test(value)) {
    return new Date(value);
  }
  return value;
};
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try { 
      const raw = localStorage.getItem(key); 
      return raw ? JSON.parse(raw, dateReviver) : initialValue; 
    }
    catch { 
      return initialValue; 
    }
  });
  useEffect(() => { 
    try { 
      localStorage.setItem(key, JSON.stringify(value)); 
    } catch {} 
  }, [key, value]);
  return [value, setValue];
}

/* Weather */
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
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=fi&appid=${OWM_API_KEY}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=fi&appid=${OWM_API_KEY}`;
        const r1 = await fetch(currentUrl, { signal: ctrl.signal });
        const r2 = await fetch(forecastUrl, { signal: ctrl.signal });
        if (!r1.ok) throw new Error(`Current ${r1.status}`);
        if (!r2.ok) throw new Error(`Forecast ${r2.status}`);
        const cur = await r1.json();
        const f = await r2.json();
        const now = new Date();
        const end = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const hours = (f.list||[])
          .filter(item => { const d = new Date(item.dt * 1000); return d >= now && d <= end; })
          .map(row => ({
            time: new Date(row.dt * 1000).toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" }),
            temp: Math.round(row.main?.temp ?? 0),
            wind: Math.round(row.wind?.speed ?? 0),
            icon: row.weather?.[0]?.icon,
            desc: row.weather?.[0]?.description
          }));
        setData({ current: { temp: Math.round(cur.main?.temp ?? 0), wind: Math.round(cur.wind?.speed ?? 0), icon: cur.weather?.[0]?.icon, desc: cur.weather?.[0]?.description }, hours });
      } catch (e) { if (e.name !== "AbortError") setError(e.message || String(e)); }
      finally { setLoading(false); }
    };
    run();
    const id = setInterval(run, 15 * 60 * 1000);
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
        <div className="text-sm text-red-400">{error || (loading ? "Päivitetään…" : "")}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          {data?.current?.icon && (
            <img alt={data?.current?.desc||""} className="h-12 w-12" src={`https://openweathermap.org/img/wn/${data.current.icon}@2x.png`} />
          )}
          <div className="text-5xl font-bold">{data?.current?.temp ?? "–"}°C</div>
          <div className="text-sm text-zinc-300 capitalize">{data?.current?.desc || ""}</div>
          <div className="text-sm text-zinc-300">Tuuli {data?.current?.wind ?? "–"} m/s</div>
        </div>
        <div className="overflow-x-auto">
          <div className="grid grid-flow-col auto-cols-max gap-2">
            {data?.hours?.map((h, i) => (
              <div key={i} className="rounded-xl border border-zinc-700 p-3 text-center w-24">
                <div className="text-xs text-zinc-300">{h.time}</div>
                {h.icon && <img className="mx-auto h-8 w-8" alt={h.desc||""} src={`https://openweathermap.org/img/wn/${h.icon}.png`} />}
                <div className="text-sm font-semibold">{h.temp}°C</div>
                <div className="text-xs text-zinc-400">{h.wind} m/s</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ICS helpers */
function unfoldIcsLines(text) { const lines = text.split(/\r?\n/); const out=[]; for (const l of lines){ if(l.startsWith(" ")||l.startsWith("\t")) out[out.length-1]+=l.slice(1); else out.push(l);} return out; }
function parseIcsDate(v){ if(!v) return null; const z=v.endsWith("Z"); if(v.length===8){const y=+v.slice(0,4),m=+v.slice(4,6)-1,d=+v.slice(6,8); return new Date(Date.UTC(y,m,d));} const y=+v.slice(0,4),m=+v.slice(4,6)-1,d=+v.slice(6,8),hh=+v.slice(9,11)||0,mm=+v.slice(11,13)||0,ss=+v.slice(13,15)||0; return z? new Date(Date.UTC(y,m,d,hh,mm,ss)) : new Date(y,m,d,hh,mm,ss); }
function parseICS(text){ const lines=unfoldIcsLines(text); const ev=[]; let cur=null; for(const ln of lines){ if(ln==="BEGIN:VEVENT") cur={}; else if(ln==="END:VEVENT"){ if(cur.DTSTART&&cur.DTEND){ ev.push({ summary:cur.SUMMARY||"", start:parseIcsDate(cur.DTSTART), end:parseIcsDate(cur.DTEND), location:cur.LOCATION||"" }); } cur=null; } else if(cur){ const i=ln.indexOf(":"); if(i>-1){ const k=ln.slice(0,i).split(";")[0]; const v=ln.slice(i+1); cur[k]=v; } } } return ev; }
async function fetchICS(url, proxy){ const u = proxy ? `${proxy}${encodeURIComponent(url)}` : url; const res = await fetch(u, {redirect:"follow"}); if(!res.ok){ throw new Error(`ICS ${res.status}`); } return await res.text(); }

/* Timetable */
const WEEKDAYS = ["maanantai","tiistai","keskiviikko","torstai","perjantai"];
const TIMELINE_START_HOUR = 8;
const TIMELINE_END_HOUR = 17;
const PIXELS_PER_HOUR = 80;

function TimetableCard({ cfg }) {
  const now = new Date();
  const hour = now.getHours();
  let dayIndex = now.getDay(); 

  if (hour >= 16) {
    dayIndex = (dayIndex + 1) % 7;
  }

  if (dayIndex === 6 || dayIndex === 0) {
    dayIndex = 1;
  }

  const targetDay = WEEKDAYS[dayIndex - 1]; 
  if (!targetDay) return null; // Prevent crash if targetDay is undefined
  const label = `Lukujärjestys – ${targetDay.charAt(0).toUpperCase() + targetDay.slice(1)}`;
  
  const cfgN = normalizeGrid(cfg);
  const kidColors = ["bg-sky-800/50 border-sky-500", "bg-rose-800/50 border-rose-500", "bg-emerald-800/50 border-emerald-500"];

  const getEventsForDay = (day, kidName, kidIdx) => {
    const icsEvents = cfgN.timetable[day]?.[kidName] || [];
    const manualOverrides = cfgN.manualOverrides[day] || {};
    
    let finalEvents = [...icsEvents];
    
    Object.entries(manualOverrides).forEach(([slot, kidsEntries]) => {
      if (kidsEntries[kidIdx]) {
        const [startHour] = slot.split('-').map(Number);
        const slotStart = new Date();
        slotStart.setHours(startHour, 0, 0, 0);
        const slotEnd = new Date();
        slotEnd.setHours(startHour + 1, 0, 0, 0);

        finalEvents = finalEvents.filter(event => {
          if (!event.start || !event.end) return false;
          const eventStart = event.start.getTime();
          const eventEnd = event.end.getTime();
          return eventEnd <= slotStart.getTime() || eventStart >= slotEnd.getTime();
        });
        
        finalEvents.push({
          start: slotStart,
          end: slotEnd,
          summary: kidsEntries[kidIdx],
          isOverride: true,
        });
      }
    });
    return finalEvents;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          <div className="flex sticky top-0 bg-zinc-800 z-10">
            <div className="flex-1 grid grid-cols-3 gap-1">
              {cfgN.kids.map((kidName) => (
                <div key={kidName} className="text-center font-bold p-2 border-b border-zinc-700">{kidName}</div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0">
              {Array.from({ length: TIMELINE_END_HOUR - TIMELINE_START_HOUR }).map((_, i) => (
                <div key={i} style={{ height: `${PIXELS_PER_HOUR}px` }} className="border-b border-zinc-800"></div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1 relative">
              {cfgN.kids.map((kidName, kidIdx) => (
                <div key={kidName} className="relative border-l border-zinc-700 h-full" style={{minHeight: `${(TIMELINE_END_HOUR - TIMELINE_START_HOUR) * PIXELS_PER_HOUR}px`}}>
                  {getEventsForDay(targetDay, kidName, kidIdx).map((event, eventIdx) => {
                    if (!event.start || !event.end) return null;
                    const minutesFromStart = (event.start.getHours() - TIMELINE_START_HOUR) * 60 + event.start.getMinutes();
                    const durationMinutes = (event.end.getTime() - event.start.getTime()) / 60000;

                    const top = (minutesFromStart / 60) * PIXELS_PER_HOUR;
                    const height = (durationMinutes / 60) * PIXELS_PER_HOUR;

                    return (
                      <div
                        key={eventIdx}
                        className={`absolute w-full p-2 rounded-lg text-xs leading-tight shadow-md ${event.isOverride ? 'bg-zinc-600/80 border-zinc-400' : kidColors[kidIdx % kidColors.length]}`}
                        style={{ top: `${top}px`, height: `${height}px`, border: '1px solid' }}
                      >
                        <p className="font-bold text-white">{event.summary}</p>
                        <p className="text-zinc-200">{`${event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${event.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}</p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


/* Clock */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const date = now.toLocaleDateString("fi-FI", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const time = now.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (<div className="text-center py-2"><div className="text-4xl font-bold tracking-tight">{time}</div><div className="text-sm text-zinc-300 capitalize">{date}</div></div>);
}

/* Settings + ICS */
const DEFAULT_CFG = {
  city: "Raahe",
  kids: ["Onerva","Nanni","Elmeri"],
  timetableSlots: ["8-9","9-10","10-11","11-12","12-13","13-14","14-15","15-16"],
  timetable: {},
  manualOverrides: { maanantai:{}, tiistai:{}, keskiviikko:{}, torstai:{}, perjantai:{} },
  ics: { Onerva: "", Nanni: "", Elmeri: "" },
  icsProxy: ""
};

function normalizeGrid(cfg) {
  const next = { ...cfg };
  if (!Array.isArray(next.kids)) next.kids = ["Onerva","Nanni","Elmeri"];
  if (typeof next.timetable !== "object") next.timetable = {};
  if (typeof next.manualOverrides !== "object") next.manualOverrides = {};

  for (const d of WEEKDAYS) {
    if (!next.timetable[d]) next.timetable[d] = {};
    if (!next.manualOverrides[d]) next.manualOverrides[d] = {};
    for (const k of next.kids) {
      if (!Array.isArray(next.timetable[d][k])) {
        next.timetable[d][k] = [];
      }
    }
     for (let s = 0; s < (next.timetableSlots || []).length; s++) {
      const slotLabel = (next.timetableSlots || HOURS)[s] || `${s}`;
      if (!Array.isArray(next.manualOverrides[d][slotLabel])) {
        next.manualOverrides[d][slotLabel] = Array(next.kids.length).fill("");
      }
    }
  }
  return next;
}

function startOfWeek(d){ const x=new Date(d); const day=(x.getDay()||7)-1; x.setHours(0,0,0,0); x.setDate(x.getDate()-day); return x; }
function toWeekdayKey(d){ return WEEKDAYS[(d.getDay()||7)-1]; }

export default function App() {
  const [cfg, setCfg] = useLocalStorage("home-dashboard-config", DEFAULT_CFG);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const mergedCfg = {
    ...cfg,
    ics: {
        ...cfg.ics,
        ...(import.meta.env.VITE_ICS_ONERVA && { Onerva: import.meta.env.VITE_ICS_ONERVA }),
        ...(import.meta.env.VITE_ICS_NANNI && { Nanni: import.meta.env.VITE_ICS_NANNI }),
        ...(import.meta.env.VITE_ICS_ELMERI && { Elmeri: import.meta.env.VITE_ICS_ELMERI }),
    }
  };

  const pullIcsAll = async () => {
    setErr(""); setLoading(true);
    try{
      const weekStart = startOfWeek(new Date());
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 14); // Fetch for 2 weeks
      weekEnd.setHours(23,59,59,999);
      const newTimetable = {};
      const kidNames = mergedCfg.kids;

      for(const day of WEEKDAYS) {
        newTimetable[day] = {};
        for(const name of kidNames) {
          newTimetable[day][name] = [];
        }
      }

      for(let kIdx=0;kIdx<kidNames.length;kIdx++){
        const name = kidNames[kIdx];
        const url = mergedCfg.ics?.[name];
        if(!url) continue;
        try{
          const ics = await fetchICS(url, mergedCfg.icsProxy);
          const events = parseICS(ics).filter(e=> e.start>=weekStart && e.start<=weekEnd);
          
          for(const e of events){
            const wd = toWeekdayKey(e.start);
            if(wd && newTimetable[wd] && newTimetable[wd][name]) {
               newTimetable[wd][name].push(e);
            }
          }
        }catch(inner){
          setErr(prev=> prev ? prev + " | " + name + ": " + inner.message : (name + ": " + inner.message));
        }
      }
      setCfg({...cfg, timetable: newTimetable});
    }finally{ setLoading(false); }
  }

  useEffect(() => {
    pullIcsAll();
    const intervalId = setInterval(pullIcsAll, 3 * 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [JSON.stringify(mergedCfg.ics), mergedCfg.icsProxy]); 

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6" style={{fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, sans-serif"}}>
      <div className="max-w-6xl mx-auto grid gap-4">
        {err && <div className="text-sm text-red-400 mb-4">{err}</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3"><WeatherCard city={mergedCfg.city} /></div>
          <div className="md:col-span-1"><Card><CardHeader><CardTitle className="text-xl">Kello</CardTitle></CardHeader><CardContent><LiveClock /></CardContent></Card></div>
          <div className="md:col-span-4"><TimetableCard cfg={mergedCfg} /></div>
        </div>

        <div className="flex justify-end gap-2 items-center mt-4">
            <Button onClick={()=>setEditing(true)}>Asetukset</Button>
        </div>
      </div>

      <SettingsDialog open={editing} onOpenChange={setEditing} config={mergedCfg} setConfig={setCfg} />
    </div>
  );
}

function SettingsDialog({ open, onOpenChange, config, setConfig }) {
  const [localCfg, setLocalCfg] = useState(config);
  useEffect(() => setLocalCfg(config), [config, open]);

  const update = (patch) => setLocalCfg((s) => normalizeGrid({ ...s, ...patch }));
  const save = () => { setConfig(normalizeGrid(localCfg)); onOpenChange(false); };
  const setKid = (idx, val) => update({ kids: localCfg.kids.map((k, i) => (i === idx ? val : k)) });
  
  const icsFromEnv = {
    Onerva: import.meta.env.VITE_ICS_ONERVA,
    Nanni: import.meta.env.VITE_ICS_NANNI,
    Elmeri: import.meta.env.VITE_ICS_ELMERI,
  };

  const updateOverride = (day, slot, kidIdx, value) => {
    const newOverrides = JSON.parse(JSON.stringify(localCfg.manualOverrides || {}));
    if (!newOverrides[day]) newOverrides[day] = {};
    if (!newOverrides[day][slot]) newOverrides[day][slot] = Array(localCfg.kids.length).fill("");
    newOverrides[day][slot][kidIdx] = value;
    update({ manualOverrides: newOverrides });
  };

  if (!open) return null;
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Asetukset">
      <div className="grid gap-6 p-1">
        <div className="grid gap-2">
          <Label>Paikkakunta</Label>
          <Input value={localCfg.city} onChange={(e) => update({ city: e.target.value })} placeholder="esim. Raahe" />
        </div>
        <Separator />
        <div className="grid gap-2">
          <Label>Lapset</Label>
          <div className="grid md:grid-cols-3 gap-2">
            {localCfg.kids.map((k, i) => (<Input key={i} value={k} onChange={(e) => setKid(i, e.target.value)} />))}
          </div>
        </div>
        <Separator />
        <div className="grid gap-2">
          <Label>Wilma ICS -linkit</Label>
          <div className="grid md:grid-cols-3 gap-2">
            {localCfg.kids.map((name) => {
              const isFromEnv = !!icsFromEnv[name];
              return (
                <Input 
                  key={name}
                  placeholder={`${name} – https://...Wilma.ics`}
                  value={localCfg.ics?.[name] || ""}
                  onChange={(e)=>update({ ics: { ...localCfg.ics, [name]: e.target.value } })}
                  disabled={isFromEnv}
                  title={isFromEnv ? "Tämä arvo on asetettu GitHub-muuttujien kautta, eikä sitä voi muokata tässä." : ""}
                />
              );
            })}
          </div>
          <Label>ICS-proxy (valinnainen, CORS)</Label>
          <Input placeholder="esim. https://<nimi>.workers.dev/?url=" value={localCfg.icsProxy||""} onChange={(e)=>update({ icsProxy: e.target.value })} />
          <div className="text-xs text-zinc-400">Jos suorat pyynnöt estetään (CORS), lisää tähän esim. Cloudflare Worker -proxy.</div>
        </div>
        <Separator />

        <div className="grid gap-2">
          <Label>Lukujärjestyksen manuaaliset muutokset</Label>
          <div className="text-xs text-zinc-400">
            Tähän syötetyt arvot korvaavat Wilmasta haetun lukujärjestyksen. Voit lisätä esimerkiksi iltapäiväkerhon tai muita menoja.
          </div>
          <Tabs defaultValue="maanantai" className="mt-2">
            <TabsList>
              {WEEKDAYS.map(day => (<TabsTrigger key={day} value={day}>{day.slice(0,2)}</TabsTrigger>))}
            </TabsList>
            {WEEKDAYS.map(day => (
              <TabsContent key={day} value={day}>
                <div className="overflow-auto mt-2">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 border border-zinc-700 w-28">Aika</th>
                        {localCfg.kids.map((k, i) => (<th key={i} className="p-2 border border-zinc-700">{k}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {(localCfg.timetableSlots || HOURS).map((slot) => (
                        <tr key={slot}>
                          <td className="p-2 border border-zinc-700 text-center">{slot}</td>
                          {localCfg.kids.map((_, kidIdx) => (
                            <td key={kidIdx} className="p-1 border border-zinc-700">
                              <Input 
                                className="bg-zinc-800 text-xs text-center p-1 h-full"
                                value={localCfg.manualOverrides?.[day]?.[slot]?.[kidIdx] || ""}
                                onChange={(e) => updateOverride(day, slot, kidIdx, e.target.value)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 mt-4 sticky bottom-0 bg-zinc-900 py-4">
          <Button onClick={() => onOpenChange(false)} className="border">Peruuta</Button>
          <Button onClick={save} className="border">Tallenna</Button>
        </div>
      </div>
    </Modal>
  );
}

