import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { merchantApi, activationsApi, logApi } from '../../lib/api';
import { Activity, Check, Edit3, FileText, Key, Lock, LogIn, LogOut, Package, PlusCircle, RefreshCw, Send, Settings, Shield, Smartphone, TrendingUp, TrendingDown, MinusCircle, Trash2, Unlink, Eye, AppWindow, CreditCard, Wallet } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from 'recharts';
import { useThemeStore } from '../../stores/theme';

interface CardStat { status: string; count: number; }
interface TrendItem { date: string; count: number; }
interface DeviceDistItem { app: string; count: number; }
interface IpStatItem { ip: string; activate_count: number; last_access: string; }
interface DashboardStats { card_stats: CardStat[]; activation_trend: TrendItem[]; device_dist: DeviceDistItem[]; ip_stats: IpStatItem[]; }
const STATUS_LABEL: Record<string, string> = { unused: '未使用', active: '使用中', expired: '已过期', disabled: '已禁用' };
const STATUS_COLOR: Record<string, string> = { unused: '#888899', active: '#7c6af7', expired: '#f87171', disabled: '#fbbf24' };

function getActionIcon(action: string) {
  const base: React.CSSProperties = { width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, flexShrink: 0, boxShadow: '0 8px 18px rgba(15,23,42,.06)' };
  const cfgs: Record<string, { el: React.ReactNode; bg: string; color: string }> = {
    login: { el: <LogIn size={18} />, bg: '#10b9811f', color: '#10b981' },
    logout: { el: <LogOut size={18} />, bg: '#f59e0b1f', color: '#f59e0b' },
    create: { el: <PlusCircle size={18} />, bg: '#3b82f61a', color: '#3b82f6' },
    update: { el: <Edit3 size={18} />, bg: '#f59e0b1a', color: '#f59e0b' },
    delete: { el: <Trash2 size={18} />, bg: '#ef44441a', color: '#ef4444' },
    activate: { el: <Smartphone size={18} />, bg: '#10b9811f', color: '#10b981' },
    verify: { el: <Shield size={18} />, bg: '#06b6d41a', color: '#0891b2' },
    unbind: { el: <Unlink size={18} />, bg: '#f59e0b1a', color: '#f59e0b' },
    sign: { el: <FileText size={18} />, bg: '#8b5cf61a', color: '#8b5cf6' },
    encrypt: { el: <Lock size={18} />, bg: '#06b6d41a', color: '#0891b2' },
    decrypt: { el: <Lock size={18} />, bg: '#10b9811f', color: '#10b981' },
    change_password: { el: <Lock size={18} />, bg: '#ef44441a', color: '#ef4444' },
    update_profile: { el: <Settings size={18} />, bg: '#64748b1a', color: '#64748b' },
    regenerate: { el: <RefreshCw size={18} />, bg: '#8b5cf61a', color: '#8b5cf6' },
    update_plan: { el: <Package size={18} />, bg: '#f59e0b1a', color: '#f59e0b' },
    send: { el: <Send size={18} />, bg: '#8b5cf61a', color: '#8b5cf6' },
    view: { el: <Eye size={18} />, bg: '#6366f11a', color: '#6366f1' },
    other: { el: <Eye size={18} />, bg: '#64748b1a', color: '#64748b' },
  };
  const c = cfgs[action] || cfgs.other;
  return <span style={{ ...base, background: c.bg, color: c.color }}>{c.el}</span>;
}

