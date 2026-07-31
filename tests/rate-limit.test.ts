import { beforeEach,describe,expect,it } from "vitest";
import { clearRateLimitsForTests,consumeRateLimit } from "../lib/rate-limit";
describe("轻量频率限制",()=>{beforeEach(clearRateLimitsForTests);it("超过窗口限额后拒绝",()=>{expect(consumeRateLimit("login:ip",2,10000).ok).toBe(true);expect(consumeRateLimit("login:ip",2,10000).ok).toBe(true);expect(consumeRateLimit("login:ip",2,10000).ok).toBe(false)})});
