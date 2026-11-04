import { lazy, Suspense, useCallback, useState, type FormEvent } from 'react';
import { adminJson, send } from '../http';
import { Alert, errorStatus, PageTitle, Panel, TextField, useLoad, type Status } from '../ui';

const MapView = lazy(() => import('../../components/MapView'));

const PROFILE_FIELDS: Array<[key: string, label: string, hint?: string]> = [
  ['visitsPerMonth', 'Visitas por mes'],
  ['hoursPerVisit', 'Horas por visita'],
  ['travelHours', 'Horas de traslado por visita'],
  ['adminHours', 'Horas de administración (mes)'],
  ['coordHours', 'Horas de coordinación (mes)'],
  ['staffHours', 'Horas de gestión de personal (mes)'],
  ['hourlyRate', 'Valor hora (USD)'],
  ['fixedCosts', 'Gastos fijos (USD/mes)'],
  ['premiumPct', 'Prima', 'Fracción: 0.2 = 20 %'],
  ['highCoef', 'Coeficiente de temporada alta', 'Ej. 2 = el doble'],
  ['highMonths', 'Meses de temporada alta', '0 a 12; admite 2.5'],
];

type Profile = Record<string, string> & { propertyTypeCode: string; serviceLevel: number };
interface Travel { baseLabel: string; baseLat: number; baseLng: number; freeRadiusKm: string; routeFactor: string; costPerKm: string; mode: 'POR_KM' }
interface PricingData {
  propertyTypes: Array<{ code: string; name: string }>;
  profiles: Profile[];
  travel: Travel | null;
  params: Record<string, string>;
  configuredProfiles: number;
  totalProfiles: number;
}

