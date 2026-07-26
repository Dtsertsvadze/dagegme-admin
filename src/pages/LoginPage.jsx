import { useState } from 'react'

function LoginPage({ onLogin }) {
  const [form, setForm] = useState({
    username: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await onLogin(form)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell auth-page">
      <section className="login-panel">
        <div className="login-card">
          <h1 className="login-title">ადმინი</h1>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="username">მომხმარებელი</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="შეიყვანეთ მომხმარებელი"
                value={form.username}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">პაროლი</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="შეიყვანეთ პაროლი"
                value={form.password}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              />
            </div>

            {error ? <div className="form-error">{error}</div> : null}

            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'მიმდინარეობს შესვლა...' : 'შესვლა'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
