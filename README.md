# 主播作品推荐投稿站

一个面向个人主播与观众的非商业粉丝网站。观众可以推荐书籍、漫画、电影、番剧、游戏等作品；主播在收件箱处理投稿、记录体验状态、发布感想并置顶推荐。公开内容形成一条温暖、轻松的时间流。

## 功能

- 用户名/密码注册登录，服务端 Session，主播与普通用户权限隔离
- 普通或匿名投稿；匿名身份在服务端公开序列化层隐藏
- 主播首次打开投稿时，在同一事务中标记已查看并首次公开
- 分类与作品状态筛选、搜索、分页、置顶排序、软删除与恢复
- 主播感想、回推首页和站内通知；普通编辑不会重复通知
- CSS Variables 主题系统、实时预览、可选 Vercel Blob 背景上传
- 主播专属 XLSX 导出、密码复验后的完整迁移 ZIP
- 备份校验、dry-run 和交互式恢复脚本
- Vitest 单元测试、Playwright 端到端测试、ESLint、严格 TypeScript

## 技术架构

- Next.js App Router、React、TypeScript strict、Tailwind CSS 4
- Node.js Runtime，服务端组件、Server Actions 与 Route Handlers
- Neon PostgreSQL、Drizzle ORM 和版本化 migrations
- bcryptjs 密码哈希；随机 Session Token，数据库只保存 SHA-256 哈希
- write-excel-file、JSZip、可选 `@vercel/blob`
- Vercel 部署；浏览器只访问同域，数据库连接串永不进入客户端

## 目录结构

```text
app/               页面、Server Actions、Route Handlers
components/        可复用界面组件
db/                Drizzle PostgreSQL schema 与连接
drizzle/           版本化数据库 migrations
lib/               权限、数据服务、校验、安全、导出
scripts/           迁移、种子、主播账号、备份恢复
tests/             Vitest 与 Playwright 测试
```

## 本地启动

要求 Node.js 22.13+、npm 和一个 Neon PostgreSQL 数据库。

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run create-host
npm run dev
```

Windows PowerShell 可用 `Copy-Item .env.example .env.local`。访问 `http://localhost:3000`。

脚本默认读取 `.env`；如果只创建了 `.env.local`，运行脚本前可把同样的 `DATABASE_URL` 保存到本机 `.env`。这两个文件都已被 Git 忽略。

## Neon 创建与连接

1. 在 Neon Console 新建项目，选择与 Vercel Functions 尽量接近的亚洲区域；免费套餐不依赖多区域。
2. 在 Connection Details 复制 **pooled connection string**，保留 `sslmode=require`。
3. 本地写入 `.env`/`.env.local` 的 `DATABASE_URL`；在 Vercel Project Settings → Environment Variables 添加同名变量。
4. 执行 `npm run db:migrate`。修改 `db/schema.ts` 后先执行 `npm run db:generate`，检查新 SQL，再迁移。

不要把连接串放入 `NEXT_PUBLIC_*` 变量、前端代码、日志或 Git。

## 主播账号与示例数据

```bash
npm run create-host
npm run db:seed   # 可选，只建议用于本地
```

`create-host` 交互输入密码，不接受命令行密码参数，也不会把密码写入文件。种子脚本中的演示密码不得用于生产环境。

## 测试和构建

