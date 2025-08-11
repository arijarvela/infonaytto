\
import React, { useEffect, useMemo, useState, createContext, useContext } from "react";

const OWM_API_KEY = import.meta.env.VITE_OWM_API_KEY || "156f04a68c2cc658949448716a6efec9";

function Card({ className = "", children }) { return <div className={`rounded-2xl border border-zinc-700 shadow-sm bg-zinc-800 text-zinc-100 ${className}`}>{children}</div>; }
function CardHeader({ children }) { return <div className="p-4 border-b border-zinc-700">{children}</div>; }
function CardTitle({ children, className = "" }) { return <div className={`font-semibold ${className}`}>{children}</div>; }
function CardContent({ children, className = "" }) { return <div className={`p-4 ${className}`}>{children}</div>; }
function Button({ children, className = "", ...props }) { return <button className={`px-3 py-2 rounded-xl border border-zinc-600 text-sm bg-zinc-800 hover:bg-zinc-700 ${className}`} {...props}>{children}</button>; }
function Input(props) { return <input {...props} className={`w-full rounded-lg border border-zinc-600 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm ${props.className||""}`} />; }
function Label({ children }) { return <label className="text-sm font-medium text-zinc-200">{children}</label>; }
function ScrollArea({ children, className="" }) { return <div className={`overflow-auto ${className}`}>{children}</div>; }
function Separator() { return <div className="h-px bg-zinc-700 my-2" />; }

const TabsCtx = createContext(null);
function Tabs({ defaultValue, children, className="" }) { const [value, setValue] = useState(defaultValue); return <TabsCtx.Provider value={{ value, setValue }}><div className={className}>{children}</div></TabsCtx.Provider>; }
function TabsList({ children, className="" }) { return <div className={`flex gap-2 ${className}`}>{children}</div>; }
function TabsTrigger({ value, children, className="" }) { const ctx = useContext(TabsCtx); const active = ctx?.value === value; return <button onClick={()=>ctx.setValue(value)} className={`px-3 py-1.5 rounded-lg border border-zinc-600 text-sm ${active?"bg-zinc-700":"bg-zinc-800 hover:bg-zinc-700"} ${className}`}>{children}</button>; }
function TabsContent({ value, children }) { const ctx = useContext(TabsCtx); return ctx?.value === value ? <div className="mt-2">{children}</div> : null; }

function Modal({ open, onOpenChange, title, children, maxWidth = "max-w-5xl" }) { if (!open) return null; return (<div className="fixed inset-0 z-50"><div className="absolute inset-0 bg-black/60" onClick={()=>onOpenChange(false)} /><div className={`absolute left-1/2 top-10 -translate-x-1/2 w-[95vw] ${maxWidth} rounded-2xl bg-zinc-900 text-zinc-100 shadow-xl`}><div className="p-4 border-b border-zinc-700 font-semibold">{title}</div><div className="p-4">{children}</div></div></div>); }

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initialValue; } catch { return initialValue; } });
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

const HOURS = ["8-9","9-10","10-11","11-12","12-13","13-14","14-15","15-16"];
const WEEKDAYS = ["maanantai","tiistai","keskiviikko","torstai","perjantai"];

function normalizeGrid(cfg) {
  const next = { ...cfg };
  if (!Array.isArray(next.kids)) next.kids = ["Onerva","Nanni","Elmeri"];
  if (!Array.isArray(next.timetableSlots)) next.timetableSlots = [...HOURS];
  if (typeof next.timetable !== "object") next.timetable = {};
  for (const d of WEEKDAYS) {
    if (!next.timetable[d]) next.timetable[d] = {};
    for (let s = 0; s < next.timetableSlots.length; s++) {
      const slotLabel = next.timetableSlots[s] || HOURS[s] || `${s}`;
      if (!Array.isArray(next.timetable[d][slotLabel])) {
        next.timetable[d][slotLabel] = Array(next.kids.length).fill("");
      } else if (next.timetable[d][slotLabel].length < next.kids.length) {
        next.timetable[d][slotLabel] = [
          ...next.timetable[d][slotLabel],
          ...Array(Math.max(0, next.kids.length - next.timetable[d][slotLabel].length)).fill("")
        ];
      }
    }
  }
  return next;
}

