import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Activity, Check, Cpu, Edit3, FileText, Lock, LogIn, LogOut, MinusCircle, Package, PlusCircle, RefreshCw, Send, Settings, Shield, Smartphone, TrendingUp, TrendingDown, Trash2, Unlink, Eye, Users, KeyRound, AppWindow, CreditCard, HardDrive, MemoryStick } from 'lucide-react';

function getActionIcon(action:string) {
  const base:React.CSSProperties={width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:12,flexShrink:0,boxShadow:'0 8px 18px rgba(15,23,42,.06)'};
  const cfgs:Record<string,{el:React.ReactNode;bg:string;color:string}> = {
    login:{el:<LogIn size={18} strokeWidth={2.3}/>,bg:'#10b9811f',color:'#10b981'},
    logout:{el:<LogOut size={18} strokeWidth={2.3}/>,bg:'#f59e0b1f',color:'#f59e0b'},
    register:{el:<PlusCircle size={18} strokeWidth={2.3}/>,bg:'#10b9811f',color:'#10b981'},
    create:{el:<PlusCircle size={18} strokeWidth={2.3}/>,bg:'#3b82f61a',color:'#3b82f6'},
    update:{el:<Edit3 size={18} strokeWidth={2.3}/>,bg:'#f59e0b1a',color:'#f59e0b'},
    delete:{el:<Trash2 size={18} strokeWidth={2.3}/>,bg:'#ef44441a',color:'#ef4444'},
    add:{el:<PlusCircle size={18} strokeWidth={2.3}/>,bg:'#3b82f61a',color:'#3b82f6'},
    remove:{el:<MinusCircle size={18} strokeWidth={2.3}/>,bg:'#ef44441a',color:'#ef4444'},
    send:{el:<Send size={18} strokeWidth={2.3}/>,bg:'#8b5cf61a',color:'#8b5cf6'},
    activate:{el:<Smartphone size={18} strokeWidth={2.3}/>,bg:'#10b9811f',color:'#10b981'},
    verify:{el:<Shield size={18} strokeWidth={2.3}/>,bg:'#06b6d41a',color:'#0891b2'},
    unbind:{el:<Unlink size={18} strokeWidth={2.3}/>,bg:'#f59e0b1a',color:'#f59e0b'},
    heartbeat:{el:<Activity size={18} strokeWidth={2.3}/>,bg:'#6366f11a',color:'#6366f1'},
    sign:{el:<FileText size={18} strokeWidth={2.3}/>,bg:'#8b5cf61a',color:'#8b5cf6'},
    encrypt:{el:<Lock size={18} strokeWidth={2.3}/>,bg:'#06b6d41a',color:'#0891b2'},
    decrypt:{el:<Lock size={18} strokeWidth={2.3}/>,bg:'#10b9811f',color:'#10b981'},
    change_password:{el:<Lock size={18} strokeWidth={2.3}/>,bg:'#ef44441a',color:'#ef4444'},
    update_profile:{el:<Settings size={18} strokeWidth={2.3}/>,bg:'#64748b1a',color:'#64748b'},
    regenerate:{el:<RefreshCw className="refresh-icon" size={18} strokeWidth={2.3}/>,bg:'#8b5cf61a',color:'#8b5cf6'},
    update_plan:{el:<Package size={18} strokeWidth={2.3}/>,bg:'#f59e0b1a',color:'#f59e0b'},
    update_status:{el:<Lock size={18} strokeWidth={2.3}/>,bg:'#ef44441a',color:'#ef4444'},
    view:{el:<Eye size={18} strokeWidth={2.3}/>,bg:'#6366f11a',color:'#6366f1'},
    other:{el:<Eye size={18} strokeWidth={2.3}/>,bg:'#64748b1a',color:'#64748b'},
  };
  const c=cfgs[action]||cfgs.other;
  return <span style={{...base, background:c.bg, color:c.color}}>{c.el}</span>;
}
function TrendChart({ rows, range, stats }: { rows: any[]; range: 7|30; stats?: any }) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=canvasRef.current; if(!c)return; const ctx=c.getContext('2d'); if(!ctx)return;
    const dpr=window.devicePixelRatio||1; const w=Math.max(320,c.offsetWidth||600); const h=Math.max(220,c.offsetHeight||240);
    c.width=w*dpr; c.height=h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
    const padL=34, padR=18, padT=34, padB=28;
    const plotW=w-padL-padR, plotH=h-padT-padB;
    const dayMs=86400000;
    const today=new Date(); today.setHours(0,0,0,0);
    const days=Array.from({length:range},(_,i)=>{const d=new Date(today.getTime()-(range-1-i)*dayMs); return d;});
    const keyOf=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const series=[
      {key:'merchants',color:'#3b82f6',label:'注册',total:Number(stats?.merchants ?? 0)||0,match:(l:any)=>String(l?.action||'')==='register'||String(l?.detail||'').includes('注册')},
      {key:'activations',color:'#10b981',label:'激活',total:Number(stats?.total_activations ?? stats?.recent_activations_30d ?? 0)||0,match:(l:any)=>String(l?.action||'')==='activate'||String(l?.detail||'').includes('激活')},
      {key:'cards',color:'#f59e0b',label:'卡密',total:Number(stats?.total_cards ?? 0)||0,match:(l:any)=>['create','add'].includes(String(l?.action||''))&&(String(l?.detail||'').includes('卡')||String(l?.detail||'').toLowerCase().includes('card'))},
      {key:'apps',color:'#8b5cf6',label:'应用',total:Number(stats?.total_apps ?? stats?.apps ?? stats?.app_count ?? 0)||0,match:(l:any)=>['create','add'].includes(String(l?.action||''))&&(String(l?.detail||'').includes('应用')||String(l?.detail||'').toLowerCase().includes('app'))},
    ];
    const data=series.map(sr=>{
      const daily:Record<string,number>={}; days.forEach(d=>daily[keyOf(d)]=0);
      (rows||[]).forEach((l:any)=>{
        const t=new Date(l?.created_at||l?.createdAt||l?.time||l?.timestamp||0); if(!Number.isFinite(t.getTime()))return;
        t.setHours(0,0,0,0); const k=keyOf(t);
        if(k in daily && sr.match(l)) daily[k]+=1;
      });
      let vals:number[]=days.map(d=>Number(daily[keyOf(d)]||0));
      // 如果日志没有覆盖到某类数据，保留该线：把当前总量放在今天，表示本时间段内无法再细分。
      if(!vals.some(v=>v!==0) && sr.total>0) vals = vals.map((v,i)=>i===vals.length-1?Number(sr.total):v);
      let peakIdx=0, peakVal=vals[0]||0; vals.forEach((v,i)=>{ if(v>peakVal){peakVal=v; peakIdx=i;} });
      return {...sr, vals, peakIdx, peakVal};
    });
    const maxVal=Math.max(...data.flatMap(d=>d.vals),1);
    const scaled=(v:number)=> Math.log1p(Math.max(0,v))/Math.log1p(maxVal);
    const baseline=h-padB;
    const yOf=(v:number)=> baseline-scaled(v)*plotH;
    const xOf=(i:number)=> padL+plotW/Math.max(1,range-1)*i;
    ctx.lineWidth=1; ctx.strokeStyle='rgba(226,232,240,.72)';
    for(let i=0;i<5;i++){const y=padT+i*plotH/4;ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(w-padR,y);ctx.stroke();}
    // X 轴日期标记
    ctx.fillStyle='#94a3b8'; ctx.font='10px sans-serif'; ctx.textAlign='center';
    const labelStep=range===30?5:1;
    days.forEach((d,i)=>{ if(i%labelStep!==0 && i!==range-1)return; ctx.fillText(`${d.getMonth()+1}/${d.getDate()}`, xOf(i), h-8); });
    let globalPeak:any=null;
    data.forEach(sr=>{
      const pts=sr.vals.map((v,i)=>({x:xOf(i),y:yOf(v),v}));
      ctx.save(); ctx.strokeStyle=sr.color; ctx.lineWidth=sr.total>0?2.6:1.4; ctx.globalAlpha=sr.total>0?1:.35; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath();
      pts.forEach((p,i)=>{
        if(i===0) ctx.moveTo(p.x,p.y);
        else { const prev=pts[i-1]; const dx=p.x-prev.x; ctx.bezierCurveTo(prev.x+dx*.45,prev.y,p.x-dx*.45,p.y,p.x,p.y); }
      });
      ctx.stroke();
      pts.forEach((p,i)=>{ if(range===30 && i%5!==0 && i!==pts.length-1 && i!==sr.peakIdx)return; ctx.fillStyle=sr.color; ctx.globalAlpha=p.v>0?1:.35; ctx.beginPath();ctx.arc(p.x,p.y,p.v>0?3.2:2.2,0,Math.PI*2);ctx.fill(); });
      if(sr.peakVal>0){
        const p=pts[sr.peakIdx];
        ctx.globalAlpha=1; ctx.strokeStyle=sr.color; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(p.x,p.y,7,0,Math.PI*2); ctx.stroke();
        if(!globalPeak || sr.peakVal>globalPeak.peakVal) globalPeak={...sr,p,date:days[sr.peakIdx]};
      }
      ctx.restore();
    });
    if(globalPeak){
      const p=globalPeak.p;
      const text=`猛增 ${globalPeak.label}+${globalPeak.peakVal} · ${globalPeak.date.getMonth()+1}/${globalPeak.date.getDate()}`;
      ctx.font='11px sans-serif'; const tw=ctx.measureText(text).width+14;
      let bx=Math.min(Math.max(p.x-tw/2,padL),w-padR-tw), by=Math.max(8,p.y-30);
      ctx.fillStyle='rgba(15,23,42,.86)'; ctx.beginPath(); ctx.roundRect(bx,by,tw,22,8); ctx.fill();
      ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.fillText(text,bx+7,by+15);
    }
    let lx=padL, ly=16; ctx.textAlign='left'; ctx.font='11px sans-serif';
    data.forEach(sr=>{ctx.fillStyle=sr.color;ctx.globalAlpha=sr.total>0?1:.45;ctx.beginPath();ctx.arc(lx,ly-3,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#64748b';ctx.fillText(sr.label,lx+8,ly);lx+=46;});
  },[rows,range,stats]);
  return <canvas ref={canvasRef} style={{width:'100%',height:'100%',display:'block'}}/>;
}

