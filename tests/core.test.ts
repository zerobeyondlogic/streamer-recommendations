import { describe,expect,it } from "vitest";
import { contentStatusLabel, submissionKind } from "../lib/config";
import { isAllowedBackgroundUrl,isAllowedSiteFontUrl,isAllowedSiteIconUrl,normalizeTitle,normalizeUsername,publicSubmitter,safeLocalPath,safePageNumber,safeSpreadsheetCell,sha256 } from "../lib/security";
import { clearRateLimitsForTests,consumeRateLimit } from "../lib/rate-limit";
import { accountPasswordSchema,accountUsernameSchema,appearanceSchema,colorSchema,hostMusingSchema,marshmallowSchema,quickLikeSchema,siteCopySchema,submissionCommentSchema,submissionReviewSchema,submissionSchema,submissionVoteSchema,themeSchema } from "../lib/validation";
import { hostRecommendationSchema, registrationSchema } from "../lib/validation";
import { themePresetIds,themePresets } from "../lib/themes";
import { tokenizeBvText } from "../lib/bilibili";
import { parseSpoilerText,recommendationScore } from "../lib/spoilers";

describe("账号与输入安全",()=>{
  it("用户名使用 NFKC 且不区分大小写",()=>expect(normalizeUsername("Ｔｅｓｔ用户")).toBe("test用户"));
  it("作品名规范化空格",()=>expect(normalizeTitle("  星   海  ")).toBe("星 海"));
  it("只允许 http/https 投稿链接",()=>{expect(submissionSchema.safeParse({category:"book",title:"书",externalUrl:"javascript:alert(1)",anonymousPublic:false}).success).toBe(false);expect(submissionSchema.safeParse({category:"book",title:"书",externalUrl:"https://example.com",anonymousPublic:false}).success).toBe(true)});
  it("拒绝非法颜色",()=>expect(colorSchema.safeParse("red").success).toBe(false));
  it("拒绝明显越界的层级透明度",()=>expect(appearanceSchema.safeParse({navOpacity:.9,heroOpacity:.9,filterOpacity:.7,cardOpacity:.2,navBlur:false,heroBlur:false,filterBlur:false,cardBlur:false,ambientTextMist:.55}).success).toBe(false));
  it("允许四种层级最低设置为 0.3",()=>expect(appearanceSchema.safeParse({navOpacity:.3,heroOpacity:.3,filterOpacity:.3,cardOpacity:.3,navBlur:true,heroBlur:false,filterBlur:false,cardBlur:true,ambientTextMist:.55}).success).toBe(true));
  it("背景悬浮文字雾气浓度限制在 0 到 1",()=>{expect(appearanceSchema.safeParse({navOpacity:.9,heroOpacity:.9,filterOpacity:.7,cardOpacity:.7,navBlur:false,heroBlur:false,filterBlur:false,cardBlur:false,ambientTextMist:0}).success).toBe(true);expect(appearanceSchema.safeParse({navOpacity:.9,heroOpacity:.9,filterOpacity:.7,cardOpacity:.7,navBlur:false,heroBlur:false,filterBlur:false,cardBlur:false,ambientTextMist:1.01}).success).toBe(false)});
  it("网页主题与层级外观可独立保存",()=>expect(themeSchema.safeParse({backgroundType:"built_in",backgroundImageUrl:"builtin:warm",primaryColor:"#7259d9",secondaryColor:"#ff9f76",accentColor:"#f4c95d",backgroundColor:"#fff9f2",backgroundOverlay:.3}).success).toBe(true));
  it.each(themePresetIds)("内置主题 %s 可被完整保存",(id)=>expect(themeSchema.safeParse({backgroundType:"built_in",...themePresets[id]}).success).toBe(true));
  it("修改用户名必须提供有效用户名与当前密码",()=>{expect(accountUsernameSchema.safeParse({username:"新名字",currentPassword:"current-pass"}).success).toBe(true);expect(accountUsernameSchema.safeParse({username:"a",currentPassword:"current-pass"}).success).toBe(false)});
  it("修改密码拒绝确认不一致和重复使用当前密码",()=>{expect(accountPasswordSchema.safeParse({currentPassword:"current-pass",password:"new-password",confirmPassword:"new-password"}).success).toBe(true);expect(accountPasswordSchema.safeParse({currentPassword:"current-pass",password:"new-password",confirmPassword:"wrong-password"}).success).toBe(false);expect(accountPasswordSchema.safeParse({currentPassword:"current-pass",password:"current-pass",confirmPassword:"current-pass"}).success).toBe(false)});
  it("自定义背景只接受本站 Vercel Blob",()=>{expect(isAllowedBackgroundUrl("https://store.public.blob.vercel-storage.com/background.png")).toBe(true);expect(isAllowedBackgroundUrl("https://example.com/background.png")).toBe(false)});
  it("网页图标只接受本站 Vercel Blob",()=>{expect(isAllowedSiteIconUrl("https://store.public.blob.vercel-storage.com/site-icons/icon.png")).toBe(true);expect(isAllowedSiteIconUrl("data:image/png;base64,unsafe")).toBe(false)});
  it("自定义字体只接受本站字体目录中的 WOFF2",()=>{expect(isAllowedSiteFontUrl("https://store.public.blob.vercel-storage.com/site-fonts/font.woff2")).toBe(true);expect(isAllowedSiteFontUrl("https://store.public.blob.vercel-storage.com/backgrounds/font.woff2")).toBe(false);expect(isAllowedSiteFontUrl("https://store.public.blob.vercel-storage.com/site-fonts/font.ttf")).toBe(false)});
  it("分页参数限制为有限范围",()=>{expect(safePageNumber("2.9")).toBe(2);expect(safePageNumber("Infinity")).toBe(1);expect(safePageNumber("999999")).toBe(500)});
  it("重定向只允许本站路径",()=>{expect(safeLocalPath("/host/library?status=pending")).toBe("/host/library?status=pending");expect(safeLocalPath("//evil.example")).toBe("/");expect(safeLocalPath("https://evil.example")).toBe("/")});
  it("实例限流器会阻止窗口内的超额请求",()=>{clearRateLimitsForTests();expect(consumeRateLimit("login:test",1,60_000).ok).toBe(true);expect(consumeRateLimit("login:test",1,60_000).ok).toBe(false)});
  it("棉花糖默认私密并拒绝空内容",()=>{expect(marshmallowSchema.parse({content:"  想说的话  "})).toEqual({content:"想说的话",allowPublic:false});expect(marshmallowSchema.safeParse({content:"   "}).success).toBe(false)});
  it("碎碎念会清理首尾空格并限制为 2000 字",()=>{expect(hostMusingSchema.parse({content:"  今天很好  "})).toEqual({content:"今天很好"});expect(hostMusingSchema.safeParse({content:"   "}).success).toBe(false);expect(hostMusingSchema.safeParse({content:"念".repeat(2001)}).success).toBe(false)});
  it("美食家和许愿箱沿用安全的统一投稿格式",()=>{expect(submissionSchema.safeParse({category:"food",title:"小馆招牌面",description:"很好吃",externalUrl:"",anonymousPublic:false}).success).toBe(true);expect(submissionSchema.safeParse({category:"wish",title:"许愿台词回读",description:"",externalUrl:"",anonymousPublic:false}).success).toBe(true)});
  it("页面主要文案有长度限制且必填标题不能为空",()=>expect(siteCopySchema.safeParse({siteName:"站点",siteTagline:"说明",recommendationHeroTitle:"",recommendationHeroAccent:"推荐给神绮爱。",recommendationTagline:"副标题",recommendationSectionTitle:"推荐",foodHeroTitle:"必吃",foodTagline:"",foodSectionTitle:"美食",wishHeroTitle:"许愿",wishTagline:"",wishSectionTitle:"愿望",marshmallowHeroTitle:"棉花糖",marshmallowTagline:"",marshmallowSectionTitle:"上墙",musingsHeroTitle:"碎碎念",musingsTagline:"",musingsSectionTitle:"最近在想"}).success).toBe(false));
});

