import { getPublicFeed } from "@/lib/data";
import type { FeedSort } from "@/lib/config";
export const dynamic="force-dynamic";
export async function GET(request:Request){const u=new URL(request.url);const feed=await getPublicFeed({category:u.searchParams.get("category")??undefined,status:u.searchParams.get("status")??undefined,q:u.searchParams.get("q")??undefined,sort:(u.searchParams.get("sort")??"time") as FeedSort,hostRecommended:u.searchParams.get("hostRecommended")==="1",page:Number(u.searchParams.get("page"))||1});return Response.json({data:feed,error:null},{headers:{"Cache-Control":"public, s-maxage=30, stale-while-revalidate=60"}});}
