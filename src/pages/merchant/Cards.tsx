import { useEffect, useState } from 'react';
import { cardsApi, appsApi } from '../../lib/api';
import { Plus, Ban, Trash2, RefreshCw, Copy, CheckCircle, Clock, Search, Key, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../stores/confirm';
import CustomSelect from '../../components/CustomSelect';
import AnimatedNumber from '../../components/AnimatedNumber';

interface Card {
  id: string; app_id: string; code: string; duration_days: number;
  max_devices: number; status: string; note: string | null;
  created_at: string; activated_at: string | null; expires_at: string | null;
}
interface App { id: string; app_name: string; }

export default function Cards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    app_id: '', count: 1, duration_days: 30, max_devices: 1, note: '',
    prefix: 'CHKM', segment_count: 4, segment_len: 4,
    enable_device_limit: false, enable_ip_limit: false, max_ips: 1,
  });
  const [searchCode, setSearchCode] = useState('');
  const [filterAppId, setFilterAppId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [cardStats, setCardStats] = useState({ total: 0, unused: 0, active: 0, expired: 0 });

  const load = (p = page, ps = pageSize) => {
    setLoading(true); setCards([]);
    Promise.all([cardsApi.list({ page: p, page_size: ps }), cardsApi.stats().catch(()=>null)]).then(([res, statRes]: any[]) => {
      if (statRes?.data?.success) { const arr = statRes.data.data || []; setCardStats(arr.reduce((a:any,x:any)=>({ total:a.total+Number(x.total||0), unused:a.unused+Number(x.unused||0), active:a.active+Number(x.active||0), expired:a.expired+Number(x.expired||0) }), { total:0, unused:0, active:0, expired:0 })); }
      if (res.data.success) {
        let filtered = res.data.data;
        if (searchCode) filtered = filtered.filter((c: Card) => c.code.toLowerCase().includes(searchCode.toLowerCase()));
        if (filterAppId) filtered = filtered.filter((c: Card) => c.app_id === filterAppId);
        if (filterStatus) filtered = filtered.filter((c: Card) => c.status === filterStatus);
        setCards(filtered); setTotal(res.data.total);
      }
    }).finally(() => setLoading(false));
  };
  useEffect(() => { appsApi.list().then(res => { if (res.data.success) setApps(res.data.data); }); }, []);
  const getAppName = (appId: string) => apps.find(a => a.id === appId)?.app_name || '—';
  useEffect(() => { load(page, pageSize); }, [page, pageSize, searchCode, filterAppId, filterStatus]);

  const confirm = useConfirm();
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.app_id) { toast.error('请选择应用'); return; }
    setSubmitting(true);
    try {
      const res = await cardsApi.generate({
        app_id: form.app_id, count: form.count,
        duration_days: form.duration_days, max_devices: form.enable_device_limit ? form.max_devices : 1,
        note: form.note || undefined, prefix: form.prefix || undefined,
        segment_count: form.segment_count, segment_len: form.segment_len,
      });
      if (res.data.success) { toast.success(res.data.message); setShowModal(false); setPage(1); load(1, pageSize); }
      else toast.error(res.data.message);
    } catch { toast.error('生成失败'); } finally { setSubmitting(false); }
  };
  const handleDisable = async (id: string) => {
    try { const res = await cardsApi.disable(id); if (res.data.success) { toast.success('已禁用'); load(); } else toast.error(res.data.message); } catch { toast.error('操作失败'); }
  };
  const handleEnable = async (id: string) => {
    try { const res = await cardsApi.enable(id); if (res.data.success) { toast.success('已启用'); load(); } else toast.error(res.data.message); } catch { toast.error('操作失败'); }
  };
  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: '删除卡密', message: '确认删除？仅可删除未使用的卡密，此操作不可撤销。', confirmText: '删除', danger: true });
    if (!ok) return;
    try { const res = await cardsApi.delete(id); if (res.data.success) { toast.success('删除成功'); load(); } else toast.error(res.data.message); } catch { toast.error('删除失败'); }
  };
  const handleBatchExtend = async () => {
    if (selectedIds.length === 0) { toast.error('请先勾选卡密'); return; }
    setSubmitting(true);
    try {
      const res = await cardsApi.batchExtend(selectedIds, extendDays);
      if (res.data.success) { toast.success(res.data.message); setShowExtendModal(false); setSelectedIds([]); load(); } else toast.error(res.data.message);
    } catch { toast.error('操作失败'); } finally { setSubmitting(false); }
  };
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const totalPages = Math.ceil(total / pageSize);
  const statusLabel: Record<string, string> = { unused: '未使用', active: '使用中', expired: '已过期', disabled: '已禁用' };
  const statusClass: Record<string, string> = { unused: 'status-badge--success', active: 'status-badge--info', expired: 'status-badge--warning', disabled: 'status-badge--danger' };

  return (
    <div className="dpage">
      <div className="stat-grid" style={{gap:8}}>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">卡密总数</div><div className="stat-card-v2__value" style={{color:'#1890ff'}}>{<AnimatedNumber value={cardStats.total || total} />}</div><div className="stat-card-v2__desc">所有卡密</div></div><div className="stat-card-v2__icon" style={{background:'#e6f4ff',color:'#1890ff'}}><Key size={20}/></div></div>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">未使用</div><div className="stat-card-v2__value" style={{color:'#52c41a'}}>{<AnimatedNumber value={cardStats.unused} />}</div><div className="stat-card-v2__desc">可用卡密</div></div><div className="stat-card-v2__icon" style={{background:'#f6ffed',color:'#52c41a'}}><CheckCircle size={20}/></div></div>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">使用中</div><div className="stat-card-v2__value" style={{color:'#faad14'}}>{<AnimatedNumber value={cardStats.active} />}</div><div className="stat-card-v2__desc">已激活</div></div><div className="stat-card-v2__icon" style={{background:'#fffbe6',color:'#faad14'}}><Clock size={20}/></div></div>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">已过期</div><div className="stat-card-v2__value" style={{color:'#ff4d4f'}}>{<AnimatedNumber value={cardStats.expired} />}</div><div className="stat-card-v2__desc">到期卡密</div></div><div className="stat-card-v2__icon" style={{background:'#fff1f0',color:'#ff4d4f'}}><AlertCircle size={20}/></div></div>
      </div>
      <div className="view-tab-row"><button className="view-tab-btn">卡密管理</button><button className="view-tab-plus" onClick={()=>setShowModal(true)}><Plus size={16}/></button></div>
      <div className="segmented-control">
        {[{value:'',label:'全部卡密'},{value:'active',label:'使用中'},{value:'unused',label:'未使用'},{value:'expired',label:'已过期'}].map(t=>(
          <button key={t.value} className={`seg-item ${filterStatus===t.value?'is-active':''}`} onClick={()=>setFilterStatus(t.value)}>{t.label}</button>
        ))}
      </div>
      <div className="action-bar">
        <div className="search-bar" style={{flex:1,maxWidth:260}}><Search size={14}/><input value={searchCode} onChange={e=>setSearchCode(e.target.value)} placeholder="搜索卡密"/></div>
        <CustomSelect className="filter-select" value={filterAppId} placeholder="全部应用" options={[{ value: '', label: '全部应用' }, ...apps.map(a => ({ value: a.id, label: a.app_name }))]} onChange={setFilterAppId} />
        {selectedIds.length === 0 ? (
          <button className="btn-secondary-lg" onClick={async()=>{
              try {
                const res = await cardsApi.exportCsv({ app_id: filterAppId || undefined });
                const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
                const a = document.createElement('a'); a.href = url; a.download = `cards_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
                toast.success('导出成功');
              } catch { toast.error('导出失败'); }
            }}>导出</button>
        ) : (
          <button className="btn-secondary-lg" onClick={()=>{const allIds=cards.map(c=>c.id);const allSelected=allIds.every(id=>selectedIds.includes(id));if(allSelected)setSelectedIds([]);else setSelectedIds(allIds);}}>全选</button>
        )}
        <button className="btn-secondary-lg" onClick={()=>load()}><RefreshCw className="refresh-icon" size={14}/> 刷新</button>
      </div>
      {selectedIds.length > 0 && (
        <div style={{background:'var(--pl9)',padding:'10px 14px',borderRadius:8,marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:13,color:'var(--pri)'}}>已选择 {selectedIds.length} 张卡密</span>
          <div style={{display:'flex',gap:8}}>
            <button className="btn-secondary-lg" onClick={()=>setShowExtendModal(true)}>批量延期</button>
            <button className="btn-secondary-lg" style={{color:'#ff4d4f'}} onClick={async()=>{
              if (selectedIds.length === 0) { toast.error('请先勾选卡密'); return; }
              const ok = await confirm({ title: '批量删除', message: `确认删除 ${selectedIds.length} 张卡密？仅可删除未使用的卡密，此操作不可撤销。`, confirmText: '删除', danger: true });
              if (!ok) return;
              setSubmitting(true);
              try {
                for (const id of selectedIds) { await cardsApi.delete(id); }
                toast.success(`已删除 ${selectedIds.length} 张卡密`);
                setSelectedIds([]);
                load();
              } catch { toast.error('批量删除失败'); }
              finally { setSubmitting(false); }
            }}>批量删除</button>
            <button className="btn-secondary-lg" onClick={()=>{
              navigator.clipboard.writeText(selectedIds.map(id => cards.find(c=>c.id===id)?.code).filter(Boolean).join('\n'));
              toast.success('已复制所有选中卡密');
            }}>批量复制</button>
          </div>
        </div>
      )}
      {loading ? <div style={{textAlign:'center',padding:60}}><span className="spinner"/></div> : (
        <>
          {cards.map(card=>(
            <div key={card.id} className="data-card" style={{maxWidth: "100%", overflow: "hidden"}}>
              <div className="data-card__header">
                <div className="data-card__title">
                  <input type="checkbox" checked={selectedIds.includes(card.id)} onChange={()=>toggleSelect(card.id)} style={{width:16,height:16,accentColor:'var(--pri)',marginRight:8}}/>
                  <span style={{fontSize:14,fontWeight:600,fontFamily:'monospace',cursor:'pointer'}} onClick={()=>{navigator.clipboard.writeText(card.code);toast.success('已复制');}} title="点击复制卡密">{card.code}</span>
                  <span className={`status-badge ${statusClass[card.status]||'status-badge--default'}`}>{statusLabel[card.status]||card.status}</span>
                  <span className="tag-chip tag-chip--blue" style={{marginLeft:6}}>{getAppName(card.app_id)}</span>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'6px 16px',marginTop:10,fontSize:12}}>
                <div><span style={{color:'var(--t3)'}}>时长</span><div style={{color:'var(--t1)',marginTop:2}}>{card.duration_days}天</div></div>
                <div><span style={{color:'var(--t3)'}}>设备数</span><div style={{color:'var(--t1)',marginTop:2}}>{card.max_devices===999?'无限制':card.max_devices}</div></div>
                <div><span style={{color:'var(--t3)'}}>创建时间</span><div style={{color:'var(--t1)',marginTop:2}}>{new Date(card.created_at).toLocaleString('zh-CN')}</div></div>
                {card.expires_at && <div><span style={{color:'var(--t3)'}}>过期时间</span><div style={{color:'var(--t1)',marginTop:2}}>{new Date(card.expires_at).toLocaleString('zh-CN')}</div></div>}
                {card.activated_at && <div><span style={{color:'var(--t3)'}}>激活时间</span><div style={{color:'var(--t1)',marginTop:2}}>{new Date(card.activated_at).toLocaleString('zh-CN')}</div></div>}
              </div>
              <div className="action-grid" style={{marginTop:16}}>
                {card.status==='unused' && <button className="act-disable" onClick={()=>handleDelete(card.id)}><Trash2 size={12}/> 删除</button>}
                {card.status==='active' && <button className="act-disable" onClick={()=>handleDisable(card.id)}><Ban size={12}/> 禁用</button>}
                {card.status==='disabled' && <button className="act-run" onClick={()=>handleEnable(card.id)}><CheckCircle size={12}/> 启用</button>}
                <button className="act-log" onClick={()=>{navigator.clipboard.writeText(card.code);toast.success('已复制');}}><Copy size={12}/> 复制卡密</button>
              </div>
            </div>
          ))}
          {cards.length===0 && <div className="empty-state"><div className="empty-state__text">暂无卡密</div></div>}
          {total > pageSize && (
            <div className="pagination-v2"><span>共 {<AnimatedNumber value={total} />} 条数据</span>
              <div className="pagination-v2__btns">
                <button className="pagination-v2__btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>&lt;</button>
                {Array.from({length:totalPages},(_,i)=>i+1).slice(Math.max(0,page-3),Math.min(totalPages,page+2)).map(p=>(
                  <button key={p} className={`pagination-v2__btn ${p===page?'is-active':''}`} onClick={()=>setPage(p)}>{p}</button>
                ))}
                <button className="pagination-v2__btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>&gt;</button>
              </div>
            </div>
          )}
        </>
      )}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-v2">
            <div className="modal-v2__header"><span className="modal-v2__title">生成卡密</span><button className="modal-v2__close" onClick={()=>setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleGenerate}>
              <div className="modal-v2__body">
                <div className="form-group-v2"><label>应用</label>
                  <CustomSelect
                    value={form.app_id}
                    placeholder="请选择"
                    options={[{ value: '', label: '请选择' }, ...apps.map(a => ({ value: a.id, label: a.app_name }))]}
                    onChange={value=>setForm(s=>({...s,app_id:value}))}
                  />
                </div>
                <div className="form-group-v2"><label>数量</label><input type="number" min={1} max={1000} value={form.count} onChange={e=>setForm(s=>({...s,count:Number(e.target.value)}))} className="form-input-v2"/></div>
                <div className="form-group-v2"><label>时长(天)</label><input type="number" min={1} value={form.duration_days} onChange={e=>setForm(s=>({...s,duration_days:Number(e.target.value)}))} className="form-input-v2"/></div>
                <div className="form-group-v2">
                  <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={form.enable_device_limit} onChange={e=>setForm(s=>({...s,enable_device_limit:e.target.checked}))} style={{accentColor:'var(--pri)'}}/> 限制设备数</label>
                </div>
                {form.enable_device_limit && <div className="form-group-v2"><label>设备数</label><input type="number" min={1} value={form.max_devices} onChange={e=>setForm(s=>({...s,max_devices:Number(e.target.value)}))} className="form-input-v2"/></div>}
                <div className="form-group-v2"><label>备注</label><input value={form.note} onChange={e=>setForm(s=>({...s,note:e.target.value}))} placeholder="可选" className="form-input-v2"/></div>
              </div>
              <div className="modal-v2__footer"><button className="btn-cancel" type="button" onClick={()=>setShowModal(false)}>取消</button><button className="btn-confirm" type="submit" disabled={submitting}>{submitting?'生成中...':'生成'}</button></div>
            </form>
          </div>
        </div>
      )}
      {showExtendModal && (
        <div className="modal-overlay">
          <div className="modal-v2">
            <div className="modal-v2__header"><span className="modal-v2__title">批量延期</span><button className="modal-v2__close" onClick={()=>setShowExtendModal(false)}>&times;</button></div>
            <div className="modal-v2__body">
              <p style={{fontSize:13,color:'var(--t2)',marginBottom:16}}>已选择 {selectedIds.length} 张卡密</p>
              <div className="form-group-v2"><label>延期天数</label><input type="number" min={1} value={extendDays} onChange={e=>setExtendDays(Number(e.target.value))} className="form-input-v2"/></div>
            </div>
            <div className="modal-v2__footer"><button className="btn-cancel" onClick={()=>setShowExtendModal(false)}>取消</button><button className="btn-confirm" onClick={handleBatchExtend} disabled={submitting}>{submitting?'处理中...':'确认'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
