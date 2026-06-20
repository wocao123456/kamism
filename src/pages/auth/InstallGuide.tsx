import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, User, Settings, ChevronDown, KeyRound, Database, Mail, Lock, RefreshCw, Loader2, Rocket } from 'lucide-react';
import appIcon from '../../assets/app-icon.png';

const randomString = (len: number) => Array.from(crypto.getRandomValues(new Uint8Array(len))).map(b => b.toString(36).padStart(2, '0')).join('').substring(0, len);
const randomHex = () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');

const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function InstallGuide() {
  const [f, setF] = useState({
    postgres_password: 'kamism',
    rabbitmq_password: 'kamism',
    jwt_secret: '',
    master_key: '',
    admin_email: 'admin@example.com',
    admin_password: 'Admin@123456',
    frontend_port: '1420',
    rust_log: 'info'
  });
  const [loading, setLoading] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [genConfirm, setGenConfirm] = useState<{ field: string; generator: () => string } | null>(null);

  useEffect(() => { document.title = '首次安装引导 - KamiSM'; }, []);

  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const handleGenRequest = (field: string, generator: () => string) => {
    setGenConfirm({ field, generator });
  };

  const submit = async () => {
    if (!f.postgres_password || f.postgres_password.length < 5) { toast.error('数据库密码至少 5 位'); return; }
    if (!f.rabbitmq_password || f.rabbitmq_password.length < 5) { toast.error('消息队列密码至少 5 位'); return; }
    if (!f.admin_email || !isEmail(f.admin_email)) { toast.error('管理员账号必须是邮箱格式'); return; }
    if (!f.admin_password) { toast.error('管理员密码不能为空'); return; }
    if (!f.master_key) { toast.error('请生成主加密密钥'); return; }
    if (!f.jwt_secret) { toast.error('请生成 JWT 签名密钥'); return; }

    setLoading(true);
    try {
      const payload: any = { ...f, frontend_port: Number(f.frontend_port) };
      const r = await fetch('/api/install/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (j.success) {
        toast.success('配置已生效，无需重启');
        setTimeout(() => (location.href = '/admin/dashboard'), 1000);
      } else {
        toast.error(j.message || '保存失败，请检查输入');
      }
    } catch (e) {
      toast.error('网络请求失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  const logLevels = ['error', 'warn', 'info', 'debug', 'trace'];

  return (
    <div className="auth-page install-page">
      <main className="auth-wrap install-wrap">
        <section className="auth-brand">
          <img src={appIcon} alt="KamiSM" />
          <h1>KamiSM</h1>
          <p></p>
        </section>

        <section className="auth-card install-card">
          <div className="auth-title">
            <h2>首次安装引导</h2>
            <p>请仅在初次部署时填写，配置保存后将自动锁定，避免重复操作带来安全隐患。</p>
          </div>

          {/* 安全密钥 */}
          <div className="install-group">
            <div className="install-group-title"><Shield size={14} /> 安全与凭据</div>

            <label className="install-field">
              <span className="install-label"><Database size={13} /> 数据库密码 <em>PostgreSQL · 至少 5 位</em></span>
              <div className="auth-input"><input type="text" value={f.postgres_password} onChange={e => set('postgres_password', e.target.value)} placeholder="kamism" /></div>
            </label>

            <label className="install-field">
              <span className="install-label"><Database size={13} /> 消息队列密码 <em>RabbitMQ · 至少 5 位</em></span>
              <div className="auth-input"><input type="text" value={f.rabbitmq_password} onChange={e => set('rabbitmq_password', e.target.value)} placeholder="kamism" /></div>
            </label>

            <label className="install-field">
              <span className="install-label"><KeyRound size={13} /> JWT 签名密钥 <em>建议 32 位以上随机字符串</em></span>
              <div className="install-with-btn">
                <div className="auth-input"><input type="text" value={f.jwt_secret} onChange={e => set('jwt_secret', e.target.value)} placeholder="点击右侧生成" /></div>
                <button type="button" className="install-gen" onClick={() => handleGenRequest('jwt_secret', () => randomString(48))}><RefreshCw size={14} /> 生成</button>
              </div>
            </label>

            <label className="install-field">
              <span className="install-label"><Lock size={13} /> 主加密密钥 <em>十六进制字符串 · 64 个字符</em></span>
              <div className="install-with-btn">
                <div className="auth-input"><input type="text" value={f.master_key} onChange={e => set('master_key', e.target.value)} placeholder="点击右侧生成" /></div>
                <button type="button" className="install-gen" onClick={() => handleGenRequest('master_key', randomHex)}><RefreshCw size={14} /> 生成</button>
              </div>
            </label>
          </div>

          {/* 管理员账号 */}
          <div className="install-group">
            <div className="install-group-title"><User size={14} /> 管理员账号</div>

            <label className="install-field">
              <span className="install-label"><Mail size={13} /> 管理员账号 <em>用于登录后台 · 必须为邮箱</em></span>
              <div className="auth-input"><input type="email" value={f.admin_email} onChange={e => set('admin_email', e.target.value)} placeholder="admin@example.com" /></div>
            </label>

            <label className="install-field">
              <span className="install-label"><Lock size={13} /> 管理员密码 <em>首次登录密码</em></span>
              <div className="auth-input"><input type="text" value={f.admin_password} onChange={e => set('admin_password', e.target.value)} placeholder="Admin@123456" /></div>
            </label>
          </div>

          {/* 高级 */}
          <div className="install-group">
            <div className="install-group-title"><Settings size={14} /> 运行参数</div>

            <label className="install-field">
              <span className="install-label"><Settings size={13} /> 前端访问端口 <em>默认 1420</em></span>
              <div className="auth-input"><input type="number" value={f.frontend_port} onChange={e => set('frontend_port', e.target.value)} placeholder="1420" /></div>
            </label>

            <div className="install-field">
              <span className="install-label"><Settings size={13} /> 日志级别 <em>错误排查用</em></span>
              <div className="install-select" onClick={() => setLogOpen(!logOpen)}>
                <span>{f.rust_log}</span>
                <ChevronDown size={18} style={{ transform: logOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />
              </div>
              {logOpen && (
                <div className="install-select-menu">
                  {logLevels.map(level => (
                    <div key={level} className={'install-select-item' + (f.rust_log === level ? ' active' : '')} onClick={() => { set('rust_log', level); setLogOpen(false); }}>
                      <span>{level}</span>
                      {f.rust_log === level && <i />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button className="auth-primary" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="spin" /> : <Rocket size={18} />} {loading ? '正在保存...' : '确认保存并进入系统'}
          </button>

          <p className="install-tip">配置保存后将立即生效，无需重启，已写入系统配置表。</p>
        </section>

        <footer className="auth-footer">KamiSM · 卡密授权管理系统</footer>
      </main>

      {genConfirm && (
        <div className="install-modal-mask" onClick={() => setGenConfirm(null)}>
          <div className="install-modal" onClick={e => e.stopPropagation()}>
            <h3><Shield size={16} /> 安全提示</h3>
            <p>不建议使用一键随机生成后置之不理，请务必妥善保管生成的密钥，遗失将无法解密历史数据。</p>
            <div className="install-modal-actions">
              <button className="install-btn-ghost" onClick={() => setGenConfirm(null)}>取消</button>
              <button className="install-btn-primary" onClick={() => { set(genConfirm.field, genConfirm.generator()); setGenConfirm(null); }}>确定生成</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}