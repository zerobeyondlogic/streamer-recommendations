import { getPublicFeed } from "@/lib/data";
export const dynamic="force-dynamic";
export async function GET(request:Request){const u=new URL(request.url);const feed=await getPublicFeed({category:u.searchParams.get("category")??undefined,status:u.searchParams.get("status")??undefined,q:u.searchParams.get("q")??undefined,page:Number(u.searchParams.get("page"))||1});return Response.json({data:feed,error:null},{headers:{"Cache-Control":"public, s-maxage=30, stale-while-revalidate=60"}});}
