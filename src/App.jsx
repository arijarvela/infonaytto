import React, { useEffect, useState, useMemo, createContext, useContext } from "react";

const OWM_API_KEY = import.meta.env.VITE_OWM_API_KEY || "156f04a68c2cc658949448716a6efec9";

/* UI */
function Card({ className = "", children }) { return <div className={`rounded-2xl border border-zinc-700 shadow-sm bg-zinc-800 text-zinc-100 ${className}`}>{children}</div>; }
function CardHeader({ children, className="" }) { return <div className={`p-4 border-b border-zinc-700 ${className}`}>{children}</div>; }
function CardTitle({ children, className = "" }) { return <div className={`font-semibold ${className}`}>{children}</div>; }
function CardContent({ children, className = "" }) { return <div className={`p-4 ${className}`}>{children}</div>; }
function Button({ children, className = "", ...props }) { return <button className={`px-3 py-2 rounded-xl border border-zinc-600 text-sm bg-zinc-800 hover:bg-zinc-700 ${className}`} {...props}>{children}</button>; }
function Input(props) { return <input {...props} className={`w-full rounded-lg border border-zinc-600 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm ${props.className||""}`} />; }
function Label({ children }) { return <label className="text-sm font-medium text-zinc-200">{children}</label>; }
function Separator() { return <div className="h-px bg-zinc-700 my-2" />; }

/* LocalStorage */
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initialValue; }
    catch { return initialValue; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }, [key, value]);
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

