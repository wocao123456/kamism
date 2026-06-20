import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useThemeStore } from '../stores/theme';
import {LayoutDashboard, Package, Key, Activity, Users, Settings, LogOut, Bell, Megaphone, Sun, Moon, ShieldAlert, Network, BookOpen, Webhook, User, Wallet, ChevronLeft, ChevronRight, Menu, Mail} from 'lucide-react';
import { publicSystemConfig, merchantMessagesApi } from '../lib/api';
import { useWs } from '../hooks/useWs';
import { useWsEventStore } from '../stores/wsEvent';
import appIcon from '../assets/app-icon.png';
import toast from 'react-hot-toast';

function planLabel(p?: string | null) { if (!p || p === 'free') return 'Free'; return p === 'pro' ? 'Pro' : p.toUpperCase(); }

interface NavItem { hideForAdmin?: boolean; feature?: string; label: string; path: string; icon: React.ReactNode; }

const adminNav: NavItem[] = [
  { label: '总览', path: '/admin/dashboard', icon: <LayoutDashboard size={16} /> },
  { label: '商户管理', path: '/admin/merchants', icon: <Users size={16} /> },
  { label: '套餐配置', path: '/admin/plan-configs', icon: <Settings size={16} /> },
  { label: '消息管理', path: '/admin/messages', icon: <Megaphone size={16} /> },
];

