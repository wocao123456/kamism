import { useEffect, useState } from 'react';
import { activationsApi } from '../../lib/api';
import { Unlink, RefreshCw, ChevronDown, ChevronRight, Search, Monitor, Clock, Smartphone, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../stores/confirm';
import AnimatedNumber from '../../components/AnimatedNumber';

interface Activation {
  id: string; card_id: string; card_code: string; app_id: string;
  device_id: string; device_name: string | null; ip_address: string | null;
  activated_at: string; last_verified_at: string; activate_count: number;
}
interface CardGroup {
  card_code: string; card_id: string; devices: Activation[];
  last_verified: string;
}

export default function Activations() {
  const [list, setList] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [searchCode, setSearchCode] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const load = (p = page, ps = pageSize, code = searchCode) => {
    setLoading(true); setList([]);
    activationsApi.list({ page: p, page_size: ps, card_code: code || undefined }).then(res => {
      if (res.data.success) { setList(res.data.data); setTotal(res.data.total); }
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(page, pageSize, searchCode); }, [page, pageSize, searchCode]);

  const confirm = useConfirm();
  const handleUnbind = async (id: string) => {
    const ok = await confirm({ title: '解绑设备', message: '确认解绑此设备？', confirmText: '解绑', danger: true });
    if (!ok) return;
    try {
      const res = await activationsApi.unbind(id);
      if (res.data.success) { toast.success('设备已解绑'); load(); } else toast.error(res.data.message);
    } catch { toast.error('操作失败'); }
  };
  const toggleExpand = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(cardId) ? next.delete(cardId) : next.add(cardId);
      return next;
    });
  };

  const grouped = new Map<string, CardGroup>();
  list.forEach(a => {
    if (!grouped.has(a.card_code)) grouped.set(a.card_code, { card_code: a.card_code, card_id: a.card_id, devices: [], last_verified: '' });
    const g = grouped.get(a.card_code)!;
    g.devices.push(a);
    if (!g.last_verified || new Date(a.last_verified_at) > new Date(g.last_verified)) g.last_verified = a.last_verified_at;
  });
  const groups = Array.from(grouped.values());
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="dpage">
      <div className="stat-grid" style={{gap:8}}>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">激活记录</div><div className="stat-card-v2__value" style={{color:'#1890ff'}}>{<AnimatedNumber value={total} />}</div><div className="stat-card-v2__desc">总记录数</div></div><div className="stat-card-v2__icon" style={{background:'#e6f4ff',color:'#1890ff'}}><Monitor size={20}/></div></div>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">卡密组数</div><div className="stat-card-v2__value" style={{color:'#52c41a'}}>{<AnimatedNumber value={groups.length} />}</div><div className="stat-card-v2__desc">当前页</div></div><div className="stat-card-v2__icon" style={{background:'#f6ffed',color:'#52c41a'}}><Shield size={20}/></div></div>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">设备数</div><div className="stat-card-v2__value" style={{color:'#faad14'}}>{<AnimatedNumber value={list.length} />}</div><div className="stat-card-v2__desc">已绑定设备</div></div><div className="stat-card-v2__icon" style={{background:'#fffbe6',color:'#faad14'}}><Smartphone size={20}/></div></div>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">最近活跃</div><div className="stat-card-v2__value" style={{color:'#86909c'}}>{<AnimatedNumber value={list.filter(a=>{const d=Date.now()-new Date(a.last_verified_at).getTime();return d<86400000;}).length} />}</div><div className="stat-card-v2__desc">24h内</div></div><div className="stat-card-v2__icon" style={{background:'#f5f7fa',color:'#86909c'}}><Clock size={20}/></div></div>
      </div>
      <div className="view-tab-row"><button className="view-tab-btn">激活记录</button></div>
      <div className="segmented-control">
        <button className={`seg-item ${activeTab==="all"?"is-active":""}`} onClick={()=>setActiveTab("all")}>全部记录</button>
        <button className={`seg-item ${activeTab==="today"?"is-active":""}`} onClick={()=>setActiveTab("today")}>今日激活</button>
        <button className={`seg-item ${activeTab==="7d"?"is-active":""}`} onClick={()=>setActiveTab("7d")}>近7天</button>
      </div>
      <div className="action-bar">
        <div className="search-bar" style={{flex:1,maxWidth:300}}><Search size={14}/><input value={searchCode} onChange={e=>setSearchCode(e.target.value)} placeholder="搜索卡密"/></div>
        <button className="btn-secondary-lg" onClick={()=>load()}><RefreshCw className="refresh-icon" size={14}/> 刷新</button>
      </div>
      {loading ? <div style={{textAlign:'center',padding:60}}><span className="spinner"/></div> : (
        <>
          {groups.map(g=>(
            <div key={g.card_id} className="data-card" style={{maxWidth: "100%", overflow: "hidden"}}>
              <div className="data-card__header" onClick={()=>toggleExpand(g.card_id)} style={{cursor:'pointer'}}>
                <div className="data-card__title">
                  {expandedCards.has(g.card_id)?<ChevronDown size={16}/>:<ChevronRight size={16}/>}
                  <span style={{fontSize:14,fontWeight:600,marginLeft:6,fontFamily:'monospace'}}>{g.card_code}</span>
                  <span className="tag-chip tag-chip--blue" style={{marginLeft:6}}>{g.devices.length} 台设备</span>
                </div>
                <span style={{fontSize:12,color:'var(--t3)'}}>最近验证: {new Date(g.last_verified).toLocaleString('zh-CN')}</span>
              </div>
              {expandedCards.has(g.card_id) && (
                <div style={{marginTop:12}}>
                  {g.devices.map(d=>(
                    <div key={d.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--bdl2)'}}>
                      <div style={{fontSize:12}}>
                        <div style={{fontWeight:500,color:'var(--t1)'}}>{d.device_name || d.device_id}</div>
                        <div style={{color:'var(--t3)',marginTop:2}}>IP: {d.ip_address || '-'} | 激活: {new Date(d.activated_at).toLocaleString('zh-CN')} | 次数: {d.activate_count}</div>
                      </div>
                      <button className="btn-icon-sm" onClick={()=>handleUnbind(d.id)} style={{color:'#ff4d4f'}}><Unlink size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {groups.length===0 && <div className="empty-state"><div className="empty-state__text">暂无激活记录</div></div>}
          {total > pageSize && (
            <div className="pagination-v2"><span>共 {<AnimatedNumber value={total} />} 条数据</span>
              <div className="pagination-v2__btns">
                <button className="pagination-v2__btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>&lt;</button>
                <button className="pagination-v2__btn is-active">{page}</button>
                <button className="pagination-v2__btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>&gt;</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
