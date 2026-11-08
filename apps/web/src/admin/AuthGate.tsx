import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { authConfigured, supabase } from './supabase';
import { useIdleLogout } from './useIdleLogout';
import { Logo } from '../components/Logo';

type Stage =
  | { kind: 'loading' }
  | { kind: 'login' }
  | { kind: 'forgot' }
  | { kind: 'recoverCode'; email: string }
  | { kind: 'enroll'; factorId: string; qr: string; secret: string }
  | { kind: 'verify'; factorId: string }
  | { kind: 'newPassword' }
  | { kind: 'ready'; email: string };

/** Largo mínimo de la contraseña nueva (Supabase Auth limita el máximo a 72 bytes por bcrypt). */
export const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 72;

const TITLES: Record<Exclude<Stage['kind'], 'ready' | 'loading'>, string> = {
  login: 'Ingresar al panel',
  forgot: 'Recuperar contraseña',
  recoverCode: 'Código de recuperación',
  enroll: 'Segundo factor',
  verify: 'Segundo factor',
  newPassword: 'Nueva contraseña',
};

/**
 * Acceso al panel (plan 4.4): email + contraseña, segundo factor obligatorio (TOTP) y
 * cierre por inactividad. La API vuelve a exigir aal2 en cada petición: esta pantalla
 * es comodidad, no la barrera de seguridad.
 *
 * Recuperación de contraseña (docs/adr/ADR-016): código enviado por email (no un enlace:
 * ningún token viaja en la URL) → segundo factor (TOTP) → contraseña nueva → se cierran
 * todas las sesiones. Supabase Auth exige aal2 para cambiar la contraseña de un usuario con
 * 2FA, así que quien solo controle el email no puede cambiarla.
 */
