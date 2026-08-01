import { DatabaseBackup, FileSpreadsheet, ShieldAlert } from "lucide-react";

export default function BackupPage(){return <>
  <header className="host-heading"><div><span className="eyebrow">Data vault</span><h1>数据导出与迁移</h1><p>表格用于整理，完整备份用于迁移与恢复。</p></div></header>
  <div className="backup-grid">
    <section className="panel stack backup-card"><FileSpreadsheet className="backup-icon" aria-hidden="true"/><h2>导出内容表格</h2><p>生成 XLSX，包含投稿、用户、通知和主题设置，不含密码、Session 或密钥。</p><a className="button primary" href="/api/export/xlsx">下载 XLSX</a></section>
    <section className="panel stack backup-card sensitive"><DatabaseBackup className="backup-icon" aria-hidden="true"/><h2>完整迁移备份</h2><p>ZIP 保留原始 ID、删除记录、活动日志和密码哈希，不含 Session 或部署密钥。</p><div className="notice notice-error"><ShieldAlert aria-hidden="true"/><span>包含敏感数据，请离线加密保管。</span></div><form className="stack" action="/api/export/backup" method="post"><label>重新验证神绮爱密码<input name="password" type="password" autoComplete="current-password" required minLength={8}/></label><button className="button secondary" type="submit">验证并下载 ZIP</button></form></section>
  </div>
  <section className="panel backup-help"><h2>恢复前先校验</h2><code>npm run backup:validate -- path/to/backup.zip</code><code>npm run backup:restore -- path/to/backup.zip --dry-run</code><code>npm run backup:restore -- path/to/backup.zip</code><p>恢复脚本会校验文件、检查版本并展示数量；实际写入前还会再次确认。</p></section>
</>}
