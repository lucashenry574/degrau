import { IconMinus, IconPlus } from './icons';

export function hm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export const num = (n: number) => n.toLocaleString('pt-BR');

export function Stepper(props: { label: string; value: string; onMinus: () => void; onPlus: () => void; disabled?: boolean }) {
  return (
    <div className="step" role="group" aria-label={props.label}>
      <button type="button" className="sb" onClick={props.onMinus} disabled={props.disabled} aria-label={`Diminuir: ${props.label}`}><IconMinus /></button>
      <output className="sv">{props.value}</output>
      <button type="button" className="sb" onClick={props.onPlus} disabled={props.disabled} aria-label={`Aumentar: ${props.label}`}><IconPlus /></button>
    </div>
  );
}

export function Bar({ value, mark }: { value: number; mark?: number }) {
  const f = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="bar">
      <i style={{ width: `${f * 100}%` }} />
      {mark !== undefined && <b style={{ left: `calc(${mark * 100}% - 1px)` }} />}
    </div>
  );
}

export function ExtLink({ href, children }: { href: string; children: string }) {
  return <a className="lbtn" href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}
