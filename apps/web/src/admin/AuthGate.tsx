import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { authConfigured, supabase } from './supabase';
import { useIdleLogout } from './useIdleLogout';

type Stage =
  | { kind: 'loading' }
  | { kind: 'login' }
  | { kind: 'enroll'; factorId: string; qr: string; secret: string }
  | { kind: 'verify'; factorId: string }
  | { kind: 'ready'; email: string };

/**
 * Acceso al panel (plan 4.4): email + contraseña, segundo factor obligatorio (TOTP) y
 * cierre por inactividad. La API vuelve a exigir aal2 en cada petición: esta pantalla
 * es comodidad, no la barrera de seguridad.
 */
export function AuthGate({ children }: { children: (ctx: { email: string; signOut: () => void }) => ReactNode }) {
  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Decide el paso según el nivel de autenticación de la sesión actual. */
  const resolve = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return setStage({ kind: 'login' });
    const { data: aal, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalErr || !aal) return setStage({ kind: 'login' });
    if (aal.currentLevel === 'aal2') return setStage({ kind: 'ready', email: s.session.user.email ?? '' });

    const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
    if (fErr) return setStage({ kind: 'login' });
    const totp = factors?.totp[0];
    if (totp) return setStage({ kind: 'verify', factorId: totp.id });

    // Primer ingreso: alta del segundo factor.
    const { data: enrolled, error: eErr } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `PRIVAT ${new Date().toISOString()}` });
    if (eErr || !enrolled || enrolled.type !== 'totp') {
      setError('No se pudo iniciar el alta del segundo factor.');
      return setStage({ kind: 'login' });
    }
    setStage({ kind: 'enroll', factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
  }, []);

  useEffect(() => {
    if (authConfigured) void resolve();
  }, [resolve]);

  const signOut = useCallback(async (message?: string) => {
    await supabase.auth.signOut();
    setNotice(message ?? null);
    setStage({ kind: 'login' });
  }, []);

  useIdleLogout(() => {
    if (stage.kind !== 'login' && stage.kind !== 'loading') void signOut('Se cerró la sesión por inactividad.');
  });

  async function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: String(f.get('email') ?? '').trim(),
      password: String(f.get('password') ?? ''),
    });
    setBusy(false);
    // Mensaje genérico: no revela si el email existe.
    if (err) return setError('Email o contraseña incorrectos.');
    await resolve();
  }

  async function onCode(e: FormEvent<HTMLFormElement>, factorId: string) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get('code') ?? '').replace(/\s/g, '');
    if (!/^\d{6}$/.test(code)) return setError('El código tiene 6 dígitos.');
    setBusy(true);
    setError(null);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    const { error: vErr } = ch
      ? await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code })
      : { error: chErr };
    setBusy(false);
    if (vErr) return setError('Código incorrecto o vencido.');
    await resolve();
  }

  if (!authConfigured) {
    return <Card title="Panel no configurado"><p>Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</p></Card>;
  }
  if (stage.kind === 'ready') return <>{children({ email: stage.email, signOut: () => void signOut() })}</>;
  if (stage.kind === 'loading') return <Card title="Panel PRIVAT"><p role="status">Cargando…</p></Card>;

  return (
    <Card title={stage.kind === 'login' ? 'Ingresar al panel' : 'Segundo factor'}>
      {notice && <p className="mb-4 rounded-md bg-background p-3 text-sm" role="status">{notice}</p>}
      {stage.kind === 'login' && (
        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required className="field" />
          </div>
          <div>
            <label htmlFor="password" className="label">Contraseña</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        </form>
      )}
      {stage.kind === 'enroll' && (
        <form onSubmit={(e) => void onCode(e, stage.factorId)} className="space-y-4">
          <p className="text-sm">
            Escanea el código con una app autenticadora (Google Authenticator, Microsoft Authenticator, 1Password…) e
            ingresa el código de 6 dígitos.
          </p>
          <img src={stage.qr} alt="Código QR para la app autenticadora" className="mx-auto h-48 w-48 bg-surface p-2" />
          <details className="text-sm">
            <summary className="cursor-pointer">¿No puedes escanear? Clave manual</summary>
            <code className="mt-2 block break-all rounded bg-background p-2">{stage.secret}</code>
          </details>
          <CodeInput busy={busy} />
        </form>
      )}
      {stage.kind === 'verify' && (
        <form onSubmit={(e) => void onCode(e, stage.factorId)} className="space-y-4">
          <p className="text-sm">Ingresa el código de 6 dígitos de tu app autenticadora.</p>
          <CodeInput busy={busy} />
          <button type="button" className="btn-secondary w-full" onClick={() => void signOut()}>Salir</button>
        </form>
      )}
      {error && <p className="mt-4 font-semibold text-error" role="alert"><span aria-hidden="true">⚠ </span>{error}</p>}
    </Card>
  );
}

function CodeInput({ busy }: { busy: boolean }) {
  return (
    <>
      <div>
        <label htmlFor="code" className="label">Código</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required className="field text-center text-xl tracking-[0.4em]" />
      </div>
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Verificando…' : 'Verificar'}</button>
    </>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-sm md:p-8">
        <p className="mb-2 text-sm font-bold tracking-[0.2em] text-text-secondary">PRIVAT</p>
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
