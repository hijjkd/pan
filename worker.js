/**
 * 夸克网盘分享「中转站」— UA 分流层
 * ---------------------------------------------------------------
 * 目标：复现 pan.zhoulanshare.com 的行为
 *   - 移动端浏览器（含微信 / QQ 内置浏览器）  → 返回「引导页」(HTML)
 *   - 其它（PC 浏览器 / 爬虫 / curl）        → 302 直跳 pan.quark.cn
 *
 * 部署方式（GitHub 集成 → Cloudflare Workers）：
 *   1. 仓库根放 wrangler.toml + 本文件 worker.js
 *   2. Cloudflare 控制台「Connect GitHub」→ 选本仓库 → 识别为 Worker → 部署
 *   3. 部署成功后在控制台绑定自定义域 pan.你的域名.com（设置 → 触发器 → 自定义域）
 *
 * 生产建议：把引导页 HTML 放到静态托管（或用 KV / Assets），此处 fetch 取回，
 *          避免 Worker 与本地 HTML 两份 UI 需要同步维护。
 */

const QUARK_HOST = 'https://pan.quark.cn';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    // 只处理 /s/{shareId}
    const m = url.pathname.match(/^\/s\/([A-Za-z0-9_-]+)\/?$/);
    if (!m) {
      return new Response('Not Found', { status: 404 });
    }

    const shareId = m[1];
    const target = `${QUARK_HOST}/s/${shareId}`;
    const ua = (request.headers.get('user-agent') || '').toLowerCase();

    const isMobile = /android|iphone|ipad|ipod|mobile|micromessenger|qq\//.test(ua);
    const isWeChat = /micromessenger/.test(ua);

    // ── 非移动端 / 爬虫 → 直接 302（与实测 zhoulanshare 行为一致）──
    if (!isMobile) {
      return Response.redirect(target, 302);
    }

    // ── 移动端（含微信 / QQ）→ 返回引导页 ──
    return new Response(renderGuide(target, isWeChat), {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-frame-options': 'DENY',
      },
    });
  },
};

/**
 * 渲染引导页。此处为精简内联版，样式与「夸克网盘分享引导页.html」保持一致。
 */
function renderGuide(target, isWeChat) {
  // 微信内额外提示：需用系统浏览器打开
  const wechatTip = isWeChat
    ? '<p class="foot" style="color:#e8890c">检测到你在微信内打开，请点右上角「···」选择「在浏览器打开」后再唤起夸克。</p>'
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="referrer" content="no-referrer" />
<title>夸克网盘分享</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif;
       background:linear-gradient(180deg,#e9eef5 0%,#f5f6f8 46%,#f7f8fa 100%);
       color:#16181d;-webkit-font-smoothing:antialiased}
  .wrap{min-height:100vh;display:flex;justify-content:center;padding:56px 18px 40px}
  .card{width:100%;max-width:430px;height:fit-content;background:#fff;border-radius:22px;
        padding:24px 20px 22px;box-shadow:0 10px 34px rgba(23,43,77,.07),0 2px 6px rgba(23,43,77,.04)}
  .head{display:flex;align-items:center;justify-content:center;gap:10px;
        padding-bottom:18px;border-bottom:1px solid #eef0f3}
  .brand{width:30px;height:30px;border-radius:50%;background:#2f68ff;display:flex;
         align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(47,104,255,.32)}
  .head h1{font-size:20px;font-weight:700;margin:0}
  .block{padding-top:20px}
  .btitle{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:700}
  .dot{width:8px;height:8px;border-radius:50%;background:#2f68ff}
  .desc{margin:10px 0 0;font-size:13px;line-height:1.65;color:#8c9199}
  .btn{display:block;width:100%;border:0;cursor:pointer;font-family:inherit;font-size:16px;
       font-weight:600;border-radius:12px;padding:14px 16px;margin-top:14px}
  .btn-primary{background:#2f68ff;color:#fff;box-shadow:0 6px 16px rgba(47,104,255,.26)}
  .btn-soft{width:auto;margin:16px auto 0;padding:13px 30px;background:#e9f0ff;color:#2f68ff}
  .field{margin-top:12px;background:#f3f4f6;border-radius:10px;padding:14px;font-size:13px;
         line-height:1.45;color:#9aa1a9;word-break:break-all;user-select:all}
  .foot{margin:20px 0 0;font-size:12.5px;line-height:1.65;color:#a6abb3;text-align:center}
</style>
</head>
<body>
  <div class="wrap">
    <main class="card">
      <div class="head">
        <span class="brand">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff"><path d="M9.6 5.5c-2.5 0-4.4 1.9-4.4 4.3 0 2.2 1.6 3.9 3.7 3.9.5 0 .9-.1 1.3-.2-.5 1.7-2 3-3.7 3.3l.5 2.2c3.6-.7 6.3-3.9 6.3-7.9 0-3.3-1.6-5.6-3.7-5.6zm9.1 0c-2.5 0-4.4 1.9-4.4 4.3 0 2.2 1.6 3.9 3.7 3.9.5 0 .9-.1 1.3-.2-.5 1.7-2 3-3.7 3.3l.5 2.2c3.6-.7 6.3-3.9 6.3-7.9 0-3.3-1.6-5.6-3.7-5.6z"/></svg>
        </span>
        <h1>夸克网盘分享</h1>
      </div>

      <section class="block">
        <div class="btitle"><i class="dot"></i>打开资源</div>
        <p class="desc">正在自动唤起夸克并跳转… 若未自动打开，可点击下方按钮或复制链接。</p>
        <button class="btn btn-primary" id="openBtn">打开夸克 App</button>
      </section>

      <section class="block">
        <div class="btitle"><i class="dot"></i>网盘链接</div>
        <div class="field" id="linkField"></div>
        <button class="btn btn-soft" id="copyBtn">复制夸克链接</button>
      </section>

      <p class="foot">打开 App 没反应？也可以复制夸克链接，再用 Safari、Chrome 或夸克 APP 打开。</p>
      ${wechatTip}
    </main>
  </div>
<script>
(function(){
  var TARGET = ${JSON.stringify(target)};
  document.getElementById('linkField').textContent = TARGET;

  function copy(text){
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function(res, rej){
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;top:-1000px;opacity:0;';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? res() : rej(); } catch(e){ rej(e); }
      finally { document.body.removeChild(ta); }
    });
  }
  document.getElementById('copyBtn').onclick = function(){
    var b = this;
    copy(TARGET).then(function(){ b.textContent = '已复制'; setTimeout(function(){ b.textContent = '复制夸克链接'; }, 1800); });
  };

  var jumped = false;
  function openQuark(){
    if (jumped) return; jumped = true;
    // 直接走夸克通用链接 pan.quark.cn/s/{id}：
    //  - 已装夸克 App → 系统/浏览器按 Universal Link 自动拉起 App（与 pan.quarkt.xyz 行为一致）
    //  - 未装 App   → 落夸克网页版，正常显示分享
    // 不再先尝试 quark:// 这类自定义 scheme（X / 微信等内嵌浏览器会拦截，反而拖累跳转）
    location.href = TARGET;
  }
  document.getElementById('openBtn').onclick = openQuark;

  // 关键：加载即自动跳转，匹配 pan.quarkt.xyz 在 X 内嵌浏览器「直接跳」的行为
  openQuark();
})();
</script>
</body>
</html>`;
}
