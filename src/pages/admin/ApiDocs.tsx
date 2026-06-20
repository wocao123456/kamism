import { useMemo, useState } from 'react';
import { Copy, Key, Lock, Menu, Search, Unlock, X } from 'lucide-react';
import toast from 'react-hot-toast';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type AuthType = 'jwt' | 'open_api' | 'none';
interface ApiParam { name: string; type: string; required?: boolean; description: string; example?: string }
interface ApiEndpoint {
  id: string; method: Method; path: string; title: string; description: string; auth?: AuthType;
  pathParams?: ApiParam[]; queryParams?: ApiParam[]; bodyParams?: ApiParam[]; responseFields?: ApiParam[]; responseExample?: string;
}
interface ApiCategory { key: string; label: string; endpoints: ApiEndpoint[] }

const apiCategories: ApiCategory[] = [
  { key: 'open', label: '开放接口', endpoints: [
    { id:'activate', method:'POST', path:'/v1/activate', title:'激活卡密', description:'使用 API Key、应用 ID、卡密和设备 ID 激活授权。适合客户端首次绑定设备时调用。', auth:'open_api', bodyParams:[
      {name:'api_key', type:'string', required:true, description:'API 密钥，可在安全设置中查看或重新生成', example:'km_xxx'},
      {name:'app_id', type:'string', required:true, description:'应用 ID', example:'app_10001'},
      {name:'card_code', type:'string', required:true, description:'卡密内容', example:'ABCD-EFGH-IJKL'},
      {name:'device_id', type:'string', required:true, description:'设备唯一标识', example:'android-xxxx'},
    ], responseFields:[
      {name:'success', type:'boolean', description:'是否成功'}, {name:'data.expires_at', type:'string', description:'授权过期时间'}, {name:'data.plan', type:'string', description:'套餐名称'}
    ], responseExample: JSON.stringify({success:true,data:{status:'active',plan:'1套餐',expires_at:'2029-10-28T00:00:00Z'}}, null, 2)},
    { id:'verify', method:'POST', path:'/v1/verify', title:'验证授权', description:'校验指定卡密与设备是否仍在有效授权期内。建议客户端启动或关键操作前调用。', auth:'open_api', bodyParams:[
      {name:'api_key', type:'string', required:true, description:'API 密钥', example:'km_xxx'},
      {name:'app_id', type:'string', required:true, description:'应用 ID', example:'app_10001'},
      {name:'card_code', type:'string', required:true, description:'卡密内容'},
      {name:'device_id', type:'string', required:true, description:'设备唯一标识'},
    ], responseFields:[{name:'valid', type:'boolean', description:'授权是否有效'}, {name:'reason', type:'string', description:'无效原因'}], responseExample: JSON.stringify({success:true,data:{valid:true,expires_at:'2029-10-28T00:00:00Z'}}, null, 2)},
    { id:'unbind', method:'POST', path:'/v1/unbind', title:'解绑设备', description:'解除卡密与当前设备的绑定，用于换机或重置授权。', auth:'open_api', bodyParams:[
      {name:'api_key', type:'string', required:true, description:'API 密钥'},
      {name:'app_id', type:'string', required:true, description:'应用 ID'},
      {name:'card_code', type:'string', required:true, description:'卡密内容'},
      {name:'device_id', type:'string', required:true, description:'设备唯一标识'},
    ], responseExample: JSON.stringify({success:true,message:'解绑成功'}, null, 2)},
  ]},
  { key:'admin', label:'管理接口', endpoints:[
    { id:'profile', method:'GET', path:'/api/profile', title:'获取个人资料', description:'获取当前登录用户资料、套餐、头像、API Key 等信息。', auth:'jwt', responseExample: JSON.stringify({success:true,data:{username:'admin',email:'admin@example.com',user_type:'admin',api_key:'km_xxx'}}, null, 2)},
    { id:'regen-key', method:'POST', path:'/api/profile/api-key', title:'重新生成 API Key', description:'重新生成当前用户的开放接口密钥。旧 Key 将立即失效。', auth:'jwt', responseExample: JSON.stringify({success:true,data:{api_key:'km_new_xxx'}}, null, 2)},
    { id:'op-logs', method:'GET', path:'/api/admin/op-logs', title:'操作日志', description:'分页获取后台操作日志。', auth:'jwt', queryParams:[{name:'page', type:'integer', description:'页码', example:'1'}, {name:'page_size', type:'integer', description:'每页数量', example:'20'}], responseExample: JSON.stringify({success:true,data:[],total:0}, null, 2)},
  ]},
];

