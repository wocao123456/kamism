import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Edit3, Mail, EyeOff, Key, RefreshCw, Copy, Check, User, Shield, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';

const api = (path: string, opts?: RequestInit) => {
  const token = localStorage.getItem('token');
  return fetch(`/api${path}`, {
    ...opts,
    headers: { 'Authorization': `Bearer ${token}`, ...(opts?.headers || {}) },
  });
};

function profilePlanText(profile: any) {
  const plan = profile?.plan || 'free';
  const rawLabel = profile?.plan_label || profile?.label || profile?.plan_name;
  const label = rawLabel || (!plan || plan === 'free' ? '免费会员' : plan === 'pro' ? 'pro套餐' : `${String(plan)}会员`);
  if (plan === 'free' || !plan) return label;
  if (!profile?.plan_expires_at) return `${label} · 永久`;
  const exp = new Date(profile.plan_expires_at);
  if (exp.getTime() <= Date.now()) return `${label} · 已过期`;
  return `${label} · ${exp.toLocaleDateString('zh-CN')}过期`;
}
function formatBalance(profile: any) {
  const value = Number(profile?.balance ?? profile?.wallet_balance ?? 0);
  return value.toFixed(2);
}

export default function AdminProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [username, setUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: '', code: '' });
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const [avatarVer, setAvatarVer] = useState(0);
  const [activeTab, setActiveTab] = useState('profile');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const authRole = useAuthStore(s => s.role);

  const loadProfile = async () => {
    setLoadError(false);
    try {
      const res = await api('/profile');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setProfile(d);
          setApiKey(d.api_key || '');
          setUsername(d.username || '');
          localStorage.setItem('kamism_profile', JSON.stringify(d));
          useAuthStore.getState().updateUser(d);
          if (d.background_url) {
            localStorage.setItem('kamism_bg_url_' + (localStorage.getItem('role') || 'guest'), d.background_url);
            document.documentElement.style.setProperty('--custom-bg', `url(${d.background_url})`);
          }
        } else {
          const saved = localStorage.getItem('kamism_profile');
          if (saved) {
            try {
              const d = JSON.parse(saved);
              setProfile(d);
              setApiKey(d.api_key || '');
              setUsername(d.username || '');
            } catch {}
          } else {
            setLoadError(true);
          }
        }
      } else {
        setLoadError(true);
      }
    } catch (e) {
      console.error(e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('kamism_bg_url_' + (localStorage.getItem('role') || 'guest'));
    if (saved) document.documentElement.style.setProperty('--custom-bg', `url(${saved})`);
  }, []);

  useEffect(() => { loadProfile(); }, []);
  const loadTransactions = async () => {
    setTxLoading(true);
    try {
      const res = await api('/merchant/balance-history?page=1&page_size=50');
      const json = await res.json();
      if (json.success) setTransactions(Array.isArray(json.data) ? json.data : (json.data?.items || json.items || []));
    } catch {}
    finally { setTxLoading(false); }
  };
  useEffect(() => { if (activeTab === 'transactions') loadTransactions(); }, [activeTab]);

  useEffect(() => {
    if (countdown > 0) { const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); }
  }, [countdown]);

  const bumpAvatar = () => setAvatarVer(v => v + 1);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('头像不能超过5MB'); return; }
    const form = new FormData();
    form.append('avatar', file);
    try {
      const res = await api('/profile/avatar', { method: 'POST', body: form });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          toast.success('头像更新成功');
          const newAvatar = json.data?.avatar;
          if (newAvatar) {
            useAuthStore.getState().updateUser({ avatar: `${newAvatar}?t=${Date.now()}` });
            setProfile((prev: any) => ({ ...prev, avatar: newAvatar }));
          }
          bumpAvatar();
          await loadProfile();
        } else { toast.error(json.message || '上传失败'); }
      } else { toast.error('上传失败'); }
    } catch { toast.error('上传失败'); }
  };


  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error('背景图不能超过8MB'); return; }
    const form = new FormData();
    form.append('background', file);
    try {
      const res = await api('/profile/upload-background', { method: 'POST', body: form });
      const json = await res.json();
      if (res.ok && json.success) {
        const raw = json.data?.background_url || json.data?.background || json.background_url;
        const bg = raw ? `${raw}${String(raw).includes('?') ? '&' : '?'}t=${Date.now()}` : '';
        if (bg) {
          setProfile((prev: any) => ({ ...prev, background_url: bg }));
          useAuthStore.getState().updateUser({ background_url: bg });
          localStorage.setItem('kamism_bg_url_' + (localStorage.getItem('role') || 'guest'), bg);
          document.documentElement.style.setProperty('--custom-bg', `url(${bg})`);
          window.dispatchEvent(new Event('merchant-sync'));
        }
        toast.success('背景已更新');
        await loadProfile();
      } else toast.error(json.message || '上传失败');
    } catch { toast.error('上传失败'); }
    finally { if (bgFileRef.current) bgFileRef.current.value = ''; }
  };

  const handleRegenerateKey = async () => {
    if (!confirm('确定要重新生成API Key？旧的Key将立即失效！')) return;
    setRegenerating(true);
    try {
      const res = await api('/profile/api-key', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setApiKey(json.data.api_key);
          useAuthStore.getState().updateUser({ api_key: json.data.api_key });
          toast.success('API Key已重新生成');
        } else { toast.error(json.message || '重新生成失败'); }
      } else { toast.error('重新生成失败'); }
    } catch { toast.error('操作失败'); }
    finally { setRegenerating(false); }
  };

  const handleSaveUsername = async () => {
    if (!username.trim()) { toast.error('用户名不能为空'); return; }
    setSavingUsername(true);
    try {
      const res = await api('/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim() }) });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('用户名已更新');
        setEditingUsername(false);
        useAuthStore.getState().updateUser({ username: username.trim() });
        window.dispatchEvent(new Event('merchant-sync'));
        await loadProfile();
        setTimeout(() => window.dispatchEvent(new Event('merchant-sync')), 500);
      } else { toast.error(json.message || '更新失败'); }
    } catch { toast.error('更新失败'); }
    finally { setSavingUsername(false); }
  };

  const handleSendEmailCode = async () => {
    if (!emailForm.email || !emailForm.email.includes('@')) { toast.error('请输入有效邮箱'); return; }
    setSendingCode(true);
    try {
      const res = await api('/auth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailForm.email, scene: 'change_email' }) });
      const json = await res.json();
      if (res.ok && json.success) { toast.success('验证码已发送'); setCountdown(60); }
      else { const msg=json.message || '发送失败'; if (msg.includes('频繁') || msg.includes('60秒')) { setCountdown(60); toast.error('请 60 秒后再重新发送'); } else toast.error(msg); }
    } catch { toast.error('发送失败'); }
    finally { setSendingCode(false); }
  };

  const handleChangeEmail = async () => {
    if (!emailForm.code || emailForm.code.length < 4) { toast.error('请输入验证码'); return; }
    try {
      const res = await api('/profile/change-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_email: emailForm.email, code: emailForm.code }) });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message || '邮箱已更换，请重新登录');
        setEmailForm({ email: '', code: '' });
        useAuthStore.getState().logout();
        navigate('/login', { replace: true });
      } else { toast.error(json.message || '更换失败'); }
    } catch { toast.error('更换失败'); }
  };

  const handleChangePassword = async (oldPwd: string, newPwd: string) => {
    try {
      const res = await api('/profile/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ old_password: oldPwd, new_password: newPwd }) });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('密码修改成功，请重新登录');
        useAuthStore.getState().logout();
        navigate('/login', { replace: true });
      } else { toast.error(json.message || '密码修改失败'); }
    } catch { toast.error('密码修改失败'); }
  };

  if (loading) return <div style={{ textAlign:'center', padding:60 }}><span className="spinner" /></div>;
  if (loadError || !profile) return (
    <div className="empty-page">
      <div className="empty-page__icon">⚠️</div>
      <div className="empty-page__title">加载失败</div>
      <div className="empty-page__desc">请稍后重试</div>
      <button className="form-btn" onClick={loadProfile}><RefreshCw className="refresh-icon" size={14} /> 重新加载</button>
    </div>
  );

  const avatarSrc = profile.avatar ? `${profile.avatar}${profile.avatar.includes('?') ? '&' : '?'}t=${avatarVer}` : null;
  const displayName = profile.username || 'User';
  const roleValue = profile.user_type || profile.role || authRole || localStorage.getItem('role');
  const roleText = roleValue === 'admin' ? '管理员' : roleValue === 'merchant' ? '商户' : '--';

  const tabs = [
    { key: "profile", label: "基本资料", icon: <User size={14} /> },
    { key: "security", label: "安全设置", icon: <Shield size={14} /> },
    { key: "transactions", label: "流水明细", icon: <Wallet size={14} /> },
  ];

  return (
    <div className="profile-page">
      <style>{`
        .account-info-card{border-radius:24px!important;padding:30px 34px!important;box-shadow:0 14px 32px rgba(15,23,42,.08)!important}
        .account-info-card h3{font-size:22px!important;margin-bottom:28px!important;gap:14px!important}
        .account-info-list{display:flex;flex-direction:column;gap:0}
        .account-info-item{display:grid;grid-template-columns:96px minmax(0,1fr) auto;align-items:center;gap:14px;padding:18px 0;border-bottom:1px dashed var(--bd,#e9edf3)}
        .account-info-item:last-child{border-bottom:0}
        .account-info-item span{font-size:18px;color:var(--t3,#8a94a6);font-weight:500}
        .account-info-item strong{font-size:18px;color:var(--t1,#1f2937);font-weight:800;text-align:right;word-break:break-all}
        .account-info-item em{font-style:normal;font-size:16px;font-weight:800;color:#e36b7a;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.13);border-radius:8px;padding:6px 12px;justify-self:end}
        .account-info-edit{border:0;background:transparent;color:var(--t2,#6b7280);font-size:16px;padding:0 0 0 8px}
        @media(max-width:768px){.account-info-card{border-radius:16px!important;padding:18px 16px!important}.account-info-card h3{font-size:16px!important;margin-bottom:16px!important;gap:8px!important}.account-info-item{grid-template-columns:64px minmax(0,1fr) auto;padding:12px 0;gap:8px}.account-info-item span{font-size:13px}.account-info-item strong{font-size:13px}.account-info-item em{font-size:12px;padding:3px 8px;border-radius:6px}.account-info-edit{font-size:13px}}
      `}</style>
      <div className="profile-hero profile-hero-pink">
        <div style={{ position:'relative', cursor:'pointer' }} onClick={() => fileRef.current?.click()}>
          <div className="profile-avatar-lg">
            {avatarSrc ? <img src={avatarSrc} alt="" style={{ width:'100%', height:'100%', borderRadius:'inherit', objectFit:'cover', outline:'none', border:'none', display:'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : (displayName?.charAt(0)?.toUpperCase() ?? 'U')}
          </div>
          <div style={{ position:'absolute', bottom:0, right:-4, width:24, height:24, borderRadius:'50%', background:'var(--pri)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, border:'2px solid var(--bg)' }}>
            <Edit3 size={10} />
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarUpload} />
          <input ref={bgFileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleBackgroundUpload} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            {editingUsername ? (
              <>
                <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} style={{ width:140 }} />
                <button className="form-btn" style={{ fontSize:11, height:32, padding:'0 12px' }} onClick={handleSaveUsername} disabled={savingUsername}>保存</button>
                <button className="form-btn form-btn--outline" style={{ fontSize:11, height:32, padding:'0 12px' }} onClick={() => setEditingUsername(false)}>取消</button>
              </>
            ) : (
              <>
                <h1>{profile.username}</h1>
                <button className="form-btn form-btn--outline" style={{ fontSize:11, height:28, padding:'0 8px' }} onClick={() => { setUsername(profile.username); setEditingUsername(true); }}><Edit3 size={10} /></button>
              </>
            )}
          </div>
          <div style={{ fontSize:13, color:'var(--t2)', marginBottom:6 }}>{profile.email}</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            <span className="hero-chip hero-chip--balance">¥ {formatBalance(profile)}</span>
            <span className={`hero-chip ${profilePlanText(profile).includes('已过期') ? 'hero-chip--green' : 'hero-chip--green'}`}>
              <span className="hero-chip-dot" />
              {profilePlanText(profile)}
            </span>
          </div>
        </div>
      </div>

      <div className="profile-body">
        <div className="profile-sidebar">
          {tabs.map(tab => (
            <button key={tab.key} className={`sidebar-tab${activeTab === tab.key ? ' active' : ''}`} onClick={() => setActiveTab(tab.key)}>
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="profile-main">
          {activeTab === 'profile' && (
            <>
            <div className="profile-section account-info-card">
              <h3><User size={16} /> 账户信息</h3>
              <div className="account-info-list">
                <div className="account-info-item"><span>用户名</span><strong>{profile.username || '--'}</strong><i /></div>
                <div className="account-info-item"><span>角色</span><em>{roleText}</em><i /></div>
                <div className="account-info-item"><span>邮箱</span><strong>{profile.email || '--'}</strong><i /></div>
                <div className="account-info-item"><span>会员</span><strong>{profilePlanText(profile)}</strong><i /></div>
                <div className="account-info-item"><span>余额</span><strong>{formatBalance(profile)}</strong><i /></div>
              </div>
            </div>
            </>
          )}

          {activeTab === 'transactions' && (
            <div className="profile-section">
              <h3><Wallet size={16} /> 流水明细</h3>
              {txLoading ? (
                <div style={{ textAlign:'center', padding:40 }}><span className="spinner" /></div>
              ) : transactions.length === 0 ? (
                <div className="empty-state" style={{ padding:'40px 0' }}>
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-text">暂无流水记录</div>
                </div>
              ) : (
                <div style={{ maxHeight:400, overflow:'auto' }}>
                  {transactions.map((tx, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px dashed var(--bd,#e9edf3)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background: tx.kind==='redeem' ? 'rgba(82,196,26,.12)' : 'rgba(59,130,246,.12)', color: tx.kind==='redeem' ? '#52c41a' : '#3b82f6', fontSize:14, fontWeight:800 }}>
                          {tx.kind === 'redeem' ? '兑' : '购'}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--t1)' }}>{tx.title}</div>
                          <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{tx.code ? ('卡密: ' + String(tx.code).slice(0,8) + '...') : ''} {tx.note || ''}</div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        {tx.amount != null && <div style={{ fontSize:14, fontWeight:800, color: Number(tx.amount) >= 0 ? '#52c41a' : '#ef4444' }}>{Number(tx.amount) >= 0 ? '+' : '-'}¥{Math.abs(Number(tx.amount)).toFixed(2)}</div>}
                        <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{tx.occurred_at ? new Date(tx.occurred_at).toLocaleString('zh-CN') : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'security' && (
            <>
            <div className="profile-section">
              <h3><Key size={16} /> API Key</h3>
              <div className="form-row">
                <label className="form-label">当前密钥</label>
                <div className="env-key-row">
                  <code>{apiKey || '暂无密钥'}</code>
                  <button className="env-key-copy" onClick={() => { navigator.clipboard.writeText(apiKey || ''); setCopied(true); toast.success('已复制'); setTimeout(() => setCopied(false), 2000); }}>
                    {copied ? <Check size={10} /> : <Copy size={10} />} {copied ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
              <button className="form-btn" onClick={handleRegenerateKey} disabled={regenerating}>
                {regenerating ? '处理中...' : '重新生成'}
              </button>
            </div>
            <div className="profile-section">
              <h3><Mail size={16} /> 邮箱换绑</h3>
              <div className="form-row"><label className="form-label">新邮箱</label><input className="form-input" placeholder="请输入新邮箱" value={emailForm.email} onChange={e => setEmailForm({ ...emailForm, email: e.target.value })} /></div>
              <div className="form-row" style={{ flexDirection:'row', gap:8 }}>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                  <label className="form-label">验证码</label>
                  <input className="form-input" placeholder="验证码" value={emailForm.code} onChange={e => setEmailForm({ ...emailForm, code: e.target.value })} />
                </div>
                <div style={{ display:'flex', alignItems:'flex-end' }}>
                  <button className="form-btn form-btn--outline" style={{ whiteSpace:'nowrap' }} onClick={handleSendEmailCode} disabled={sendingCode || countdown > 0}>
                    {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
              </div>
              <button className="form-btn" style={{ marginTop:8 }} onClick={handleChangeEmail}>确认换绑</button>
            </div>
            <PasswordSection onChangePassword={handleChangePassword} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordSection({ onChangePassword }: { onChangePassword: (oldPwd: string, newPwd: string) => void }) {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!oldPwd || !newPwd || !confirmPwd) { toast.error('请填写完整'); return; }
    if (newPwd.length < 6) { toast.error('新密码至少6位'); return; }
    if (newPwd !== confirmPwd) { toast.error('密码不一致'); return; }
    setSending(true);
    try {
      await onChangePassword(oldPwd, newPwd);
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    } finally { setSending(false); }
  };

  return (
    <div className="profile-section">
      <h3><EyeOff size={16} /> 修改密码</h3>
      <div className="form-row"><label className="form-label">旧密码</label><input type="password" className="form-input" placeholder="请输入旧密码" value={oldPwd} onChange={e => setOldPwd(e.target.value)} /></div>
      <div className="form-row"><label className="form-label">新密码</label><input type="password" className="form-input" placeholder="请输入新密码（至少6位）" value={newPwd} onChange={e => setNewPwd(e.target.value)} /></div>
      <div className="form-row"><label className="form-label">确认新密码</label><input type="password" className="form-input" placeholder="请再次输入新密码" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} /></div>
      <button className="form-btn" onClick={submit} disabled={sending}>
        {sending ? '提交中...' : '确认修改'}
      </button>
    </div>
  );
}