function TrendChart({ rows }: { rows: TrendItem[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1, w = Math.max(320, c.offsetWidth || 600), h = Math.max(220, c.offsetHeight || 240);
    c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const padL = 36, padR = 18, padT = 30, padB = 28, plotW = w - padL - padR, plotH = h - padT - padB;
    if (!rows || rows.length === 0) { ctx.fillStyle = '#94a3b8'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('暂无激活数据', w / 2, h / 2); return; }
    const vals = rows.map(r => Number(r.count) || 0), maxVal = Math.max(...vals, 1);
    const xOf = (i: number) => padL + plotW / Math.max(1, rows.length - 1) * i;
    const yOf = (v: number) => h - padB - (v / maxVal) * plotH;
    ctx.strokeStyle = 'rgba(226,232,240,.7)'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const y = padT + i * plotH / 4; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke(); }
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(rows.length / 8));
    rows.forEach((r, i) => { if (i % step !== 0 && i !== rows.length - 1) return; ctx.fillText(r.date.slice(5), xOf(i), h - 8); });
    const grad = ctx.createLinearGradient(0, padT, 0, h - padB);
    grad.addColorStop(0, 'rgba(124,106,247,.32)'); grad.addColorStop(1, 'rgba(124,106,247,0)');
    ctx.beginPath();
    rows.forEach((r, i) => { const p = { x: xOf(i), y: yOf(Number(r.count) || 0) }; if (i === 0) ctx.moveTo(p.x, p.y); else { const pr = { x: xOf(i - 1), y: yOf(Number(rows[i - 1].count) || 0) }; const dx = p.x - pr.x; ctx.bezierCurveTo(pr.x + dx * .45, pr.y, p.x - dx * .45, p.y, p.x, p.y); } });
    ctx.lineTo(xOf(rows.length - 1), h - padB); ctx.lineTo(padL, h - padB); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = '#7c6af7'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath();
    rows.forEach((r, i) => { const p = { x: xOf(i), y: yOf(Number(r.count) || 0) }; if (i === 0) ctx.moveTo(p.x, p.y); else { const pr = { x: xOf(i - 1), y: yOf(Number(rows[i - 1].count) || 0) }; const dx = p.x - pr.x; ctx.bezierCurveTo(pr.x + dx * .45, pr.y, p.x - dx * .45, p.y, p.x, p.y); } });
    ctx.stroke();
    rows.forEach((r, i) => { const p = { x: xOf(i), y: yOf(Number(r.count) || 0) }; ctx.fillStyle = '#7c6af7'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
  }, [rows]);
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [d, setD] = useState(0);
  useEffect(() => { let f = 0; const s = performance.now(); const step = (n: number) => { const p = Math.min((n - s) / 800, 1); setD(value * (1 - Math.pow(1 - p, 3))); if (p < 1) f = requestAnimationFrame(step); }; f = requestAnimationFrame(step); return () => cancelAnimationFrame(f); }, [value]);
  return <>{d.toFixed(decimals)}</>;
}
function greetingText() { const h = new Date().getHours(); if (h < 6) return ['夜深了', '夜深了，记得早点休息哦~']; if (h < 12) return ['早上好', '欢迎回来！查看您的卡密系统运营情况。']; if (h < 14) return ['中午好', '该吃午饭啦，注意劳逸结合~']; if (h < 18) return ['下午好', '下午也要保持专注哦！']; return ['晚上好', '辛苦一天啦，看看系统运行情况吧~']; }
function getLocalUsername() { try { return JSON.parse(localStorage.getItem('user') || '{}')?.username || '商户'; } catch { return '商户'; } }
function timeAgo(t: any) { const ms = Date.now() - new Date(t).getTime(); if (!Number.isFinite(ms)) return ''; const m = Math.max(1, Math.floor(ms / 60000)); if (m < 60) return `${m}分钟前`; const h = Math.floor(m / 60); if (h < 24) return `${h}小时前`; return `${Math.floor(h / 24)}天前`; }
function isNoiseLog(l: any) { const d = String(l?.detail || '').toLowerCase(); const noisy = ['/auth/send-code', '/profile/upload-background', '/profile/avatar', '/profile/api-key', '/profile/change-password', '/profile/change-email', '/profile/verify-old-email', '/install/status', '/system-config/public', '/profile', '/dashboard-stats', '/op-logs', '/notices', '/messages', '/unread-count']; return noisy.some(x => d.includes(x)) || d.includes('查看平台总览') || d.includes('查看页面') || d === '其他操作'; }
function cleanLogTitle(l: any) { const detail = String(l?.detail || '').replace(/^查看\s+/, '').trim(); const map: Record<string, string> = { login: '商户登录', logout: '退出登录', create: '新建数据', update: '更新资料', delete: '删除数据', activate: '卡密激活', verify: '接口校验', regenerate: '重置密钥', update_plan: '套餐变更', update_profile: '修改资料', change_password: '修改密码', view: detail && !detail.startsWith('/') ? detail : '查看页面' }; return map[l?.action] || detail || '系统操作'; }

