import React, { useState } from 'react';
import T from '../../../core/tokens';
import { login } from '../../../services/auth.service';
import { InputField } from '../../../core/components/form';

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
    <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:T.primary, fontFamily:"'Open Sans',sans-serif" }}>
      <div style={{ width:420, background:T.white, borderRadius:20, padding:'40px 36px', boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ marginBottom:32, textAlign:'center' }}>
          <div style={{ fontFamily:'Poppins,sans-serif', fontSize:26, fontWeight:700, color:T.primary }}>
            <span style={{ fontWeight:800 }}>Sibylla</span>
            <span style={{ fontWeight:400, color:T.textInactive }}>Platform</span>
          </div>
        </div>

        <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:18, fontWeight:600, color:T.primary, margin:'0 0 24px', textAlign:'center' }}>
          Accedi al tuo account
        </h2>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
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
            <div style={{ fontSize:12, color:T.error, background:T.errorLight, borderRadius:6, padding:'8px 12px' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ width:'100%', height:46, background:loading ? T.textDisabled : T.primary, border:'none', borderRadius:8, fontSize:14, fontWeight:700, color:'#fff', cursor:loading?'not-allowed':'pointer', fontFamily:"'Open Sans',sans-serif", marginTop:4, transition:'background 0.15s' }}
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:T.textInactive, cursor:'pointer' }}>
              <input type="checkbox" className="sib-checkbox"/> Ricorda
            </label>
            <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:T.blue, fontFamily:"'Open Sans',sans-serif" }}>
              Password dimenticata?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
