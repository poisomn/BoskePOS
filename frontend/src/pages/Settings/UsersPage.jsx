import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { cashGet, cashPost, cashPatch } from '../../services/cashService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import FormModal from '../../components/FormModal'

const empty = { email: '', first_name: '', last_name: '', role: 'vendedor', password: '', is_active: true }

export default function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [pin, setPin] = useState('')
  const [password, setPassword] = useState('')
  const reload = () => cashGet('users').then(setUsers)
  useEffect(() => { reload().catch(e => setError(getApiErrorMessage(e))) }, [])
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (editing.id) await cashPatch(`users/${editing.id}`, payload)
      else await cashPost('users', payload)
      setEditing(null); await reload(); setMessage('Usuario guardado.')
    } catch (e) { setError(getApiErrorMessage(e)) } finally { setBusy(false) }
  }
  async function savePin(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try { await cashPost('users/my-pin', { pin, password }); setPin(''); setPassword(''); await reload(); setMessage('Tu PIN personal está listo para autorizar cierres y descuentos.') }
    catch (e) { setError(getApiErrorMessage(e)) } finally { setBusy(false) }
  }
  return <div className="space-y-5">
    <div className="surface p-5 flex flex-wrap items-center justify-between gap-3"><div><p className="section-note">Configuración de empresa</p><h1 className="text-2xl font-semibold">Usuarios y autorizaciones</h1></div><Link className="btn btn-secondary" to="/settings/business">Datos del negocio</Link></div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}{message && <div className="alert alert-success" role="status">{message}</div>}
    <section className="surface p-5"><div className="flex items-center justify-between mb-4"><h2 className="section-title">Equipo</h2><button className="btn btn-primary" onClick={() => { setForm(empty); setEditing({}); setError('') }}>Nuevo usuario</button></div>
      <div className="overflow-auto"><table className="data-table"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>PIN admin</th><th>Acciones</th></tr></thead><tbody>{users.map(person => <tr key={person.id}><td>{[person.first_name, person.last_name].join(' ').trim() || '—'}</td><td>{person.email}</td><td>{person.roles.join(', ')}</td><td>{person.is_active ? 'Activo' : 'Inactivo'}</td><td>{person.has_authorization_pin ? 'Configurado' : '—'}</td><td><button className="btn btn-secondary" onClick={() => { setForm({ ...empty, ...person, role: person.roles[0] || 'vendedor', password: '' }); setEditing(person); setError('') }}>Editar</button></td></tr>)}</tbody></table></div>
    </section>
    <form onSubmit={savePin} className="surface p-5 space-y-4 max-w-xl"><h2 className="section-title">Mi PIN de autorización</h2><p className="section-note">Personal y exclusivo de administrador. Autorizará cierres y descuentos excepcionales como {user.email}.</p><label className="block"><span className="field-label">Contraseña actual</span><input className="input" autoComplete="current-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label><label className="block"><span className="field-label">Nuevo PIN de 4 dígitos</span><input className="input" autoComplete="new-password" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required value={pin} onChange={e => setPin(e.target.value)} /></label><button className="btn btn-primary" disabled={busy}>Guardar mi PIN</button></form>
    <FormModal isOpen={!!editing} title={editing?.id ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => !busy && setEditing(null)}>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <form onSubmit={save} className="space-y-4">{[['email', 'Correo', 'email'], ['first_name', 'Nombre', 'text'], ['last_name', 'Apellido', 'text'], ['password', editing?.id ? 'Nueva contraseña (opcional)' : 'Contraseña inicial', 'password']].map(([key, label, type]) => <label className="block" key={key}><span className="field-label">{label}</span><input className="input" type={type} autoComplete={type === 'password' ? 'new-password' : undefined} required={key === 'email' || (key === 'password' && !editing?.id)} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
        <label className="block"><span className="field-label">Rol</span><select className="select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="administrador">Administrador</option><option value="vendedor">Vendedor / cajero</option><option value="encargado_inventario">Inventario</option></select></label><label className="flex gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />Activo</label><button className="btn btn-primary" disabled={busy}>Guardar usuario</button>
      </form>
    </FormModal>
  </div>
}
