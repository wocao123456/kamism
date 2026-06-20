import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../lib/api';
import { Mail, Lock, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';
import appIcon from '../../assets/app-icon.png';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  useEffect(() => { document.title = '创建账户 - KamiSM'; }, []);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.includes('@')) return toast.error('请输入正确的邮箱');
    if (form.password.length < 6) return toast.error('密码至少6个字符');
    if (form.password !== form.confirmPassword) return toast.error('两次密码输入不一致');
    const email = form.email.trim();
    const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || `user${Date.now().toString().slice(-6)}`;
    try {
      const pendingRaw = sessionStorage.getItem('pending_register');
      const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
      if (pending?.email === email) {
        sessionStorage.setItem('pending_register', JSON.stringify({ username, email, password: form.password, coupon: '' }));
        toast('已存在有效验证码，请直接输入上一次邮箱验证码', { icon: '📩' });
        navigate('/verify-email');
        return;
      }
    } catch {}
    setLoading(true);
    try {
      const res = await authApi.sendCode(email);
      const msg = res.data.message || '';
      if (res.data.success) {
        sessionStorage.setItem('pending_register', JSON.stringify({ username, email, password: form.password, coupon: '' }));
        toast.success('验证码已发送，请查收邮件');
        navigate('/verify-email');
      } else if (msg.includes('频繁') || msg.includes('60秒')) {
        // 之前已发过验证码：保留会话，直接进入验证页继续输入
        sessionStorage.setItem('pending_register', JSON.stringify({ username, email, password: form.password, coupon: '' }));
        toast('已发送过验证码，请前往邮箱查收并继续完成验证', { icon: '📩' });
        navigate('/verify-email');
      } else toast.error(msg || '验证码发送失败');
    } catch { toast.error('发送失败，请检查网络'); } finally { setLoading(false); }
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
          <div className="auth-title"><h2>创建账户</h2><p>创建您的商户账户</p></div>
          <form className="auth-form" onSubmit={handleContinue}>
            <label>邮箱
              <div className="auth-input"><Mail /><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="请输入邮箱" required /></div>
            </label>
            <label>密码
              <div className="auth-input"><Lock /><input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="创建一个安全的密码" required /><button type="button" onClick={() => setShowPwd(!showPwd)}>{showPwd ? <EyeOff /> : <Eye />}</button></div>
              <small>至少 6 个字符</small>
            </label>
            <label>确认密码
              <div className="auth-input"><Lock /><input type={showConfirmPwd ? 'text' : 'password'} value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="请再次输入密码" required /><button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)}>{showConfirmPwd ? <EyeOff /> : <Eye />}</button></div>
            </label>
            <button className="auth-primary" disabled={loading}>{loading ? <Loader2 className="spin" /> : <UserPlus />} {loading ? '发送中...' : '继续'}</button>
          </form>
        </section>
        <footer className="auth-footer">已有账户？ <Link to="/login">登录</Link></footer>
      </main>
    </div>
  );
}