export function PricingPage() {
  const load = useCallback(() => adminJson<PricingData>('/admin/pricing'), []);
  const { data, status, reload } = useLoad(load);
  const [editing, setEditing] = useState<{ code: string; level: number } | null>(null);
  if (!data) return status ? <Alert {...status} /> : <p role="status">Cargando…</p>;

  const find = (code: string, level: number) => data.profiles.find((p) => p.propertyTypeCode === code && p.serviceLevel === level);

  return (
    <>
      <PageTitle hint="Información comercial sensible: nunca se muestra en la web. Los cambios llegan al cotizador al publicar.">Precios y viáticos</PageTitle>
      <Panel title={`Perfiles de cálculo (${data.configuredProfiles} de ${data.totalProfiles} configurados)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th scope="col" className="p-2 text-left">Tipo de propiedad</th>{[1, 2, 3].map((l) => <th key={l} scope="col" className="p-2">Nivel {l}</th>)}</tr></thead>
            <tbody>
              {data.propertyTypes.map((t) => (
                <tr key={t.code} className="border-t border-border">
                  <th scope="row" className="p-2 text-left font-normal">{t.name}</th>
                  {[1, 2, 3].map((l) => {
                    const p = find(t.code, l);
                    return (
                      <td key={l} className="p-2 text-center">
                        <button type="button" className="btn-secondary min-h-9 px-3 py-1 text-sm" onClick={() => setEditing({ code: t.code, level: l })}
                          aria-label={`${p ? 'Editar' : 'Configurar'} ${t.name} nivel ${l}`}>
                          {p ? `✓ ${p.hourlyRate} USD/h` : 'Configurar'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editing && (
          <ProfileForm key={`${editing.code}-${editing.level}`} code={editing.code} level={editing.level}
            typeName={data.propertyTypes.find((t) => t.code === editing.code)?.name ?? editing.code}
            initial={find(editing.code, editing.level)} onDone={() => { setEditing(null); void reload(); }} />
        )}
      </Panel>
      <TravelForm initial={data.travel} onSaved={reload} />
      <ParamsForm params={data.params} onSaved={reload} />
      <TestSimulation types={data.propertyTypes} travel={data.travel} />
    </>
  );
}

function ProfileForm({ code, level, typeName, initial, onDone }: { code: string; level: number; typeName: string; initial?: Profile; onDone: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(PROFILE_FIELDS.map(([k]) => [k, initial?.[k] ?? ''])));
  const [status, setStatus] = useState<Status>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await adminJson(`/admin/pricing/profiles/${code}/${level}`, send('PUT', values));
      onDone();
    } catch (err) {
      setStatus(errorStatus(err));
    }
  }
  return (
    <form onSubmit={save} className="mt-6 rounded-md border border-border p-4">
      <h3 className="mb-4 font-bold">{typeName} · Nivel {level}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PROFILE_FIELDS.map(([k, label, hint]) => (
          <TextField key={k} id={`p-${k}`} label={label} hint={hint} value={values[k] ?? ''} inputMode="decimal"
            onChange={(v) => setValues({ ...values, [k]: v.replace(',', '.') })} required />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-primary">Guardar perfil</button>
        <button type="button" className="btn-secondary" onClick={onDone}>Cancelar</button>
        {initial && (
          <button type="button" className="btn-secondary" onClick={async () => {
            if (!window.confirm('¿Eliminar este perfil? El cotizador mostrará "sin tarifa" para esta combinación al publicar.')) return;
            try { await adminJson(`/admin/pricing/profiles/${code}/${level}`, { method: 'DELETE' }); onDone(); } catch (err) { setStatus(errorStatus(err)); }
          }}>Eliminar perfil</button>
        )}
      </div>
      {status && <div className="mt-3"><Alert {...status} /></div>}
    </form>
  );
}

function TravelForm({ initial, onSaved }: { initial: Travel | null; onSaved: () => void }) {
  const [v, setV] = useState<Travel>(initial ?? { baseLabel: '', baseLat: -34.9, baseLng: -54.95, freeRadiusKm: '0', routeFactor: '1.3', costPerKm: '0.35', mode: 'POR_KM' });
  const [picked, setPicked] = useState(Boolean(initial));
  const [status, setStatus] = useState<Status>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!picked) return setStatus({ kind: 'error', message: 'Marca la base de operaciones en el mapa.' });
    try {
      await adminJson('/admin/pricing/travel', send('PUT', v));
      setStatus({ kind: 'ok', message: 'Viáticos guardados en borrador.' });
      onSaved();
    } catch (err) {
      setStatus(errorStatus(err));
    }
  }
  return (
    <Panel title="Viáticos y base de operaciones">
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3">
          <TextField id="t-label" label="Nombre de la base" value={v.baseLabel} onChange={(x) => setV({ ...v, baseLabel: x })} maxLength={80} required />
          <p className="text-sm">{picked ? `Ubicación: ${v.baseLat.toFixed(5)}, ${v.baseLng.toFixed(5)}` : 'Haz clic en el mapa para marcar la base.'}</p>
          <TextField id="t-radius" label="Radio sin cargo (km)" value={v.freeRadiusKm} onChange={(x) => setV({ ...v, freeRadiusKm: x.replace(',', '.') })} required />
          <TextField id="t-factor" label="Factor de ruta" hint="Entre 1 y 3. Valor inicial 1.3, a calibrar con trayectos reales (P-4)." value={v.routeFactor} onChange={(x) => setV({ ...v, routeFactor: x.replace(',', '.') })} required />
          <TextField id="t-cost" label="Costo por km (USD)" value={v.costPerKm} onChange={(x) => setV({ ...v, costPerKm: x.replace(',', '.') })} required />
          <p className="text-xs text-text-secondary">Modo: por km. El cobro por tramos se habilitará cuando se defina la regla (P-3).</p>
          <button className="btn-primary">Guardar viáticos</button>
          {status && <Alert {...status} />}
        </div>
        <Suspense fallback={<p>Cargando mapa…</p>}>
          <MapView
            base={picked ? { baseLabel: v.baseLabel || 'Base', baseLat: v.baseLat, baseLng: v.baseLng } : null}
            point={null}
            onPick={(p) => { setV({ ...v, baseLat: p.lat, baseLng: p.lng }); setPicked(true); }}
            onOutside={() => setStatus({ kind: 'error', message: 'La base debe estar en Uruguay.' })}
          />
        </Suspense>
      </form>
    </Panel>
  );
}

function ParamsForm({ params, onSaved }: { params: Record<string, string>; onSaved: () => void }) {
  const [tol, setTol] = useState(params.TERRITORY_TOLERANCE_KM ?? '2');
  const [status, setStatus] = useState<Status>(null);
  return (
    <Panel title="Parámetros generales">
      <form className="max-w-sm space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        try { await adminJson('/admin/pricing/params/TERRITORY_TOLERANCE_KM', send('PUT', { value: tol })); setStatus({ kind: 'ok', message: 'Guardado en borrador.' }); onSaved(); } catch (err) { setStatus(errorStatus(err)); }
      }}>
        <TextField id="tol" label="Tolerancia de borde de Uruguay (km)" hint="0 a 20. Compensa la simplificación de la costa del mapa (ADR-006)." value={tol} onChange={(v) => setTol(v.replace(',', '.'))} required />
        <button className="btn-primary">Guardar</button>
        {status && <Alert {...status} />}
      </form>
    </Panel>
  );
}

function TestSimulation({ types, travel }: { types: PricingData['propertyTypes']; travel: Travel | null }) {
  const [code, setCode] = useState(types[0]?.code ?? '');
  const [level, setLevel] = useState(1);
  const [lat, setLat] = useState(String(travel?.baseLat ?? ''));
  const [lng, setLng] = useState(String(travel?.baseLng ?? ''));
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<Status>(null);
  return (
    <Panel title="Simulación de prueba (con el borrador; no se guarda)">
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={async (e) => {
        e.preventDefault();
        setResult(null);
        try {
          setResult(await adminJson('/admin/pricing/test-simulation', send('POST', { propertyTypeCode: code, serviceLevel: level, lat: Number(lat), lng: Number(lng) })));
          setStatus(null);
        } catch (err) { setStatus(errorStatus(err)); }
      }}>
        <div>
          <label htmlFor="ts-type" className="label">Tipo</label>
          <select id="ts-type" className="field" value={code} onChange={(e) => setCode(e.target.value)}>{types.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}</select>
        </div>
        <div>
          <label htmlFor="ts-level" className="label">Nivel</label>
          <select id="ts-level" className="field" value={level} onChange={(e) => setLevel(Number(e.target.value))}>{[1, 2, 3].map((l) => <option key={l} value={l}>{l}</option>)}</select>
        </div>
        <TextField id="ts-lat" label="Latitud" value={lat} onChange={setLat} required />
        <TextField id="ts-lng" label="Longitud" value={lng} onChange={setLng} required />
        <div className="sm:col-span-2 lg:col-span-4"><button className="btn-primary">Simular</button></div>
      </form>
      {status && <div className="mt-3"><Alert {...status} /></div>}
      {result && (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3" data-testid="test-sim-result">
          {([
            ['totalHours', 'Horas totales (mes)'],
            ['distanceKm', 'Distancia por ruta (km)'],
            ['billableKm', 'Km facturables por visita'],
            ['travelCostMonthly', 'Viático mensual (USD)'],
            ['lowFee', 'Abono temporada baja (USD)'],
            ['highFee', 'Abono temporada alta (USD)'],
            ['annualFee', 'Total anual (USD)'],
          ] as const).map(([k, label]) => (
            <div key={k} className="rounded-md bg-background p-3"><dt className="text-text-secondary">{label}</dt><dd className="text-lg font-bold">{String(result[k])}</dd></div>
          ))}
        </dl>
      )}
    </Panel>
  );
}
