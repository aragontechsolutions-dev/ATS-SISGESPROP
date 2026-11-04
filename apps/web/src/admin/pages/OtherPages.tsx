import { useCallback, useState } from 'react';
import { adminFetch, adminJson, send } from '../http';
import { Alert, downloadBlob, errorStatus, PageTitle, Panel, useLoad, type Status } from '../ui';

const fmtDate = (d: string) => new Date(d).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' });

// ---------------- Consultas ----------------

interface Lead {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string | null;
  propertyType: string | null;
  message: string | null;
  status: 'NUEVA' | 'CONTACTADA' | 'CERRADA';
  simulation: { serviceLevel: number; lowFee: string; highFee: string; annualFee: string; distanceKm: string } | null;
}
const STATUS_LABEL = { NUEVA: 'Nueva', CONTACTADA: 'Contactada', CERRADA: 'Cerrada' } as const;

export function LeadsPage() {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const load = useCallback(
    () => adminJson<{ total: number; page: number; pageSize: number; items: Lead[] }>(`/admin/leads?page=${page}${filter ? `&status=${filter}` : ''}`),
    [filter, page],
  );
  const { data, status: loadStatus, reload } = useLoad(load);
  const [status, setStatus] = useState<Status>(null);

  async function changeStatus(id: string, value: string) {
    try {
      await adminJson(`/admin/leads/${id}/status`, send('PATCH', { status: value }));
      setStatus({ kind: 'ok', message: 'Estado actualizado.' });
      void reload();
    } catch (e) {
      setStatus(errorStatus(e));
    }
  }

  async function exportCsv() {
    try {
      const res = await adminFetch(`/admin/leads/export.csv${filter ? `?status=${filter}` : ''}`);
      downloadBlob(await res.blob(), `consultas-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e) {
      setStatus(errorStatus(e));
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <>
      <PageTitle hint="Datos personales (Ley 18.331): úsalos solo para responder la consulta. Cada exportación queda registrada.">Consultas recibidas</PageTitle>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="lead-filter" className="label">Estado</label>
          <select id="lead-filter" className="field" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
            <option value="">Todas</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button type="button" className="btn-secondary" onClick={() => void exportCsv()}>Exportar CSV</button>
      </div>
      {loadStatus && <div className="mb-4"><Alert {...loadStatus} /></div>}
      {status && <div className="mb-4"><Alert {...status} /></div>}
      {!data ? <p role="status">Cargando…</p> : data.items.length === 0 ? <p>No hay consultas.</p> : (
        <ul className="space-y-3">
          {data.items.map((l) => (
            <li key={l.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{l.name}</p>
                  <p className="text-sm"><a className="underline" href={`mailto:${l.email}`}>{l.email}</a>{l.phone && ` · ${l.phone}`}</p>
                  <p className="text-sm text-text-secondary">{fmtDate(l.createdAt)}{l.propertyType && ` · ${l.propertyType}`}</p>
                </div>
                <div>
                  <label htmlFor={`st-${l.id}`} className="sr-only">Estado de la consulta de {l.name}</label>
                  <select id={`st-${l.id}`} className="field" value={l.status} onChange={(e) => void changeStatus(l.id, e.target.value)}>
                    {Object.entries(STATUS_LABEL).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
                  </select>
                </div>
              </div>
              {/* React escapa el texto: el mensaje del formulario público nunca se interpreta como HTML. */}
              {l.message && <p className="mt-2 whitespace-pre-wrap text-sm">{l.message}</p>}
              {l.simulation && (
                <p className="mt-2 text-sm">
                  Simulación: nivel {l.simulation.serviceLevel} · baja USD {l.simulation.lowFee} · alta USD {l.simulation.highFee} · anual USD {l.simulation.annualFee} · {l.simulation.distanceKm} km
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {data && pages > 1 && (
        <nav aria-label="Páginas" className="mt-4 flex items-center gap-3">
          <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
          <span>Página {page} de {pages}</span>
          <button type="button" className="btn-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</button>
        </nav>
      )}
    </>
  );
}

// ---------------- Publicar ----------------

interface Publication { id: string; publishedAt: string; publishedBy: string; hasPricing: boolean }

export function PublishPage() {
  const load = useCallback(() => adminJson<Publication[]>('/admin/publications'), []);
  const { data, status: loadStatus, reload } = useLoad(load);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  async function run(path: string, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const r = await adminJson<{ deploy: string; warnings: string[] }>(path, { method: 'POST' });
      setStatus({ kind: 'ok', message: 'Publicado.', details: r.warnings });
      void reload();
    } catch (e) {
      setStatus(errorStatus(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle hint="Publicar copia el borrador (contenidos y precios) a la web y al cotizador. Queda registro de quién publicó y cuándo.">Publicar</PageTitle>
      <Panel title="Publicar el borrador actual">
        <p className="mb-4 text-sm">Antes de publicar, prueba los precios con la simulación de prueba (Precios y viáticos).</p>
        <button type="button" className="btn-primary" disabled={busy}
          onClick={() => void run('/admin/publications', '¿Publicar el borrador? Los cambios llegarán a la web y al cotizador.')}>
          {busy ? 'Publicando…' : 'Publicar'}
        </button>
      </Panel>
      {status && <div className="mb-6"><Alert {...status} /></div>}
      {loadStatus && <div className="mb-6"><Alert {...loadStatus} /></div>}
      <Panel title="Historial de publicaciones">
        {!data ? <p role="status">Cargando…</p> : data.length === 0 ? <p>Todavía no se publicó nada.</p> : (
          <ul className="divide-y divide-border">
            {data.map((p, i) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  {fmtDate(p.publishedAt)} · {p.publishedBy} · {p.hasPricing ? 'con precios' : 'sin precios'}
                  {i === 0 && <strong className="ml-2">(vigente)</strong>}
                </span>
                {i > 0 && (
                  <button type="button" className="btn-secondary" disabled={busy}
                    onClick={() => void run(`/admin/publications/${p.id}/restore`, '¿Volver a esta versión? Se publicará de nuevo tal como estaba.')}>
                    Restaurar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

// ---------------- Registro de cambios ----------------

interface AuditItem { id: string; createdAt: string; actor: string | null; action: string; entity: string; entityId: string; before: unknown; after: unknown }

export function AuditPage() {
  const [page, setPage] = useState(1);
  const load = useCallback(() => adminJson<{ total: number; pageSize: number; items: AuditItem[] }>(`/admin/audit?page=${page}`), [page]);
  const { data, status } = useLoad(load);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <>
      <PageTitle hint="Quién cambió qué y cuándo. Este registro no se puede modificar ni borrar.">Registro de cambios</PageTitle>
      {status && <Alert {...status} />}
      {!data ? <p role="status">Cargando…</p> : (
        <ul className="space-y-2">
          {data.items.map((a) => (
            <li key={a.id} className="rounded-md border border-border bg-surface p-3 text-sm">
              <p><strong>{a.action}</strong> · {a.entity} {a.entityId} · {a.actor ?? 'sistema'} · {fmtDate(a.createdAt)}</p>
              <details className="mt-1">
                <summary className="cursor-pointer text-text-secondary">Ver antes / después</summary>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <pre className="overflow-x-auto rounded bg-background p-2 text-xs">{JSON.stringify(a.before, null, 2)}</pre>
                  <pre className="overflow-x-auto rounded bg-background p-2 text-xs">{JSON.stringify(a.after, null, 2)}</pre>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      {data && pages > 1 && (
        <nav aria-label="Páginas" className="mt-4 flex items-center gap-3">
          <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
          <span>Página {page} de {pages}</span>
          <button type="button" className="btn-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</button>
        </nav>
      )}
    </>
  );
}