describe("匿名、状态和导出规则",()=>{
  it("公开序列化层隐藏匿名身份",()=>expect(publicSubmitter(true,"真实用户名")).toBe("匿名观众"));
  it("非匿名保留展示名",()=>expect(publicSubmitter(false,"小星星")).toBe("小星星"));
  it.each([["book","pending","未读"],["manga","completed","已读"],["movie","pending","未看"],["anime","in_progress","观看中"],["game","completed","已玩"],["other","dropped","已放弃"]] as const)("%s/%s 显示 %s",(category,status,label)=>expect(contentStatusLabel(category,status)).toBe(label));
  it.each([["food","pending","想吃"],["food","completed","吃过"],["wish","pending","未完成"],["wish","completed","已完成"]] as const)("%s/%s 显示 %s",(category,status,label)=>expect(contentStatusLabel(category,status)).toBe(label));
  it("从扩展分类稳定推导栏目",()=>{expect(submissionKind("book")).toBe("work");expect(submissionKind("food")).toBe("food");expect(submissionKind("wish")).toBe("wish")});
  it("阻止 Excel 公式注入",()=>{expect(safeSpreadsheetCell("=1+1")).toBe("'=1+1");expect(safeSpreadsheetCell("普通文本")).toBe("普通文本")});
  it("SHA-256 输出稳定",()=>expect(sha256("token")).toMatch(/^[a-f0-9]{64}$/));
});