function methodClass(method: Method) { return `api-method-${method.toLowerCase()}`; }
function baseOrigin() { return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:1420'; }
function makeBody(ep: ApiEndpoint) {
  const params = ep.bodyParams || [];
  if (!params.length) return '';
  const obj: Record<string, string> = {};
  params.forEach(p => obj[p.name] = p.example || `<${p.name}>`);
  return JSON.stringify(obj, null, 2);
}
function codeExample(ep: ApiEndpoint) {
  const body = makeBody(ep);
  return `curl -X ${ep.method} '${baseOrigin()}${ep.path}' \
  -H 'Content-Type: application/json'${ep.auth === 'jwt' ? ` \
  -H 'Authorization: Bearer <TOKEN>'` : ''}${body ? ` \
  -d '${body.replace(/'/g, `\'`)}'` : ''}`;
}

export default function ApiDocs() {
  const [searchText, setSearchText] = useState('');
  const [selectedId, setSelectedId] = useState(apiCategories[0].endpoints[0].id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [codeTab, setCodeTab] = useState<'shell' | 'javascript' | 'python'>('shell');
  const filteredCategories = useMemo(() => {
    const kw = searchText.trim().toLowerCase();
    if (!kw) return apiCategories;
    return apiCategories.map(cat => ({ ...cat, endpoints: cat.endpoints.filter(ep => ep.title.toLowerCase().includes(kw) || ep.path.toLowerCase().includes(kw) || ep.method.toLowerCase().includes(kw)) })).filter(cat => cat.endpoints.length);
  }, [searchText]);
  const current = useMemo(() => filteredCategories.flatMap(c => c.endpoints).find(ep => ep.id === selectedId) || filteredCategories[0]?.endpoints[0], [filteredCategories, selectedId]);
  const currentCategory = filteredCategories.find(c => c.endpoints.some(ep => ep.id === current?.id));
  const totalEndpoints = apiCategories.reduce((sum, cat) => sum + cat.endpoints.length, 0);
  const copy = async (text: string, key = 'copy') => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('已复制');
    setTimeout(() => setCopiedKey(''), 1400);
  };
  const selectEndpoint = (id: string) => { setSelectedId(id); setMobileMenuOpen(false); };
  const jsExample = (ep: ApiEndpoint) => {
    const body = makeBody(ep);
    return `const res = await fetch('${baseOrigin()}${ep.path}', {\n  method: '${ep.method}',\n  headers: { 'Content-Type': 'application/json'${ep.auth === 'jwt' ? ", Authorization: 'Bearer <TOKEN>'" : ''} },${body ? `\n  body: JSON.stringify(${body})` : ''}\n});\nconsole.log(await res.json());`;
  };
  const pyExample = (ep: ApiEndpoint) => {
    const body = makeBody(ep);
    return `import requests\n\nurl = '${baseOrigin()}${ep.path}'\nheaders = {'Content-Type': 'application/json'${ep.auth === 'jwt' ? ", 'Authorization': 'Bearer <TOKEN>'" : ''}}${body ? `\npayload = ${body}` : ''}\nres = requests.${ep.method.toLowerCase()}(url, headers=headers${body ? ', json=payload' : ''})\nprint(res.json())`;
  };
  const activeCode = current ? (codeTab === 'shell' ? codeExample(current) : codeTab === 'javascript' ? jsExample(current) : pyExample(current)) : '';
  const ParamTable = ({ title, rows }: { title: string; rows?: ApiParam[] }) => rows?.length ? (
    <div className="api-param-block">
      <div className="api-param-title">{title}</div>
      <div className="api-param-table">
        <div className="api-param-head"><span>字段</span><span>类型</span><span>说明</span></div>
        {rows.map(row => <div className="api-param-row" key={row.name}>
          <code>{row.name}</code><span className="api-type-chip">{row.type}</span><span>{row.description}{row.required ? '（必填）' : ''}</span>
        </div>)}
      </div>
    </div>
  ) : null;
  const Sidebar = () => (
    <>
      <div className="api-drawer-search">
        <div className="api-search-box"><Search size={20} /><input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="搜索接口..." /></div>
        <div className="api-sider-count">共 {totalEndpoints} 个接口</div>
      </div>
      <div className="api-sider-menu">
        {filteredCategories.map(cat => <div key={cat.key}>
          <div className="api-menu-group-title">{cat.label}（{cat.endpoints.length}）</div>
          {cat.endpoints.map(ep => <button key={ep.id} className={`api-menu-item ${selectedId === ep.id ? 'active' : ''}`} onClick={() => selectEndpoint(ep.id)}>
            <span className={`api-method-badge api-method-sm ${methodClass(ep.method)}`}>{ep.method}</span><span>{ep.title}</span>
          </button>)}
        </div>)}
      </div>
    </>
  );

  return (
    <div className="api-docs-page api-docs-ref">
      <div className="api-page-header">
        <h3>开发接口文档</h3>
        <button className="api-mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}><Menu size={16} />接口列表</button>
      </div>
      {mobileMenuOpen && (
        <div className="api-mobile-drawer is-open" onClick={() => setMobileMenuOpen(false)}>
          <aside onClick={e => e.stopPropagation()}>
            <div className="api-drawer-title"><span>接口列表</span><button onClick={() => setMobileMenuOpen(false)}><X size={28} /></button></div>
            <Sidebar />
          </aside>
        </div>
      )}
      <main className="api-content">
        {current ? <>
          <section className="api-doc-card">
            <div className="api-breadcrumb">{currentCategory?.label || '接口文档'} / 接口概述</div>
            <h2 className="api-endpoint-title">{current.title}</h2>
            <div className="api-url-bar">
              <span className={`api-method-badge ${methodClass(current.method)}`}>{current.method}</span>
              <span className="api-url-path">{baseOrigin()}{current.path}</span>
              <button onClick={() => copy(`${baseOrigin()}${current.path}`, 'url')}><Copy size={15} /></button>
            </div>
            <p className="api-description">{current.description}</p>
            <div className={`api-auth-banner ${current.auth === 'jwt' ? 'auth-jwt' : current.auth === 'none' ? 'auth-none' : 'auth-open'}`}>
              {current.auth === 'none' ? <Unlock size={16} /> : <Lock size={16} />}
              <span>{current.auth === 'jwt' ? '此接口需要登录 Token 鉴权' : current.auth === 'open_api' ? '此接口使用开放 API Key 鉴权' : '此接口无需鉴权即可访问'}</span>
            </div>
            {(current.pathParams?.length || current.queryParams?.length || current.bodyParams?.length) && <div className="api-inner-card"><div className="api-card-title">请求参数</div><ParamTable title="Path 参数" rows={current.pathParams} /><ParamTable title="Query 参数" rows={current.queryParams} /><ParamTable title="Body 字段" rows={current.bodyParams} /></div>}
            <div className="api-inner-card">
              <div className="api-card-title"><span>请求示例代码</span><button onClick={() => copy(activeCode, 'code')}><Copy size={13} /> {copiedKey === 'code' ? '已复制' : '复制'}</button></div>
              <div className="api-code-tabs">
                <button className={codeTab === 'shell' ? 'active' : ''} onClick={() => setCodeTab('shell')}>Shell</button>
                <button className={codeTab === 'javascript' ? 'active' : ''} onClick={() => setCodeTab('javascript')}>JavaScript</button>
                <button className={codeTab === 'python' ? 'active' : ''} onClick={() => setCodeTab('python')}>Python</button>
              </div>
              <pre className="api-code-block">{activeCode}</pre>
            </div>
            {current.responseExample && <div className="api-inner-card"><div className="api-card-title">返回响应</div><div className="api-response-status"><span><i />200 成功</span><em>application/json</em></div>{current.responseFields?.length ? <ParamTable title="Body 字段" rows={current.responseFields} /> : null}<div className="api-response-label">响应示例</div><pre className="api-code-block">{current.responseExample}</pre></div>}
          </section>
        </> : <div className="empty-state"><Key size={28} /><div className="empty-state__text">暂无匹配接口</div></div>}
      </main>
    </div>
  );
}
