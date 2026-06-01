import React, { useState } from 'react';
import { login } from '../../../services/auth.service';
import { InputField } from '../../../core/components/form';
import './LoginPage.sass';

interface Props {
  onLogin: (token: string) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async () => {
    if (!username || !password) { setError('Inserisci email e password'); return; }
    setLoading(true); setError('');
    try {
      const token = await login(username, password);
      onLogin(token);
    } catch (e: any) {
      setError(e.message || 'Errore di accesso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand__logo">
            <span className="login-brand__name">Sibylla</span>
            <span className="login-brand__suffix">Platform</span>
          </div>
        </div>

        <h2 className="login-title">
          Accedi al tuo account
        </h2>

        <div className="login-form">
          <InputField
            name="username"
            type="email"
            placeholder="inserisci email"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
          />
          <InputField
            name="password"
            type="password"
            placeholder="inserisci password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          />

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={'login-submit' + (loading ? ' login-submit--loading' : '')}
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>

          <div className="login-options">
            <label className="login-remember">
              <input type="checkbox" className="sib-checkbox"/> Ricorda
            </label>
            <button className="login-forgot">
              Password dimenticata?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
