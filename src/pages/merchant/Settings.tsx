import { useState } from 'react';
import { Save, RefreshCw, Key, Bell, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/auth';

export default function Settings() {
  const { user, updateUser } = useAuthStore();
  const [email, setEmail] = useState(user?.email || '');
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySystem, setNotifySystem] = useState(true);
  const [twoFA, setTwoFA] = useState(false);

  const saveProfile = () => {
    setSaving(true);
    fetch('/auth/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, body: JSON.stringify({ email }) })
      .then(r => r.json()).then(d => {
        if (d.success) { toast.success('已保存'); updateUser({ ...user, email }); }
        else toast.error(d.message || '保存失败');
      }).catch(() => toast.error('请求失败')).finally(() => setSaving(false));
  };

  const changePassword = () => {
    if (!oldPwd || !newPwd) { toast.error('请填写完整'); return; }
    if (newPwd !== confirmPwd) { toast.error('两次密码不一致'); return; }
    if (newPwd.length < 6) { toast.error('密码至少6位'); return; }
    setSaving(true);
    fetch('/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, body: JSON.stringify({ old_password: oldPwd, new_password: newPwd }) })
      .then(r => r.json()).then(d => {
        if (d.success) { toast.success('密码已修改'); setOldPwd(''); setNewPwd(''); setConfirmPwd(''); }
        else toast.error(d.message || '修改失败');
      }).catch(() => toast.error('请求失败')).finally(() => setSaving(false));
  };

  return (
    <div className="dpage">
      <div className="view-tab-row"><button className="view-tab-btn">系统设置</button></div>
      <div className="segmented-control">
        {[{l:'个人资料',i:<User size={12}/>},{l:'安全设置',i:<Shield size={12}/>},{l:'通知设置',i:<Bell size={12}/>}].map((t,i)=>(
          <button key={i} className={`seg-item ${i===0?'is-active':''}`}>{t.i} {t.l}</button>
        ))}
      </div>

      <div className="data-card" style={{maxWidth:"100%",overflow:"hidden"}}>
        <div className="data-card__header"><div className="data-card__title"><User size={16}/> <span style={{fontSize:15,fontWeight:600,marginLeft:8}}>个人资料</span></div></div>
        <div style={{marginTop:14}}>
          <div className="form-group-v2"><label>用户名</label><input value={user?.username||''} disabled className="form-input-v2" style={{opacity:0.6}}/></div>
          <div className="form-group-v2"><label>邮箱</label><input value={email} onChange={e=>setEmail(e.target.value)} className="form-input-v2"/></div>
          <div className="form-group-v2"><label>角色</label><div className={`role-badge ${(user as any)?.role === 'admin' ? 'role-badge--admin' : 'role-badge--merchant'}`}>{(user as any)?.role === 'admin' ? '管理员' : '商户'}</div></div>
        </div>
        <div className="action-grid" style={{marginTop:16}}>
          <button className="act-run" onClick={saveProfile} disabled={saving}><Save size={12}/> {saving?'保存中...':'保存'}</button>
          <button className="act-log"><RefreshCw className="refresh-icon" size={12}/> 重置</button>
        </div>
      </div>

      <div className="data-card" style={{maxWidth:"100%",overflow:"hidden"}}>
        <div className="data-card__header"><div className="data-card__title"><Key size={16}/> <span style={{fontSize:15,fontWeight:600,marginLeft:8}}>修改密码</span></div></div>
        <div style={{marginTop:14}}>
          <div className="form-group-v2"><label>当前密码</label><input type="password" value={oldPwd} onChange={e=>setOldPwd(e.target.value)} className="form-input-v2"/></div>
          <div className="form-group-v2"><label>新密码</label><input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} className="form-input-v2"/></div>
          <div className="form-group-v2"><label>确认新密码</label><input type="password" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} className="form-input-v2"/></div>
        </div>
        <div className="action-grid" style={{marginTop:16}}>
          <button className="act-run" onClick={changePassword} disabled={saving}><Save size={12}/> 修改密码</button>
        </div>
      </div>

      <div className="data-card" style={{maxWidth:"100%",overflow:"hidden"}}>
        <div className="data-card__header"><div className="data-card__title"><Bell size={16}/> <span style={{fontSize:15,fontWeight:600,marginLeft:8}}>通知设置</span></div></div>
        <div style={{marginTop:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--bdl2)'}}>
            <div><div style={{fontSize:13,fontWeight:500}}>邮件通知</div><div style={{fontSize:12,color:'var(--t3)',marginTop:2}}>接收系统邮件通知</div></div>
            <div className={`toggle-switch ${notifyEmail?'is-on':''}`} onClick={()=>setNotifyEmail(!notifyEmail)}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--bdl2)'}}>
            <div><div style={{fontSize:13,fontWeight:500}}>系统消息</div><div style={{fontSize:12,color:'var(--t3)',marginTop:2}}>接收站内消息推送</div></div>
            <div className={`toggle-switch ${notifySystem?'is-on':''}`} onClick={()=>setNotifySystem(!notifySystem)}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0'}}>
            <div><div style={{fontSize:13,fontWeight:500}}>二次验证</div><div style={{fontSize:12,color:'var(--t3)',marginTop:2}}>登录时需要验证码</div></div>
            <div className={`toggle-switch ${twoFA?'is-on':''}`} onClick={()=>setTwoFA(!twoFA)}/>
          </div>
        </div>
      </div>
    </div>
  );
}
