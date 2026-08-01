import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { MarshmallowStage } from "@/components/marshmallow-stage";
import { Notice } from "@/components/notice";
import { getMarshmallowStage } from "@/lib/data";
import { formatDate } from "@/lib/view";

export const metadata: Metadata = { title: "棉花糖展示台" };

export default async function MarshmallowStagePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const id = z.uuid().safeParse(params.id);
  const stage = await getMarshmallowStage(id.success ? id.data : undefined);
  return <>
    <header className="host-heading compact"><div><span className="eyebrow">Live display</span><h1>棉花糖展示台</h1><p>从最早一条开始，点击“已读”完成处理。</p></div><Link className="button ghost" href="/host/marshmallows">返回管理</Link></header>
    <Notice>{params.error}</Notice><Notice type="success">{params.success}</Notice>
    {stage ? <MarshmallowStage current={{ ...stage.current, createdAt: formatDate(stage.current.createdAt) }} previousId={stage.previousId} nextId={stage.nextId}/> : <div className="empty-state marshmallow-stage-empty"><span>✓</span><h3>暂无待展示棉花糖</h3><Link className="button ghost" href="/host/marshmallows?status=read">查看已读</Link></div>}
  </>;
}
