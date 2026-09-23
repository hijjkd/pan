# quark-relay

夸克网盘分享「防红中转站」Worker。通过 Cloudflare Workers（GitHub 集成）部署。

- 移动端浏览器（含微信/QQ）→ 返回引导页
- PC 浏览器 / 爬虫 / curl → 302 直跳 pan.quark.cn

## 仓库结构
- `worker.js` — Worker 入口（UA 分流逻辑 + 内联引导页）
- `wrangler.toml` — Worker 部署配置

## 部署
1. Cloudflare 控制台「Workers 和 Pages」→ Connect GitHub → 选本仓库
2. 识别为 Worker 后部署（默认分配到 `*.workers.dev`）
3. 控制台绑定自定义域 `pan.你的域名.com`

> 唤起 App 用的 `quark://` 为占位 Scheme，需按夸克官方核实后替换。
