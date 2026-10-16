import BrandLogo from '../components/BrandLogo'
import Mascot from '../components/Mascot'
function LoadingScreen() {
  return <main className="app-shell grid place-items-center"><div className="flex flex-col items-center gap-4" role="status"><BrandLogo className="w-56" /><Mascot state="cargando" size={120} /><p className="section-note">Preparando tu espacio de trabajo…</p></div></main>
}
export default LoadingScreen
