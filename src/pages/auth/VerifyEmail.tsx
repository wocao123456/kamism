import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../lib/api';
import { CheckCircle, ArrowLeft, Loader2, Mail } from 'lucide-react';
import appIcon from '../../assets/app-icon.png';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<any>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    document.title = 'Verify Email - KamiSM';
    const raw = sessionStorage.getItem('pending_register');
    if (raw) {
      try { setPending(JSON.parse(raw)); } catch { toast.error('注册会话已过期'); }
    } else toast.error('注册会话已过期');
  }, []);
  useEffect(() => { if (countdown <= 0) return; const t = setTimeout(() => setCountdown(v => v - 1), 1000); return () => clearTimeout(t); }, [countdown]);

  const resend = async () => {
    if (!pending?.email) return;
    setSending(true);
    try {
      const r = await authApi.sendCode(pending.email);
      if (r.data.success) { toast.success('验证码已重新发送'); setCountdown(60); }
      else toast.error(r.data.message || '发送失败');
    } catch { toast.error('发送失败'); } finally { setSending(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending) return navigate('/register');
    if (code.length !== 6) return toast.error('请输入6位验证码');
    setLoading(true);
    try {
      const r = await authApi.register({ username: pending.username, email: pending.email, password: pending.password, code });
      if (r.data.success) {
        sessionStorage.removeItem('pending_register');
        toast.success('注册成功，请登录');
        navigate('/login');
      } else toast.error(r.data.message || '注册失败');
    } catch { toast.error('注册失败，请检查网络'); } finally { setLoading(false); }
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
          <div className="auth-title"><h2>验证您的邮箱</h2><p>我们将发送验证码到&nbsp; <b>{pending?.email || '注册邮箱'}</b></p></div>
          {!pending ? (
            <div className="auth-alert warn"><Mail /> 注册会话已过期，请返回重新注册。</div>
          ) : (
            <form className="auth-form" onSubmit={submit}>
              <label className="center">验证码
                <input className="verify-code-input" inputMode="numeric" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} autoFocus />
              </label>
              <div className="verify-help">请输入发送到您邮箱的6位验证码</div>
              <div className="verify-help verify-help-extra" style={{ fontSize:12, color:'#a16207', marginTop:-6, lineHeight:1.6 }}>若提示「频繁」或「60秒」，可直接使用上一次邮件中的验证码，无需重复发送。</div>
              <button className="auth-primary" disabled={loading || !code}>{loading ? <Loader2 className="spin" /> : <CheckCircle />} {loading ? '验证中...' : '验证并创建账户'}</button>
              <button type="button" className="auth-link-btn" disabled={countdown > 0 || sending} onClick={resend}>{sending ? '发送中...' : countdown > 0 ? `${countdown}秒后可重新发送` : '点击重新发送验证码'}</button>
            </form>
          )}
        </section>
        <Link className="auth-back" to="/register"><ArrowLeft /> 返回注册</Link>
      </main>
    </div>
  );
}