export function AuthGate({ children }: { children: (ctx: { email: string; signOut: () => void }) => ReactNode }) {
  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** true entre el código de recuperación válido y el cambio de contraseña. */
  const recovering = useRef(false);

  /** Decide el paso según el nivel de autenticación de la sesión actual. */
  const resolve = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return setStage({ kind: 'login' });
    const { data: aal, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalErr || !aal) return setStage({ kind: 'login' });
    if (aal.currentLevel === 'aal2') {
      if (recovering.current) return setStage({ kind: 'newPassword' });
      return setStage({ kind: 'ready', email: s.session.user.email ?? '' });
    }

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
    recovering.current = false;
    await supabase.auth.signOut();
    setError(null);
    setNotice(message ?? null);
    setStage({ kind: 'login' });
  }, []);

  useIdleLogout(() => {
    if (stage.kind !== 'login' && stage.kind !== 'loading') void signOut('Se cerró la sesión por inactividad.');
  });

  function go(next: Stage) {
    setError(null);
    setNotice(null);
    setStage(next);
  }

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

  async function onForgot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email);
    setBusy(false);
    // Solo se distingue el exceso de intentos; cualquier otro caso muestra el mismo mensaje
    // para no revelar qué emails tienen cuenta.
    if (err?.status === 429) return setError('Demasiados intentos. Espera unos minutos y vuelve a probar.');
    setStage({ kind: 'recoverCode', email });
    setNotice('Si el email corresponde a una cuenta del panel, te enviamos un código. Revisa tu correo, también la carpeta de spam.');
  }

  async function onRecoverCode(e: FormEvent<HTMLFormElement>, email: string) {
    e.preventDefault();
    const token = String(new FormData(e.currentTarget).get('recovery-code') ?? '').replace(/\s/g, '');
    if (!/^\d{6,10}$/.test(token)) return setError('Ingresa el código numérico que llegó por email.');
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
    setBusy(false);
    if (err) return setError('Código incorrecto o vencido. Puedes pedir uno nuevo.');
    recovering.current = true;
    setNotice(null);
    // Con el código válido la sesión es aal1: resolve() pide el segundo factor antes de la contraseña.
    await resolve();
  }

  async function onNewPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get('new-password') ?? '');
    const confirm = String(f.get('confirm-password') ?? '');
    const problem = passwordProblem(password, confirm);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      if (err.code === 'same_password') return setError('La contraseña nueva debe ser distinta de la anterior.');
      if (err.code === 'weak_password') return setError('La contraseña no cumple los requisitos de seguridad. Usa una más larga y variada.');
      if (err.code === 'insufficient_aal') return void signOut('Falta el segundo factor. Vuelve a empezar la recuperación.');
      return setError('No se pudo cambiar la contraseña. Intenta de nuevo.');
    }
    // signOut() cierra TODAS las sesiones (alcance global): si alguien más tenía una abierta, la pierde.
    await signOut('Contraseña actualizada. Se cerraron todas las sesiones: ingresa con la contraseña nueva.');
  }

  if (!authConfigured) {
    return <Card title="Panel no configurado"><p>Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</p></Card>;
  }
  if (stage.kind === 'ready') return <>{children({ email: stage.email, signOut: () => void signOut() })}</>;
  if (stage.kind === 'loading') return <Card title="Panel PRIVAT"><p role="status">Cargando…</p></Card>;

  return (
    <Card title={TITLES[stage.kind]}>
      {notice && <p className="mb-4 rounded-md bg-background p-3 text-sm" role="status">{notice}</p>}
      {stage.kind === 'login' && (
        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required className="field" />
          </div>
          <PasswordField id="password" label="Contraseña" autoComplete="current-password" />
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
          <button type="button" className="w-full text-sm underline" onClick={() => go({ kind: 'forgot' })}>
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      )}
      {stage.kind === 'forgot' && (
        <form onSubmit={onForgot} className="space-y-4">
          <p className="text-sm">
            Te enviaremos un código por email. Para cambiar la contraseña también vas a necesitar el código de tu app
            autenticadora (segundo factor).
          </p>
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required className="field" />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Enviando…' : 'Enviar código'}</button>
          <button type="button" className="btn-secondary w-full" onClick={() => go({ kind: 'login' })}>Volver</button>
        </form>
      )}
      {stage.kind === 'recoverCode' && (
        <form onSubmit={(e) => void onRecoverCode(e, stage.email)} className="space-y-4">
          <div>
            <label htmlFor="recovery-code" className="label">Código del email</label>
            <input id="recovery-code" name="recovery-code" inputMode="numeric" autoComplete="one-time-code" maxLength={12} required className="field text-center text-xl tracking-[0.3em]" />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Verificando…' : 'Continuar'}</button>
          <button type="button" className="btn-secondary w-full" onClick={() => go({ kind: 'forgot' })}>Pedir otro código</button>
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
      {stage.kind === 'newPassword' && (
        <form onSubmit={onNewPassword} className="space-y-4">
          <p className="text-sm">Mínimo {MIN_PASSWORD_LENGTH} caracteres. Al guardarla se cierran todas las sesiones abiertas.</p>
          <PasswordField id="new-password" label="Contraseña nueva" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} />
          <PasswordField id="confirm-password" label="Repite la contraseña nueva" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} />
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
          <button type="button" className="btn-secondary w-full" onClick={() => void signOut()}>Cancelar</button>
        </form>
      )}
      {error && <p className="mt-4 font-semibold text-error" role="alert"><span aria-hidden="true">⚠ </span>{error}</p>}
    </Card>
  );
}

/** Validación de la contraseña nueva en el navegador (Supabase vuelve a validar en el servidor). */
export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_LENGTH) return `La contraseña es demasiado larga (máximo ${MAX_PASSWORD_LENGTH} bytes).`;
  if (password !== confirm) return 'Las contraseñas no coinciden.';
  return null;
}

/**
 * Campo de contraseña con botón para mostrar u ocultar lo escrito. Accesible: el botón
 * anuncia su estado (aria-pressed) y su acción; no envía el formulario (type="button").
 */
function PasswordField({ id, label, autoComplete, minLength }: { id: string; label: string; autoComplete: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  const hintId = useId();
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={MAX_PASSWORD_LENGTH}
          required
          spellCheck={false}
          autoCapitalize="off"
          className="field pr-12"
          aria-describedby={hintId}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-text-secondary hover:text-text-primary"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((v) => !v)}
        >
          <EyeIcon crossed={visible} />
        </button>
      </div>
      <p id={hintId} className="sr-only">{visible ? 'La contraseña está visible.' : 'La contraseña está oculta.'}</p>
    </div>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M3 3l18 18" />}
    </svg>
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
        <Logo variant="verde" alt="PRIVAT Gestión de Propiedades" className="mb-6 h-14 w-auto" />
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
