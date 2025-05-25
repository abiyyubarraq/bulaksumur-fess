import { type Bot, InlineKeyboard } from "grammy";
import { viewMyProfileMenu } from "../mainBot/commands/commandMenuContent";
import type { BotContext } from "../utils/types";

export const settingMenuMessage = async (
  ctx: BotContext,
  callBackQuery: string = "back_to_view_my_profile"
) => {
  const keyboard = new InlineKeyboard()
    .text(
      `${ctx.session.isShowAge ? "👁️" : "🔒"} Umur`,
      `change_show_age_to_${!ctx.session.isShowAge}_${callBackQuery}`
    )
    .text(
      `${ctx.session.isShowFaculty ? "👁️" : "🔒"} Fakultas`,
      `change_show_faculty_to_${!ctx.session.isShowFaculty}_${callBackQuery}`
    )
    .row()
    .text(
      `${ctx.session.isShowDiamond ? "👁️" : "🔒"} Diamond`,
      `change_show_diamond_to_${!ctx.session.isShowDiamond}_${callBackQuery}`
    )
    .row()
    .text("« BACK", callBackQuery);

  const settingMessage =
    "<b>Berikut adalah settingan akunmu</b>\n" +
    (ctx.session.isShowDiamond
      ? `\n💎Tampilkan Diamond: ✅`
      : `\n💎Tampilkan Diamond: ❌`) +
    (ctx.session.isShowFaculty
      ? `\n🏫Tampilkan Fakultas: ✅`
      : `\n🏫Tampilkan Fakultas: ❌`) +
    (ctx.session.isShowAge
      ? `\n👤Tampilkan Umur: ✅`
      : `\n👤Tampilkan Umur: ❌`) +
    "\n\n<i>⚙️ Pengaturan di atas berlaku baik untuk menfess, anon reply, dan juga anon message yang akan kamu kirim ✨</i>";

  await ctx.editMessageText(settingMessage, {
    reply_markup: keyboard,
    parse_mode: "HTML",
  });
};

export function initViewMyProfile(bot: Bot<BotContext>): void {
  bot.callbackQuery("back_to_view_my_profile", async (ctx) => {
    await viewMyProfileMenu(ctx);
  });

  bot.callbackQuery(/^change_show_age_to_(true|false)_(.+)$/, async (ctx) => {
    const valueMatch = ctx.callbackQuery.data.match(
      /^change_show_age_to_(true|false)/
    );
    const newValue = valueMatch?.[1] === "true";
    const callbackMatch = ctx.callbackQuery.data.match(
      /^change_show_age_to_(true|false)_(.+)$/
    );
    const callBackQuery = callbackMatch?.[2];
    if (!callBackQuery) return;

    ctx.session.isShowAge = newValue;
    await settingMenuMessage(ctx, callBackQuery);
  });

  bot.callbackQuery(
    /^change_show_faculty_to_(true|false)_(.+)$/,
    async (ctx) => {
      const valueMatch = ctx.callbackQuery.data.match(
        /^change_show_faculty_to_(true|false)/
      );
      const newValue = valueMatch?.[1] === "true";
      const callbackMatch = ctx.callbackQuery.data.match(
        /^change_show_faculty_to_(true|false)_(.+)$/
      );
      const callBackQuery = callbackMatch?.[2];
      if (!callBackQuery) return;

      ctx.session.isShowFaculty = newValue;
      await settingMenuMessage(ctx, callBackQuery);
    }
  );

  bot.callbackQuery(
    /^change_show_diamond_to_(true|false)_(.+)$/,
    async (ctx) => {
      const valueMatch = ctx.callbackQuery.data.match(
        /^change_show_diamond_to_(true|false)/
      );
      const newValue = valueMatch?.[1] === "true";
      const callbackMatch = ctx.callbackQuery.data.match(
        /^change_show_diamond_to_(true|false)_(.+)$/
      );
      const callBackQuery = callbackMatch?.[2];
      if (!callBackQuery) return;

      ctx.session.isShowDiamond = newValue;
      await settingMenuMessage(ctx, callBackQuery);
    }
  );

  bot.callbackQuery("view_my_settings", async (ctx) => {
    await settingMenuMessage(ctx, "back_to_view_my_profile");
  });
}
