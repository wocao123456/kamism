import { useState } from 'react';
import toast from 'react-hot-toast';
import { Shield, User, Settings, ChevronDown } from 'lucide-react';

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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px 100px', position: 'relative' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, var(--accent), #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(124,106,247,0.3)' }}>
              <Settings size={24} color="#fff" />
            </div>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.5px' }}>首次安装引导</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            请仅在初次部署时填写。配置保存后将自动锁定，避免重复操作带来安全隐患。
          </p>
        </div>

        <div className="card" style={{ padding: '24px 20px', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gap: 22 }}>
            
            {/* PostgreSQL Password */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Shield size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>数据库密码</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>PostgreSQL (至少 5 位)</div>
              <input className="input" type="text" value={f.postgres_password} onChange={e => set('postgres_password', e.target.value)} placeholder="kamism" style={{ height: 44, fontSize: 14 }} />
            </div>

            {/* RabbitMQ Password */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Shield size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>消息队列密码</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>RabbitMQ (至少 5 位)</div>
              <input className="input" type="text" value={f.rabbitmq_password} onChange={e => set('rabbitmq_password', e.target.value)} placeholder="kamism" style={{ height: 44, fontSize: 14 }} />
            </div>

            {/* JWT Secret */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Shield size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>JWT 签名密钥</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>建议 32 位以上随机字符串</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="text" value={f.jwt_secret} onChange={e => set('jwt_secret', e.target.value)} placeholder="点击生成" style={{ height: 44, fontSize: 14, flex: 1 }} />
                <button className="btn btn-ghost" onClick={() => handleGenRequest('jwt_secret', () => randomString(48))} style={{ height: 44, padding: '0 16px', fontSize: 13, whiteSpace: 'nowrap' }}>生成</button>
              </div>
            </div>

            {/* Master Key */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Shield size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>主加密密钥</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>十六进制字符串（64 个字符）</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="text" value={f.master_key} onChange={e => set('master_key', e.target.value)} placeholder="点击生成" style={{ height: 44, fontSize: 14, flex: 1 }} />
                <button className="btn btn-ghost" onClick={() => handleGenRequest('master_key', randomHex)} style={{ height: 44, padding: '0 16px', fontSize: 13, whiteSpace: 'nowrap' }}>生成</button>
              </div>
            </div>

            {/* Admin Email */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <User size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>管理员账号</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>用于登录后台 (必须为邮箱)</div>
              <input className="input" type="email" value={f.admin_email} onChange={e => set('admin_email', e.target.value)} placeholder="admin@example.com" style={{ height: 44, fontSize: 14 }} />
            </div>

            {/* Admin Password */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <User size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>管理员密码</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>首次登录密码</div>
              <input className="input" type="text" value={f.admin_password} onChange={e => set('admin_password', e.target.value)} placeholder="Admin@123456" style={{ height: 44, fontSize: 14 }} />
            </div>

            {/* Frontend Port */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Settings size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>前端访问端口</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>默认 1420</div>
              <input className="input" type="number" value={f.frontend_port} onChange={e => set('frontend_port', e.target.value)} placeholder="1420" style={{ height: 44, fontSize: 14 }} />
            </div>

            {/* Log Level - Expandable */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Settings size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>日志级别</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>错误排查用</div>
              <div 
                className="input" 
                onClick={() => setLogOpen(!logOpen)}
                style={{ height: 44, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span>{f.rust_log}</span>
                <ChevronDown size={18} style={{ transform: logOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />
              </div>
              
              {logOpen && (
                <div style={{ marginTop: 4, background: 'var(--bg-hover)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {logLevels.map(level => (
                    <div 
                      key={level} 
                      onClick={() => { set('rust_log', level); setLogOpen(false); }}
                      style={{ 
                        padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', fontSize: 14, fontWeight: 500,
                        background: f.rust_log === level ? 'var(--accent-glow)' : 'transparent',
                        color: f.rust_log === level ? 'var(--accent)' : 'var(--text)'
                      }}
                    >
                      <span>{level}</span>
                      {f.rust_log === level && <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)' }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={loading}
            style={{
              marginTop: 28, height: 48, fontSize: 15, fontWeight: 700, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--accent), #6d28d9)', border: 'none',
              boxShadow: '0 4px 12px rgba(124,106,247,0.25)', width: '100%'
            }}
          >
            {loading ? '正在保存...' : '确认保存并进入系统'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          配置保存后将立即生效，无需重启。已保存到系统表。
        </div>

        {/* Custom Confirmation Modal */}
        {genConfirm && (
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => setGenConfirm(null)} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1001, background: 'var(--bg-card)', padding: 24, borderRadius: 16, width: 'min(320px, 90vw)', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>安全提示</h3>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                警告：不建议使用一键随机生成，请妥善保管生成的密钥！
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setGenConfirm(null)}>取消</button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => { 
                    set(genConfirm.field, genConfirm.generator()); 
                    setGenConfirm(null); 
                  }}
                >
                  确定
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
