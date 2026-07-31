import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ChefHat, Eye, EyeOff, LogIn } from "lucide-react";

const ORANGE = "#204769";

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm]   = useState({ username: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]  = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username || !form.password) { setError("Inserisci username e password"); return; }
    setLoading(true);
    try {
      await login(form.username, form.password);
    } catch (err) {
      setError(err.message || "Credenziali non valide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(135deg, #204769 0%, #243650 60%, #1a3a56 100%)",
      fontFamily:"'Segoe UI',system-ui,sans-serif", padding:20,
    }}>
      {/* Background decoration */}
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:"-20%",right:"-10%",width:500,height:500,
          borderRadius:"50%",background:"rgba(249,115,22,.06)"}}/>
        <div style={{position:"absolute",bottom:"-20%",left:"-10%",width:400,height:400,
          borderRadius:"50%",background:"rgba(249,115,22,.04)"}}/>
      </div>

      <div style={{width:"100%",maxWidth:420,position:"relative",zIndex:1}}>
        {/* Logo card */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{
            width:72,height:72,borderRadius:20,margin:"0 auto 16px",
            background:"linear-gradient(135deg, #5C9CD4 0%, #204769 100%)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"0 8px 32px rgba(92,156,212,.35)",
          }}>
            <ChefHat size={36} color="white"/>
          </div>
          <h1 style={{fontSize:28,fontWeight:700,color:"white",fontFamily:"'Poppins',sans-serif",letterSpacing:-.5,marginBottom:4}}>
            Sibylla Outlet Manager
          </h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,.6)"}}>
            Sistema gestione outlet & ristorante
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background:"rgba(255,255,255,.97)",borderRadius:20,padding:32,
          boxShadow:"0 24px 64px rgba(0,0,0,.4)",
        }}>
          <h2 style={{fontSize:18,fontWeight:600,color:"#204769",fontFamily:"'Poppins',sans-serif",marginBottom:6}}>
            Accedi al sistema
          </h2>
          <p style={{fontSize:13,color:"#6E7175",marginBottom:24}}>
            Inserisci le tue credenziali per continuare
          </p>

          {error && (
            <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,
              padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:8,
              fontSize:13,color:"#dc2626",fontWeight:600}}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={submit}>
            {/* Username */}
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#4A4D53",marginBottom:6}}>
                Username
              </label>
              <input
                type="text" value={form.username} autoComplete="username"
                onChange={e => setForm(p => ({...p, username: e.target.value}))}
                placeholder="es. mario.rossi"
                style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:10,
                  padding:"11px 14px",fontSize:14,boxSizing:"border-box",outline:"none",
                  transition:"border-color .15s"}}
                onFocus={e => e.target.style.borderColor='#5C9CD4'}
                onBlur={e => e.target.style.borderColor="#DBDBDB"}
              />
            </div>

            {/* Password */}
            <div style={{marginBottom:24}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#4A4D53",marginBottom:6}}>
                Password
              </label>
              <div style={{position:"relative"}}>
                <input
                  type={showPwd?"text":"password"} value={form.password} autoComplete="current-password"
                  onChange={e => setForm(p => ({...p, password: e.target.value}))}
                  placeholder="••••••••"
                  style={{width:"100%",border:"1.5px solid #e2e8f0",borderRadius:10,
                    padding:"11px 44px 11px 14px",fontSize:14,boxSizing:"border-box",outline:"none",
                    transition:"border-color .15s"}}
                  onFocus={e => e.target.style.borderColor='#5C9CD4'}
                  onBlur={e => e.target.style.borderColor="#DBDBDB"}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
                    background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:4}}>
                  {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{width:"100%",background:loading?"#A9AAAD":"#204769",color:"white",border:"none",
                borderRadius:10,padding:13,fontWeight:700,fontSize:15,cursor:loading?"not-allowed":"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                transition:"background .15s",boxShadow:loading?"none":"0 4px 14px rgba(32,71,105,.35)"}}>
              {loading
                ? <><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"white",borderRadius:"50%",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Accesso in corso...</>
                : <><LogIn size={16}/> Accedi</>
              }
            </button>
          </form>

          <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid #f1f5f9",
            display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#94a3b8"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",flexShrink:0}}/>
            Connesso al server locale
          </div>
        </div>

        <p style={{textAlign:"center",marginTop:20,fontSize:12,color:"rgba(255,255,255,.25)"}}>
          Outlet Manager v1.0 — © {new Date().getFullYear()}
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
