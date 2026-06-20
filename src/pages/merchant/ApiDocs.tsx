import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Copy, Key, Lock, Menu, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/auth';

type Method = 'POST';
type Param = { name: string; type: string; required?: boolean; description: string; example?: string };
type Endpoint = { id: string; title: string; method: Method; path: string; group: string; auth: 'api_key' | 'bearer'; description: string; params: Param[]; response: string; note?: string };
const BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9527');

function endpoints(apiKey: string): Endpoint[] {
  return [
    { id: 'activate', title: '激活卡密', method: 'POST', path: '/v1/activate', group: '授权接口', auth: 'api_key', description: '客户端首次使用卡密时调用，验证卡密并绑定当前设备。设备已绑定时可直接返回成功。', params: [
      { name: 'api_key', type: 'string', required: true, description: '商户 API Key', example: apiKey },
      { name: 'app_id', type: 'string', required: true, description: '应用 ID', example: '<app_id>' },
      { name: 'card_code', type: 'string', required: true, description: '卡密内容', example: '<card_code>' },
      { name: 'device_id', type: 'string', required: true, description: '设备唯一标识', example: '<device_id>' },
      { name: 'device_name', type: 'string', description: '设备名称，可选', example: '<optional>' },
    ], response: JSON.stringify({ success: true, message: '激活成功', data: { expires_at: '2026-12-31T00:00:00Z', remaining_days: 276, max_devices: 3, current_devices: 1 } }, null, 2), note: 'device_id 建议使用主板序列号、MAC、Android ID 等稳定唯一标识，长度不超过 128 字符。' },
    { id: 'verify', title: '验证授权', method: 'POST', path: '/v1/verify', group: '授权接口', auth: 'api_key', description: '软件启动或关键操作前调用，校验卡密是否有效且当前设备是否已绑定。', params: [
      { name: 'api_key', type: 'string', required: true, description: '商户 API Key', example: apiKey },
      { name: 'app_id', type: 'string', required: true, description: '应用 ID', example: '<app_id>' },
      { name: 'card_code', type: 'string', required: true, description: '卡密内容', example: '<card_code>' },
      { name: 'device_id', type: 'string', required: true, description: '设备唯一标识', example: '<device_id>' },
    ], response: JSON.stringify({ success: true, valid: true, message: '卡密有效', data: { expires_at: '2026-12-31T00:00:00Z', remaining_days: 276 } }, null, 2), note: '返回 success:false 或 valid:false 时，客户端应拒绝运行并展示 message。' },
    { id: 'unbind', title: '解绑设备', method: 'POST', path: '/v1/unbind', group: '授权接口', auth: 'api_key', description: '解除指定设备与卡密的绑定关系，释放设备配额。', params: [
      { name: 'api_key', type: 'string', required: true, description: '商户 API Key', example: apiKey },
      { name: 'app_id', type: 'string', required: true, description: '应用 ID', example: '<app_id>' },
      { name: 'card_code', type: 'string', required: true, description: '卡密内容', example: '<card_code>' },
      { name: 'device_id', type: 'string', required: true, description: '设备唯一标识', example: '<device_id>' },
    ], response: JSON.stringify({ success: true, message: '设备已解绑' }, null, 2) },
    { id: 'sign', title: '签名运算', method: 'POST', path: '/api/ts/sign', group: '算法接口', auth: 'bearer', description: '使用 API 管理中配置的签名代码，对传入参数进行签名运算。', params: [
      { name: 'key_name', type: 'string', required: true, description: '配置名称', example: 'sign' },
      { name: 'text', type: 'string', required: true, description: '待签名原文', example: '<text>' },
      { name: 'params', type: 'object', description: '自定义参数', example: '{}' },
    ], response: JSON.stringify({ code: 200, msg: 'success', data: { key_name: 'sign', result: '<signature>' } }, null, 2), note: '需要在 Header 中传入 Authorization: Bearer <auth_key>。' },
    { id: 'encrypt', title: '加密文本', method: 'POST', path: '/api/ts/encrypt', group: '算法接口', auth: 'bearer', description: '使用 API 管理中配置的加密代码，对传入文本进行加密。', params: [
      { name: 'key_name', type: 'string', required: true, description: '配置名称', example: 'enc' },
      { name: 'text', type: 'string', required: true, description: '待加密文本', example: '<text>' },
      { name: 'params', type: 'object', description: '自定义参数', example: '{}' },
    ], response: JSON.stringify({ code: 200, msg: 'success', data: { key_name: 'enc', result: '<encrypted>' } }, null, 2), note: '需要在 Header 中传入 Authorization: Bearer <auth_key>。' },
    { id: 'decrypt', title: '解密文本', method: 'POST', path: '/api/ts/decrypt', group: '算法接口', auth: 'bearer', description: '使用 API 管理中配置的解密代码，对密文进行解密还原。', params: [
      { name: 'key_name', type: 'string', required: true, description: '配置名称', example: 'dec' },
      { name: 'text', type: 'string', required: true, description: '待解密密文', example: '<encrypted>' },
      { name: 'params', type: 'object', description: '自定义参数', example: '{}' },
    ], response: JSON.stringify({ code: 200, msg: 'success', data: { key_name: 'dec', result: '<decrypted>' } }, null, 2), note: '需要在 Header 中传入 Authorization: Bearer <auth_key>。' },
  ];
}
function body(ep: Endpoint) { const o: Record<string, string> = {}; ep.params.forEach(p => { o[p.name] = p.example || `<${p.name}>`; }); return JSON.stringify(o, null, 2); }
function curl(ep: Endpoint) { return `curl -X ${ep.method} '${BASE_URL}${ep.path}' \
  -H 'Content-Type: application/json'${ep.auth === 'bearer' ? ` \
  -H 'Authorization: Bearer <auth_key>'` : ''} \
  -d '${body(ep).replace(/'/g, "\\'")}'`; }
