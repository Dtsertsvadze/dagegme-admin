import { NavLink, Outlet } from 'react-router-dom'
import { adminResources } from '../data/adminResources.js'

function AdminLayout({ onLogout }) {
  return (
    <div className="app-shell admin-shell">
      <header className="admin-topbar">
        <strong className="admin-title">ადმინი</strong>
        <button className="secondary-button compact-button" type="button" onClick={onLogout}>
          გასვლა
        </button>
      </header>

      <nav className="category-nav" aria-label="კატეგორიები">
        {adminResources.map((resource, index) => (
          <NavLink
            key={resource.key}
            to={`/${resource.key}`}
            className={({ isActive }) =>
              isActive ? 'category-link category-link-active' : 'category-link'
            }
          >
            <span className="category-number">{String(index + 1).padStart(2, '0')}</span>
            <span>{resource.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
