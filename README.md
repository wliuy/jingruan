# 🚀 jingruan 导航

> 一个极致简洁、响应式适配、支持云端同步的个人导航站。

## ✨ 核心特性

* **🖥️ PC 端深度优化** - 卡片高度固定 90px，支持 11px 字号的 3 行站点介绍，图标自适应高度并垂直居中。
* **📱 手机端精致布局** - 采用 1 行 2 列紧凑布局，卡片高度 60px，极致利用屏幕空间。
* **🛠️ 全功能管理后台** - 支持分类排序、站点增删改、系统标题及搜索引擎设置。
* **📱 后台移动端适配** - 管理菜单在手机端自动转为横向滑动 Tab，单手操作更顺滑。
* **🔐 访问保护** - 内置访问密钥验证（`VITE_OPEN_LOCK`），保护个人收藏的私密性。
* **☁️ 云端存储** - 数据保存在 Cloudflare KV，后台修改实时写入，前台即时读取，无需重新部署。
* **🚀 一键推送脚本** - 内置 `push.js`，本地代码改动后仅需一行命令即可同步到 GitHub。

## 🛠️ 技术栈

* **框架**: Vue 3 (Composition API)
* **状态管理**: Pinia
* **路由**: Vue Router
* **构建工具**: Vite
* **部署推荐**: Cloudflare Workers + Pages（数据存储于 KV）

---

## 🚀 快速开始

### 1. 环境配置
在项目根目录创建 `.env` 文件（注意：此文件包含敏感信息，默认已被 `.gitignore` 忽略，请勿推送到公开仓库）：

```env
# 管理员登录后台的密钥（注意：必须与 Worker 的 ADMIN_PASSWORD 一致，后台保存数据时用它鉴权）
VITE_ADMIN_PASSWORD=你的后台登录密码

# 访问锁定（留空则不启用，若填入内容，则首页访问前需验证此密码）
VITE_OPEN_LOCK=
```

### 2. 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（本地无 /api 接口时自动回退到 src/mock/mock_data.js 的本地数据）
npm run dev
```

### 3. 部署到 Cloudflare（KV 存储）

```bash
# 安装依赖
npm install

# 生成前端产物
npm run build

# 部署 Worker 与静态资源（wrangler.jsonc 已绑定 KV namespace SITE_DATA）
npx wrangler deploy
```

首次部署建议按以下步骤初始化数据：

```bash
# 1. 创建 KV namespace（若 wrangler.jsonc 中的 id 尚未填写）
npx wrangler kv namespace create SITE_DATA

# 2. 设置写入密钥（必须与 VITE_ADMIN_PASSWORD 一致）
npx wrangler secret put ADMIN_PASSWORD

# 3. 用 src/mock/mock_data.js 当前内容初始化站点数据
#    将 mock_data.js 中的 JSON 导出为 seed.json 后执行：
npx wrangler kv key put site-data --binding SITE_DATA --path=seed.json --remote
```

### 4. 代码同步（可选）

```bash
node push.js
```
此脚本会自动执行 `git init`（若无）、`add`、`commit` 及 `force push`，仅用于同步**代码**（数据已存储在 KV，不在仓库中）。

---

## 📂 项目结构

```text
jingruan/
├── src/
│   ├── apis/            # 核心接口层
│   │   ├── useSiteDataAPI.js  # KV 数据读写 (loadSiteData / saveSiteData / uploadLogo)
│   │   ├── useNavigation.js   # 前台数据驱动 (负责首页数据加载)
│   │   └── fetchSiteMetadata.js # 站点元数据抓取
│   ├── components/      # 后台功能组件
│   │   └── admin/
│   │       ├── CategoryManager.vue # 分类管理 (Emoji选择、排序)
│   │       ├── SiteManager.vue     # 站点管理 (元数据抓取、增删改)
│   │       └── SystemSettings.vue   # 系统设置 (标题、Logo、搜索)
│   ├── mock/
│   │   └── mock_data.js       # 初始种子数据 (首次灌入 KV，仅作本地开发回退)
│   ├── stores/
│   │   └── counter.js         # 全局状态 (主题色、网站标题同步)
│   ├── views/           # 页面视图层
│   │   ├── NavHomeView.vue    # 前台首页 (用户看到的导航网格)
│   │   └── AdminView.vue      # 后台主框架 (管理员登录与Tab调度)
│   └── App.vue          # 根组件 (全站入口)
├── worker/
│   └── index.js         # Cloudflare Worker 路由 (site-data/logo/metadata/health)
├── lib/
│   ├── siteData.js      # Worker 侧 KV 读写逻辑 (含密码鉴权)
│   └── siteMetadata.js  # Worker 侧元数据抓取逻辑
├── public/              # 静态资源
├── push.js              # 运维工具 (本地代码推送到 GitHub)
└── .env                 # 核心配置 (VITE_ADMIN_PASSWORD、VITE_OPEN_LOCK)
```

## 🎯 UI 规范说明

为了保持全站视觉的一致性，项目遵循以下设计规范：

* **PC 站点卡片**：高度 90px，内边距 8px 14px，文字垂直居中。
* **手机站点卡片**：高度 60px，双列排列，描述文字强制显示 1 行。
* **站点图标**：强制 1:1 正方形，高度 100% 自适应卡片高度。
* **熔断机制**：若图标加载失败，系统将自动回退显示 `/logo.png` 或占位背景，防止页面闪烁。

## 🤝 维护建议

* **在线维护**：登录 `/admin` 页面，完成修改后点击“保存”，数据实时写入 Cloudflare KV（约 60 秒内全球同步）。
* **离线维护**：本地直接编辑 `src/mock/mock_data.js` 后用上述 `wrangler kv key put` 命令灌入 KV。

> ⭐ 如果这个导航站对你有帮助，欢迎在使用过程中记录你的优化想法！