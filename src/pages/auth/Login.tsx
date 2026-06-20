import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { authApi } from '../../lib/api';
import { Eye, EyeOff, Mail, Lock, LogIn, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import appIcon from '../../assets/app-icon.png';

const OAUTH_TYPES = [
  { value: 'qq', label: 'QQ', icon: '🐧' },
  { value: 'wx', label: '微信', icon: '💬' },
  { value: 'alipay', label: '支付宝', icon: '💰' },
  { value: 'google', label: 'Google', icon: '🔗' },
  { value: 'github', label: 'GitHub', icon: '🐱' },
];

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [oauthEnabled, setOauthEnabled] = useState(false);
  const [enabledTypes, setEnabledTypes] = useState<string[]>([]);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  useEffect(() => {
    document.title = '登录 - KamiSM';
    (async () => {
      try {
        const res = await fetch('/auth/oauth/config');
        const json = await res.json();
        setOauthEnabled(Boolean(json?.data?.enabled));
        setEnabledTypes(json?.data?.enabled_types || []);
      } catch {
        setOauthEnabled(false);
        setEnabledTypes([]);
      }
    })();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const { success, token, refresh_token, role, user, message } = res.data;
      if (success) {
        setAuth(token, refresh_token, role, user);
        toast.success('登录成功');
        navigate(role === 'admin' ? '/admin/dashboard' : '/dashboard');
      } else toast.error(message || '登录失败');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (type: string) => {
    setLoggingIn(type);
    try {
      const res = await fetch('/auth/oauth/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) });
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch { json = { raw: text }; }
      const url = json?.url || json?.data?.url || (typeof json?.raw === 'string' && json.raw.match(/"url"\s*:\s*"([^"]+)"/)?.[1]);
      if (url) window.location.href = url;
      else toast.error('获取登录链接失败');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || '网络错误');
    } finally {
      setLoggingIn(null);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-orbs"><span /><span /><span /></div>
      <main className="auth-wrap">
        <section className="auth-brand">
          <img src={appIcon} alt="KamiSM" />
          <h1>KamiSM</h1>
          <p></p>
        </section>
        <section className="auth-card">
          <div className="auth-title"><h2>欢迎回来</h2><p>登录您的账户继续管理服务</p></div>
          <form className="auth-form" onSubmit={handleLogin}>
            <label>邮箱
              <div className="auth-input"><Mail /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="请输入邮箱" required autoFocus /></div>
            </label>
            <label>密码
              <div className="auth-input"><Lock /><input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码" required /><button type="button" onClick={() => setShowPwd(!showPwd)}>{showPwd ? <EyeOff /> : <Eye />}</button></div>
              <Link className="auth-small-link" to="/reset-password">忘记密码？</Link>
            </label>
            <button className="auth-primary" disabled={loading}>{loading ? <Loader2 className="spin" /> : <LogIn />} {loading ? '登录中...' : '登录'}</button>
            {oauthEnabled && enabledTypes.length > 0 && <div className="oauth-box"><div><span />或使用第三方登录<span /></div><div className="oauth-grid">{enabledTypes.map(type => { const cfg = OAUTH_TYPES.find(t => t.value === type); if (!cfg) return null; return <button type="button" key={type} onClick={() => handleOAuthLogin(type)} disabled={loggingIn !== null}><b>{cfg.icon}</b>{loggingIn === type ? '跳转中...' : cfg.label}</button>; })}</div></div>}
          </form>
        </section>
        <footer className="auth-footer">还没有账户？ <Link to="/register">注册</Link></footer>
      </main>
    </div>
  );
}
