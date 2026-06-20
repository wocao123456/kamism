import { useEffect, useState, useRef } from 'react';
import { adminMessagesApi } from '../../lib/api';
import { Plus, Trash2, RefreshCw, Pin, Bell, FileText, MessageSquare } from 'lucide-react';
import { useConfirm } from '../../stores/confirm';
import toast from 'react-hot-toast';
import CustomSelect from '../../components/CustomSelect';
import AnimatedNumber from '../../components/AnimatedNumber';

interface Message {
  id: string; msg_type: string; title: string; content: string;
  target_type: string; target_id: string | null; pinned: boolean;
  read_count: number; reward_amount?: number | null; created_at: string;
}
interface SendForm {
  msg_type: string; title: string; content: string;
  target_type: string; target_email: string; pinned: boolean; reward_amount: string; expires_at: string;
}
const defaultForm: SendForm = {
  msg_type: 'notice', title: '', content: '',
  target_type: 'all', target_email: '', pinned: false, reward_amount: '', expires_at: '',
};

export default function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<SendForm>(defaultForm);
  const [filterType, setFilterType] = useState('');
  const PAGE_SIZE = 15;

  const load = (p = page) => {
    setLoading(true); setMessages([]);
    adminMessagesApi.list({ page: p, page_size: PAGE_SIZE, msg_type: filterType || undefined })
      .then((res) => { if (res.data.success) { setMessages(res.data.data); setTotal(res.data.total); } })
      .finally(() => setLoading(false));
  };
  const prevFilterRef = useRef(filterType);
  useEffect(() => {
    const isFilterChange = prevFilterRef.current !== filterType;
    prevFilterRef.current = filterType;
    const p = isFilterChange ? 1 : page;
    if (isFilterChange) setPage(1);
    load(p);
  }, [page, filterType]);

  const confirm = useConfirm();
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('标题不能为空'); return; }
    if (!form.content.trim()) { toast.error('内容不能为空'); return; }
    if ((form.msg_type === 'message' || (form.msg_type === 'email' && form.target_type === 'single')) && !form.target_email.trim()) {
      toast.error('请输入目标邮箱'); return;
    }
    setSubmitting(true);
    try {
      const res = await adminMessagesApi.send({ ...form, pinned: form.pinned, reward_amount: form.reward_amount ? Number(form.reward_amount) : undefined });
      if (res.data.success) { toast.success('发送成功'); setShowModal(false); setForm(defaultForm); load(1); setPage(1); }
      else toast.error(res.data.message || '发送失败');
    } catch { toast.error('发送失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: '删除消息', message: '确定删除此消息？', danger: true });
    if (!ok) return;
    try {
      const res = await adminMessagesApi.delete(id);
      if (res.data.success) { toast.success('已删除'); load(); }
      else toast.error(res.data.message || '删除失败');
    } catch { toast.error('删除失败'); }
  };

  const togglePin = async (msg: Message) => {
    try {
      const res = await adminMessagesApi.update(msg.id, { pinned: !msg.pinned });
      if (res.data.success) { toast.success(msg.pinned ? '已取消置顶' : '已置顶'); load(); }
      else toast.error(res.data.message);
    } catch { toast.error('操作失败'); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const typeMap: Record<string, string> = { notice: '公告', message: '指定商户', email: '邮箱发送' };

  return (
    <div className="dpage">
      <div className="stat-grid" style={{gap:8}}>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">总消息</div><div className="stat-card-v2__value" style={{color:'#1890ff'}}>{<AnimatedNumber value={total} />}</div><div className="stat-card-v2__desc">所有消息</div></div><div className="stat-card-v2__icon" style={{background:'#e6f4ff',color:'#1890ff'}}><Bell size={20}/></div></div>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">公告</div><div className="stat-card-v2__value" style={{color:'#52c41a'}}>{<AnimatedNumber value={messages.filter(m=>m.msg_type==='notice').length} />}</div><div className="stat-card-v2__desc">当前页公告</div></div><div className="stat-card-v2__icon" style={{background:'#f6ffed',color:'#52c41a'}}><FileText size={20}/></div></div>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">指定商户</div><div className="stat-card-v2__value" style={{color:'#faad14'}}>{<AnimatedNumber value={messages.filter(m=>m.msg_type==='message').length} />}</div><div className="stat-card-v2__desc">当前页指定商户</div></div><div className="stat-card-v2__icon" style={{background:'#fffbe6',color:'#faad14'}}><MessageSquare size={20}/></div></div>
        <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">邮箱发送</div><div className="stat-card-v2__value" style={{color:'#7c3aed'}}>{<AnimatedNumber value={messages.filter(m=>m.msg_type==='email').length} />}</div><div className="stat-card-v2__desc">当前页邮箱</div></div><div className="stat-card-v2__icon" style={{background:'#f5f3ff',color:'#7c3aed'}}><Bell size={20}/></div></div>
      </div>
      <div className="view-tab-row"><button className="view-tab-btn">消息管理</button><button className="view-tab-plus" onClick={()=>setShowModal(true)}><Plus size={16}/></button></div>
      <div className="segmented-control">
        {[{value:'',label:'全部消息'},{value:'notice',label:'公告'},{value:'message',label:'指定商户'},{value:'email',label:'邮箱发送'}].map(tab=>(
          <button key={tab.value} className={`seg-item ${filterType===tab.value?'is-active':''}`} onClick={()=>setFilterType(tab.value)}>{tab.label}</button>
        ))}
      </div>
      <div className="action-bar"><button className="btn-secondary-lg" onClick={()=>load()}><RefreshCw className="refresh-icon" size={14}/> 刷新</button></div>
      {loading ? <div style={{textAlign:'center',padding:60}}><span className="spinner"/></div> : (
        <>
          {messages.map(msg=>(
            <div key={msg.id} className={`data-card ${msg.pinned ? 'message-card--pinned' : ''}`} style={{maxWidth: "100%", overflow: "hidden"}}>
              <div className="data-card__header">
                <div className="data-card__title" style={{flex:1,minWidth:0,overflow:'hidden'}}>
                  <span style={{fontSize:15,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:300,display:'inline-block'}}>{msg.title}</span>
                  <span className="tag-chip tag-chip--blue" style={{marginLeft:6,flexShrink:0}}>{typeMap[msg.msg_type]||msg.msg_type}</span>
                  <span className={`status-badge ${msg.target_type==='all'?'status-badge--success':'status-badge--info'}`} style={{flexShrink:0}}>{msg.msg_type==='email' ? (msg.target_type==='all'?'邮箱全部':'邮箱指定') : (msg.target_type==='all'?'全部':msg.target_type==='plan'?'套餐':'个人')}</span>
                  {msg.pinned && <span style={{marginLeft:4,color:'#ff4d4f',flexShrink:0}}><Pin size={12}/></span>}
                  {Number(msg.reward_amount || 0) > 0 && <span className="tag-chip tag-chip--green" style={{marginLeft:6,flexShrink:0}}>余额奖励 ¥{Number(msg.reward_amount).toFixed(2)}</span>}
                </div>
              </div>
              {/* 内容小框 */}
              <div style={{fontSize:13,color:'var(--t2)',marginTop:8,lineHeight:1.8,whiteSpace:'pre-wrap',padding:'8px 10px',background:'var(--bg2, #fafafa)',borderRadius:6,maxHeight:150,overflowY:'auto'}}>{msg.content}</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12,fontSize:12}}>
                <div style={{display:'flex',gap:'6px 16px',flexWrap:'wrap'}}>
                  <div><span style={{color:'var(--t3)'}}>发布时间</span><div style={{color:'var(--t1)',marginTop:2}}>{new Date(msg.created_at).toLocaleString('zh-CN')}</div></div>
                  <div><span style={{color:'var(--t3)'}}>阅读数</span><div style={{color:'var(--t1)',marginTop:2}}>{msg.read_count}</div></div>
                  {msg.target_id && <div><span style={{color:'var(--t3)'}}>目标</span><div style={{color:'var(--t1)',marginTop:2}}>{msg.target_id}</div></div>}
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  <button className="btn-secondary-lg" style={{height:30,fontSize:12}} onClick={()=>togglePin(msg)}><Pin size={12}/> {msg.pinned?'取消置顶':'置顶'}</button>
                  <button className="btn-secondary-lg" style={{height:30,fontSize:12,color:'#ff4d4f'}} onClick={()=>handleDelete(msg.id)}><Trash2 size={12}/> 删除</button>
                </div>
              </div>
            </div>
          ))}
          {total > PAGE_SIZE && (
            <div className="pagination-v2">
              <span>共 {<AnimatedNumber value={total} />} 条数据</span>
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
            <div className="modal-v2__header"><span className="modal-v2__title">发送消息</span><button className="modal-v2__close" onClick={()=>setShowModal(false)}>×</button></div>
            <form onSubmit={handleSend}>
              <div className="modal-v2__body">
                <div className="form-group-v2"><label>类型</label>
                  <CustomSelect value={form.msg_type} options={[{ value: 'notice', label: '公告' }, { value: 'message', label: '指定商户' }, { value: 'email', label: '邮箱发送' }]} onChange={value=>setForm(s=>({...s,msg_type:value,target_type:value==='message'?'single':'all',target_email:''}))} />
                </div>
                <div className="form-group-v2"><label>标题</label><input value={form.title} onChange={e=>setForm(s=>({...s,title:e.target.value}))} placeholder="消息标题" className="form-input-v2"/></div>
                <div className="form-group-v2"><label>内容</label><textarea value={form.content} onChange={e=>setForm(s=>({...s,content:e.target.value}))} rows={5} placeholder="消息内容" className="form-input-v2" style={{resize:'vertical'}}/></div>
                {form.msg_type==='notice' && <div className="form-group-v2"><label>公告奖励金额（可选，商户可领取一次）</label><input type="number" min="0" step="0.01" value={form.reward_amount} onChange={e=>setForm(s=>({...s,reward_amount:e.target.value}))} placeholder="例如 1.00，不填则无奖励" className="form-input-v2"/></div>}
                {form.msg_type==='message' && <div className="form-group-v2"><label>指定商户邮箱</label><input value={form.target_email} onChange={e=>setForm(s=>({...s,target_email:e.target.value,target_type:'single'}))} placeholder="输入商户邮箱，发送站内指定消息" className="form-input-v2"/></div>}
                {form.msg_type==='email' && (
                  <>
                    <div className="form-group-v2"><label>目标</label>
                      <CustomSelect value={form.target_type} options={[{ value: 'all', label: '全局发送（全部商户邮箱）' }, { value: 'single', label: '指定商户邮箱' }]} onChange={value=>setForm(s=>({...s,target_type:value}))} />
                    </div>
                    {form.target_type==='single' && <div className="form-group-v2"><label>目标邮箱</label><input value={form.target_email} onChange={e=>setForm(s=>({...s,target_email:e.target.value}))} placeholder="输入商户邮箱，仅发送邮件，不进入站内消息" className="form-input-v2"/></div>}
                  </>
                )}
                <div className="form-group-v2">
                  <label style={{display:'flex',alignItems:'center',gap:8}}>
                    <input type="checkbox" checked={form.pinned} onChange={e=>setForm(s=>({...s,pinned:e.target.checked}))} style={{accentColor:'var(--pri)'}}/> 置顶
                  </label>
                </div>
              </div>
              <div className="modal-v2__footer"><button className="btn-cancel" type="button" onClick={()=>setShowModal(false)}>取消</button><button className="btn-confirm" type="submit" disabled={submitting}>{submitting?'发送中...':'发送'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
