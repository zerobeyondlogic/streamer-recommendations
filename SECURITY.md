# Security Policy

## 报告安全问题

请不要在公开 Issue 中披露可利用的漏洞、真实凭据、数据库连接串或备份文件。请通过仓库所有者公开的私密联系方式报告，并提供影响范围、复现步骤和建议修复方式。维护者应先撤销泄露凭据，再修复和发布。

## 安全设计

- bcrypt cost 12；不记录密码、Cookie 或 Session Token。
- Session 使用 256-bit 随机 Token，数据库只保存 SHA-256；HttpOnly、SameSite=Lax，生产环境 Secure。
- 用户被封禁后，Session 查询因状态校验立即失效。
- 角色、所有权、匿名序列化、颜色/URL/上传校验都在服务端执行。
- React 默认转义纯文本；项目不使用 `dangerouslySetInnerHTML`。
- 全站发送 CSP、禁止 iframe 嵌入、MIME 嗅探和高风险浏览器能力；自定义背景只接受本站 Vercel Blob 的 HTTPS 地址。
- 分页、搜索长度与重定向目标在服务端收口，避免超大 OFFSET 和站外跳转。
- 完整备份需要神绮爱重验密码，禁止缓存且不包含 Session/部署密钥。

## 运维建议

定期运行 `npm audit` 并审查 migration；为 Neon 与 Vercel 使用独立、最小权限凭据；生产、预览和开发环境分开；敏感备份离线加密。生产环境应在 Vercel Firewall 为登录、注册和高频写操作配置平台级限流，代码内存限流只作为单实例兜底。发现泄露后立即轮换 Neon 密码、Blob Token 和其他部署凭据，并让用户重新登录。
