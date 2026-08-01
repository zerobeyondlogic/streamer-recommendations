import { describe,expect,it } from "vitest";
import { canAuthorEditMarshmallow,firstOpenPatch,marshmallowReadPatch,pinSortKey,replyEffects,shouldNotifySubmissionAuthor } from "../lib/transitions";

describe("投稿与时间流事务规则",()=>{
  const now=new Date("2026-01-02T03:04:05.000Z");
  it("首次打开同时写入查看、公开和首页活跃时间",()=>expect(firstOpenPatch(null,now)).toMatchObject({hostReadAt:now,publishedAt:now,feedActivityAt:now}));
  it("重复打开不覆盖首次时间",()=>expect(firstOpenPatch(new Date("2025-01-01T00:00:00Z"),now)).toBeNull());
  it("首次感想刷新时间流且只创建首次回复通知",()=>expect(replyEffects(false,false,false,now)).toEqual({feedActivityAt:now,notificationType:"host_reply"}));
  it("普通编辑感想既不刷新也不通知",()=>expect(replyEffects(true,false,true,now)).toEqual({feedActivityAt:null,notificationType:null}));
  it("重新推首页可选再次通知",()=>expect(replyEffects(true,true,true,now)).toEqual({feedActivityAt:now,notificationType:"host_reply_updated"}));
  it("只通知其他观众投稿的作者",()=>{expect(shouldNotifySubmissionAuthor("user","viewer","host")).toBe(true);expect(shouldNotifySubmissionAuthor("user","host","host")).toBe(false);expect(shouldNotifySubmissionAuthor("host","host","host")).toBe(false)});
  it("置顶排序键优先于普通活跃时间",()=>expect(pinSortKey(now,new Date("2020-01-01"))[0]).toBeGreaterThan(pinSortKey(null,new Date("2030-01-01"))[0]));
  it("允许公开的棉花糖只在已读时写入公开时间",()=>expect(marshmallowReadPatch(true,now)).toMatchObject({readAt:now,publishedAt:now}));
  it("私密棉花糖已读后仍不公开",()=>expect(marshmallowReadPatch(false,now)).toMatchObject({readAt:now,publishedAt:null}));
  it("棉花糖只有未读且未移除时可由投稿者修改",()=>{expect(canAuthorEditMarshmallow(null,null)).toBe(true);expect(canAuthorEditMarshmallow(now,null)).toBe(false);expect(canAuthorEditMarshmallow(null,now)).toBe(false)});
});