function CardShell({ title, children, right }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-xl">{title}</CardTitle>
        {right}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function WeatherCard({ city }) {
  const { data, loading, error } = useWeather({ city });
  return (
    <CardShell title={`Sää – ${city || "(ei asetettu)"}`} right={<div className="text-sm text-red-400">{error || (loading ? "Päivitetään…" : "")}</div>}>
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
    </CardShell>
  );
}

/* ICS helpers */
function unfoldIcsLines(text) {
  const lines = (text || "").replace(/\r?\n/g, "\n").split("\n");
  const out = [];
  for (const l of lines) {
    if (l.startsWith(" ") || l.startsWith("\t")) {
      out[out.length - 1] = (out[out.length - 1] || "") + l.slice(1);
    } else {
      out.push(l);
    }
  }
  return out;
}

function parseIcsDate(v){ if(!v) return null; const z=v.endsWith(\"Z\"); if(v.length===8){const y=+v.slice(0,4),m=+v.slice(4,6)-1,d=+v.slice(6,8); return new Date(Date.UTC(y,m,d));} const y=+v.slice(0,4),m=+v.slice(4,6)-1,d=+v.slice(6,8),hh=+v.slice(9,11)||0,mm=+v.slice(11,13)||0,ss=+v.slice(13,15)||0; return z? new Date(Date.UTC(y,m,d,hh,mm,ss)) : new Date(y,m,d,hh,mm,ss); }
function parseICS(text){ const lines=unfoldIcsLines(text); const ev=[]; let cur=null; for(const ln of lines){ if(ln===\"BEGIN:VEVENT\") cur={}; else if(ln===\"END:VEVENT\"){ if(cur.DTSTART&&cur.DTEND){ ev.push({ summary:cur.SUMMARY||\"\", start:parseIcsDate(cur.DTSTART), end:parseIcsDate(cur.DTEND), location:cur.LOCATION||\"\" }); } cur=null; } else if(cur){ const i=ln.indexOf(\":\"); if(i>-1){ const k=ln.slice(0,i).split(\";\")[0]; const v=ln.slice(i+1); cur[k]=v; } } } return ev; }
async function fetchICS(url, proxy){ const u = proxy ? `${proxy}${encodeURIComponent(url)}` : url; const res = await fetch(u, {redirect:\"follow\"}); if(!res.ok){ throw new Error(`ICS ${res.status}`); } return await res.text(); }

/* Timetable */
const HOURS = [\"8-9\",\"9-10\",\"10-11\",\"11-12\",\"12-13\",\"13-14\",\"14-15\",\"15-16\"];
const WEEKDAYS = [\"maanantai\",\"tiistai\",\"keskiviikko\",\"torstai\",\"perjantai\"];

function normalizeGrid(cfg) {
  const next = { ...(cfg || {}) };
  if (!Array.isArray(next.kids)) next.kids = [\"Onerva\",\"Nanni\",\"Elmeri\"];
  if (!Array.isArray(next.timetableSlots)) next.timetableSlots = [...HOURS];
  if (typeof next.timetable !== \"object\" || next.timetable === null) next.timetable = {};
  for (const d of WEEKDAYS) {
    if (!next.timetable[d]) next.timetable[d] = {};
    for (let s = 0; s < next.timetableSlots.length; s++) {
      const slotLabel = next.timetableSlots[s] || HOURS[s] || `${s}`;
      if (!Array.isArray(next.timetable[d][slotLabel])) {
        next.timetable[d][slotLabel] = Array(next.kids.length).fill(\"\");
      } else if (next.timetable[d][slotLabel].length < next.kids.length) {
        next.timetable[d][slotLabel] = [
          ...next.timetable[d][slotLabel],
          ...Array(Math.max(0, next.kids.length - next.timetable[d][slotLabel].length)).fill(\"\")
        ];
      }
    }
  }
  if (!next.ics) next.ics = {};
  if (typeof next.icsProxy !== 'string') next.icsProxy = \"\";
  return next;
}

function slotLabelForDateRange(slots, start, end){
  if(!(start instanceof Date)) start = new Date(start);
  if(!(end instanceof Date)) end = new Date(end);
  const m = start.getMinutes();
  let h = start.getHours() + (m >= 30 ? 1 : 0);
  if (h < 0) h = 0; if (h > 23) h = 23;
  const label = `${h}-${h+1}`;
  if (slots.includes(label)) return label;
  const alt1 = `${start.getHours()}-${start.getHours()+1}`;
  const alt2 = `${start.getHours()+1}-${start.getHours()+2}`;
  if (slots.includes(alt1)) return alt1;
  if (slots.includes(alt2)) return alt2;
  return null;
}

function startOfWeek(d){ const x=new Date(d); const day=(x.getDay()||7)-1; x.setHours(0,0,0,0); x.setDate(x.getDate()-day); return x; }
function toWeekdayKey(d){ return WEEKDAYS[(d.getDay()||7)-1]; }

function TimetableCard({ cfg }) {
  const now = new Date();
  const hour = now.getHours();
  const jsDay = now.getDay();
  const todayIdxBase = jsDay === 0 || jsDay === 6 ? 0 : jsDay - 1;
  const targetIdx = hour >= 18 ? (todayIdxBase + 1) % 5 : todayIdxBase;
  const targetDay = WEEKDAYS[targetIdx];
  const label = hour >= 18 ? `Seuraava päivä – ${targetDay}` : `Tänään – ${targetDay}`;
  const cfgN = useMemo(() => normalizeGrid(cfg), [cfg]);
  const slots = cfgN.timetableSlots;
  const table = cfgN.timetable[targetDay];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl">Lukujärjestys ({label})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="p-2 border border-zinc-700 w-28">Aika</th>
                {cfgN.kids.map((k, i) => (<th key={i} className="p-2 border border-zinc-700">{k}</th>))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot}>
                  <td className="p-2 border border-zinc-700 text-center">{slot}</td>
                  {cfgN.kids.map((_, kidIdx) => (<td key={kidIdx} className="p-1 border border-zinc-700">{table?.[slot]?.[kidIdx] || "—"}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
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
  timetableSlots: [...HOURS],
  timetable: { maanantai:{}, tiistai:{}, keskiviikko:{}, torstai:{}, perjantai:{} },
  ics: { Onerva: "", Nanni: "", Elmeri: "" },
  icsProxy: ""
};

export default function App() {
  const [cfg, setCfg] = useLocalStorage("home-dashboard-config", DEFAULT_CFG);
  const [editing, setEditing] = useState(false);
  const [localCfg, setLocalCfg] = useState(cfg);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [lastIcsRun, setLastIcsRun] = useLocalStorage("ics-last-run", "");

  useEffect(()=>setLocalCfg(cfg),[cfg]);

  async function pullIcsAll(){
    setErr(""); setLoading(true);
    try{
      const weekStart = startOfWeek(new Date());
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6); weekEnd.setHours(23,59,59,999);
      const next = normalizeGrid(cfg);
      // tyhjennä viikon taulukko
      for (const d of WEEKDAYS) next.timetable[d] = {};
      const kidNames = next.kids;
      const slots = next.timetableSlots;
      for(let kIdx=0;kIdx<kidNames.length;kIdx++){
        const name = kidNames[kIdx];
        const url = next.ics?.[name];
        if(!url) continue;
        try{
          const ics = await fetchICS(url, next.icsProxy);
          const events = parseICS(ics).filter(e=> e.start>=weekStart && e.start<=weekEnd);
          for(const e of events){
            const wd = toWeekdayKey(e.start);
            if(!WEEKDAYS.includes(wd)) continue;
            const label = slotLabelForDateRange(slots, e.start, e.end);
            if(!label) continue;

            if (!next.timetable[wd][label]) next.timetable[wd][label] = Array(kidNames.length).fill("");

            const durMin = Math.round((e.end - e.start) / 60000);
            if (/^onerva$/i.test(name) && durMin >= 70) {
              // kirjoita nykyiseen slottiin
              next.timetable[wd][label][kIdx] = e.summary || "Tunti";
              // kirjoita myös seuraavaan slottiin
              const idx = slots.indexOf(label);
              if (idx >= 0 && idx + 1 < slots.length) {
                const nextLabel = slots[idx + 1];
                if (!next.timetable[wd][nextLabel]) next.timetable[wd][nextLabel] = Array(kidNames.length).fill("");
                next.timetable[wd][nextLabel][kIdx] = e.summary || "Tunti";
              }
            } else {
              next.timetable[wd][label][kIdx] = e.summary || "Tunti";
            }
          }
        }catch(inner){
          setErr(prev=> prev ? prev + " | " + name + ": " + inner.message : (name + ": " + inner.message));
        }
      }
      setCfg(next);
    }finally{ setLoading(false); }
  }

  useEffect(() => {
    const tick = async () => {
      try {
        const now = new Date();
        const isSunday = now.getDay() === 0;
        if (!isSunday) return;
        if (now.getHours() < 12) return;
        const key = now.toISOString().slice(0,10);
        if (lastIcsRun === key) return;
        await pullIcsAll();
        setLastIcsRun(key);
      } catch (e) {}
    };
    tick();
    const id = setInterval(tick, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [lastIcsRun, cfg.ics, cfg.icsProxy, cfg.kids, cfg.timetableSlots]);

  const cfgN = useMemo(()=>normalizeGrid(cfg),[cfg]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6" style={{fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, sans-serif"}}>
      <div className="max-w-6xl mx-auto grid gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl md:text-3xl font-bold">Kodin infonäyttö</div>
            <div className="text-sm text-zinc-400">Sää • Lukujärjestykset (Wilma ICS) • Kello</div>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={()=>setEditing(true)}>Asetukset</Button>
            <Button onClick={pullIcsAll}>Hae lukujärjestykset</Button>
          </div>
        </div>
        {err && <div className="text-sm text-red-400">{err}</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3"><WeatherCard city={cfgN.city} /></div>
          <div className="md:col-span-1"><Card><CardHeader><CardTitle className="text-xl">Kello</CardTitle></CardHeader><CardContent><LiveClock /></CardContent></Card></div>
          <div className="md:col-span-4"><TimetableCard cfg={cfgN} /></div>
        </div>
      </div>

      <SettingsDialog
        open={editing}
        onOpenChange={setEditing}
        config={cfgN}
        setConfig={setCfg}
      />
      {loading && (<div className="fixed bottom-4 right-4 text-xs bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-lg">Haetaan ICS-tietoja…</div>)}
    </div>
  );
}

function SettingsDialog({ open, onOpenChange, config, setConfig }) {
  const safe = useMemo(() => normalizeGrid(config || DEFAULT_CFG), [config]);
  const [local, setLocal] = useState(safe);
  useEffect(()=> setLocal(safe), [safe]);
  const update = (patch) => setLocal((s) => normalizeGrid({ ...(s||{}), ...patch }));
  const save = () => { setConfig(normalizeGrid(local)); onOpenChange(false); };
  const setKid = (idx, val) => update({ kids: (safe.kids || []).map((k, i) => (i === idx ? val : k)) });

  if (!open) return null;
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Asetukset">
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label>Paikkakunta</Label>
          <Input value={local.city || ""} onChange={(e) => update({ city: e.target.value })} placeholder="esim. Raahe" />
        </div>
        <Separator />
        <div className="grid gap-2">
          <Label>Lapset</Label>
          <div className="grid md:grid-cols-3 gap-2">
            {(local.kids || []).map((k, i) => (<Input key={i} value={k} onChange={(e) => setKid(i, e.target.value)} />))}
          </div>
        </div>
        <Separator />
        <div className="grid gap-2">
          <Label>Wilma ICS -linkit</Label>
          <div className="grid md:grid-cols-3 gap-2">
            {(local.kids || []).map((name) => (
              <Input
                key={name}
                placeholder={`${name} – https://...Wilma.ics`}
                value={(local.ics && local.ics[name]) || ""}
                onChange={(e)=>update({ ics: { ...(local.ics || {}), [name]: e.target.value } })}
              />
            ))}
          </div>
          <Label>ICS-proxy (valinnainen, CORS)</Label>
          <Input
            placeholder="esim. https://<nimi>.workers.dev/?url="
            value={local.icsProxy || ""}
            onChange={(e)=>update({ icsProxy: e.target.value })}
          />
          <div className="text-xs text-zinc-400">Jos suorat pyynnöt estetään (CORS), lisää tähän esim. Cloudflare Worker -proxy.</div>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} className="border">Peruuta</Button>
          <Button onClick={save} className="border">Tallenna</Button>
        </div>
      </div>
    </Modal>
  );
}

/* Modal (simple) */
function Modal({ open, onOpenChange, title, children, maxWidth = "max-w-4xl" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={()=>onOpenChange(false)} />
      <div className={`absolute left-1/2 top-10 -translate-x-1/2 w-[95vw] ${maxWidth} rounded-2xl bg-zinc-900 text-zinc-100 shadow-xl`}>
        <div className="p-4 border-b border-zinc-700 font-semibold">{title}</div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}


