import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Upload, Save, LayoutDashboard, Package, Key, Activity, Wallet, Bell, ShieldAlert, Network, BookOpen, Webhook, Store, RefreshCw, Github, Power, SlidersHorizontal, CheckCircle2, AlertTriangle, Database, HardDrive, Mail, Server, Box, Download, X, ChevronRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { adminApi } from '../../lib/api';
import appIcon from '../../assets/app-icon.png';

const OAUTH_TYPES = [
  { value: 'qq', label: 'QQ', icon: '🐧' }, { value: 'wx', label: '微信', icon: '💬' },
  { value: 'alipay', label: '支付宝', icon: '💰' }, { value: 'sina', label: '微博', icon: '📢' },
  { value: 'baidu', label: '百度', icon: '🔍' }, { value: 'douyin', label: '抖音', icon: '🎵' },
  { value: 'huawei', label: '华为', icon: '📱' }, { value: 'google', label: 'Google', icon: '🔗' },
  { value: 'microsoft', label: 'Microsoft', icon: '🪟' }, { value: 'twitter', label: 'Twitter', icon: '🐦' },
  { value: 'dingtalk', label: '钉钉', icon: '💼' }, { value: 'gitee', label: 'Gitee', icon: '🐙' },
  { value: 'github', label: 'GitHub', icon: '🐱' },
];

const MERCHANT_FEATURES = [
  ['dashboard','总览', LayoutDashboard], ['apps','我的应用', Package], ['cards','卡密管理', Key], ['activations','激活记录', Activity], ['recharge','商户充值', Wallet],
  ['messages','消息中心', Bell], ['blacklist','风控管理', ShieldAlert], ['agents','代理管理', Network], ['api_docs','API 文档', BookOpen], ['api_manage','API 管理', Webhook],
] as const;

function Chip({ active, children, onClick }: { active:boolean; children:React.ReactNode; onClick:()=>void }) { return <button onClick={onClick} className={`env-tab${active ? ' active' : ''}`}>{children}</button>; }
function fmtDate(v?: string) { if (!v) return '从未检查'; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleString('zh-CN'); }

function versionNums(value?: any) {
  const m = String(value || '').match(/v?\d+(?:\.\d+){1,3}/)?.[0];
  if (!m) return null;
  return m.replace(/^v/i, '').split('.').map(n => Number(n || 0));
}
function remoteVersionNewer(current?: any, latest?: any) {
  const cur = versionNums(current);
  const lat = versionNums(latest);
  if (!cur || !lat) return true;
  const len = Math.max(cur.length, lat.length);
  while (cur.length < len) cur.push(0);
  while (lat.length < len) lat.push(0);
  for (let i = 0; i < len; i++) {
    if (lat[i] > cur[i]) return true;
    if (lat[i] < cur[i]) return false;
  }
  return false;
}
function versionLabel(value?: any) {
  return String(value || '').match(/v?\d+(?:\.\d+){1,3}/)?.[0] || '';
}
function usageClass(n?: number) { const v = Number(n || 0); return v >= 80 ? '#ef4444' : v >= 60 ? '#f59e0b' : '#10b981'; }
function fmtBytes(bytes?: number) { const b=Number(bytes||0); if(!b) return '0 B'; const u=['B','KB','MB','GB','TB']; const i=Math.floor(Math.log(b)/Math.log(1024)); return `${(b/Math.pow(1024,i)).toFixed(1)} ${u[i]}`; }