function TimetableCard({ cfg }) {
  const now = new Date();
  const hour = now.getHours();
  const jsDay = now.getDay();
  const todayIdxBase = jsDay === 0 || jsDay === 6 ? 0 : jsDay - 1;
  const targetIdx = hour >= 18 ? (todayIdxBase + 1) % 5 : todayIdxBase;
  const targetDay = WEEKDAYS[targetIdx];
  const label = hour >= 18 ? `Seuraava päivä – ${targetDay}` : `Tänään – ${targetDay}`;
  const cfgN = normalizeGrid(cfg);
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

function SettingsDialog({ open, onOpenChange, config, setConfig }) {
  const [local, setLocal] = useState(normalizeGrid(config));
  useEffect(() => setLocal(normalizeGrid(config)), [config]);
  const update = (patch) => setLocal((s) => normalizeGrid({ ...s, ...patch }));
  const save = () => { setConfig(normalizeGrid(local)); onOpenChange(false); };
  const setKid = (idx, val) => update({ kids: local.kids.map((k, i) => (i === idx ? val : k)) });
  const setCell = (day, slot, kidIdx, val) => {
    const next = { ...local, timetable: { ...local.timetable } };
    if (!next.timetable[day]) next.timetable[day] = {};
    if (!Array.isArray(next.timetable[day][slot])) next.timetable[day][slot] = Array(next.kids.length).fill("");
    next.timetable[day][slot] = [...next.timetable[day][slot]];
    next.timetable[day][slot][kidIdx] = val;
    update(next);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Asetukset">
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label>Paikkakunta</Label>
          <Input value={local.city} onChange={(e) => update({ city: e.target.value })} placeholder="esim. Oulu" />
        </div>
        <Separator />
        <div className="grid gap-2">
          <Label>Lapset</Label>
          <div className="grid md:grid-cols-3 gap-2">
            {local.kids.map((k, i) => (<Input key={i} value={k} onChange={(e) => setKid(i, e.target.value)} />))}
          </div>
        </div>
        <Separator />
        <div className="grid gap-2">
          <Label>Lukujärjestys (viikko)</Label>
          <Tabs defaultValue={WEEKDAYS[0]} className="w-full">
            <TabsList className="flex flex-wrap">
              {WEEKDAYS.map((d)=> (<TabsTrigger key={d} value={d} className="capitalize">{d}</TabsTrigger>))}
            </TabsList>
            {WEEKDAYS.map((day) => (
              <TabsContent key={day} value={day}>
                <ScrollArea className="h-96 rounded border border-zinc-700">
                  <div className="min-w-[800px]">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 border border-zinc-700 w-28">Aika</th>
                          {local.kids.map((k, i) => (<th key={i} className="p-2 border border-zinc-700">{k}</th>))}
                        </tr>
                      </thead>
                      <tbody>
                        {local.timetableSlots.map((slot) => (
                          <tr key={`${day}-${slot}`}>
                            <td className="p-2 border border-zinc-700 text-center">{slot}</td>
                            {local.kids.map((_, kidIdx) => (
                              <td key={kidIdx} className="p-1 border border-zinc-700">
                                <Input
                                  value={local.timetable?.[day]?.[slot]?.[kidIdx] || ""}
                                  onChange={(e) => setCell(day, slot, kidIdx, e.target.value)}
                                  placeholder="Oppiaine / huomio"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} className="border">Peruuta</Button>
          <Button onClick={save} className="border">Tallenna</Button>
        </div>
      </div>
    </Modal>
  );
}

function LiveClock() { const [now, setNow] = useState(new Date()); useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []); const date = now.toLocaleDateString("fi-FI", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }); const time = now.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); return (<div className="text-center py-2"><div className="text-4xl font-bold tracking-tight">{time}</div><div className="text-sm text-zinc-300 capitalize">{date}</div></div>); }

export default function App() {
  const [cfg, setCfg] = useLocalStorage("home-dashboard-config", normalizeGrid({ city: "Raahe", kids: ["Onerva","Nanni","Elmeri"] }));
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6" style={{fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, sans-serif"}}>
      <div className="max-w-6xl mx-auto grid gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl md:text-3xl font-bold">Kodin infonäyttö</div>
            <div className="text-sm text-zinc-400">Muokattava dashboard tabletin selaimeen</div>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={()=>setOpen(true)}>Asetukset</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2"><WeatherCard city={cfg.city} /></div>
          <div className="md:col-span-1"><Card><CardHeader><CardTitle className="text-xl">Kello</CardTitle></CardHeader><CardContent><LiveClock /></CardContent></Card></div>
          <div className="md:col-span-3"><TimetableCard cfg={cfg} /></div>
        </div>
      </div>
      <SettingsDialog open={open} onOpenChange={setOpen} config={cfg} setConfig={setCfg} />
    </div>
  );
}
