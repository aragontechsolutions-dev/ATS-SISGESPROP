import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { adminJson, send } from '../http';
import { emptyValue, SECTIONS, type FieldMeta } from '../fields';
import { Alert, errorStatus, PageTitle, Panel, TextField, useLoad, type Status } from '../ui';

interface ContentData {
  sections: Record<string, Record<string, unknown>>;
  missingSections: string[];
  services: Array<{ level: number; name: string; description: string; items: string[] }>;
  faq: Array<{ id: string; question: string; answer: string; sortOrder: number; visible: boolean }>;
  testimonials: Array<{ id: string; author: string; text: string; authorizedAt: string; visible: boolean }>;
}

export function ContentPage() {
  const load = useCallback(() => adminJson<ContentData>('/admin/content'), []);
  const { data, status, reload } = useLoad(load);
  const [current, setCurrent] = useState(SECTIONS[0]!.id);

  if (!data) return status ? <Alert {...status} /> : <p role="status">Cargando…</p>;
  const section = SECTIONS.find((s) => s.id === current)!;

  return (
    <>
      <PageTitle hint="Los cambios se guardan como borrador. Llegan a la web al pulsar Publicar.">Contenidos</PageTitle>
      {data.missingSections.length > 0 && (
        <Alert kind="info" message="Secciones sin contenido (no se puede publicar hasta completarlas):" details={data.missingSections} />
      )}
      <div className="mt-4 grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Secciones">
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={s.id === current ? 'true' : undefined}
                  onClick={() => setCurrent(s.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${s.id === current ? 'bg-primary text-text-on-dark' : 'hover:bg-surface'}`}
                >
                  {s.title}
                  {data.missingSections.includes(s.id) && <span className="ml-1 text-xs">(vacía)</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <SectionForm key={section.id} section={section} initial={data.sections[section.id]} onSaved={reload} />
          {section.id === 'services' && <ServiceLevels services={data.services} onSaved={reload} />}
        </div>
      </div>
      <FaqEditor items={data.faq} onChanged={reload} />
      <TestimonialEditor items={data.testimonials} onChanged={reload} />
    </>
  );
}

// ---------------- Editor genérico de sección ----------------

function SectionForm({ section, initial, onSaved }: { section: (typeof SECTIONS)[number]; initial?: Record<string, unknown>; onSaved: () => void }) {
  const build = () => Object.fromEntries(section.fields.map((f) => [f.key, initial?.[f.key] ?? emptyValue(f)]));
  const [value, setValue] = useState<Record<string, unknown>>(build);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setValue(build()), [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await adminJson(`/admin/content/sections/${section.id}`, send('PUT', { value }));
      setStatus({ kind: 'ok', message: 'Guardado en borrador.' });
      onSaved();
    } catch (err) {
      setStatus(errorStatus(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={section.title}>
      <form onSubmit={save} className="space-y-4">
        {section.fields.map((f) => (
          <FieldInput key={f.key} id={`${section.id}-${f.key}`} field={f} value={value[f.key]} onChange={(v) => setValue({ ...value, [f.key]: v })} />
        ))}
        <button className="btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar borrador'}</button>
        {status && <Alert {...status} />}
      </form>
    </Panel>
  );
}

function FieldInput({ id, field, value, onChange }: { id: string; field: FieldMeta; value: unknown; onChange: (v: unknown) => void }) {
  switch (field.kind) {
    case 'text':
    case 'textarea':
      return (
        <TextField id={id} label={field.label} hint={field.hint} value={(value as string | null) ?? ''} maxLength={field.max}
          multiline={field.kind === 'textarea'} onChange={(v) => onChange(field.optional && v === '' ? null : v)} />
      );
    case 'url':
    case 'email':
      return <TextField id={id} label={field.label} type={field.kind} value={(value as string | null) ?? ''} onChange={(v) => onChange(v === '' ? null : v)} />;
    case 'bool':
      return (
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    case 'enum':
      return (
        <div>
          <label htmlFor={id} className="label">{field.label}</label>
          <select id={id} className="field" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    case 'list': {
      const list = (value as string[]) ?? [];
      return (
        <fieldset className="rounded-md border border-border p-3">
          <legend className="px-1 text-sm font-semibold">{field.label}</legend>
          {list.map((item, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input aria-label={`${field.label} ${i + 1}`} className="field" value={item} maxLength={field.max}
                onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />
              <button type="button" className="btn-secondary" onClick={() => onChange(list.filter((_, j) => j !== i))}>Quitar</button>
            </div>
          ))}
          {list.length < field.maxItems && <button type="button" className="btn-secondary" onClick={() => onChange([...list, ''])}>Agregar</button>}
        </fieldset>
      );
    }
    case 'objectList': {
      const list = (value as Array<Record<string, unknown>>) ?? [];
      return (
        <fieldset className="rounded-md border border-border p-3">
          <legend className="px-1 text-sm font-semibold">{field.label}</legend>
          {list.map((item, i) => (
            <div key={i} className="mb-4 space-y-2 border-b border-border pb-4">
              {field.fields.map((sub) => (
                <FieldInput key={sub.key} id={`${id}-${i}-${sub.key}`} field={sub} value={item[sub.key]}
                  onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, [sub.key]: v } : x)))} />
              ))}
              <button type="button" className="btn-secondary" onClick={() => onChange(list.filter((_, j) => j !== i))}>Quitar</button>
            </div>
          ))}
          {list.length < field.maxItems && (
            <button type="button" className="btn-secondary" onClick={() => onChange([...list, Object.fromEntries(field.fields.map((s) => [s.key, emptyValue(s)]))])}>Agregar</button>
          )}
        </fieldset>
      );
    }
  }
}

// ---------------- Niveles de servicio ----------------

function ServiceLevels({ services, onSaved }: { services: ContentData['services']; onSaved: () => void }) {
  return (
    <>
      {services.map((s) => <ServiceLevelForm key={s.level} service={s} onSaved={onSaved} />)}
    </>
  );
}

function ServiceLevelForm({ service, onSaved }: { service: ContentData['services'][number]; onSaved: () => void }) {
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description);
  const [items, setItems] = useState(service.items.join('\n'));
  const [status, setStatus] = useState<Status>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await adminJson(`/admin/content/service-levels/${service.level}`, send('PUT', { name, description, items: items.split('\n').map((i) => i.trim()).filter(Boolean) }));
      setStatus({ kind: 'ok', message: 'Guardado en borrador.' });
      onSaved();
    } catch (err) {
      setStatus(errorStatus(err));
    }
  }
  const id = `lvl${service.level}`;
  return (
    <Panel title={`Nivel ${service.level}`}>
      <form onSubmit={save} className="space-y-3">
        <TextField id={`${id}-name`} label="Nombre" value={name} onChange={setName} maxLength={80} required />
        <TextField id={`${id}-desc`} label="Descripción" value={description} onChange={setDescription} maxLength={400} multiline required />
        <TextField id={`${id}-items`} label="Qué incluye (una línea por ítem)" value={items} onChange={setItems} multiline />
        <button className="btn-primary">Guardar borrador</button>
        {status && <Alert {...status} />}
      </form>
    </Panel>
  );
}

// ---------------- Preguntas frecuentes ----------------

function FaqEditor({ items, onChanged }: { items: ContentData['faq']; onChanged: () => void }) {
  const [status, setStatus] = useState<Status>(null);
  const empty = { question: '', answer: '', sortOrder: items.length + 1, visible: true };
  const [draft, setDraft] = useState(empty);

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      setStatus({ kind: 'ok', message: ok });
      onChanged();
    } catch (err) {
      setStatus(errorStatus(err));
    }
  }

  return (
    <Panel title="Preguntas frecuentes (sin preguntas, la sección no se muestra)">
      <ul className="mb-4 divide-y divide-border">
        {items.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>{f.sortOrder}. {f.question} {!f.visible && <em className="text-text-secondary">(oculta)</em>}</span>
            <span className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => void run(() => adminJson(`/admin/content/faq/${f.id}`, send('PUT', { question: f.question, answer: f.answer, sortOrder: f.sortOrder, visible: !f.visible })), 'Actualizada.')}>
                {f.visible ? 'Ocultar' : 'Mostrar'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => window.confirm('¿Eliminar la pregunta?') && void run(() => adminJson(`/admin/content/faq/${f.id}`, { method: 'DELETE' }), 'Eliminada.')}>Eliminar</button>
            </span>
          </li>
        ))}
      </ul>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(() => adminJson('/admin/content/faq', send('POST', draft)), 'Pregunta agregada.').then(() => setDraft(empty)); }}>
        <TextField id="faq-q" label="Pregunta" value={draft.question} onChange={(v) => setDraft({ ...draft, question: v })} maxLength={200} required />
        <TextField id="faq-a" label="Respuesta" value={draft.answer} onChange={(v) => setDraft({ ...draft, answer: v })} maxLength={2000} multiline required />
        <button className="btn-primary">Agregar pregunta</button>
      </form>
      {status && <div className="mt-3"><Alert {...status} /></div>}
    </Panel>
  );
}

// ---------------- Testimonios ----------------

function TestimonialEditor({ items, onChanged }: { items: ContentData['testimonials']; onChanged: () => void }) {
  const [status, setStatus] = useState<Status>(null);
  const empty = { author: '', text: '', authorizedAt: '', visible: false };
  const [draft, setDraft] = useState(empty);

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      setStatus({ kind: 'ok', message: ok });
      onChanged();
    } catch (err) {
      setStatus(errorStatus(err));
    }
  }

  return (
    <Panel title="Testimonios (solo reales y con autorización escrita del autor)">
      <ul className="mb-4 divide-y divide-border">
        {items.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>{t.author} · autorizado el {t.authorizedAt.slice(0, 10)} {!t.visible && <em className="text-text-secondary">(oculto)</em>}</span>
            <span className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => void run(() => adminJson(`/admin/content/testimonials/${t.id}`, send('PUT', { author: t.author, text: t.text, authorizedAt: t.authorizedAt.slice(0, 10), visible: !t.visible })), 'Actualizado.')}>
                {t.visible ? 'Ocultar' : 'Publicar'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => window.confirm('¿Eliminar el testimonio?') && void run(() => adminJson(`/admin/content/testimonials/${t.id}`, { method: 'DELETE' }), 'Eliminado.')}>Eliminar</button>
            </span>
          </li>
        ))}
      </ul>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(() => adminJson('/admin/content/testimonials', send('POST', draft)), 'Testimonio agregado.').then(() => setDraft(empty)); }}>
        <TextField id="t-author" label="Autor" value={draft.author} onChange={(v) => setDraft({ ...draft, author: v })} maxLength={120} required />
        <TextField id="t-text" label="Texto" value={draft.text} onChange={(v) => setDraft({ ...draft, text: v })} maxLength={1000} multiline required />
        <TextField id="t-date" label="Fecha de la autorización del autor" type="date" value={draft.authorizedAt} onChange={(v) => setDraft({ ...draft, authorizedAt: v })} required />
        <label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={draft.visible} onChange={(e) => setDraft({ ...draft, visible: e.target.checked })} /> Visible al publicar</label>
        <button className="btn-primary">Agregar testimonio</button>
      </form>
      {status && <div className="mt-3"><Alert {...status} /></div>}
    </Panel>
  );
}