export default function MerchantDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ card_stats: [], activation_trend: [], device_dist: [], ip_stats: [] });
  const [loading, setLoading] = useState(true);
  const [opLogs, setOpLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  const username = getLocalUsername();
  const [greeting, greetingSub] = greetingText();
  const { theme } = useThemeStore();
  useEffect(() => {
    logApi.log('view', 'platform', 'view_merchant_overview');
    setLoading(true);
    const token = localStorage.getItem('token') || '';
    fetch('/api/merchant/op-logs?page=1&page_size=80', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { if (d.success) setOpLogs((d.data || []).filter((x: any) => !isNoiseLog(x))); }).catch(() => { }).finally(() => setLogsLoading(false));
    merchantApi.getProfile().then(r => { if (r.data.success) setProfile(r.data.data); }).catch(() => { });
    Promise.all([merchantApi.dashboardStats('week'), activationsApi.list({ page: 1, page_size: 500 })]).then(([sr]) => {
      const d: DashboardStats = { card_stats: [], activation_trend: [], device_dist: [], ip_stats: [] };
      if (sr?.data?.success) { d.card_stats = sr.data.data?.card_stats ?? []; d.activation_trend = sr.data.data?.activation_trend ?? []; d.device_dist = sr.data.data?.device_dist ?? []; d.ip_stats = sr.data.data?.ip_stats ?? []; }
      setStats(d);
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);
  const totalCards = stats.card_stats.reduce((s, c) => s + c.count, 0);
  const activeCards = stats.card_stats.find(c => c.status === 'active')?.count ?? 0;
  const totalActivations = stats.activation_trend.reduce((s, c) => s + c.count, 0);
  const balance = Number(profile?.balance ?? 0);
  const trendCounts = stats.activation_trend.map(x => Number(x.count) || 0);
  const lastTrend = trendCounts.length ? trendCounts[trendCounts.length - 1] : 0;
  const prevTrend = trendCounts.length > 1 ? trendCounts[trendCounts.length - 2] : 0;
  const activeDelta = lastTrend - prevTrend;
  const activeDeltaText = activeDelta === 0 ? '0' : `${activeDelta > 0 ? '+' : ''}${activeDelta}`;
  const activeDeltaClass = activeDelta > 0 ? 'is-up' : activeDelta < 0 ? 'is-down' : 'is-flat';
  const statCards = [
    { label: '账户余额', value: balance, prefix: '¥', decimals: 2, icon: <Wallet size={22} />, color: '#10b981', bg: '#10b9811f' },
    { label: '卡密总数', value: totalCards, icon: <Key size={22} />, color: '#3b82f6', bg: '#3b82f61a' },
    { label: '使用中', value: activeCards, icon: <Activity size={22} />, color: '#7c6af7', bg: '#7c6af71a' },
    { label: '近期激活', value: totalActivations, delta: activeDeltaText, deltaClass: activeDeltaClass, icon: <Smartphone size={22} />, color: '#f59e0b', bg: '#f59e0b1a' },
  ];
  const visibleLogs = logsLoading ? [] : opLogs.filter((x: any) => !isNoiseLog(x)).filter((x: any) => !String(cleanLogTitle(x)).startsWith('/')).slice(0, 10);
  const activities = visibleLogs.map((l: any) => ({ title: cleanLogTitle(l), desc: l.user_type === 'admin' ? '管理员操作' : '我的操作', time: timeAgo(l.created_at), action: l.action, success: l.action !== 'delete' && l.action !== 'logout' }));
  const quickTiles: any[] = [['应用', AppWindow, '#10b9811f', '#10b981', '/apps'], ['卡密', Key, '#3b82f61a', '#3b82f6', '/cards'], ['充值', CreditCard, '#f59e0b1a', '#f59e0b', '/recharge'], ['API', FileText, '#8b5cf61a', '#8b5cf6', '/api-manage'], ['设置', Settings, '#6b72801a', '#6b7280', '/profile']];
  const tooltipStyle = { background: theme === 'dark' ? '#111118' : '#fff', border: `1px solid ${theme === 'dark' ? '#2a2a3e' : '#c8c8da'}`, borderRadius: 8, color: theme === 'dark' ? '#e8e8f0' : '#18181f', fontSize: 12 };
  return (
    <div className="dpage merchant-dashboard">
      <div className="hero-row animate-fade-in-up">
        <div className="hero-banner hero-banner--dynamic hero-wave-sea">
          <div className="sea-layer sea-layer--front" /><div className="sea-layer sea-layer--back" /><div className="sea-layer sea-layer--foam" />
          <div className="hero-c"><h3>{greeting}，{username} <span className="hero-wave">👋</span></h3><p>{greetingSub}</p></div>
        </div>
        <div className="hero-quick">
          <div className="hero-quick__title">快捷操作</div>
          <div className="hero-quick__grid">
            {quickTiles.map(([label, IconComp, bg, color, href]: any, i: number) => (
              <div key={i} className="quick-tile" onClick={() => navigate(href)}>
                <div className="quick-tile__icon" style={{ background: bg, color: color }}><IconComp size={22} /></div>
                <span className="quick-tile__label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="stat-grid animate-fade-in-up delay-50">
        {statCards.map((c, i) => (
          <div key={i} className="stat-card">
            <div>
              <div className="stat-card__label">{c.label}</div>
              <div className="stat-card__value">{loading ? '...' : <>{c.prefix || ''}<CountUp value={Number(c.value) || 0} decimals={c.decimals || 0} /></>}</div>
              {c.delta && c.delta !== '0' && c.delta !== '持平' && (
                <div style={{marginTop:6}}>
                  <span className={`stat-card__delta-value ${c.deltaClass}`}>
                    {c.deltaClass==='is-up' ? <TrendingUp size={12}/> : c.deltaClass==='is-down' ? <TrendingDown size={12}/> : <MinusCircle size={12}/>} {' '}{c.delta}
                  </span>
                </div>
              )}
            </div>
            <div className="stat-card__icon" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
          </div>
        ))}
      </div>
      <div className="middle-grid animate-fade-in-up delay-100" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <div className="panel">
          <div className="panel-header"><span className="panel-header__title"><TrendingUp size={20} /> 激活趋势（近7天）</span></div>
          <div className="chart-shell">{loading ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--t3)' }}><span className="spinner" style={{ marginRight: 8 }} /> 加载中...</div> : <TrendChart rows={stats.activation_trend} />}</div>
        </div>
        <div className="panel">
          <div className="panel-header"><span className="panel-header__title"><Activity size={20} /> 最近活动</span></div>
          <div className="activity-feed">
            {logsLoading ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--t3)' }}>加载中...</div> : activities.length === 0 ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--t3)' }}>暂无操作记录</div> : activities.map((a, i) => (
              <div key={i} className="activity-item">
                <div className={`activity-item__icon${a.success ? ' is-success' : ' is-failed'}`}>{a.action ? getActionIcon(a.action) : <Check size={14} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div className="activity-item__title">{a.title}</div><div className="activity-item__desc">{a.desc}</div></div>
                <span className="activity-item__time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="middle-grid animate-fade-in-up delay-150" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="panel">
          <div className="panel-header"><span className="panel-header__title"><Key size={18} /> 卡密分布</span></div>
          <div style={{ padding: 16, height: 260 }}>
            {stats.card_stats.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--t3)', paddingTop: 90 }}>暂无卡密</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.card_stats} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {stats.card_stats.map((e, i) => <Cell key={i} fill={STATUS_COLOR[e.status] || '#999'} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any, _n: any, p: any) => [v, STATUS_LABEL[p.payload.status] || p.payload.status]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><span className="panel-header__title"><Package size={18} /> 设备分布</span></div>
          <div style={{ padding: 16, height: 260 }}>
            {stats.device_dist.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--t3)', paddingTop: 90 }}>暂无数据</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.device_dist.slice(0, 8)} layout="vertical" margin={{ top: 6, right: 30, left: 6, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,.4)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="app" tick={{ fontSize: 11, fill: '#94a3b8' }} width={80} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#7c6af7" radius={[0, 6, 6, 0]}><LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: '#94a3b8' }} /></Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
