import { describe, expect, it } from "vitest";
import i18n, { resolveConsoleLang } from "./i18n";

const SIMPLIFIED_ONLY = /[国这设设备录连线码号组状删认软网务载显据关闭请输选页签证邮员册质标视复盘夹内]/;

describe("console language detection", () => {
  it("honors a stored choice before the browser locale", () => {
    expect(resolveConsoleLang("zh-HK", ["zh-CN"])).toBe("zh-HK");
    expect(resolveConsoleLang("en", ["zh-HK"])).toBe("en");
    expect(resolveConsoleLang("zh-TW", ["en"])).toBe("zh-TW");
  });

  it("maps traditional and simplified Chinese separately", () => {
    expect(resolveConsoleLang(null, ["zh-HK"])).toBe("zh-HK");
    expect(resolveConsoleLang(null, ["zh-TW"])).toBe("zh-HK");
    expect(resolveConsoleLang(null, ["zh-Hant"])).toBe("zh-HK");
    expect(resolveConsoleLang(null, ["zh-Hant-HK"])).toBe("zh-HK");
    expect(resolveConsoleLang(null, ["zh_HK"])).toBe("zh-HK");
    expect(resolveConsoleLang(null, ["zh-MO"])).toBe("zh-HK");
    expect(resolveConsoleLang(null, ["zh-CN", "en"])).toBe("zh-CN");
    expect(resolveConsoleLang(null, ["zh-Hans"])).toBe("zh-CN");
    expect(resolveConsoleLang(null, ["zh-Hans-CN"])).toBe("zh-CN");
    expect(resolveConsoleLang(null, ["zh-SG"])).toBe("zh-CN");
    expect(resolveConsoleLang(null, ["zh"])).toBe("en");
    expect(resolveConsoleLang(null, ["en-HK"])).toBe("en");
    expect(resolveConsoleLang(null, ["fr"])).toBe("en");
  });
});

describe("zh-HK catalog", () => {
  it("covers every English and Simplified Chinese key", () => {
    const en = i18n.getResourceBundle("en", "translation") as Record<string, string>;
    const cn = i18n.getResourceBundle("zh-CN", "translation") as Record<string, string>;
    const hk = i18n.getResourceBundle("zh-HK", "translation") as Record<string, string>;
    expect(Object.keys(hk).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(cn).sort()).toEqual(Object.keys(en).sort());
    expect(hk.login).toBe("登入");
    expect(hk.logout).toBe("登出");
    expect(hk.users).toBe("用戶");
    expect(hk.devices).toBe("裝置");
    expect(hk.groups).toBe("群組");
    expect(hk.myAddressBook).toBe("我的通訊錄");
    expect(hk.save).toBe("儲存");
    expect(hk.systemSettings).toBe("系統設定");
    expect(cn.login).toBe("登录");
    expect(cn.logout).toBe("退出登录");
    for (const [key, value] of Object.entries(hk)) {
      expect(value, key).not.toMatch(SIMPLIFIED_ONLY);
    }
  });
});
