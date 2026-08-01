import { getPublicFeed } from "@/lib/data";
import { categories, contentStatuses, feedSorts, submissionKinds, type Category, type ContentStatus, type FeedSort, type SubmissionKind } from "@/lib/config";
import { safePageNumber } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawCategory = url.searchParams.get("category");
  const rawStatus = url.searchParams.get("status");
  const rawSort = url.searchParams.get("sort");
  const rawKind = url.searchParams.get("kind");
  const feed = await getPublicFeed({
    category: categories.includes(rawCategory as Category) ? rawCategory as Category : undefined,
    status: contentStatuses.includes(rawStatus as ContentStatus) ? rawStatus as ContentStatus : undefined,
    sort: feedSorts.includes(rawSort as FeedSort) ? rawSort as FeedSort : "time",
    kind: submissionKinds.includes(rawKind as SubmissionKind) ? rawKind as SubmissionKind : undefined,
    q: url.searchParams.get("q")?.slice(0, 100),
    hostRecommended: url.searchParams.get("hostRecommended") === "1",
    page: safePageNumber(url.searchParams.get("page")),
  });
  return Response.json({ data: feed, error: null }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
