import type { Metadata } from "next";
import { PublicFeedPage } from "@/components/public-feed-page";

export const metadata: Metadata = { title: "美食家" };
export const dynamic = "force-dynamic";

export default function FoodPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PublicFeedPage kind="food" searchParams={searchParams}/>;
}