const merchantNav: NavItem[] = [
  { label: '总览', path: '/dashboard', icon: <LayoutDashboard size={16} />, hideForAdmin: true, feature: 'dashboard' },
  { label: '我的应用', path: '/apps', icon: <Package size={16} />, feature: 'apps' },
  { label: '卡密管理', path: '/cards', icon: <Key size={16} />, feature: 'cards' },
  { label: '激活记录', path: '/activations', icon: <Activity size={16} />, feature: 'activations' },
  { label: '商户充值', path: '/recharge', icon: <Wallet size={16} />, feature: 'recharge' },
  { label: '消息中心', path: '/messages', icon: <Bell size={16} />, feature: 'messages' },
  { label: '风控管理', path: '/blacklist', icon: <ShieldAlert size={16} />, feature: 'blacklist' },
  { label: '代理管理', path: '/agents', icon: <Network size={16} />, hideForAdmin: true, feature: 'agents' },
  { label: 'API 文档', path: '/api-docs', icon: <BookOpen size={16} />, feature: 'api_docs' },
  { label: 'API 管理', path: '/api-manage', icon: <Webhook size={16} />, feature: 'api_manage' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, logout, refreshProfile } = useAuthStore();
  const { theme, toggle: toggleTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMob, setIsMob] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  const [unread, setUnread] = useState(0);
  const [noticeQueue, setNoticeQueue] = useState<{id:string;title:string;content:string;created_at:string}[]>([]);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeList, setNoticeList] = useState<any[]>([]);
  const [noticeDetail, setNoticeDetail] = useState<any>(null);
  const defaultFeatures = ['dashboard','apps','cards','activations','recharge','messages','blacklist','agents','api_docs','api_manage'];
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(defaultFeatures);
  const [merchantPageEnabled, setMerchantPageEnabled] = useState(true);
  const [appVersion, setAppVersion] = useState('1.5.0');
  // 读取本地 CHANGELOG 获取当前版本号
  useEffect(() => {
    fetch('/CHANGELOG.md').then(r=>r.text()).then(t=>{
      const m = t.match(/## \[([^\]]+)\]/);
      if (m) setAppVersion(m[1]);
    }).catch(()=>{});
  }, []);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const setLastEvent = useWsEventStore((s) => s.setLastEvent);

  useEffect(() => { const h = () => setIsMob(window.innerWidth <= 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  useEffect(() => { const h = () => refreshProfile(); window.addEventListener('merchant-sync', h); return () => window.removeEventListener('merchant-sync', h); }, [refreshProfile]);
  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  useEffect(() => {
    publicSystemConfig.get().then((res) => {
      const data = res.data?.data || {};
      const arr = data['merchant.enabled_features'];
      if (Array.isArray(arr)) setEnabledFeatures(arr); else setEnabledFeatures(defaultFeatures);
      setMerchantPageEnabled(data['merchant.page_enabled'] !== false);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let layer = document.getElementById('global-custom-bg') as HTMLDivElement | null;
    if (!layer) { layer = document.createElement('div'); layer.id = 'global-custom-bg'; document.body.prepend(layer); }
    const savedBg = localStorage.getItem('kamism_bg_url_' + (role || 'guest'));
    const bg = user?.background_url || savedBg;
    const isAuthPath = ['/login','/register','/reset-password'].includes(location.pathname);
    if (bg && !isAuthPath) layer.style.cssText = `position:fixed;inset:0;z-index:0;pointer-events:none;background-image:url(${bg});background-repeat:no-repeat;background-position:center center;background-size:cover;opacity:1;`;
    else layer.style.cssText = 'display:none';
  }, [user?.background_url, role, location.pathname]);

  const fetchNoticeList = () => {
    Promise.all([
      merchantMessagesApi.listNotices({ page: 1, page_size: 50 }),
      merchantMessagesApi.listMessages({ page: 1, page_size: 50 }),
    ]).then(([nRes, mRes]) => {
      const all: any[] = [];
      if (nRes.data.success) all.push(...(nRes.data.data || []).filter((m:any) => m.msg_type !== 'email').map((m:any) => ({ ...m, read: m.is_read })));
      if (mRes.data.success) all.push(...(mRes.data.data || []).filter((m:any) => m.msg_type !== 'email').map((m:any) => ({ ...m, read: m.is_read, msg_type: m.msg_type || 'message' })));
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNoticeList(all);
    }).catch(() => {});
  };

  const fetchUnread = () => {
    if (role !== 'merchant') return;
    Promise.all([
      merchantMessagesApi.listNotices({ page: 1, page_size: 50 }),
      merchantMessagesApi.listMessages({ page: 1, page_size: 50 }),
    ]).then(([nRes, mRes]) => {
      const notices = nRes.data.success ? (nRes.data.data || []) : [];
      const messages = mRes.data.success ? (mRes.data.data || []).filter((m:any) => m.msg_type !== 'email') : [];
      const count = [...notices.filter((m:any) => m.msg_type !== 'email'), ...messages].filter((m:any) => !(m.is_read ?? m.read)).length;
      setUnread(count);
    }).catch(() => {
      merchantMessagesApi.unreadCount().then((res) => { if (res.data.success) setUnread(res.data.data.unread); }).catch(() => {});
    });
  };
  useEffect(() => { fetchUnread(); }, [role, location.pathname]);

  useEffect(() => {
    if (role !== 'merchant') return;
    merchantMessagesApi.listNotices({ page: 1, page_size: 5 }).then((res) => {
      if (!res.data.success) return;
      const shown: string[] = JSON.parse(localStorage.getItem('shown_notices') || '[]');
      const pending = (res.data.data as any[]).filter((n) => !shown.includes(n.id));
      if (pending.length > 0) setNoticeQueue(pending);
    }).catch(() => {});
  }, [role]);

  useWs({ onMessage: (evt) => { if (role !== 'merchant') return; setLastEvent(evt); if (evt.event === 'new_message') setUnread((n) => n + 1); }, reconnectInterval: role === 'merchant' ? 3000 : -1 });

  // 监听 unread-sync 事件，消息页标记已读后同步更新小红点
  useEffect(() => {
    const handler = () => fetchUnread();
    window.addEventListener('unread-sync', handler);
    return () => window.removeEventListener('unread-sync', handler);
  }, [role]);

  useEffect(() => { const h = () => setUserDropdownOpen(false); document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);

  if (role === 'merchant' && !merchantPageEnabled) {
    return <div className="merchant-disabled-wrap">
      <div className="merchant-disabled-card">
        <div className="icon">⚙️</div>
        <h2>商户页面维护中</h2>
        <p>系统管理员已暂时关闭商户页面访问。<br/>请稍后再试，或联系管理员了解详情。</p>
        <div className="actions">
          <button className="btn-primary" onClick={() => window.location.reload()}>重新加载</button>
          <button className="btn-ghost" onClick={() => { logout(); navigate('/login'); }}>退出登录</button>
        </div>
      </div>
    </div>;
  }

  const handleClaimReward = async (msg:any) => {
    try {
      const res = await merchantMessagesApi.claimReward(msg.id);
      if (res.data.success) {
        toast.success(res.data.message || '领取成功');
        setNoticeList(prev => prev.map(m => m.id===msg.id ? {...m, reward_claimed:true, read:true} : m));
        setNoticeDetail((d:any) => d?.id===msg.id ? {...d, reward_claimed:true, read:true} : d);
        await refreshProfile();
      } else toast.error(res.data.message || '领取失败');
    } catch { toast.error('领取失败'); }
  };
  const handleNoticeConfirm = () => {
    const [current, ...rest] = noticeQueue;
    if (current) {
      const shown: string[] = JSON.parse(localStorage.getItem('shown_notices') || '[]');
      localStorage.setItem('shown_notices', JSON.stringify([...new Set([...shown, current.id])]));
      setNoticeList(prev => prev.map(m => m.id === current.id ? { ...m, read: true } : m));
      merchantMessagesApi.markRead(current.id).catch(() => {}).finally(() => {
        fetchUnread();
        window.dispatchEvent(new CustomEvent('unread-sync'));
      });
    }
    setNoticeQueue(rest);
  };


  const handleMarkAllRead = async () => {
    try {
      const res = await merchantMessagesApi.markAllRead();
      if (res.data.success) {
        setNoticeList(prev => prev.map(m => ({ ...m, read: true, is_read: true })));
        setUnread(0);
        window.dispatchEvent(new CustomEvent('unread-sync'));
        toast.success('已全部阅读');
      } else toast.error(res.data.message || '操作失败');
    } catch { toast.error('操作失败'); }
  };

  const merchantVisibleNav = merchantNav.filter(n => !n.feature || enabledFeatures.includes(n.feature));
  const navItems: NavItem[] = role === 'admin' ? [...adminNav, ...merchantVisibleNav.filter(n => !n.hideForAdmin)] : merchantVisibleNav;

  const handleLogout = () => { logout(); navigate('/login'); };
  const handleNav = (path: string) => { if (!path) return; navigate(path); setSidebarOpen(false); };

  // 面包屑层级映射
  const breadcrumbMap: Record<string, string> = {
    '/admin/dashboard': '总览',
    '/admin/merchants': '商户管理',
    '/admin/plan-configs': '套餐配置',
    '/admin/messages': '消息管理',
    '/dashboard': '总览',
    '/apps': '我的应用',
    '/cards': '卡密管理',
    '/activations': '激活记录',
    '/recharge': '商户充值',
    '/messages': '消息中心',
    '/blacklist': '风控管理',
    '/agents': '代理管理',
    '/api-docs': 'API 文档',
    '/api-manage': 'API 管理',
    '/profile': '个人设置',
    '/settings': '系统设置',
  };
  const sectionMap: Record<string, string> = {};
  ['/admin/dashboard','/admin/merchants','/admin/plan-configs','/admin/messages'].forEach(p => sectionMap[p] = '管理功能');
  ['/dashboard','/apps','/cards','/activations','/recharge','/messages','/blacklist','/agents','/api-docs','/api-manage'].forEach(p => sectionMap[p] = '商户功能');
  sectionMap['/profile'] = '个人';
  sectionMap['/settings'] = '系统';
  const currentNav = navItems.find(n => n.path === location.pathname);
  const pageTitle = currentNav?.label || breadcrumbMap[location.pathname] || '页面';
  const sectionLabel = sectionMap[location.pathname] || '';

  const showCollapsed = isMob ? false : collapsed;

  const sideLogo = React.useMemo(() => (
    <div className={`sidebar-logo${showCollapsed ? ' is-collapsed' : ''}`}>
      <div className="logo-inner">
        <div className="logo-icon-wrap">
          <span aria-label="KamiSM" style={{ width: 18, height: 18, borderRadius: 4, display:'block', backgroundImage:`url(${appIcon})`, backgroundSize:'cover', backgroundPosition:'center', flexShrink:0 }} />
        </div>
        {!showCollapsed && <><span className="logo-title">KamiSM</span><span className="logo-version">v{appVersion}</span></>}
      </div>
    </div>
  ), []);

  const sideNav = (
    <nav className="sidebar-nav">
      {role === 'admin' && <div className="nav-section-label">管理功能</div>}
      {(() => {
        const adminLen = role === 'admin' ? adminNav.length : 0;
        const items = role === 'admin' ? navItems : merchantVisibleNav;
        let merchantDividerRendered = false;
        return items.map((item, idx) => {
          if (item.hideForAdmin && role === 'admin') return null;
          if (!item.label) return null;
          const isFirstMerchant = role === 'admin' && idx >= adminLen && !merchantDividerRendered;
          if (isFirstMerchant) merchantDividerRendered = true;
          const active = location.pathname === item.path;
          return (
            <React.Fragment key={item.path}>
              {isFirstMerchant && <><div className="nav-section-divider" /><div className="nav-section-label">商户功能</div></>}
              <button className={`nav-item${active ? ' is-active' : ''}`} onClick={() => handleNav(item.path)} title={showCollapsed ? item.label : undefined}>
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.path === '/messages' && unread > 0 && <span style={{ background:'var(--pri)', color:'#fff', borderRadius:10, fontSize:10, fontWeight:700, padding:'1px 6px', minWidth:18, textAlign:'center', lineHeight:'16px' }}>{unread > 99 ? '99+' : unread}</span>}
              </button>
            </React.Fragment>
          );
        });
      })()}
    </nav>
  );

  const sideUser = (
    <div className="sidebar-user">
      <div className="user-card-inner">
        {user?.avatar ? <img src={user.avatar} alt="avatar" className="user-avatar--img" /> : <div className="user-avatar--ph">{user?.username?.[0]?.toUpperCase() ?? 'U'}</div>}
        {!showCollapsed && <div className="user-info"><span className="user-name">{user?.username}</span><span className={`user-role role-text ${role === 'admin' ? 'role-text--admin' : 'role-text--merchant'}`}>{role === 'admin' ? '管理员' : '商户'} · {planLabel(user?.plan)}</span></div>}
      </div>
    </div>
  );

  return (
    <div className="layout-container">
      <div className={`mobile-drawer${sidebarOpen ? ' is-open' : ''}`}>
        <div className="drawer-mask" onClick={() => setSidebarOpen(false)} />
        <div className="drawer-panel"><div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
          {sideLogo}
          {sideNav}
          {!isMob && (
            <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <><ChevronRight size={14} /><span className="ctext">展开</span></> : <><ChevronLeft size={14} /><span className="ctext">折叠</span></>}
            </button>
          )}
          {sideUser}
        </div></div>
      </div>
      {!isMob && (
        <aside className={`layout-aside${collapsed ? ' is-collapsed' : ''}`}>
          {sideLogo}
          {sideNav}
          {!isMob && (
            <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <><ChevronRight size={14} /><span className="ctext">展开</span></> : <><ChevronLeft size={14} /><span className="ctext">折叠</span></>}
            </button>
          )}
          {sideUser}
        </aside>
      )}
      <div className="layout-main-wrap">
        <header className="layout-header">
          <div className="header-left">
            <button className="toggle-btn" onClick={() => { if (isMob) setSidebarOpen(true); else setCollapsed(!collapsed); }} title="切换侧栏">
              {isMob ? <Menu size={16} /> : (collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />)}
            </button>
            <div className="header-breadcrumb">
              {sectionLabel && <>
                <span className="breadcrumb-section">{sectionLabel}</span>
                <span className="breadcrumb-sep">›</span>
              </>}
              <span className="breadcrumb-current">{pageTitle}</span>
            </div>
          </div>
          <div className="header-right">
            <button className={`header-icon-btn notice-bell-btn ${unread > 0 ? 'has-unread' : ''}`} title="通知" onClick={() => { setNoticeOpen(true); fetchNoticeList(); }}>
              <Bell size={16} className={unread > 0 ? "bell-shake" : ""} />
              {unread > 0 && <span className="notice-dot-breathe" />}
            </button>
            <button className={`header-icon-btn theme-toggle ${theme === 'dark' ? 'is-dark' : 'is-light'}`} onClick={toggleTheme} title={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="header-user" onClick={(e) => { e.stopPropagation(); setUserDropdownOpen(!userDropdownOpen); }}>
              {user?.avatar ? <img src={user.avatar} alt="avatar" className="header-user-avatar--img" /> : <div className="header-user-avatar">{user?.username?.[0]?.toUpperCase() ?? 'U'}</div>}
              
              <ChevronRight size={12} style={{color:'var(--ph)', transform: userDropdownOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease'}} />
              <div className={`user-dropdown${userDropdownOpen ? ' is-open' : ''}`}>
                <div className="dropdown-item" onClick={() => { handleNav('/profile'); setUserDropdownOpen(false); }}><User size={14} /> 个人设置</div>
                <div className="dropdown-item" onClick={() => { handleNav('/settings'); setUserDropdownOpen(false); }}><Settings size={14} /> 系统设置</div>
                <div className="dropdown-item dropdown-item--divided" onClick={() => { handleLogout(); setUserDropdownOpen(false); }}><LogOut size={14} /> 退出登录</div>
              </div>
            </div>
          </div>
        </header>
        <main className="layout-main">
          <div className="route-shell">{children}</div>
        </main>
        <footer className="layout-footer"><span>© {new Date().getFullYear()} KamiSM</span><span className="footer-sep">·</span><a href="#" className="footer-link">文档中心</a></footer>
      </div>
      {/* 登录公告弹窗 */}
      {noticeQueue.length > 0 && (
        <div className="notif-portal" style={{ zIndex:1050 }}>
          <div className="notif-drawer-mask" style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)' }} onClick={handleNoticeConfirm} />
          <div className="notif-drawer-panel" style={{ position:'relative', width:'90vw', maxWidth:520, background:'var(--card)', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', overflow:'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ height:6, background:'linear-gradient(90deg, var(--pri), #7c3aed)' }} />
            <div style={{ padding:'28px 28px 24px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg, var(--pri), #7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Megaphone size={22} style={{ color:'#fff' }} /></div>
                <div><div style={{ fontSize:13, fontWeight:600, color:'var(--pri)' }}>系统公告</div><div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{new Date(noticeQueue[0].created_at).toLocaleString('zh-CN')}</div></div>
              </div>
              <h3 style={{ margin:'0 0 16px', fontSize:18, fontWeight:800, color:'var(--t1)', lineHeight:1.4 }}>{noticeQueue[0].title}</h3>
              <div style={{ fontSize:14, color:'var(--t2)', lineHeight:2, whiteSpace:'pre-wrap', background:'var(--bg2, var(--bgp))', borderRadius:12, padding:16, marginBottom:24 }}>{noticeQueue[0].content}</div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                {noticeQueue.length > 1 && <button style={{ padding:'10px 20px', borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--t2)', fontSize:13, fontWeight:500, cursor:'pointer' }} onClick={() => { const [,...rest] = noticeQueue; const shown: string[] = JSON.parse(localStorage.getItem('shown_notices') || '[]'); localStorage.setItem('shown_notices', JSON.stringify([...shown, noticeQueue[0].id])); setNoticeQueue(rest); }}>跳过</button>}
                <button style={{ padding:'10px 28px', borderRadius:10, border:'none', background:'linear-gradient(135deg, var(--pri), #7c3aed)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }} onClick={handleNoticeConfirm}>{noticeQueue.length > 1 ? '下一条 →' : '我知道了'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 铃铛通知弹窗 */}
      {noticeOpen && (
        <div className="notif-portal">
          <div className="notif-drawer-mask" style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)' }} onClick={() => { setNoticeOpen(false); setNoticeDetail(null); }} />
          <div className="notif-drawer-panel" style={{ position:'relative', width:'90vw', maxWidth:480, maxHeight:'80vh', background:'var(--card)', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', overflow:'hidden', display:'flex', flexDirection:'column' }} onClick={(e) => e.stopPropagation()}>
            {!noticeDetail && (<>
              <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg, var(--pri), #7c3aed)', display:'flex', alignItems:'center', justifyContent:'center' }}><Bell size={18} style={{ color:'#fff' }} /></div>
                  <span style={{ fontSize:16, fontWeight:700, color:'var(--t1)' }}>消息通知</span>
                  {unread > 0 && <span style={{ background:'#ff4d4f', color:'#fff', borderRadius:10, fontSize:11, fontWeight:600, padding:'2px 8px' }}>{unread > 99 ? '99+' : unread}</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}><button className="notif-read-all-btn" onClick={handleMarkAllRead} disabled={unread <= 0}>全部已读</button><button style={{ background:'none', border:'none', fontSize:20, color:'var(--t3)', cursor:'pointer', padding:4 }} onClick={() => { setNoticeOpen(false); setNoticeDetail(null); }}>✕</button></div>
              </div>
              <div style={{ flex:1, overflow:'auto', padding:'8px 16px 16px' }}>
                {noticeList.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'48px 0', color:'var(--t3)' }}><Bell size={36} style={{ opacity:0.2, marginBottom:10 }} /><div style={{ fontSize:13 }}>暂无消息</div></div>
                ) : noticeList.map((msg: any, idx: number) => (
                  <div key={msg.id} className="notif-item-enter" style={{ animationDelay: idx*0.05+'s', display:'flex', alignItems:'center', gap:14, padding:'14px 12px', borderRadius:14, cursor:'pointer', transition:'background .2s', background:'transparent', marginBottom:4 }} onClick={() => { setNoticeDetail({...msg, read:true}); if (!msg.read) { setNoticeList(prev => prev.map(m => m.id===msg.id ? {...m, read:true} : m)); merchantMessagesApi.markRead(msg.id).catch(()=>{}).finally(()=>{ fetchUnread(); window.dispatchEvent(new CustomEvent('unread-sync')); }); } }} onMouseEnter={(e:any) => (e.currentTarget as HTMLDivElement).style.background='var(--bgp)'} onMouseLeave={(e:any) => (e.currentTarget as HTMLDivElement).style.background='transparent'}>
                    <div style={{ width:42, height:42, borderRadius:12, background: msg.msg_type==='notice' ? 'linear-gradient(135deg, #52c41a, #73d13d)' : 'linear-gradient(135deg, #1890ff, #40a9ff)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {msg.msg_type === 'notice' ? <Megaphone size={20} style={{color:'#fff'}} /> : <Mail size={20} style={{color:'#fff'}} />}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        {!msg.read && <span style={{ width:7, height:7, borderRadius:'50%', background:'#ff4d4f', flexShrink:0 }} />}
                        <span style={{ fontSize:14, fontWeight: msg.read ? 500 : 700, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{msg.title}</span>
                      </div>
                      <div style={{ fontSize:12, color:'var(--t3)', marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
                        <span>{msg.msg_type === 'notice' ? '公告' : '私信'}</span><span>·</span><span>{new Date(msg.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color:'var(--t3)', flexShrink:0 }} />
                  </div>
                ))}
              </div>
            </>)}
            {noticeDetail && (
              <div className="notif-detail-enter" style={{ display:'flex', flexDirection:'column', height:'100%' }}>
                <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                  <button style={{ background:'none', border:'none', fontSize:18, color:'var(--t2)', cursor:'pointer', padding:4 }} onClick={() => setNoticeDetail(null)}>← 返回</button>
                </div>
                <div style={{ flex:1, overflow:'auto', padding:'4px 28px 28px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                    <div style={{ width:44, height:44, borderRadius:14, background: noticeDetail.msg_type==='notice' ? 'linear-gradient(135deg, #52c41a, #73d13d)' : 'linear-gradient(135deg, var(--pri), #7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {noticeDetail.msg_type === 'notice' ? <Megaphone size={22} style={{color:'#fff'}} /> : <Mail size={22} style={{color:'#fff'}} />}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color: noticeDetail.msg_type==='notice' ? '#52c41a' : 'var(--pri)' }}>{noticeDetail.msg_type === 'notice' ? '系统公告' : '站内信'}</div>
                      <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{new Date(noticeDetail.created_at).toLocaleString('zh-CN')}</div>
                    </div>
                  </div>
                  <h3 style={{ margin:'0 0 16px', fontSize:18, fontWeight:800, color:'var(--t1)', lineHeight:1.4 }}>{noticeDetail.title}</h3>
                  <div style={{ fontSize:14, color:'var(--t2)', lineHeight:2, whiteSpace:'pre-wrap', background:'var(--bg2, var(--bgp))', borderRadius:12, padding:16 }}>{noticeDetail.content}</div>
                  {noticeDetail.msg_type==='notice' && Number(noticeDetail.reward_amount||0)>0 && <div style={{ marginTop:16, padding:14, borderRadius:12, background:'linear-gradient(135deg, #fff7e6, #fffbe6)', border:'1px solid #ffd591', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}><div style={{ fontSize:13, color:'#ad6800', fontWeight:700 }}>余额奖励 ¥{Number(noticeDetail.reward_amount).toFixed(2)}</div><button style={{ height:34, padding:'0 16px', borderRadius:10, border:'none', background:noticeDetail.reward_claimed?'#d9d9d9':'linear-gradient(135deg,#fa8c16,#faad14)', color:'#fff', fontWeight:700, cursor:noticeDetail.reward_claimed?'not-allowed':'pointer' }} disabled={noticeDetail.reward_claimed} onClick={()=>handleClaimReward(noticeDetail)}>{noticeDetail.reward_claimed?'已领取':'领取余额奖励'}</button></div>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}