/**
 * Primitives d'interface partagées.
 *
 * Volontairement minces et sans état : la majorité des écrans de Hive sont
 * des composants serveur, et un champ de formulaire qui exigerait `useState`
 * les forcerait tous à basculer côté client.
 */

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm '
  + 'placeholder:text-muted/60 focus:border-primary focus:outline-none';

export function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint !== undefined ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={inputClass} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />;
}

const BUTTON_STYLES = {
  solid: 'bg-primary text-white hover:bg-primary-light',
  outline: 'border border-primary text-primary hover:bg-surface',
  ghost: 'text-muted hover:text-ink',
} as const;

export function Button({ variant = 'outline', className = '', ...props }:
React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_STYLES }) {
  return (
    <button
      {...props}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${BUTTON_STYLES[variant]} ${className}`}
    />
  );
}

/** Message d'erreur ou de confirmation, rendu au même endroit sur tous les écrans. */
export function Notice({ tone = 'error', children }: {
  tone?: 'error' | 'success'; children: React.ReactNode;
}) {
  const style = tone === 'success'
    ? 'bg-success/15 text-ink'
    : 'bg-accent/20 text-ink';
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 text-sm ${style}`}>
      {children}
    </p>
  );
}

export function Badge({ children, tone = 'neutral' }: {
  children: React.ReactNode; tone?: 'neutral' | 'rent' | 'sale' | 'success';
}) {
  const style = {
    neutral: 'bg-surface text-muted',
    rent: 'bg-primary text-white',
    sale: 'bg-accent text-white',
    success: 'bg-success text-white',
  }[tone];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-4 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children !== undefined ? <div className="text-sm text-muted">{children}</div> : null}
    </div>
  );
}
