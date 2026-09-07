import { MessageSquareReply } from "lucide-react";
import { BvText } from "@/components/bv-text";
import { formatDate } from "@/lib/view";

export function MarshmallowReply({ content, updatedAt }: { content: string | null; updatedAt?: Date | null }) {
  if (!content) return null;

  return <section className="marshmallow-host-reply" aria-label="主播回复">
    <div className="marshmallow-host-reply-meta"><strong><MessageSquareReply aria-hidden="true"/>主播回复</strong>{updatedAt ? <time>{formatDate(updatedAt)}</time> : null}</div>
    <BvText className="marshmallow-host-reply-copy">{content}</BvText>
  </section>;
}