function SettingsCard({children, style}:{children:React.ReactNode; style?:React.CSSProperties}) { return <div className="overview-card" style={{background:'var(--c, #fff)', border:'1px solid var(--bd,#edf0f5)', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,.04)', padding:24, ...style}}>{children}</div>; }

export default function SettingsPage() {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState('');
  const [systemInfo, setSystemInfo] = useState<any>({ hostname:'kamism', os:'Linux', arch:'x86_64', cpu_usage:0, num_cpu:0, memory_usage:0, memory_used:0, memory_total:0, disk_usage:0, disk_used:0, disk_total:0 });
  const [healthInfo, setHealthInfo] = useState<any>({ postgresql:'ok', containers: [] });
  const [checkingHealth, setCheckingHealth] = useState(false);
  const pollRef = useRef<number | null>(null);
  const sysPollRef = useRef<number | null>(null);
  const updateStatusPollRef = useRef<number | null>(null);

  // 新增：更新相关状态
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);
  const [progressVisible, setProgressVisible] = useState(false);
  const [progressPhase, setProgressPhase] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const [changelogVisible, setChangelogVisible] = useState(false);
  const [logVisible, setLogVisible] = useState(false);

  const [oauthEnabled, setOauthEnabled] = useState(false);
  const [appid, setAppid] = useState('');
  const [appkey, setAppkey] = useState('');
  const [redirectUri, setRedirectUri] = useState(() => `${window.location.origin}/auth/oauth/callback`);
  const [oauthBaseUrl, setOauthBaseUrl] = useState('https://u.suyanw.cn');
  const [oauthLoginPath, setOauthLoginPath] = useState('/connect.php');
  const [oauthUserPath, setOauthUserPath] = useState('/api.php');
  const [enabledTypes, setEnabledTypes] = useState<string[]>([]);
  const [merchantFeatures, setMerchantFeatures] = useState<string[]>(MERCHANT_FEATURES.map(([k]) => k));
  const [merchantPageEnabled, setMerchantPageEnabled] = useState(true);
  const [registerEnabled, setRegisterEnabled] = useState(true);
  const [smtp, setSmtp] = useState<any>({ enabled:false, smtp_host:'', smtp_port:'465', smtp_user:'', smtp_pass:'', smtp_from_name:'KamiSM', smtp_from_email:'' });
  const [activeTab, setActiveTab] = useState(() => (role === 'admin' ? 'overview' : 'basic'));
  const [adminInner, setAdminInner] = useState<'merchant'|'features'|'oauth'|'mail'>('merchant');

  const stopPolling = () => { if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; } };
  const stopSysPolling = () => { if (sysPollRef.current) { window.clearInterval(sysPollRef.current); sysPollRef.current = null; } };
  const stopUpdateStatusPolling = () => { if (updateStatusPollRef.current) { window.clearInterval(updateStatusPollRef.current); updateStatusPollRef.current = null; } };
  const loadSystemInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/system/info', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setSystemInfo(json.data || json || {});
    } catch {}
  };
  const checkForUpdates = async (silent = false, allowAutoApply = false, recordCheck = !silent) => {
    if (!isAdmin) return;
    if (!silent) setChecking(true);
    else setStatusRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/system-update/status', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        const responseHasUpdate = Boolean(json.data?.has_update && remoteVersionNewer(versionLabel(json.data?.current_version || json.data?.current), versionLabel(json.data?.latest_version || json.data?.latest)));
        setUpdateInfo(json.data);
        if (json.data?.running) {
          if (!applyingRef.current) { applyingRef.current = true; setApplying(true); }
          setProgressVisible(true);
          setProgressPhase(json.data.phase || 'running');
          setProgressMessage(json.data.phase_message || '更新中...');
          if (!pollRef.current) pollRef.current = window.setInterval(() => checkForUpdates(true, false, false), 3000);
        } else {
          if (applyingRef.current && !json.data?.running) {
            // 更新刚完成
            applyingRef.current = false;
            setApplying(false);
            setProgressPhase('done');
            setProgressMessage('更新完成，页面即将刷新...');
            stopPolling();
            setTimeout(() => window.location.reload(), 3000);
          }
        }
        if (recordCheck) {
          const nowIso=new Date().toISOString();
          setLastCheckTime(nowIso);
          localStorage.setItem('kamism_auto_update_last_check', nowIso);
        }
        if (allowAutoApply && localStorage.getItem('kamism_auto_update_enabled')==='1' && responseHasUpdate && !json.data?.running) {
          fetch('/api/system-update/apply',{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}}).catch(()=>{});
        }
      }
      else if (!silent && res.status !== 403) toast.error(json.message || '检查更新失败');
    } catch { if (!silent && isAdmin) toast.error('检查更新失败'); }
    finally { if (!silent) setChecking(false); else setStatusRefreshing(false); }
  };

  const applyUpdate = async () => {
    if (applying) { toast('更新任务已在进行中'); return; }
    const msg = displayHasUpdate
      ? `确认更新到 ${versionLabel(updateInfo?.latest_version) || '最新版'}？\n\n系统将执行以下操作：\n1. 从 Git 拉取最新代码\n2. 重新构建 Docker 镜像\n3. 重启 app/web 容器\n4. 写入版本信息\n\n更新期间服务会短暂中断。`
      : '当前已是最新版本，无需更新。';
    if (displayHasUpdate && !confirm(msg)) return;
    if (!displayHasUpdate) { toast.success('当前已是最新版本'); return; }

    setApplying(true);
    applyingRef.current = true;
    setProgressVisible(true);
    setProgressPhase('preparing');
    setProgressMessage('正在提交更新任务...');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/system-update/apply', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        toast.success('系统更新已开始');
        if (!pollRef.current) pollRef.current = window.setInterval(() => checkForUpdates(true, false, false), 3000);
      } else {
        setApplying(false);
        applyingRef.current = false;
        setProgressPhase('error');
        setProgressMessage(json.message || '启动更新失败');
        toast.error(json.message || '启动更新失败');
      }
    } catch {
      setApplying(false);
      applyingRef.current = false;
      setProgressPhase('error');
      setProgressMessage('网络错误');
      toast.error('启动更新失败');
    }
  };

  const restartPanel = async () => { if (!confirm('确定要重启面板吗？重启期间服务将短暂中断。')) return; toast('正在重启面板...'); try { await fetch('/api/system/restart',{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}}); } catch {} setTimeout(()=>window.location.reload(), 4500); };
  const refreshHealth = async () => { setCheckingHealth(true); try { const token=localStorage.getItem('token'); const [hi, hf] = await Promise.all([fetch('/api/system/info',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()), fetch('/api/system/health-full',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json())]); setSystemInfo(hi.data||hi||{}); setHealthInfo(hf.data||hf||{}); toast.success('检测完成'); } catch { toast.error('检测失败'); } finally { setCheckingHealth(false); } };

  useEffect(() => {
    if (isAdmin) {
      (async () => { try { const token = localStorage.getItem('token'); const res = await fetch('/auth/oauth/admin/config', { headers: { Authorization: `Bearer ${token}` } }); const json = await res.json(); if (json.success && json.data) { const cfg = json.data; setOauthEnabled(Boolean(cfg.enabled)); setAppid(cfg.appid || ''); setAppkey(cfg.appkey || ''); setRedirectUri(cfg.redirect_uri || `${window.location.origin}/auth/oauth/callback`); setOauthBaseUrl(cfg.base_url || 'https://u.suyanw.cn'); setOauthLoginPath(cfg.login_path || '/connect.php'); setOauthUserPath(cfg.user_path || '/api.php'); setEnabledTypes(cfg.enabled_types || []); } } catch {} })();
      const defer = (fn:()=>void, delay=900) => window.setTimeout(fn, delay);
      defer(() => adminApi.getSystemConfig().then((res) => { const data = res.data?.data || {}; const features = data['merchant.enabled_features']; if (Array.isArray(features)) setMerchantFeatures(features); else setMerchantFeatures(MERCHANT_FEATURES.map(([k]) => k)); setMerchantPageEnabled(data['merchant.page_enabled'] !== false); setRegisterEnabled(data['auth.register_enabled'] !== false); const active = document.activeElement as HTMLElement | null; const editing = !!active && ['INPUT','TEXTAREA','SELECT'].includes(active.tagName); if (data['mail.smtp'] && !editing) setSmtp((prev:any) => ({ ...prev, ...data['mail.smtp'] })); }).catch(() => {}), 700);
      defer(() => { loadSystemInfo(); if (!sysPollRef.current) sysPollRef.current = window.setInterval(loadSystemInfo, 5000); }, 1000);
      defer(() => fetch('/api/system/health-full',{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}}).then(r=>r.json()).then(j=>setHealthInfo(j.data||j||{})).catch(()=>{}), 1200);
      const au = localStorage.getItem('kamism_auto_update_enabled') === '1';
      setAutoUpdate(au);
      const lc = localStorage.getItem('kamism_auto_update_last_check') || '';
      if (lc) setLastCheckTime(lc);
      // 进入页面后先静默刷新一次状态，避免“当前状态”一直停留在旧缓存。
      defer(() => checkForUpdates(true, false, false), 1600);
      // 状态每 60 秒刷新一次；只有自动更新开启且距离上次检查超过 24 小时时，才允许自动执行更新。
      if (!updateStatusPollRef.current) {
        updateStatusPollRef.current = window.setInterval(() => {
          const enabled = localStorage.getItem('kamism_auto_update_enabled') === '1';
          const last = localStorage.getItem('kamism_auto_update_last_check') || '';
          const due = enabled && (!last || Date.now() - new Date(last).getTime() >= 86400000);
          checkForUpdates(true, due, due);
        }, 60000);
      }
      if (au && (!lc || Date.now()-new Date(lc).getTime()>=86400000)) {
        defer(() => checkForUpdates(true, true, true), 2200);
      }
    }
    return () => { stopPolling(); stopSysPolling(); stopUpdateStatusPolling(); };
  }, []);

  useEffect(() => {
    if (!isAdmin && activeTab !== 'basic') setActiveTab('basic');
  }, [isAdmin, activeTab]);

  const tabs = [
    ...(isAdmin ? [{ key: 'overview', label: '概览', icon: <LayoutDashboard size={15} /> }] : []),
    { key: 'basic', label: '基础设置', icon: <Upload size={15} /> },
    ...(isAdmin ? [{ key: 'admin', label: '管理员设置', icon: <SlidersHorizontal size={15} /> }] : []),
  ];
  const rawVersion = updateInfo?.current_version || updateInfo?.current || (()=>{ try { const m = document.querySelector('meta[name=app-version]')?.getAttribute('content') || ''; return m || '1.5.1'; } catch { return '1.5.1'; } })();
  const currentVersion = versionLabel(rawVersion).replace(/^v/i,'') || '1.5.1';
  const latestVersion = versionLabel(updateInfo?.latest_version || updateInfo?.latest);
  const displayHasUpdate = Boolean(updateInfo?.has_update && remoteVersionNewer(currentVersion, latestVersion));
  const nextCheck = lastCheckTime ? new Date(new Date(lastCheckTime).getTime()+86400000).toLocaleString('zh-CN') : '-';
  const mailFields: Record<string, { label: string; placeholder: string; help: string; type?: string }> = {
    smtp_host: { label: 'SMTP 服务器地址', placeholder: '例如：smtp.qq.com、smtp.163.com、smtp.gmail.com', help: '填写邮箱服务商提供的 SMTP_HOST，不要填写 http:// 或 https://。' },
    smtp_port: { label: 'SMTP 端口', placeholder: '常用：465（SSL）或 587（TLS）', help: '多数国内邮箱使用 465；如果服务商要求 STARTTLS 通常填 587。' },
    smtp_user: { label: 'SMTP 登录账号', placeholder: '通常为完整邮箱地址，例如：notice@example.com', help: '用于登录 SMTP 服务的账号。' },
    smtp_pass: { label: 'SMTP 授权码/密码', placeholder: '填写邮箱授权码，不是登录密码', help: 'QQ/163/企业邮箱一般需要在邮箱后台生成 SMTP 授权码。', type: 'password' },
    smtp_from_name: { label: '发件人名称', placeholder: '例如：KamiSM 通知中心', help: '收件人看到的发件人名称。' },
    smtp_from_email: { label: '发件邮箱地址', placeholder: '例如：notice@example.com', help: '建议与 SMTP 登录账号保持一致，避免被服务商拒发。' },
  };

  return (
    <div className="profile-page" style={{gap:18}}>
      <style>{`
        .settings-tabs{display:flex;gap:34px;overflow-x:auto;border-bottom:1px solid var(--bd,#e9edf3);padding:12px 0 0;margin:0 0 18px;scrollbar-width:thin}.settings-tab{border:0;background:transparent;color:var(--t2);font-size:15px;font-weight:700;padding:0 0 12px;white-space:nowrap;display:flex;align-items:center;gap:7px;position:relative}.settings-tab.active{color:#3da0f5}.settings-tab.active:after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:3px;border-radius:3px;background:#3da0f5}.hero-logo-k{width:70px;height:70px;border-radius:18px;background:linear-gradient(135deg,#7bc8ff,#20c7d9);display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 8px 22px rgba(59,130,246,.18);margin:2px auto 12px}.overview-grid{display:grid;grid-template-columns:1fr;gap:14px}.two-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.pill-btn{height:36px;border-radius:999px;border:0;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;gap:7px}.sys-info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.si-label{font-size:12px;color:var(--t3);margin-bottom:5px}.si-val{font-size:13px;font-weight:700;color:var(--t1);word-break:break-word}.admin-subtabs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}.admin-subtabs button{border:1px solid var(--bd);background:var(--fc);border-radius:999px;padding:9px 14px;font-weight:700;color:var(--t2)}.admin-subtabs button.active{background:#3da0f5;color:white;border-color:#3da0f5}.mini-stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.mini-stat{background:rgba(248,250,252,.85);border-radius:12px;padding:14px 8px;text-align:center}.mini-stat-label{font-size:12px;color:var(--t3);margin-bottom:8px}.mini-stat-value{font-size:21px;font-weight:800;color:var(--t1)}@media(max-width:768px){.settings-tabs{gap:32px;margin-left:-2px;margin-right:-2px}.settings-tab{font-size:14px;flex-direction:row;gap:6px}.two-grid,.sys-info-grid{grid-template-columns:1fr}.pill-btn{width:100%}.hero-actions-k{flex-direction:column!important;gap:9px!important}.profile-page{padding:0 10px!important;gap:12px!important}.overview-card{padding:18px!important;border-radius:14px!important}.hero-logo-k{width:64px;height:64px;border-radius:17px}.hero-title{font-size:24px!important}.hero-desc2{font-size:13px!important;margin-bottom:20px!important}.hero-ver{font-size:17px!important}.hero-tech{font-size:14px!important;line-height:1.2!important;white-space:nowrap}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.hero-ver-row{gap:54px!important;margin-bottom:20px!important}.update-switch-card{padding:14px!important}.update-foot{grid-template-columns:1fr!important;gap:10px!important}.health-row{align-items:flex-start!important}.health-msg{display:none}.settings-card-title{font-size:16px!important;margin-bottom:16px!important}}`}</style>

      <div className="settings-tabs">
        {tabs.map(t => <button key={t.key} className={`settings-tab ${activeTab===t.key?'active':''}`} onClick={()=>setActiveTab(t.key)}>{t.icon}<span>{t.label}</span></button>)}
      </div>

      {isAdmin && activeTab === 'overview' && <div className="overview-grid">
        <SettingsCard>
          <h3 className="settings-card-title" style={{margin:'0 0 18px',fontSize:18}}>产品与版本</h3>
          <div style={{textAlign:'center'}}>
            <div className="hero-logo-k" aria-label="KamiSM" style={{backgroundImage:`url(${appIcon})`,backgroundSize:'cover',backgroundPosition:'center'}}></div>
            <h2 className="hero-title" style={{margin:'0 0 6px',fontSize:28,fontWeight:900}}>KamiSM</h2>
            <p className="hero-desc2" style={{margin:'0 0 24px',fontSize:15,color:'var(--t2)'}}>轻量级卡密管理平台</p>
            <div className="hero-ver-row" style={{display:'flex',justifyContent:'center',gap:68,marginBottom:24}}>
              <div>
                <div style={{fontSize:13,color:'var(--t3)',marginBottom:8}}>当前版本</div>
                <div className="hero-ver" style={{fontSize:18,fontWeight:900,color:'#3da0f5'}}>v{currentVersion}</div>
                {updateInfo && <div style={{fontSize:11,color:'var(--t3)',marginTop:4}}>{updateInfo.current_message}</div>}
              </div>
              <div>
                <div style={{fontSize:13,color:'var(--t3)',marginBottom:8}}>技术栈</div>
                <div className="hero-tech" style={{fontSize:15,fontWeight:700,color:'var(--t2)',lineHeight:1.2,whiteSpace:'nowrap'}}>Rust + React</div>
              </div>
            </div>
            {displayHasUpdate && (
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:18,padding:'10px 16px',borderRadius:12,background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.18)'}}>
                <Download size={16} color="#3b82f6"/>
                <span style={{fontSize:13,fontWeight:700,color:'#3b82f6'}}>发现新版本 {latestVersion}</span>
                <span style={{fontSize:12,color:'var(--t3)'}}>· {updateInfo.latest_message}</span>
                <button onClick={()=>setChangelogVisible(true)} style={{border:0,background:'transparent',color:'#3b82f6',cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:2}}>更新日志<ChevronRight size={13}/></button>
              </div>
            )}
            <div className="hero-actions-k" style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
              <button className="pill-btn" onClick={()=>checkForUpdates()} disabled={checking} style={{background:'#3da0f5',color:'#fff',padding:'0 30px'}}><RefreshCw className={`refresh-icon ${checking?'spin':''}`} size={18}/>{checking?'检查中...':'检查更新'}</button>
              {displayHasUpdate && (
                <button className="pill-btn" onClick={applyUpdate} disabled={applying} style={{background:applying?'#94a3b8':'#10b981',color:'#fff',padding:'0 30px'}}>
                  {applying ? <><Loader2 className="spin" size={18}/> 更新中...</> : <><Download size={18}/> 一键更新</>}
                </button>
              )}
              <button className="pill-btn" onClick={restartPanel} style={{background:'#f2aa2c',color:'#fff',padding:'0 30px'}}><Power size={18}/>重启面板</button>
              <button className="pill-btn" onClick={()=>window.location.href='https://github.com/wocao123456/kamism'} style={{background:'var(--fc,#f8fafc)',color:'var(--t1)',border:'1px solid var(--bd)',padding:'0 30px'}}><Github size={18}/>访问 GitHub</button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard>
          <h3 className="settings-card-title" style={{margin:'0 0 8px',fontSize:18}}>系统更新设置</h3>
          <p style={{margin:'0 0 20px',color:'var(--t3)',fontSize:14}}>保持系统为最新版本以获得更好的稳定性和性能</p>
          <div className="update-switch-card" style={{display:'flex',alignItems:'center',gap:14,padding:16,borderRadius:14,background:'linear-gradient(135deg,rgba(24,144,255,.08),rgba(54,207,201,.06))',border:'1px solid rgba(59,130,246,.12)',marginBottom:18}}>
            <div style={{width:42,height:42,borderRadius:13,background:'linear-gradient(135deg,#1890ff,#36cfc9)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',boxShadow:'0 4px 12px rgba(24,144,255,.28)'}}><RefreshCw className="refresh-icon" size={22}/></div>
            <div style={{flex:1,minWidth:0}}><div style={{fontWeight:800,marginBottom:4}}>自动更新</div><div style={{fontSize:13,color:'var(--t2)',lineHeight:1.55}}>每 24 小时自动检查一次新版本，检测到新版本后会在空闲时段尝试更新。</div></div>
            <label style={{display:'flex',alignItems:'center',gap:8,fontWeight:700}}><input type="checkbox" checked={autoUpdate} onChange={e=>{const v=e.target.checked; setAutoUpdate(v); localStorage.setItem('kamism_auto_update_enabled', v?'1':'0'); if(v){ checkForUpdates(false, true, true); }}} style={{width:18,height:18,accentColor:'#3da0f5'}}/>{autoUpdate?'开':'关'}</label>
          </div>
          <div className="update-foot" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
            {[[ '#3b82f6','最后检查时间',fmtDate(lastCheckTime) ],[ '#10b981','当前状态', (checking || statusRefreshing)?'检查中...':(updateInfo ? (updateInfo.has_update?'发现新版本':'系统已是最新版本') : '未检查') ],[ '#36cfc9','下次检查时间',nextCheck ]].map(([c,l,v])=><div key={l} style={{display:'flex',gap:9,alignItems:'flex-start'}}><span style={{width:8,height:8,borderRadius:'50%',background:c,boxShadow:`0 0 0 3px ${c}22`,marginTop:5}}/><div><div style={{fontSize:12,color:'var(--t3)'}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:l==='当前状态'?'#10b981':'var(--t2)'}}>{v}</div></div></div>)}
          </div>
          {updateInfo?.log && (
            <div style={{marginTop:16}}>
              <button onClick={()=>setLogVisible(!logVisible)} style={{border:0,background:'transparent',color:'#3da0f5',cursor:'pointer',fontSize:13,fontWeight:700}}>{logVisible?'收起日志':'查看更新日志'}</button>
              {logVisible && <pre style={{marginTop:8,maxHeight:300,overflow:'auto',background:'var(--fc,#f8fafc)',border:'1px solid var(--bd,#edf0f5)',borderRadius:12,padding:'12px 14px',fontSize:12,lineHeight:1.6,color:'var(--t2)',whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{updateInfo.log}</pre>}
            </div>
          )}
        </SettingsCard>

        {/* 更新进度弹窗 */}
        {progressVisible && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={(e)=>{ if(e.target===e.currentTarget && progressPhase!=='done' && progressPhase!=='error') setProgressVisible(false); }}>
            <div style={{background:'#fff',borderRadius:20,padding:'36px 32px',maxWidth:440,width:'calc(100% - 32px)',boxShadow:'0 24px 70px rgba(0,0,0,.18)',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
              {progressPhase === 'done' ? (
                <div style={{width:64,height:64,borderRadius:'50%',background:'#10b981',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}><CheckCircle2 size={32} color="#fff"/></div>
              ) : progressPhase === 'error' ? (
                <div style={{width:64,height:64,borderRadius:'50%',background:'#ef4444',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}><AlertTriangle size={32} color="#fff"/></div>
              ) : (
                <div style={{width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#06b6d4)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}><Loader2 className="spin" size={32} color="#fff"/></div>
              )}
              <h3 style={{margin:'0 0 12px',fontSize:20,fontWeight:900,color:'#0f172a'}}>{progressPhase === 'done' ? '更新完成' : progressPhase === 'error' ? '更新失败' : '正在更新系统'}</h3>
              <p style={{margin:'0 0 24px',fontSize:14,color:'#64748b',lineHeight:1.6}}>{progressMessage}</p>
              {progressPhase !== 'done' && progressPhase !== 'error' && (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:16}}>
                  <div style={{width:200,height:6,borderRadius:3,background:'#e5e7eb',overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:3,background:'linear-gradient(90deg,#3b82f6,#06b6d4)',transition:'width .5s',width: progressPhase==='preparing'?'15%':progressPhase==='fetching'?'30%':progressPhase==='building'?'55%':progressPhase==='restarting'?'80%':progressPhase==='finalizing'?'95%':'100%'}}/>
                  </div>
                </div>
              )}
              {progressPhase === 'error' && (
                <button onClick={()=>{ setProgressVisible(false); setApplying(false); applyingRef.current = false; }} style={{height:40,padding:'0 28px',border:0,borderRadius:12,background:'var(--fc,#f1f5f9)',color:'var(--t2)',fontWeight:700,cursor:'pointer',fontSize:14}}>关闭</button>
              )}
            </div>
          </div>
        )}

        {/* 更新日志弹窗 */}
        {changelogVisible && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={(e)=>{ if(e.target===e.currentTarget) setChangelogVisible(false); }}>
            <div style={{background:'var(--c,#fff)',border:'1px solid var(--bd,#edf0f5)',borderRadius:20,padding:'28px 32px',maxWidth:560,maxHeight:'70vh',width:'calc(100% - 32px)',boxShadow:'0 24px 70px rgba(0,0,0,.28)',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <h3 style={{margin:0,fontSize:18,fontWeight:900,color:'var(--t1)'}}>更新日志</h3>
                <button onClick={()=>setChangelogVisible(false)} style={{border:0,background:'transparent',cursor:'pointer',padding:4}}><X size={20} color="#94a3b8"/></button>
              </div>
              <pre style={{margin:0,flex:1,overflow:'auto',fontSize:13,lineHeight:1.7,color:'var(--t2)',background:'var(--fc,transparent)',border:'1px solid var(--bd,#edf0f5)',borderRadius:12,padding:'12px 14px',whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{updateInfo?.changelog || '暂无更新日志'}</pre>
              <div style={{display:'flex',gap:12,marginTop:20,justifyContent:'flex-end'}}>
                <button onClick={()=>setChangelogVisible(false)} style={{height:40,padding:'0 24px',border:0,borderRadius:12,background:'var(--fc,#f1f5f9)',color:'var(--t2)',fontWeight:700,cursor:'pointer',fontSize:14}}>关闭</button>
                {displayHasUpdate && <button onClick={()=>{ setChangelogVisible(false); applyUpdate(); }} style={{height:40,padding:'0 24px',border:0,borderRadius:12,background:'#10b981',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:8}}><Download size={16}/> 立即更新</button>}
              </div>
            </div>
          </div>
        )}


        <div className="two-grid">
          <SettingsCard>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}><h3 style={{margin:0,fontSize:17,display:'flex',gap:8,alignItems:'center'}}>{([healthInfo.postgresql, ...((healthInfo.containers||[]).map((c:any)=>c.ok?'ok':'error'))].every(x=>x==='ok')) ? <CheckCircle2 size={18} color="#10b981"/> : <AlertTriangle size={18} color="#ef4444"/>} 系统健康</h3><button className="form-btn form-btn--outline" style={{height:32,padding:'0 12px',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,lineHeight:1}} onClick={refreshHealth} disabled={checkingHealth}><RefreshCw className={`refresh-icon ${checkingHealth?'spin':''}`} size={14}/> <span style={{display:'inline-flex',alignItems:'center',lineHeight:1}}>立即检查</span></button></div>
            {[{name:'PostgreSQL', ok:healthInfo.postgresql==='ok', status:healthInfo.postgresql||'unknown', icon:Database, color:'#10b981'}, ...((healthInfo.containers||[]).map((c:any,i:number)=>({name:c.name, ok:c.ok, status:c.status, icon:[Server,Box,Database,Activity,HardDrive][i]||Box, color:['#3b82f6','#8b5cf6','#10b981','#f59e0b','#14b8a6'][i]||'#10b981'})))].map((it:any)=>{const Icon=it.ok?it.icon:AlertTriangle; return <div className="health-row" key={it.name} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px dashed var(--bd)'}}><Icon size={18} color={it.ok?it.color:'#ef4444'}/><div style={{flex:1}}><b>{it.name}</b><span style={{marginLeft:8,fontSize:12,padding:'2px 8px',borderRadius:999,color:it.ok?'#10b981':'#ef4444',background:it.ok?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)'}}>{it.ok?'正常':(it.status||'异常')}</span></div><span className="health-msg" style={{fontSize:12,color:it.ok?'var(--t3)':'#ef4444'}}>{it.ok?'运行正常':(it.status||'异常')}</span></div>})}
          </SettingsCard>
          <SettingsCard>
            <h3 style={{margin:'0 0 18px',fontSize:17,display:'flex',gap:8,alignItems:'center'}}><HardDrive size={18}/> 系统信息</h3>
            <div className="sys-info-grid">
              {[
                ['主机名',systemInfo.hostname||'kamism'],['操作系统',`${systemInfo.os||'Linux'} ${systemInfo.arch||'x86_64'}`],['CPU 使用率',`${systemInfo.cpu_usage??0}% (${systemInfo.num_cpu||0} 核)`,systemInfo.cpu_usage],['内存使用',`${systemInfo.memory_usage??0}% (${fmtBytes(systemInfo.memory_used)} / ${fmtBytes(systemInfo.memory_total)})`,systemInfo.memory_usage],['磁盘使用',`${systemInfo.disk_usage??0}% (${fmtBytes(systemInfo.disk_used)} / ${fmtBytes(systemInfo.disk_total)})`,systemInfo.disk_usage]
              ].map(([l,v,p]:any)=><div key={l}><div className="si-label">{l}</div><div className="si-val" style={{color:p!==undefined?usageClass(p):undefined}}>{v}</div></div>)}
            </div>
          </SettingsCard>
        </div>
      </div>}

      {activeTab === 'admin' && isAdmin && <SettingsCard><div className="admin-subtabs">{[['merchant','商户管理',Store],['features','功能控制',LayoutDashboard],['oauth','OAuth配置',Webhook],['mail','邮件服务',Mail]].map(([k,l,Icon]:any)=><button key={k} className={adminInner===k?'active':''} onClick={()=>setAdminInner(k)}><Icon size={14}/> {l}</button>)}</div>
        {adminInner === 'merchant' && <div><h3><Store size={16} /> 商户管理</h3><div className="settings-help-card settings-help-card--merchant"><b>使用说明</b><span>商户页面开关控制商户端是否允许访问；关闭后商户登录、后台页面和商户业务入口会被限制。</span><span>注册开关只控制新用户注册，不影响已有商户登录。维护期间建议只关闭注册，避免影响已付费商户。</span></div><div className="form-row"><label className="form-label">商户页面开关</label><label style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--t1)', cursor:'pointer' }}><input type="checkbox" checked={merchantPageEnabled} onChange={e=>setMerchantPageEnabled(e.target.checked)} style={{ width:16, height:16, accentColor:'var(--pri)' }}/>{merchantPageEnabled ? '已开启商户页面' : '已关闭商户页面'}</label></div><div className="form-row"><label className="form-label">注册开关</label><label style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--t1)', cursor:'pointer' }}><input type="checkbox" checked={registerEnabled} onChange={e=>setRegisterEnabled(e.target.checked)} style={{ width:16, height:16, accentColor:'var(--pri)' }}/>{registerEnabled ? '已开放注册' : '已关闭注册'}</label></div><button className="form-btn" onClick={async()=>{try{const results=await Promise.all([adminApi.saveSystemConfig('merchant.page_enabled', merchantPageEnabled), adminApi.saveSystemConfig('auth.register_enabled', registerEnabled)]); if(results.every(r=>r.data.success))toast.success('页面开关已保存'); else toast.error('部分配置保存失败')}catch{toast.error('保存失败')}}}><Save size={14}/> 保存页面开关</button></div>}
        {adminInner === 'features' && <div><h3><LayoutDashboard size={16} /> 商户功能控制</h3><div className="settings-help-card"><b>使用说明</b><span>这里控制商户端左侧/顶部可访问的功能入口，关闭后商户不会看到对应菜单，也无法从商户端正常进入页面。</span><span>建议保留“总览、商户充值、消息中心”，如果只是临时维护可关闭“商户页面访问”总开关。</span></div><div className="env-tabs" style={{ marginBottom:12 }}>{MERCHANT_FEATURES.map(([key,label,Icon])=>{ const active=merchantFeatures.includes(key); return <Chip key={key} active={active} onClick={()=>setMerchantFeatures(prev=>active?prev.filter(x=>x!==key):[...prev,key])}><Icon size={14}/> {label}</Chip>; })}</div><button className="form-btn" onClick={async()=>{try{const res=await adminApi.saveSystemConfig('merchant.enabled_features', merchantFeatures); if(res.data.success)toast.success('商户功能已保存'); else toast.error(res.data.message||'保存失败')}catch{toast.error('保存失败')}}}><Save size={14}/> 保存功能配置</button></div>}
        {adminInner === 'oauth' && <div><h3><Webhook size={16} /> 三方OAuth配置</h3><div className="settings-help-card settings-help-card--oauth"><b>使用说明</b><span>开启后登录页会显示已勾选的平台按钮，用户点击后跳转到第三方 OAuth 服务完成授权。</span><span>回调地址建议填写当前站点的 <code>/auth/oauth/callback</code>，并在第三方平台后台保持完全一致。</span><span>服务地址填写域名，登录接口路径和用户信息接口路径分别对应发起授权、拉取用户资料接口。</span></div><div className="form-row"><label style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--t1)', cursor:'pointer' }}><input type="checkbox" checked={oauthEnabled} onChange={e=>setOauthEnabled(e.target.checked)} style={{ width:16, height:16, accentColor:'var(--pri)' }}/>启用第三方登录</label></div>{oauthEnabled && <><div className="form-row"><label className="form-label">OAuth服务地址</label><input className="form-input" value={oauthBaseUrl} onChange={e=>setOauthBaseUrl(e.target.value)} /></div><div className="form-row"><label className="form-label">登录接口路径</label><input className="form-input" value={oauthLoginPath} onChange={e=>setOauthLoginPath(e.target.value)} /></div><div className="form-row"><label className="form-label">用户信息接口路径</label><input className="form-input" value={oauthUserPath} onChange={e=>setOauthUserPath(e.target.value)} /></div><div className="form-row"><label className="form-label">AppID</label><input className="form-input" value={appid} onChange={e=>setAppid(e.target.value)} /></div><div className="form-row"><label className="form-label">AppKey</label><input className="form-input" value={appkey} onChange={e=>setAppkey(e.target.value)} /></div><div className="form-row"><label className="form-label">跳转地址</label><input className="form-input" value={redirectUri} onChange={e=>setRedirectUri(e.target.value)} /></div><div className="env-tabs" style={{ marginBottom:12 }}>{OAUTH_TYPES.map(t=>{const active=enabledTypes.includes(t.value);return <Chip key={t.value} active={active} onClick={()=>setEnabledTypes(prev=>active?prev.filter(x=>x!==t.value):[...prev,t.value])}>{t.icon} {t.label}</Chip>})}</div></>}<button className="form-btn" onClick={async()=>{if(oauthEnabled&&(!appid||!appkey||!oauthBaseUrl)){toast.error('请填写 OAuth 服务地址、AppID 和 AppKey');return;}try{const token=localStorage.getItem('token');const res=await fetch('/auth/oauth/admin/config',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({enabled:oauthEnabled,appid,appkey,redirect_uri:(redirectUri&&redirectUri.startsWith('http'))?redirectUri:`${window.location.origin}${redirectUri||'/auth/oauth/callback'}`,base_url:oauthBaseUrl,login_path:oauthLoginPath,user_path:oauthUserPath,enabled_types:enabledTypes})});const json=await res.json();if(json.success)toast.success('配置已保存');else toast.error(json.message||'保存失败')}catch{toast.error('保存失败，请检查网络')}}}>保存OAuth配置</button></div>}
        {adminInner === 'mail' && <div><h3><Bell size={16} /> 邮件服务</h3><div style={{ fontSize:12, color:'var(--t3)', lineHeight:1.7, marginBottom:12 }}>用于注册验证码、找回密码验证码和系统通知邮件发送。请先在邮箱服务商后台开启 SMTP 服务，并复制授权码。</div><div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.8, background:'var(--fc,#f8fafc)', border:'1px solid var(--bd,#edf0f5)', borderRadius:12, padding:'10px 12px', marginBottom:14 }}><b>SMTP_HOST 填写说明：</b>这里填写“SMTP 服务器地址”，例如 QQ 邮箱填 smtp.qq.com，163 邮箱填 smtp.163.com，企业邮箱请填服务商提供的 SMTP 地址。</div><div className="form-row"><label style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--t1)', cursor:'pointer' }}><input type="checkbox" checked={Boolean(smtp.enabled)} onChange={e=>setSmtp((p:any)=>({...p,enabled:e.target.checked}))} style={{ width:16, height:16, accentColor:'var(--pri)' }}/>启用邮件服务</label></div>{Boolean(smtp.enabled) && ['smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from_name','smtp_from_email'].map(k=>{ const f = mailFields[k]; return <div className="form-row" key={k}><label className="form-label">{f.label}</label><input className="form-input" type={f.type || 'text'} value={smtp[k]||''} placeholder={f.placeholder} autoComplete="off" onChange={e=>setSmtp((p:any)=>({...p,[k]:e.target.value}))}/><div style={{ fontSize:12, color:'var(--t3)', marginTop:6, lineHeight:1.6 }}>{f.help}</div></div>})}<button className="form-btn" onClick={async()=>{try{const res=await adminApi.saveSystemConfig('mail.smtp', smtp); if(res.data.success)toast.success('邮件服务已保存'); else toast.error(res.data.message||'保存失败')}catch{toast.error('保存失败')}}}><Save size={14}/> 保存邮件配置</button></div>}
      </SettingsCard>}

    </div>
  );
}
