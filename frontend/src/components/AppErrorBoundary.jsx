import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <section className="surface p-7 max-w-md space-y-4" role="alert">
        <img src="/brand/boskepos-logo.png" alt="BoskePOS" className="w-48" />
        <h1 className="text-xl font-semibold">No pudimos mostrar esta pantalla</h1>
        <p className="section-note">Ocurrió un error al cargar la interfaz. Recarga la página para volver a intentarlo.</p>
        <button className="btn btn-primary" type="button" onClick={() => window.location.reload()}>Recargar página</button>
      </section>
    </main>
  }
}
