import { describe,expect,it } from "vitest";
import { contentStatusLabel } from "../lib/config";
import { normalizeTitle,normalizeUsername,publicSubmitter,safeSpreadsheetCell,sha256 } from "../lib/security";
import { colorSchema,marshmallowSchema,submissionSchema,themeSchema } from "../lib/validation";
import { hostRecommendationSchema, registrationSchema } from "../lib/validation";
import { tokenizeBvText } from "../lib/bilibili";

describe("账号与输入安全",()=>{
  it("用户名使用 NFKC 且不区分大小写",()=>expect(normalizeUsername("Ｔｅｓｔ用户")).toBe("test用户"));
  it("作品名规范化空格",()=>expect(normalizeTitle("  星   海  ")).toBe("星 海"));
  it("只允许 http/https 投稿链接",()=>{expect(submissionSchema.safeParse({category:"book",title:"书",externalUrl:"javascript:alert(1)",anonymousPublic:false}).success).toBe(false);expect(submissionSchema.safeParse({category:"book",title:"书",externalUrl:"https://example.com",anonymousPublic:false}).success).toBe(true)});
  it("拒绝非法颜色",()=>expect(colorSchema.safeParse("red").success).toBe(false));
  it("拒绝明显越界的主题透明度",()=>expect(themeSchema.safeParse({siteName:"站",siteTagline:"",backgroundType:"built_in",backgroundImageUrl:"",primaryColor:"#7259d9",secondaryColor:"#ff9f76",accentColor:"#f4c95d",backgroundColor:"#fff9f2",cardOpacity:.2,backgroundOverlay:.3}).success).toBe(false));
  it("棉花糖默认私密并拒绝空内容",()=>{expect(marshmallowSchema.parse({content:"  想说的话  "})).toEqual({content:"想说的话",allowPublic:false});expect(marshmallowSchema.safeParse({content:"   "}).success).toBe(false)});
});

describe("匿名、状态和导出规则",()=>{
  it("公开序列化层隐藏匿名身份",()=>expect(publicSubmitter(true,"真实用户名")).toBe("匿名观众"));
  it("非匿名保留展示名",()=>expect(publicSubmitter(false,"小星星")).toBe("小星星"));
  it.each([["book","pending","未读"],["manga","completed","已读"],["movie","pending","未看"],["anime","in_progress","观看中"],["game","completed","已玩"],["other","dropped","已放弃"]] as const)("%s/%s 显示 %s",(category,status,label)=>expect(contentStatusLabel(category,status)).toBe(label));
  it("阻止 Excel 公式注入",()=>{expect(safeSpreadsheetCell("=1+1")).toBe("'=1+1");expect(safeSpreadsheetCell("普通文本")).toBe("普通文本")});
  it("SHA-256 输出稳定",()=>expect(sha256("token")).toMatch(/^[a-f0-9]{64}$/));
});

describe("评分、B站绑定与 BV 链接",()=>{
  it("注册必须提供数字 UID",()=>{expect(registrationSchema.safeParse({username:"观众",password:"12345678",bilibiliUid:"123456"}).success).toBe(true);expect(registrationSchema.safeParse({username:"观众",password:"12345678",bilibiliUid:"BV123"}).success).toBe(false)});
  it("未完成作品不能评分",()=>expect(hostRecommendationSchema.safeParse({category:"game",title:"作品",description:"",externalUrl:"",contentStatus:"pending",score:"9",experience:"",pin:false,pinNote:""}).success).toBe(false));
  it("把独立 BV 号转换为官方视频地址",()=>{const tokens=tokenizeBvText("看看 BV16v3t6GEpY 很有趣");expect(tokens).toContainEqual({type:"bv",value:"BV16v3t6GEpY",href:"https://www.bilibili.com/video/BV16v3t6GEpY/"})});
  it("不会截取更长字符串中的伪 BV 号",()=>expect(tokenizeBvText("ABV16v3t6GEpY9")).toEqual([{type:"text",value:"ABV16v3t6GEpY9"}]));
});