function CountUp({ value, suffix='', decimals=0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 900;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{display.toFixed(decimals)}{suffix}</>;
}
function greetingText() {
  const hour = new Date().getHours();
  if (hour < 6) return ['夜深了', '夜深了，记得早点休息哦~'];
  if (hour < 12) return ['早上好', '欢迎回来！今天又是高效执行任务的一天！'];
  if (hour < 14) return ['中午好', '该吃午饭啦，注意劳逸结合~'];
  if (hour < 18) return ['下午好', '下午也要保持专注哦！'];
  return ['晚上好', '辛苦一天啦，看看系统运行情况吧~'];
}
function getLocalUsername() {
  try { return JSON.parse(localStorage.getItem('user') || '{}')?.username || 'Admin'; } catch { return 'Admin'; }
}
function formatBytes(n: any) {
  const v = Number(n || 0);
  if (!v) return '0B';
  const units = ['B','KB','MB','GB','TB'];
  let x = v, i = 0;
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i++; }
  return `${x >= 10 ? x.toFixed(0) : x.toFixed(1)}${units[i]}`;
}
function pctText(v: any) {
  const n = Number(v || 0);
  return `${Math.max(0, Math.min(100, n)).toFixed(n % 1 ? 1 : 0)}%`;
}
function isNoiseLog(l: any) {
  const d = String(l?.detail || '').toLowerCase();
  const path = d.replace(/^查看\s+/, '').trim();
  const noisy = ['/auth/send-code','/profile/upload-background','/profile/avatar','/profile/api-key','/profile/change-password','/profile/change-email','/profile/verify-old-email','/install/status','/admin/system-resources','/api/system/info','/system/info','/api/admin/stats','/admin/stats','/system-config/public','/profile','/admin/recharge-codes','/api/admin/recharge-codes','/api/system/health-full','/system/health-full','/system-update/status','/api/system-update/status','/admin/system-config','/api/admin/system-config','/oauth/admin/config','/api/oauth/admin/config','/auth/oauth/admin/config','/ts/logs','/api/ts/logs','/plans','/api/plans'];
  return noisy.some(x => path.includes(x)) || d.includes('查看平台统计数据') || d.includes('查看全局操作日志') || d === '查看页面';
}
function statDelta(stats:any, key:string) {
  const n = Number(stats?.deltas?.[key] ?? 0);
  return { text: n > 0 ? `+${n}` : `${n}`, cls: n > 0 ? 'is-up' : n < 0 ? 'is-down' : 'is-flat' };
}
function cleanLogTitle(l: any) {
  const detail = String(l?.detail || '').replace(/^查看\s+/, '').trim();
  const map: Record<string,string> = {
    login: '用户登录', logout: '用户退出', register: '商户注册', create: '创建数据', update: '更新资料', delete: '删除数据',
    activate: '卡密激活', verify: '接口校验', regenerate: '重置密钥', update_plan: '套餐变更', update_status: '状态变更',
    view: detail && !detail.startsWith('/') ? detail : '查看页面'
  };
  return map[l?.action] || detail || '系统操作';
}
function timeAgo(t: any) {
  const ms = Date.now() - new Date(t).getTime();
  if (!Number.isFinite(ms)) return '';
  const m = Math.max(1, Math.floor(ms / 60000));
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}
function renderStatValue(value: any) {
  if (typeof value === 'number') return <CountUp value={value} />;
  const text = String(value);
  const match = text.match(/^(\d+(?:\.\d+)?)(%)$/);
  if (match) return <CountUp value={Number(match[1])} suffix={match[2]} decimals={match[1].includes('.') ? 1 : 0} />;
  return text;
}

