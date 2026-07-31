import { getCurrentUser } from "@/lib/auth";
import { createXlsxExport } from "@/lib/export";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){const user=await getCurrentUser();if(user?.role!=="host")return Response.json({error:{code:"FORBIDDEN",message:"无权导出"}},{status:403});const file=await createXlsxExport();return new Response(new Uint8Array(file.bytes),{headers:{"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="${file.filename}"`,"Cache-Control":"private, no-store"}});}
