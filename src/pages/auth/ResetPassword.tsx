import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../lib/api';
import { Mail, Lock, ArrowRight, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react';
import appIcon from '../../assets/app-icon.png';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [form, setForm] = useState({ email: '', code: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { document.title = '重置密码 - KamiSM'; }, []);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    const email = form.email.trim();
    if (!email.includes('@')) { toast.error('请输入正确的邮箱'); return; }
    try {
      const pendingRaw = sessionStorage.getItem('pending_reset');
      const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
      if (pending?.email === email) {
        toast('已存在有效验证码，请直接输入上一次邮箱验证码', { icon: '📩' });
        setStep('code');
        setCountdown(0);
        return;
      }
    } catch {}
    setCodeSending(true);
    try {
      const res = await authApi.sendResetCode(email);
      const msg = res.data.message || '';
      if (res.data.success) {
        sessionStorage.setItem('pending_reset', JSON.stringify({ email, at: Date.now() }));
        toast.success('验证码已发送，请查收邮件');
        setStep('code');
        startCountdown();
      } else if (msg.includes('频繁') || msg.includes('60秒')) {
        sessionStorage.setItem('pending_reset', JSON.stringify({ email, at: Date.now() }));
        toast('已发送过验证码，请直接输入上一次邮箱验证码', { icon: '📩' });
        setStep('code');
        setCountdown(0);
      } else {
        toast.error(msg || '发送失败');
      }
    } catch {
      toast.error('发送失败，请检查网络');
    } finally {
      setCodeSending(false);
    }
  };

  const handleVerifyCode = () => {
    if (!form.code || form.code.length !== 6) { toast.error('请输入6位验证码'); return; }
    setStep('password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('密码至少8位'); return; }
    if (form.password !== form.confirm) { toast.error('两次密码不一致'); return; }
    setLoading(true);
    try {
      const res = await authApi.resetPassword({ email: form.email, code: form.code, new_password: form.password });
      if (res.data.success) {
        sessionStorage.removeItem('pending_reset');
        toast.success('密码重置成功，请重新登录');
        navigate('/login');
      } else {
        toast.error(res.data.message || '重置失败');
      }
    } catch {
      toast.error('重置失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  const subtitle = step === 'email'
    ? '输入您的邮箱地址，我们将向您发送密码重置链接。'
    : step === 'code'
      ? `验证码已发送到 ${form.email}`
      : '请设置一个新的安全密码。';

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

        <section className="auth-card auth-step-card" key={step}>
          <div className="auth-title">
            <h2>重置密码</h2>
            <p>{subtitle}</p>
          </div>

          {step === 'email' && (
            <form className="auth-form" onSubmit={e => { e.preventDefault(); handleSendCode(); }}>
              <label>邮箱
                <div className="auth-input"><Mail /><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="请输入邮箱" required autoFocus /></div>
              </label>
              <button type="submit" className="auth-primary" disabled={codeSending}>
                {codeSending ? <Loader2 className="spin" /> : <Mail />} {codeSending ? '发送中...' : '发送重置链接'}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form className="auth-form" onSubmit={e => { e.preventDefault(); handleVerifyCode(); }}>
              <label className="center">验证码
                <input className="verify-code-input" inputMode="numeric" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="000000" required maxLength={6} autoFocus />
              </label>
              <div className="verify-help">请输入邮件中的 6 位验证码</div>
              <div className="auth-actions-row">
                <button type="button" className="auth-secondary" onClick={() => setStep('email')}>返回</button>
                <button type="submit" className="auth-primary"><ShieldCheck /> 下一步</button>
              </div>
              <button type="button" className="auth-link-btn" onClick={handleSendCode} disabled={countdown > 0 || codeSending}>
                {codeSending ? '发送中...' : countdown > 0 ? `${countdown}秒后可重新发送` : '重新发送验证码'}
              </button>
            </form>
          )}

          {step === 'password' && (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <label>新密码
                <div className="auth-input"><Lock /><input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="至少8位" required /><button type="button" onClick={() => setShowPwd(v => !v)}>{showPwd ? <EyeOff /> : <Eye />}</button></div>
              </label>
              <label>确认密码
                <div className="auth-input"><Lock /><input type={showConfirm ? 'text' : 'password'} value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} placeholder="再次输入密码" required /><button type="button" onClick={() => setShowConfirm(v => !v)}>{showConfirm ? <EyeOff /> : <Eye />}</button></div>
              </label>
              <div className="auth-actions-row">
                <button type="button" className="auth-secondary" onClick={() => setStep('code')}>返回</button>
                <button type="submit" className="auth-primary" disabled={loading}>{loading ? <Loader2 className="spin" /> : <ArrowRight />} {loading ? '重置中...' : '重置密码'}</button>
              </div>
            </form>
          )}
        </section>

        <footer className="auth-footer">想起密码了？ <Link to="/login">登录</Link></footer>
      </main>
    </div>
  );
}