interface Stats { merchants?: number; total_cards?: number; active_cards?: number; total_activations?: number; [key:string]: any; }
export default function AdminDashboard() {
  const [stats,setStats]=useState<Stats|null>(null);
  const [sys,setSys]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [opLogs,setOpLogs]=useState<any[]>([]);
  const [logsLoading,setLogsLoading]=useState(true);
  const [trendRange,setTrendRange]=useState<7|30>(7);
  const navigate = useNavigate();
  const username = getLocalUsername();
  const [greeting, greetingSub] = greetingText();
  useEffect(()=>{
    const token = localStorage.getItem('token') || '';
    adminApi.getStats().then(res=>{if(res.data.success)setStats(res.data.data);}).catch(()=>{}).finally(()=>setLoading(false));
    const loadSys = () => fetch('/api/system/info',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(j=>setSys(j.data||j||{})).catch(()=>{});
    loadSys();
    const timer = window.setInterval(loadSys, 5000);
    fetch('/api/admin/op-logs?page=1&page_size=80',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(d=>{if(d.success)setOpLogs((d.data||[]).filter((x:any)=>!isNoiseLog(x)));}).catch(()=>{}).finally(()=>setLogsLoading(false));
    return () => window.clearInterval(timer);
  },[]);
  const recentActivations = stats?.recent_activations_30d ?? stats?.last_30_days_activations ?? stats?.monthly_activations ?? stats?.total_activations ?? 0;
  const appTotal = stats?.total_apps ?? stats?.apps ?? stats?.app_count ?? 0;
  const dm=statDelta(stats,'merchants'), da=statDelta(stats,'activations'), dc=statDelta(stats,'cards'), dap=statDelta(stats,'apps');
  const statCards=[
    {label:'注册总数',value:stats?.merchants??0,delta:dm.text,deltaClass:dm.cls,icon:<Users size={22}/>,color:'#3b82f6',bg:'#3b82f61a'},
    {label:'近期激活',value:recentActivations,delta:da.text,deltaClass:da.cls,icon:<Activity size={22}/>,color:'#10b981',bg:'#10b9811f'},
    {label:'卡密总数',value:stats?.total_cards??0,delta:dc.text,deltaClass:dc.cls,icon:<KeyRound size={22}/>,color:'#f59e0b',bg:'#f59e0b1a'},
    {label:'应用总数',value:appTotal,delta:dap.text,deltaClass:dap.cls,icon:<AppWindow size={22}/>,color:'#8b5cf6',bg:'#8b5cf61a'},
  ];

  const visibleLogs = logsLoading ? [] : opLogs.filter((x:any)=>!isNoiseLog(x)).filter((x:any)=>!String(cleanLogTitle(x)).startsWith('/')).slice(0,10);
  const activities = visibleLogs.map((l:any)=>({
    title: cleanLogTitle(l),
    desc: l.user_type === 'admin' ? '管理员操作' : l.user_type === 'merchant' ? '商户操作' : '系统记录',
    time: timeAgo(l.created_at),
    action: l.action,
    success: l.action !== 'delete' && l.action !== 'logout'
  }));
  const quickTiles: any[] = [
    ['应用',AppWindow,'#10b9811f','#10b981','/apps'],
    ['卡密',KeyRound,'#3b82f61a','#3b82f6','/cards'],
    ['充值',CreditCard,'#f59e0b1a','#f59e0b','/recharge'],
    ['API',FileText,'#8b5cf61a','#8b5cf6','/api-manage'],
    ['设置',Settings,'#6b72801a','#6b7280','/profile'],
  ];
  const resources = [
    ['CPU', pctText(sys?.cpu_usage), '#3b82f6', sys?.system_cpu ? `${sys.system_cpu} 核` : '实时负载', Cpu],
    ['内存', pctText(sys?.memory_usage), '#10b981', `${formatBytes(sys?.memory_used)} / ${formatBytes(sys?.memory_total)}`, MemoryStick],
    ['磁盘', pctText(sys?.disk_usage), '#f59e0b', '服务器磁盘', HardDrive],
  ];
  return (
    <div className="dpage">
      <div className="hero-row animate-fade-in-up">
        <div className="hero-banner hero-banner--dynamic hero-wave-sea">
          <div className="sea-layer sea-layer--front" />
          <div className="sea-layer sea-layer--back" />
          <div className="sea-layer sea-layer--foam" />
          <div className="hero-c">
            <h3>{greeting}，{username} <span className="hero-wave">👋</span></h3>
            <p>{greetingSub}</p>
          </div>
        </div>
        <div className="hero-quick">
          <div className="hero-quick__title">快捷操作</div>
          <div className="hero-quick__grid">
            {quickTiles.map(([label, IconComp, bg, color, href]: any, idx: number) => (
              <div key={idx} className="quick-tile" onClick={() => navigate(href)}>
                <div className="quick-tile__icon" style={{background:bg,color:color}}><IconComp size={22}/></div>
                <span className="quick-tile__label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stat-grid animate-fade-in-up delay-50">
        {statCards.map((c,i)=>(
          <div key={i} className="stat-card">
            <div>
              <div className="stat-card__label">{c.label}</div>
              <div className="stat-card__value">{loading ? '...' : renderStatValue(c.value)}</div>
              {c.delta && c.delta !== '0' && (
                <div style={{marginTop:4}}>
                  <span className={`stat-card__delta-value ${c.deltaClass}`}>
                    {c.deltaClass==='is-up' ? <TrendingUp size={12}/> : c.deltaClass==='is-down' ? <TrendingDown size={12}/> : <MinusCircle size={12}/>}
                    {' '}{c.delta}
                  </span>
                </div>
              )}
            </div>
            <div className="stat-card__icon" style={{background:c.bg,color:c.color}}>{c.icon}</div>
          </div>
        ))}
      </div>

      <div className="middle-grid animate-fade-in-up delay-100">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-header__title"><TrendingUp size={20}/> 执行趋势
              <span className="seg-btn-group" style={{marginLeft:8}}>
                <button className={`seg-btn ${trendRange===7?'is-active':''}`} onClick={()=>setTrendRange(7)}>7天</button>
                <button className={`seg-btn ${trendRange===30?'is-active':''}`} onClick={()=>setTrendRange(30)}>30天</button>
              </span>
            </span>
          </div>
          <div className="chart-shell"><TrendChart rows={stats?.trend || []} range={trendRange} stats={stats}/></div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <span className="panel-header__title"><Cpu size={20}/> 系统资源</span>
          </div>
          <div className="resource-list">
            {resources.map(([l,v,c,d,IconComp]: any,i:number)=>(
              <div key={i} className="resource-row">
                <div className="resource-row__icon" style={{background:c+'1f',color:c}}><IconComp size={22}/></div>
                <div className="resource-row__body">
                  <div className="resource-row__top">
                    <span className="resource-row__label">{l}</span>
                    <span style={{flex:1,fontSize:12,color:'var(--t3)'}}>{d}</span>
                    <span className="resource-row__pct">{v}</span>
                  </div>
                  <div className="resource-bar"><div className="resource-bar__fill" style={{width:v,background:c}}/></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <span className="panel-header__title"><Activity size={20}/> 最近活动</span>
          </div>
          <div className="activity-feed">
            {activities.map((a,i)=>(
              <div key={i} className="activity-item">
                <div className={`activity-item__icon${a.success?' is-success':' is-failed'}`}>
                  {a.action ? getActionIcon(a.action) : <Check size={14}/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div className="activity-item__title">{a.title}</div>
                  <div className="activity-item__desc">{a.desc}</div>
                </div>
                <span className="activity-item__time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 执行日志已合并到最近活动，任务统计已移除 */}
</div>
  );
}