```bash
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Playwright 的未登录公开页面测试无需数据库；完整账号/事务测试应在独立 Neon 测试分支或专用测试项目中运行，绝不要把测试指向生产数据库。

## Vercel 部署与 GitHub 自动部署

1. 将仓库推送到 GitHub。
2. 在 Vercel 点击 **Add New → Project**，导入该仓库；Framework Preset 使用 Next.js。
3. 添加 `DATABASE_URL`，可选添加 `BLOB_READ_WRITE_TOKEN`；Production、Preview、Development 按需要分开配置。
4. 首次部署前，对生产数据库执行 `npm run db:migrate` 并创建主播账号。
5. 部署后每次推送 `main` 自动发布生产版本，其他分支/PR 产生 Preview。

建议让 Neon 与 Vercel 选择相近区域。不要在构建命令中自动执行不可逆 migration；先审查 migration，再由维护者执行。

### 自定义域名

在 Vercel Project → Settings → Domains 添加域名，按提示配置 DNS。中国大陆访问建议使用自己的简短域名，但 Vercel 在中国大陆不承诺稳定性；本项目不依赖 Google Fonts、reCAPTCHA、Turnstile 或外部图片 CDN。

## Vercel Blob（可选）

在 Vercel Storage 创建 Blob store，并把自动生成的 `BLOB_READ_WRITE_TOKEN` 连接到项目。未配置时，主题页会明确提示，内置背景和所有其他功能仍正常。

主播上传仅允许 PNG/JPEG/WebP、最大 5 MB；服务端同时检查 MIME 与文件签名，随机命名，不允许 SVG。数据库成功更新后才替换旧背景。

## 主题、表格与备份

- `/host/theme` 修改站名、文案、配色、透明度、遮罩和背景；服务端验证颜色与可读性。
- `/host/backup` 下载 XLSX。文本会防止 Excel 公式注入，不包含密码、Session 或密钥。
- 完整 ZIP 包含密码哈希，导出前必须重验主播密码，响应使用 `no-store`，不会在 Vercel 长期保存。

```bash
npm run backup:validate -- ./streamer-recommendations-backup-2026-01-01.zip
npm run backup:restore -- ./streamer-recommendations-backup-2026-01-01.zip --dry-run
npm run backup:restore -- ./streamer-recommendations-backup-2026-01-01.zip
```

恢复脚本校验 SHA-256、schema 版本和目标数据库，显示数量并要求输入 `RESTORE`；按外键顺序导入且不恢复旧 Session。恢复前先做目标数据库快照或使用 Neon 分支验证。

## 环境变量

| 变量 | 必需 | 作用 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | Neon pooled PostgreSQL 连接串，仅服务端使用 |
| `BLOB_READ_WRITE_TOKEN` | 否 | 主播自定义背景上传 |

`.env.example` 只有安全占位值。任何变量都不要使用 `NEXT_PUBLIC_` 前缀。

## 免费套餐与大陆访问注意

- Neon Free 可能休眠，首次数据库请求会有冷启动；注意存储、计算时间和分支额度。
- Vercel Hobby 有函数时长、带宽、构建和 Blob 限额；大型导出可能受内存/响应时长限制。
- 公开列表短缓存，登录态与主播页面动态且不公共缓存；尽量减少客户端 JavaScript。
- 系统字体、CSS 装饰和内置视觉均随站点部署；数据库只由同域服务端访问。
- Vercel 在中国大陆不保证连通性。若未来迁移平台，请先确认 Next.js Node Runtime、PostgreSQL 和对象存储兼容性。

## 常见问题

- `DATABASE_URL_MISSING`：复制 `.env.example` 为 `.env.local`，填写 Neon pooled URL；脚本还需 `.env`。
- migration 连接超时：确认 Neon 项目未暂停、连接串为当前分支、IP/代理可访问并含 SSL 参数。
- 登录后立刻退出：检查生产站点使用 HTTPS、数据库时钟正确、用户未被封禁。
- 背景上传不可用：配置 Blob token；不影响内置背景。
- Playwright 缺浏览器：运行 `npx playwright install chromium`。
- Vercel 构建成功但运行报错：检查 Production 环境变量而非只配置 Preview。

## 数据库演进建议

先修改 schema，生成 migration 并审查 SQL；在 Neon 分支或测试项目演练备份、迁移、回滚，再应用生产。结构变更前导出完整迁移备份。不可逆列删除建议分两次发布：先停止读写，后续版本再删除。

## License

MIT。安全问题请阅读 [SECURITY.md](./SECURITY.md)。
