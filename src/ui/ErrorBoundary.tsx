import { Component, type ReactNode } from 'react';

/** Se uma tela quebrar, mostra um aviso no lugar dela em vez de deixar o app em branco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card">
        <h2>Esta tela teve um problema</h2>
        <p className="lead" style={{ marginTop: 4 }}>Seus dados continuam salvos no aparelho. Recarregue o app; se repetir, anote o que você tinha acabado de tocar.</p>
        <p className="small muted" style={{ marginTop: 8 }}>{this.state.error.message}</p>
        <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => location.reload()}>Recarregar</button>
      </div>
    );
  }
}
