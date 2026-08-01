import { Pencil } from "lucide-react";
import { updateOwnSubmissionAction } from "@/app/actions";
import { StyledSelect } from "@/components/styled-select";
import { categories, categoryLabels, submissionKind, type Category } from "@/lib/config";

type EditableSubmission = {
  id: string;
  category: Category;
  title: string;
  description: string | null;
  externalUrl: string | null;
  anonymousPublic: boolean;
  source: "user" | "host";
};

export function SubmissionContentEditor({ item, returnTo, open = false }: { item: EditableSubmission; returnTo: string; open?: boolean }) {
  const kind = submissionKind(item.category);
  const workCategories = categories.filter((category) => category !== "food" && category !== "wish");
  const titleLabel = kind === "food" ? "店铺 / 菜品名称" : kind === "wish" ? "愿望 / 计划标题" : "作品名称";
  const descriptionLabel = kind === "wish" ? "愿望 / 计划说明" : "推荐理由";
  return <details className="authored-content-editor" open={open}>
    <summary><Pencil aria-hidden="true"/>编辑内容</summary>
    <form className="stack" action={updateOwnSubmissionAction}>
      <input name="submissionId" type="hidden" value={item.id}/>
      <input name="returnTo" type="hidden" value={returnTo}/>
      {kind === "work" ? (
        <StyledSelect
          name="category"
          label="作品分类"
          defaultValue={item.category}
          options={workCategories.map((category) => ({ value: category, label: categoryLabels[category] }))}
        />
      ) : (
        <input name="category" type="hidden" value={item.category}/>
      )}
      <label>{titleLabel}<input name="title" required maxLength={100} defaultValue={item.title}/></label>
      <label>{descriptionLabel}<textarea name="description" maxLength={1000} defaultValue={item.description ?? ""}/><span className="helper">最多 1000 字。</span></label>
      <label>相关链接（选填）<input name="externalUrl" type="url" inputMode="url" placeholder="https://…" defaultValue={item.externalUrl ?? ""}/></label>
      {item.source === "user" ? <label className="checkbox"><input name="anonymousPublic" type="checkbox" defaultChecked={item.anonymousPublic}/><span>公开时隐藏我的用户名</span></label> : null}
      <button className="button primary" type="submit">保存修改</button>
    </form>
  </details>;
}
