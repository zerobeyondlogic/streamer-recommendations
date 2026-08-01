import { PublicFeedPage } from "@/components/public-feed-page";

export const dynamic = "force-dynamic";

export default function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PublicFeedPage kind="work" searchParams={searchParams}/>;
}
