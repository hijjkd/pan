/**
 * 夸克网盘分享「中转站」— UA 分流层
 * ---------------------------------------------------------------
 * 目标：复现 pan.zhoulanshare.com / pan.quarkt.xyz 的行为
 *   - 移动端浏览器（含微信 / QQ / X 内嵌浏览器） → 返回「引导页」(HTML)
 *   - 其它（PC 浏览器 / 爬虫 / curl）            → 302 直跳 pan.quark.cn
 *
 * 移动端「打开夸克 App」按钮：
 *   使用夸克官方 ULCall 机制（unet.ucweb.com/quarkcloud/ulcall），
 *   内部 ucLink = qkcloudlink://...（夸克云盘真实唤起 scheme），
 *   在 X / 微信内嵌浏览器点按即可拉起 App（与 pan.quarkt.xyz 行为一致）。
 *   ⚠️ 模板里 7f2cf8874f59 为占位 shareId，运行时按真实 shareId 替换。
 *
 * 部署方式（GitHub 集成 → Cloudflare Workers）：
 *   1. 仓库根放 wrangler.toml + 本文件 worker.js
 *   2. Cloudflare 控制台「Connect GitHub」→ 选本仓库 → 识别为 Worker → 部署
 *   3. 部署成功后在控制台绑定自定义域 pan.你的域名.com（设置 → 触发器 → 自定义域）
 */

const QUARK_HOST = 'https://pan.quark.cn';

