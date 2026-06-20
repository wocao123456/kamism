import { useEffect, useState } from 'react';
import { appsApi, webhookApi } from '../../lib/api';
import { Plus, Trash2, RefreshCw, Copy, Webhook, Search, Package, CheckCircle, XCircle, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../stores/confirm';
import AnimatedNumber from '../../components/AnimatedNumber';

interface App {
  id: string; app_name: string; description: string | null;
  status: string; created_at: string;
}

export default function Apps() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ app_name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [webhookApp, setWebhookApp] = useState<{ id: string; app_name: string } | null>(null);
  const [webhookForm, setWebhookForm] = useState({ url: '', secret: '', enabled: true, events: ['activate', 'verify'] as string[] });
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookSubmitting, setWebhookSubmitting] = useState(false);
  const [webhookExists, setWebhookExists] = useState(false);

  const load = (p = page, ps = pageSize) => {
    setLoading(true); setApps([]);
    appsApi.list({ page: p, page_size: ps }).then(res => {
      if (res.data.success) { setApps(res.data.data); setTotal(res.data.total ?? res.data.data.length); }
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(page, pageSize); }, [page, pageSize]);

  const confirm = useConfirm();
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.app_name.trim()) { toast.error('应用名称不能为空'); return; }
    setSubmitting(true);
    try {
      const res = await appsApi.create({ app_name: form.app_name, description: form.description || undefined });
      if (res.data.success) { toast.success('创建成功'); setShowModal(false); setForm({ app_name: '', description: '' }); load(1, pageSize); setPage(1); }
      else toast.error(res.data.message);
    } catch { toast.error('创建失败'); } finally { setSubmitting(false); }
  };
  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: '删除应用', message: '确认删除这个应用？所有相关卡密和激活记录将无泒访问。', danger: true });
    if (!ok) return;
    try {
      const res = await appsApi.delete(id);
      if (res.data.success) { toast.success('已删除'); load(); } else toast.error(res.data.message);
    } catch { toast.error('删除失败'); }
  };
  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'active' ? 'disabled' : 'active';
    try {
      const res = await appsApi.updateStatus(id, next);
      if (res.data.success) { toast.success(next === 'active' ? '已启用' : '已禁用'); load(); } else toast.error(res.data.message);
    } catch { toast.error('操作失败'); }
  };
  const openWebhook = (app: App) => {
    setWebhookApp({ id: app.id, app_name: app.app_name });
    setWebhookLoading(true); setWebhookExists(false);
    setWebhookForm({ url: '', secret: '', enabled: true, events: ['activate', 'verify'] });
    webhookApi.get(app.id).then(res => {
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        setWebhookForm({ url: d.url || '', secret: d.secret || '', enabled: d.enabled !== false, events: d.events || ['activate', 'verify'] });
        setWebhookExists(true);
      }
    }).catch(() => {}).finally(() => setWebhookLoading(false));
  };
  const saveWebhook = async () => {
    if (!webhookApp) return;
    setWebhookSubmitting(true);
    try {
      const res = await webhookApi.upsert(webhookApp.id, webhookForm);
      if (res.data.success) { toast.success('已保存'); setWebhookApp(null); } else toast.error(res.data.message);
    } catch { toast.error('保存失败'); } finally { setWebhookSubmitting(false); }
  };
  const deleteWebhook = async () => {
    if (!webhookApp) return;
    try {
      const res = await webhookApi.delete(webhookApp.id);
      if (res.data.success) { toast.success('已删除'); setWebhookApp(null); } else toast.error(res.data.message);
    } catch { toast.error('删除失败'); }
  };
  const filtered = apps.filter(a => {
    if (search && !a.app_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter && a.status !== filter) return false;
    return true;
  });
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="dpage">
      <div className="stat-grid" style={{gap:8}}>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">应用总数</div><div className="stat-card-v2__value" style={{color:'#1890ff'}}>{<AnimatedNumber value={total} />}</div><div className="stat-card-v2__desc">所有应用</div></div><div className="stat-card-v2__icon" style={{background:'#e6f4ff',color:'#1890ff'}}><Package size={20}/></div></div>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">已启用</div><div className="stat-card-v2__value" style={{color:'#52c41a'}}>{<AnimatedNumber value={apps.filter(a=>a.status==='active').length} />}</div><div className="stat-card-v2__desc">正在运行</div></div><div className="stat-card-v2__icon" style={{background:'#f6ffed',color:'#52c41a'}}><CheckCircle size={20}/></div></div>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">已禁用</div><div className="stat-card-v2__value" style={{color:'#ff4d4f'}}>{<AnimatedNumber value={apps.filter(a=>a.status==='disabled').length} />}</div><div className="stat-card-v2__desc">已停止</div></div><div className="stat-card-v2__icon" style={{background:'#fff1f0',color:'#ff4d4f'}}><XCircle size={20}/></div></div>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">有Webhook</div><div className="stat-card-v2__value" style={{color:'#faad14'}}>-</div><div className="stat-card-v2__desc">已配置</div></div><div className="stat-card-v2__icon" style={{background:'#fffbe6',color:'#faad14'}}><Globe size={20}/></div></div>
      </div>
      <div className="view-tab-row"><button className="view-tab-btn">应用管理</button><button className="view-tab-plus" onClick={()=>setShowModal(true)}><Plus size={16}/></button></div>
      <div className="segmented-control">
        {[{value:'',label:'全部应用'},{value:'active',label:'已启用'},{value:'disabled',label:'已禁用'}].map(t=>(
          <button key={t.value} className={`seg-item ${filter===t.value?'is-active':''}`} onClick={()=>setFilter(t.value)}>{t.label}</button>
        ))}
      </div>
      <div className="action-bar">
        <div className="search-bar" style={{flex:1,maxWidth:300}}><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索应用名"/></div>
        <button className="btn-secondary-lg" onClick={()=>load()}><RefreshCw className="refresh-icon" size={14}/> 刷新</button>
      </div>
      {loading ? <div style={{textAlign:'center',padding:60}}><span className="spinner"/></div> : (
        <>
          {filtered.map(app=>(
            <div key={app.id} className="data-card" style={{maxWidth: "100%", overflow: "hidden"}}>
              <div className="data-card__header">
                <div className="data-card__title">
                  <Package size={16}/>
                  <span style={{fontSize:15,fontWeight:600,marginLeft:8}}>{app.app_name}</span>
                  <span className={`status-badge ${app.status==='active'?'status-badge--success':'status-badge--danger'}`} style={{marginLeft:6}}>{app.status==='active'?'启用':'禁用'}</span>
                </div>
                <div className={`toggle-switch ${app.status==='active'?'is-on':''}`} onClick={()=>toggleStatus(app.id,app.status)}/>
              </div>
              {app.description && <div style={{fontSize:13,color:'var(--t2)',marginTop:8}}>{app.description}</div>}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 16px',marginTop:10,fontSize:12}}>
                <div><span style={{color:'var(--t3)'}}>创建时间</span><div style={{color:'var(--t1)',marginTop:2}}>{new Date(app.created_at).toLocaleString('zh-CN')}</div></div>
                <div><span style={{color:'var(--t3)'}}>应用ID</span><div style={{color:'var(--t1)',marginTop:2,fontFamily:'monospace'}}>{app.id}</div></div>
              </div>
              <div className="action-grid" style={{marginTop:16}}>
                <button className="act-run" onClick={()=>openWebhook(app)}><Webhook size={12}/> Webhook</button>
                <button className="act-disable" onClick={()=>handleDelete(app.id)}><Trash2 size={12}/> 删除</button>
                <button className="act-log" onClick={()=>{navigator.clipboard.writeText(app.id);toast.success('已复制ID');}}><Copy size={12}/> 复制ID</button>
              </div>
            </div>
          ))}
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
            <div className="modal-v2__header"><span className="modal-v2__title">创建应用</span><button className="modal-v2__close" onClick={()=>setShowModal(false)}>&times;</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-v2__body">
                <div className="form-group-v2"><label>应用名称</label><input value={form.app_name} onChange={e=>setForm(s=>({...s,app_name:e.target.value}))} placeholder="输入应用名称" className="form-input-v2"/></div>
                <div className="form-group-v2"><label>描述</label><input value={form.description} onChange={e=>setForm(s=>({...s,description:e.target.value}))} placeholder="可选" className="form-input-v2"/></div>
              </div>
              <div className="modal-v2__footer"><button className="btn-cancel" type="button" onClick={()=>setShowModal(false)}>取消</button><button className="btn-confirm" type="submit" disabled={submitting}>{submitting?'创建中...':'创建'}</button></div>
            </form>
          </div>
        </div>
      )}
      {webhookApp && (
        <div className="modal-overlay">
          <div className="modal-v2">
            <div className="modal-v2__header"><span className="modal-v2__title">Webhook - {webhookApp.app_name}</span><button className="modal-v2__close" onClick={()=>setWebhookApp(null)}>&times;</button></div>
            <div className="modal-v2__body">
              {webhookLoading ? <div style={{textAlign:'center',padding:30}}><span className="spinner"/></div> : (
                <>
                  <div className="form-group-v2"><label>URL</label><input value={webhookForm.url} onChange={e=>setWebhookForm(s=>({...s,url:e.target.value}))} placeholder="https://example.com/webhook" className="form-input-v2"/></div>
                  <div className="form-group-v2"><label>Secret</label><input value={webhookForm.secret} onChange={e=>setWebhookForm(s=>({...s,secret:e.target.value}))} placeholder="可选，用于验签" className="form-input-v2"/></div>
                  <div className="form-group-v2">
                    <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={webhookForm.enabled} onChange={e=>setWebhookForm(s=>({...s,enabled:e.target.checked}))} style={{accentColor:'var(--pri)'}}/> 启用</label>
                  </div>
                </>
              )}
            </div>
            <div className="modal-v2__footer">
              {webhookExists && <button className="btn-cancel" onClick={deleteWebhook} style={{color:'#ff4d4f',marginRight:'auto'}}>删除</button>}
              <button className="btn-cancel" onClick={()=>setWebhookApp(null)}>取消</button>
              <button className="btn-confirm" onClick={saveWebhook} disabled={webhookSubmitting}>{webhookSubmitting?'保存中...':'保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
