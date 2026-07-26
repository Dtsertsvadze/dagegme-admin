import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout.jsx'
import { adminResources } from '../data/adminResources.js'
import LoginPage from '../pages/LoginPage.jsx'
import ResourcePage from '../pages/ResourcePage.jsx'

function AppRouter({
  isAuthenticated,
  onLogin,
  onLogout,
}) {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage onLogin={onLogin} />
        }
      />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <AdminLayout
              onLogout={onLogout}
            />
          ) : <Navigate to="/login" replace />
        }
      >
        <Route index element={<Navigate to={`/${adminResources[0].key}`} replace />} />
        {adminResources.map((resource) => (
          <Route
            key={resource.key}
            path={resource.key}
            element={(
              <ResourcePage
                key={resource.key}
                resourceKey={resource.key}
              />
            )}
          />
        ))}
      </Route>
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />}
      />
    </Routes>
  )
}

export default AppRouter
