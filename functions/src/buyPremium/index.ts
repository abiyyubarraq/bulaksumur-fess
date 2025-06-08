import { type Bot, InlineKeyboard } from "grammy";
import { sendBuyPremiumMenu } from "../mainBot/commands/commandMenuContent";
import type { BotContext } from "../utils/types";

const buyPremiumText = `Silahkan pilih jenis membership yang ingin kamu beli:

<b>✦ Premium 💎</b> <i>Rp. 22.xxx monthly</i>
- <code>💰 Gold 1200/24H</code>
- <code>10x Free Interaksi/Menfess*</code>

<b>✦ Premium 💎💎</b> <i>Rp. 33.xxx monthly</i>
- <code>💰 Gold 3300/24H</code>
- <code>24x Free Interaksi/Menfess*</code>
- <code>Bisa Melakukan Interaksi✚</code>
- <code>Bisa mengunci menfess dari anon reply</code>

<b>✦ Premium 💎💎💎</b> <i>Rp. 55.xxx monthly</i>
- <code>💰 Gold 7000/24H</code>
- <code>90x Free Interaksi/Menfess*</code>
- <code>Bisa Melakukan Interaksi✚</code>
- <code>Bisa mengunci menfess dari anon reply</code>
- <code>Multi Interaksi</code>

Untuk penjelasan lebih lanjut tentang keuntungan menjadi Premium Membership, bisa Kamu baca di Menu - Bantuan - Premium Membership.

*Free quota Interaksi bagi Member yang berinteraksi di Menfess Kamu namun kehabisan Gold.`;

export function initBuyPremium(bot: Bot<BotContext>): void {
  bot.callbackQuery(/^purchase_premium_member$/, async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("✦ Premium 💎", "purchase_premium_member_1")
      .text("✦ Premium 💎💎", "purchase_premium_member_2")
      .text("✦ Premium 💎💎💎", "purchase_premium_member_3")
      .row()
      .text("« BACK", "back_to_buy_premium_menu");
    await ctx.editMessageText(buyPremiumText, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  });

  bot.callbackQuery(/^back_to_buy_premium_menu$/, async (ctx) => {
    await sendBuyPremiumMenu(ctx);
  });
}
