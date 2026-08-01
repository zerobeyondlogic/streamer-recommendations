import type { Metadata } from "next";
import { PublicFeedPage } from "@/components/public-feed-page";

export const metadata: Metadata = { title: "许愿箱" };
export const dynamic = "force-dynamic";

export default function WishesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PublicFeedPage kind="wish" searchParams={searchParams}/>;
}