describe("评分、B站绑定与 BV 链接",()=>{
  it("注册必须提供数字 UID",()=>{expect(registrationSchema.safeParse({username:"观众",password:"12345678",bilibiliUid:"123456"}).success).toBe(true);expect(registrationSchema.safeParse({username:"观众",password:"12345678",bilibiliUid:"BV123"}).success).toBe(false)});
  it("主播原创推荐自动走完成流程，因此可以直接评分",()=>expect(hostRecommendationSchema.safeParse({category:"game",title:"作品",description:"",externalUrl:"",score:"9",experience:"",pin:false,pinNote:""}).success).toBe(true));
  it("把独立 BV 号转换为官方视频地址",()=>{const tokens=tokenizeBvText("看看 BV16v3t6GEpY 很有趣");expect(tokens).toContainEqual({type:"bv",value:"BV16v3t6GEpY",href:"https://www.bilibili.com/video/BV16v3t6GEpY/"})});
  it("不会截取更长字符串中的伪 BV 号",()=>expect(tokenizeBvText("ABV16v3t6GEpY9")).toEqual([{type:"text",value:"ABV16v3t6GEpY9"}]));
});

describe("社区评价与剧透",()=>{
  it("净推荐数等于推荐减去不推荐",()=>expect(recommendationScore([true,true,false,true,false])).toBe(1));
  it("推荐投票和文字评论可以独立提交",()=>{const submissionId="00000000-0000-4000-8000-000000000000";expect(submissionVoteSchema.safeParse({submissionId,recommend:"recommend"}).success).toBe(true);expect(submissionVoteSchema.safeParse({submissionId,recommend:"clear"}).success).toBe(true);expect(submissionCommentSchema.safeParse({submissionId,comment:"只写评论也可以"}).success).toBe(true)});
  it("快速点赞只接受五类公开内容对应的三种数据目标",()=>{const targetId="00000000-0000-4000-8000-000000000000";expect(quickLikeSchema.safeParse({targetType:"submission",targetId}).success).toBe(true);expect(quickLikeSchema.safeParse({targetType:"marshmallow",targetId}).success).toBe(true);expect(quickLikeSchema.safeParse({targetType:"musing",targetId}).success).toBe(true);expect(quickLikeSchema.safeParse({targetType:"comment",targetId}).success).toBe(false)});
  it("把成对标记中的文字解析为剧透",()=>expect(parseSpoilerText("开头||结局剧透||结尾")).toEqual([{text:"开头",spoiler:false},{text:"结局剧透",spoiler:true},{text:"结尾",spoiler:false}]));
  it("拒绝没有闭合的剧透标记",()=>expect(submissionReviewSchema.safeParse({submissionId:"00000000-0000-4000-8000-000000000000",recommend:"recommend",comment:"这里有||未闭合剧透"}).success).toBe(false));
});