function js(ep: Endpoint) { return `const res = await fetch('${BASE_URL}${ep.path}', {\n  method: '${ep.method}',\n  headers: {\n    'Content-Type': 'application/json'${ep.auth === 'bearer' ? ",\n    'Authorization': 'Bearer <auth_key>'" : ''}\n  },\n  body: JSON.stringify(${body(ep)})\n});\nconsole.log(await res.json());`; }
function py(ep: Endpoint) { return `import requests\n\nurl = '${BASE_URL}${ep.path}'\npayload = ${body(ep)}\nheaders = {'Content-Type': 'application/json'}${ep.auth === 'bearer' ? "\nheaders['Authorization'] = 'Bearer <auth_key>'" : ''}\nres = requests.post(url, json=payload, headers=headers)\nprint(res.json())`; }

export default function ApiDocs() {
  const { user } = useAuthStore();
  const all = useMemo(() => endpoints(user?.api_key || '<your_api_key>'), [user?.api_key]);
  const [active, setActive] = useState('activate');
  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState('');
  const [tab, setTab] = useState<'Shell' | 'JavaScript' | 'Python'>('Shell');
  const list = all.filter(e => !kw.trim() || `${e.title} ${e.path} ${e.group}`.toLowerCase().includes(kw.trim().toLowerCase()));
  const current = list.find(e => e.id === active) || list[0] || all[0];
  const groups = Array.from(new Set(list.map(e => e.group)));
  const examples = { Shell: curl(current), JavaScript: js(current), Python: py(current) };
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const body = document.body;
    const html = document.documentElement;
    const oldBodyStyle = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    const oldHtmlOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = oldHtmlOverflow;
      body.style.position = oldBodyStyle.position;
      body.style.top = oldBodyStyle.top;
      body.style.left = oldBodyStyle.left;
      body.style.right = oldBodyStyle.right;
      body.style.width = oldBodyStyle.width;
      body.style.overflow = oldBodyStyle.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('已复制'); };
  const choose = (id: string) => { setActive(id); setOpen(false); setTimeout(() => document.querySelector('.api-content')?.scrollTo({ top: 0, behavior: 'smooth' }), 20); };
  const menu = <><div className="api-drawer-search"><div className="api-search-box"><Search size={18}/><input value={kw} onChange={e => setKw(e.target.value)} placeholder="搜索接口..." /></div><div className="api-sider-count">共 {list.length} 个接口</div></div><div className="api-sider-menu">{groups.map(g => <div key={g}><div className="api-menu-group-title">{g}</div>{list.filter(e => e.group === g).map(e => <button key={e.id} className={`api-menu-item ${active === e.id ? 'active' : ''}`} onClick={() => choose(e.id)}><span className="api-method-badge api-method-sm api-method-post">POST</span><span>{e.title}</span></button>)}</div>)}</div></>;
  return <div className="dpage api-docs-page api-docs-unified api-docs-compact">
    <div className="api-docs-mobile-actions"><button className="btn-secondary-lg" onClick={() => setOpen(true)}><Menu size={14}/>接口列表</button></div>
    {open && <div className="api-mobile-drawer" onClick={() => setOpen(false)}><aside onClick={e => e.stopPropagation()}><div className="api-drawer-title"><span>接口列表</span><button onClick={() => setOpen(false)}><X size={22}/></button></div>{menu}</aside></div>}
    <div className="api-unified-layout">
      <main className="api-main-card">
        <div className="data-card">
          <div className="data-card__header"><div className="data-card__title"><BookOpen size={16}/>{current.title}<span className="tag-chip tag-chip--blue">{current.group}</span></div></div>
          <div className="api-url-line"><span className="status-badge status-badge--success">POST</span><code>{BASE_URL}{current.path}</code><button className="act-log" onClick={() => copy(`${BASE_URL}${current.path}`)}><Copy size={12}/>复制</button></div>
          <p className="api-desc-v2">{current.description}</p>
          <div className={`api-auth-tip ${current.auth === 'bearer' ? 'jwt' : ''}`}><Lock size={14}/>{current.auth === 'bearer' ? 'Bearer auth_key 鉴权：Authorization: Bearer <auth_key>' : 'API Key 鉴权：请求体中传入 api_key。'}</div>
          {current.note && <div className="api-auth-tip note"><Key size={14}/>{current.note}</div>}
        </div>
        <div className="data-card">
          <div className="data-card__header"><div className="data-card__title">请求参数</div><button className="act-log" onClick={() => copy(body(current))}><Copy size={12}/>复制 JSON</button></div>
          <div className="api-param-table-v2"><div className="api-param-row-v2 head"><div>参数名</div><div>类型</div><div>必填</div><div>说明 / 示例</div></div>{current.params.map(p => <div className="api-param-row-v2" key={p.name}><div><code>{p.name}</code></div><div>{p.type}</div><div><span className={`status-badge ${p.required ? 'status-badge--danger' : 'status-badge--info'}`}>{p.required ? '必填' : '可选'}</span></div><div>{p.description}<em>{p.example || '-'}</em></div></div>)}</div>
        </div>
        <div className="data-card">
          <div className="data-card__header"><div className="data-card__title">代码示例</div><button className="act-log" onClick={() => copy(examples[tab])}><Copy size={12}/>复制</button></div>
          <div className="segmented-control api-code-seg">{(['Shell','JavaScript','Python'] as const).map(t => <button key={t} className={`seg-item ${tab === t ? 'is-active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}</div>
          <pre className="api-code-block-v2"><code>{examples[tab]}</code></pre>
        </div>
        <div className="data-card">
          <div className="data-card__header"><div className="data-card__title">返回响应</div><button className="act-log" onClick={() => copy(current.response)}><Copy size={12}/>复制</button></div>
          <pre className="api-code-block-v2"><code>{current.response}</code></pre>
        </div>
      </main>
      <aside className="data-card api-menu-card">{menu}</aside>
    </div>
    <style>{`.api-unified-layout{display:grid;grid-template-columns:260px 1fr;gap:12px}.api-menu-card{position:sticky;top:12px;align-self:start}.api-drawer-search{margin-bottom:12px}.api-search-box{height:36px;border:1px solid var(--bdl2);border-radius:8px;display:flex;align-items:center;gap:8px;padding:0 10px;background:var(--bg)}.api-search-box input{border:0;outline:0;background:transparent;color:var(--t1);width:100%}.api-sider-count{font-size:12px;color:var(--t3);margin-top:8px}.api-menu-group-title{font-size:12px;color:var(--t3);font-weight:700;margin:12px 0 8px}.api-menu-item{width:100%;height:34px;border:0;background:transparent;color:var(--t2);display:flex;align-items:center;gap:8px;border-radius:8px;padding:0 10px;cursor:pointer}.api-menu-item.active,.api-menu-item:hover{background:var(--pl9,rgba(24,144,255,.08));color:var(--pri)}.api-method-badge{font-size:10px;border-radius:6px;padding:2px 6px;background:#f6ffed;color:#52c41a;border:1px solid #b7eb8f}.api-url-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--bdl2);border-radius:8px;background:var(--fcl,rgba(148,163,184,.08));margin:10px 0}.api-url-line code{flex:1;min-width:220px;color:var(--t1);word-break:break-all}.api-desc-v2{font-size:13px;color:var(--t2);line-height:1.7}.api-auth-tip{margin-top:8px;border:1px solid rgba(82,196,26,.25);background:rgba(82,196,26,.08);color:#16a34a;border-radius:8px;padding:10px 12px;font-size:13px;display:flex;gap:8px;align-items:flex-start}.api-auth-tip.jwt{border-color:rgba(250,173,20,.25);background:rgba(250,173,20,.08);color:#b7791f}.api-auth-tip.note{border-color:var(--bdl2);background:var(--fcl,rgba(148,163,184,.08));color:var(--t2)}.api-param-table-v2{overflow:auto}.api-param-row-v2{display:grid;grid-template-columns:150px 90px 80px minmax(220px,1fr);gap:10px;align-items:center;border-bottom:1px solid var(--bdl2);padding:10px 0;font-size:13px;color:var(--t2)}.api-param-row-v2.head{font-weight:700;color:var(--t1)}.api-param-row-v2 em{display:block;font-style:normal;font-family:monospace;color:var(--t3);margin-top:3px}.api-code-seg{margin-bottom:10px}.api-code-block-v2{margin:0;background:#0f172a;color:#d6e4ff;border-radius:10px;padding:14px;overflow:auto;font-size:12px;line-height:1.6}.api-mobile-drawer{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1000;display:flex;justify-content:flex-end}.api-mobile-drawer aside{width:min(340px,86vw);height:100%;background:var(--bg);padding:16px;overflow:auto}.api-drawer-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-weight:700}.api-drawer-title button{border:0;background:transparent;color:var(--t1)}@media(max-width:900px){.api-unified-layout{grid-template-columns:1fr}.api-menu-card{display:none}.api-param-row-v2{grid-template-columns:120px 70px 70px minmax(180px,1fr)}}@media(max-width:600px){.api-param-row-v2{grid-template-columns:1fr;gap:4px}.api-url-line code{min-width:0}.api-docs-unified .page-header{align-items:flex-start}}`}</style>
  </div>;
}