// 夸克官方 ULCall 唤起链接模板（取自 pan.quarkt.xyz 实测，已验证可在 X 内嵌浏览器拉起 App）
// 仅有一处 shareId（7f2cf8874f59）需替换；其余 appkey / ch / bid / share_dn 为夸克 SDK 常量，照搬即可。
const UL_CALL_TPL =
  'https://unet.ucweb.com/quarkcloud/ulcall' +
  '?st_name=JSSDK' +
  '&amp;appkey=ca7b1fad21e741b3a4aa4284ce58d686' +
  '&amp;ch=kkcloud%40product_wangpan_share' +
  '&amp;bid=37281' +
  '&amp;pkg=com.quark.clouddrive' +
  '&amp;fr=ios' +
  '&amp;fromULcall=1' +
  '&amp;ucLink=qkcloudlink%3A%2F%2Fwww.uc.cn%2Fca7b1fad21e741b3a4aa4284ce58d686%3Fsrc_ch%3Dkkcloud%2540product_wangpan_share%26action%3Dopen_url%26url%3Dhttps%253A%252F%252Fwww.myquark.cn%252F%253Fentry%253Dbuwang_others%2526qk_tech%253Dflutter%2526qk_biz%253Dcloud_disk%2526qk_module%253D%25252Fclouddrive%25252Fmain%2526qk_params%253D%25257B%252522statParams%252522%25253A%25257B%252522entry%252522%25253A%252522share%252522%25252C%252522platform%252522%25253A%252522safari%252522%25252C%252522share_dn%252522%25253A%25252235f3fbc1-d347-4e22-9428-179b42accf93%252522%25252C%252522h5Ver%252522%25253A%2525220.1.55%252522%25257D%25252C%252522flutter_view_mode%252522%25253A%25257B%252522immerse%252522%25253Atrue%25257D%25252C%252522params%252522%25253A%25257B%252522action%252522%25253A%252522share%252522%25252C%252522query%252522%25253A%25257B%252522pwd_id%252522%25253A%2525227f2cf8874f59%252522%25252C%252522passcode%252522%25253A%252522%252522%25252C%252522user_token%252522%25253A%252522%252522%25257D%25257D%25257D' +
  '&amp;downLink=https%3A%2F%2Funet.ucweb.com%2Fquarkbrowser%2Fulcall%3Fst_name%3DJSSDK%26appkey%3D656bdcddd4758b39206a8181c91a7d14%26ch%3Dkk%2540product_wangpan_share7%26bid%3D36729%26pkg%3Dcom.quark.browser%26fr%3Dios%26fromULcall%3D1%26ucLink%3Dqklink%253A%252F%252Fwww.uc.cn%252F656bdcddd4758b39206a8181c91a7d14%253Fsrc_ch%253Dkk%252540product_wangpan_share7%2526action%253Dopen_url%2526url%253Dhttps%25253A%25252F%25252Fwww.myquark.cn%25252F%25253Fentry%25253Dbuwang_others%252526qk_tech%25253Dflutter%252526qk_biz%25253Dcloud_disk%252526qk_module%25253D%2525252Fclouddrive%2525252Fmain%252526qk_params%25253D%2525257B%25252522statParams%25252522%2525253A%2525257B%25252522entry%25252522%2525253A%25252522share%25252522%2525252C%25252522platform%25252522%2525253A%25252522safari%25252522%2525252C%25252522share_dn%25252522%2525253A%2525252235f3fbc1-d347-4e22-9428-179b42accf93%25252522%2525252C%25252522h5Ver%25252522%2525253A%252525220.1.55%25252522%2525257D%2525252C%25252522flutter_view_mode%25252522%2525253A%2525257B%25252522immerse%25252522%2525253Atrue%2525257D%2525252C%25252522params%25252522%2525253A%2525257B%25252522action%25252522%2525253A%25252522share%25252522%2525252C%25252522query%25252522%2525253A%2525257B%25252522pwd_id%25252522%2525253A%252525227f2cf8874f59%25252522%2525252C%25252522passcode%25252522%2525253A%25252522%25252522%2525252C%252522user_token%25252522%2525253A%25252522%25252522%2525257D%2525257D%2525257D%26downLink%3Dhttps%253A%252F%252Fdownload.quark.cn%252Fdownload%252Fquark%253Fch%253Dkk%2540product_wangpan_share7';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    // 只处理 /s/{shareId}
    const m = url.pathname.match(/^\/s\/([A-Za-z0-9_-]+)\/?$/);
    if (!m) {
      return new Response('Not Found', { status: 404 });
    }

    const shareId = m[1];
    const target = `${QUARK_HOST}/s/${shareId}`;   // 兜底：复制 / 桌面打开用
    const ua = (request.headers.get('user-agent') || '').toLowerCase();

    const isMobile = /android|iphone|ipad|ipod|mobile|micromessenger|qq\//.test(ua);
    const isWeChat = /micromessenger/.test(ua);

    // ── 非移动端 / 爬虫 → 直接 302（与实测 zhoulanshare 行为一致）──
    if (!isMobile) {
      return Response.redirect(target, 302);
    }

    // ── 移动端（含微信 / QQ / X）→ 返回引导页 ──
    const ulCall = UL_CALL_TPL.split('7f2cf8874f59').join(shareId);
    return new Response(renderGuide(target, ulCall, isWeChat), {
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
 * 渲染引导页。结构对齐 pan.quarkt.xyz（蓝色按钮走 ULCall 唤起 App）。
 */
function renderGuide(target, ulCall, isWeChat) {
  const wechatTip = isWeChat
    ? '<p class="foot" style="color:#e8890c">检测到你在微信内打开，请点右上角「···」选择「在浏览器打开」后再点蓝色按钮唤起夸克。</p>'
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="referrer" content="no-referrer" />
<title>夸克网盘分享</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#eef4ff;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif}
  .card{width:86%;max-width:360px;background:#fff;border-radius:24px;padding:40px 22px 22px;text-align:center}
  .logo{width:64px;height:64px;margin:0 auto 18px;border-radius:50%;background:#2b6cff;color:#fff;
        font-size:34px;font-weight:700;display:flex;align-items:center;justify-content:center}
  h1{font-size:18px;line-height:1.45;margin:0 0 18px;word-break:break-word}
  .link-wrap{margin:0 auto 12px;width:100%;text-align:center}
  .link-box{background:#f3f6fb;border-radius:18px;padding:14px 16px;color:#9aa3b2;font-size:13px;
            word-break:break-all;line-height:1.55;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .link-prefix{color:#6f7785;font-weight:500;white-space:nowrap}
  .btn{display:block;width:100%;border:0;border-radius:14px;padding:15px 0;font-size:17px;
       margin-bottom:12px;text-decoration:none;cursor:pointer;font-family:inherit}
  .primary{background:#2b6cff;color:#fff;box-shadow:0 6px 16px rgba(43,108,255,.25)}
  .ghost{background:#eef3ff;color:#2b6cff}
  .tip{padding:14px;background:#f4f7fb;color:#8b93a3;font-size:13px;border-radius:14px;text-align:left;line-height:1.6;margin-bottom:14px}
  .foot{margin:16px 0 0;font-size:12.5px;line-height:1.6;color:#a6abb3;text-align:center}
</style>
</head>
<body>
  <div class="card">
    <div class="logo">Q</div>
    <h1 id="shareTitle">夸克网盘分享</h1>
    <a class="btn primary" id="openBtn" href="${ulCall}">打开夸克 App（保存）</a>
    <div class="link-wrap">
      <div class="link-box" id="linkBox"><span class="link-prefix">夸克链接：</span><span id="linkText">${target}</span></div>
    </div>
    <button class="btn ghost" id="copyBtn" type="button">复制夸克链接</button>
    <div class="tip">打开 App 没反应？也可以复制夸克链接，再用 Safari、Chrome 或夸克浏览器打开。</div>
    ${wechatTip}
  </div>
<script>
(function(){
  var official = ${JSON.stringify(target)};
  var copyBtn = document.getElementById('copyBtn');
  var linkBox = document.getElementById('linkBox');
  var copyTimer = null;
  function markCopied(){
    copyBtn.textContent = '已复制，请在浏览器打开';
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(function(){ copyBtn.textContent = '复制夸克链接'; }, 4000);
  }
  function execCopy(text){
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly','');
    ta.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;';
    document.body.appendChild(ta); ta.focus(); ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch(e){}
    document.body.removeChild(ta);
    return ok;
  }
  function copyOfficial(onOk){
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(official).then(onOk).catch(function(){
        if (execCopy(official)) onOk(); else prompt('复制：', official);
      });
    } else if (execCopy(official)){
      onOk();
    } else {
      prompt('复制：', official);
    }
  }
  linkBox.onclick = function(){ copyOfficial(markCopied); };
  copyBtn.onclick = function(){ copyOfficial(markCopied); };

  // 加载即尝试自动唤起（桌面/部分浏览器生效；X/微信内嵌浏览器若拦截自动导航，用户仍可点蓝色按钮）
  setTimeout(function(){
    try { window.location.href = document.getElementById('openBtn').href; } catch(e){}
  }, 800);
})();
</script>
</body>
</html>`;
}
