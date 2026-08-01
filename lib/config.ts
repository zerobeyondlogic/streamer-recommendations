export const categories = ["book", "manga", "movie", "anime", "game", "other", "food", "wish"] as const;
export const submissionKinds = ["work", "food", "wish"] as const;
export const contentStatuses = ["pending", "in_progress", "completed", "dropped"] as const;
export const MAX_PINNED_SUBMISSIONS = 5;
export const SESSION_DAYS = 30;

export type Category = (typeof categories)[number];
export type SubmissionKind = (typeof submissionKinds)[number];
export type ContentStatus = (typeof contentStatuses)[number];

export const categoryLabels: Record<Category, string> = {
  book: "书籍", manga: "漫画", movie: "电影", anime: "动漫", game: "游戏", other: "其他", food: "美食", wish: "愿望",
};

export const primaryCategories = categories.filter((category): category is Exclude<Category, "other" | "food" | "wish"> => !["other", "food", "wish"].includes(category));
export const feedSorts = ["time", "score", "community"] as const;
export type FeedSort = (typeof feedSorts)[number];

export const submissionKindLabels: Record<SubmissionKind, string> = { work: "推荐单", food: "美食家", wish: "许愿箱" };
export function submissionKind(category: Category): SubmissionKind {
  return category === "food" ? "food" : category === "wish" ? "wish" : "work";
}

const labels = {
  reading: { pending: "未读", in_progress: "阅读中", completed: "已读", dropped: "弃读" },
  watching: { pending: "未看", in_progress: "观看中", completed: "已看", dropped: "弃看" },
  playing: { pending: "未玩", in_progress: "游玩中", completed: "已玩", dropped: "弃玩" },
  generic: { pending: "待体验", in_progress: "体验中", completed: "已体验", dropped: "已放弃" },
} satisfies Record<string, Record<ContentStatus, string>>;

export function contentStatusLabel(category: Category, status: ContentStatus) {
  if (category === "wish") return { pending: "未完成", in_progress: "准备中", completed: "已完成", dropped: "不再安排" }[status];
  if (category === "food") return { pending: "想吃", in_progress: "计划中", completed: "吃过", dropped: "暂不考虑" }[status];
  if (category === "book" || category === "manga") return labels.reading[status];
  if (category === "movie" || category === "anime") return labels.watching[status];
  if (category === "game") return labels.playing[status];
  return labels.generic[status];
}
