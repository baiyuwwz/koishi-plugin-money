var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var name = "money";
var Config = import_koishi.Schema.object({});
var inject = ["database"];
function apply(ctx) {
  ctx.model.extend("money", {
    userId: "string",
    channelId: "string",
    currencyName: "string",
    amount: "integer"
  }, {
    primary: ["userId", "channelId", "currencyName"]
  });
  ctx.money = {
    add: /* @__PURE__ */ __name(async (userId, channelId, currencyName, amount) => {
      try {
        let [moneyRecord] = await ctx.database.get("money", { userId, channelId, currencyName });
        if (!moneyRecord) {
          await ctx.database.create("money", { userId, channelId, currencyName, amount });
        } else {
          await ctx.database.set("money", { userId, channelId, currencyName }, {
            amount: moneyRecord.amount + amount
          });
        }
        return true;
      } catch (error) {
        ctx.logger.error("增加货币时出错:", error);
        return false;
      }
    }, "add"),
    reduce: /* @__PURE__ */ __name(async (userId, channelId, currencyName, amount) => {
      try {
        let [moneyRecord] = await ctx.database.get("money", { userId, channelId, currencyName });
        if (!moneyRecord) {
          return false;
        }
        const newAmount = moneyRecord.amount - amount;
        if (newAmount < 0) {
          return moneyRecord.amount;
        }
        await ctx.database.set("money", { userId, channelId, currencyName }, {
          amount: newAmount
        });
        return newAmount;
      } catch (error) {
        ctx.logger.error("减少货币时出错:", error);
        return false;
      }
    }, "reduce"),
    get: /* @__PURE__ */ __name(async (userId, channelId, currencyName) => {
      try {
        const [moneyRecord] = await ctx.database.get("money", { userId, channelId, currencyName });
        return moneyRecord ? moneyRecord.amount : void 0;
      } catch (error) {
        ctx.logger.error("查询货币时出错:", error);
        return void 0;
      }
    }, "get")
  };
  ctx.command("money", "查询货币").action(async ({ session }) => {
    if (!session) return "无法获取会话信息";
    const moneyRecords = await ctx.database.get("money", {
      userId: session.userId,
      channelId: session.channelId
    });
    if (moneyRecords.length === 0) {
      return "您在此群聊中还没有任何货币记录";
    }
    let result = "您的货币信息：\n";
    for (const record of moneyRecords) {
      result += `${record.currencyName}: ${record.amount}
`;
    }
    return result.trim();
  });
  ctx.command("money.add <currency> <amount:number>", "增加货币").option("target", "-t [target]", { authority: 2 }).action(async ({ session, options }, currency, amount) => {
    if (!session) return "无法获取会话信息";
    if (!currency || amount === void 0) return "请输入货币名称和数量";
    try {
      const targetUserId = options.target ? options.target : session.userId;
      const success = await ctx.money.add(targetUserId, session.channelId, currency, amount);
      if (success) {
        return `成功为用户${options.target ? targetUserId : "您"}增加${amount}${currency}`;
      } else {
        return "操作失败，请稍后重试";
      }
    } catch (error) {
      ctx.logger.error("增加货币时出错:", error);
      return "操作失败，请稍后重试";
    }
  });
  ctx.command("money.reduce <currency> <amount:number>", "减少货币").option("target", "-t [target]", { authority: 2 }).action(async ({ session, options }, currency, amount) => {
    if (!session) return "无法获取会话信息";
    if (!currency || amount === void 0) return "请输入货币名称和数量";
    try {
      const targetUserId = options.target ? options.target : session.userId;
      const result = await ctx.money.reduce(targetUserId, session.channelId, currency, amount);
      if (result === false) {
        return `用户没有${currency}货币记录`;
      } else if (typeof result === "number" && result < amount) {
        return `用户${currency}货币不足`;
      } else if (typeof result === "number") {
        return `成功为用户${options.target ? targetUserId : "您"}减少${amount}${currency}，当前余额：${result}`;
      } else {
        return "操作失败，请稍后重试";
      }
    } catch (error) {
      ctx.logger.error("减少货币时出错:", error);
      return "操作失败，请稍后重试";
    }
  });
  ctx.command("money.reset", "重置货币数据表").option("confirm", "-c").action(async ({ session, options }) => {
    if (!session) return "无法获取会话信息";
    if (session.user?.["authority"] !== 2) {
      return "权限不足，只有管理员可以重置数据表";
    }
    if (!options.confirm) {
      return "此操作将删除所有货币数据且不可恢复，如确定执行请添加 -c 参数";
    }
    await ctx.database.remove("money", {});
    return "货币数据表已重置，所有数据已被清除";
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
