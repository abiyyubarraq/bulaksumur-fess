import type { ParseModeFlavor } from "@grammyjs/parse-mode";
import { Bot, InlineKeyboard } from "grammy";
import { botConfig } from "../utils/config";
import { db } from "../utils/firebase";
import type { BotContext } from "../utils/types";

type AgreementItem = {
  title: string;
  content: string;
  nextStep: "agreement1" | "agreement2" | "agreement3" | "complete";
};

type AgreementMap = {
  [key: number]: AgreementItem;
};

const AGREEMENTS: AgreementMap = {
  1: {
    title: `Untuk menggunakan BOT ${botConfig.botUserName} dan bergabung dengan channel ${botConfig.channelId} Anda harus menyetujui pernyataan berikut:`,
    content:
      `Saya menyatakan bahwa:\n\n` +
      `Dalam pernyataan ini, Saya adalah pengguna BOT Telegram ${botConfig.botUserName} dan anggota Channel Telegram ${botConfig.channelId}, termasuk grup diskusinya.\n\n` +
      `Saya bertanggung jawab sepenuhnya atas setiap tindakan, informasi, atau pesan yang saya sampaikan melalui semua fitur di ${botConfig.botUserName}, termasuk namun tidak terbatas pada tindakan, informasi, atau pesan yang dapat melanggar ketentuan peraturan perundang-undangan yang berlaku di Indonesia atau merugikan pihak lain.\n\n` +
      `Dengan ini, saya membebaskan pengelola channel ${botConfig.channelId} dan BOT ${botConfig.botUserName} dari segala bentuk tanggung jawab, risiko, dan tuntutan hukum, baik pidana maupun perdata, yang timbul akibat perbuatan saya tersebut.\n\n` +
      `Ketentuan penggunaan versi: 15-05-2025 00:00\n\n` +
      `Apakah Anda sudah memahami dengan baik dan menyetujui pernyataan di atas?`,
    nextStep: "agreement2",
  },
  2: {
    title: `Untuk menggunakan BOT ${botConfig.botUserName} dan bergabung dengan channel ${botConfig.channelId} Anda harus mematuhi peraturan berikut:`,
    content:
      "Saya akan mematuhi peraturan berikut:\n\n" +
      "1. Tidak diperbolehkan melakukan segala bentuk aktivitas yang melanggar undang-undang yang berlaku.\n\n" +
      "2. Member di bawah umur tidak diperbolehkan. Segala hal berbau Underage dilarang apapun bentuknya.\n\n" +
      "3. Dilarang mengirim Menfes, Giveaway, Anon Chat, Anon Message, Anon Reply, Video Group Calls, atau chat di group yang mengandung prostitusi. Termasuk namun tidak terbatas mengenai BO, CC, LC, SUGDAD, SUGBAB, COUPLE, VCS, PS, GF/BF, BDSM, EXIB, BJ, JILMEK, 3SOME.\n\n" +
      "4. Tidak boleh menyinggung SARA (Suku, Agama, Ras, dan Antar golongan) yang mengandung arti kurang baik/kebencian.\n\n" +
      "5. Dilarang meminta rekomendasi film, cerita, atau komik dewasa dan semi dewasa.\n\n" +
      "6. Dilarang mengirimkan apapun yang mengandung tautan/link, emot, atau username dalam bentuk text, tag, atau gambar baik dengan memposting sendiri atau disematkan ke postingan orang lain.\n\n" +
      "7. Dilarang mengirim apapun yang mengandung politik dan berita hoax.\n\n" +
      "8. Tidak diperbolehkan titip Menfes atau mengaku sender dari Menfes yang dikirim orang lain.\n\n" +
      "9. Tidak diperbolehkan menyebarluaskan identitas jelas, termasuk nomor telepon baik itu milik orang lain ataupun milik sendiri.\n\n" +
      "10. Dilarang mengirimkan foto, video, atau suara orang lain, barang pribadi orang lain, tempat pribadi orang lain, atau apapun tentang orang lain yang dapat disimpulkan merujuk ke orang lain tersebut tanpa seizin tertulis dari orang yang bersangkutan. Pengecualian jika foto, video, atau suara tersebut diambil di tempat umum.\n\n" +
      "11. Tidak diperbolehkan menggunakan fitur BOT untuk mengunggah permasalahan pribadi antar member yang berpotensi menimbulkan kegaduhan, termasuk tapi tidak terbatas berupa sindiran sarkas dan sejenisnya.\n\n" +
      "12. Dilarang melakukan aktivitas jual beli, promosi, lowongan kerja, atau investasi dalam bentuk apapun di Base. Segala bentuk Jual/beli/promosi hanya boleh melalui BOT baik berupa Menfes, Giveaway, dengan syarat harus menggunakan hashtag #SEL #BUY #LOKER.\n\n" +
      "13. Mengirimkan Giveaway hanya boleh menggunakan fitur Giveaway dari BOT.\n\n" +
      "14. Dilarang menggunakan Base untuk mendapatkan keuntungan pribadi atau kelompok tanpa seizin Admin. Termasuk mengemis, meminta-minta, atau menjual kesedihan.\n\n" +
      "15. Tidak diperbolehkan manipulatif, menggiring opini yang merusak keharmonisan komunitas, perusuh, atau memecah belah Base.\n\n" +
      "16. Tidak diperbolehkan melakukan SPAM/mengirimkan pesan berulang dalam waktu berdekatan baik menggunakan fitur BOT maupun chat langsung di group.\n\n" +
      "17. Tidak diperbolehkan menjatuhkan, menggiring opini negatif, atau mengusik urusan pribadi baik terhadap Base, Admin, ataupun pihak representatif Base.\n\n" +
      "Peraturan versi: 15-05-2025 00:00\n\n" +
      "Apakah Anda sudah memahami dengan baik dan setuju akan mematuhi peraturan di atas?",
    nextStep: "agreement3",
  },
  3: {
    title: `Untuk menggunakan BOT ${botConfig.botUserName} dan bergabung dengan channel ${botConfig.channelId} Anda harus setuju untuk mematuhi ketentuan berikut:`,
    content:
      "Saya akan mematuhi ketentuan berikut:\n\n" +
      "1. Keputusan Admin mutlak tidak bisa diganggu gugat.\n\n" +
      "2. Admin berhak bertindak apapun jika terdapat Menfes, Giveaway, Anon Reply, Anon Chat, Video Group Calls, Chat Group, Komentar Menfes, atau Akun Personal yang melanggar Peraturan di atas.\n\n" +
      "3. Admin berhak bertindak apapun jika terdapat Menfes, Giveaway, Anon Reply, Anon Chat, Video Group Calls, Chat Group, Komentar Menfes, atau Akun Personal yang digunakan untuk menyerang individu atau kelompok lain baik atas inisiatif sendiri maupun permintaan member lainnya.\n\n" +
      "4. Admin berhak memberitahukan baik kepada pihak yang dirugikan ataupun mengumumkan ke Base siapa Sender Menfes, Giveaway, Anon Reply, Anon Chat yang melanggar peraturan ataupun Ketentuan Base.\n\n" +
      "Ketentuan penggunaan versi: 07-05-2025 14:25\n\n" +
      "Apakah Anda sudah memahami dengan baik dan menyetujui pernyataan di atas?",
    nextStep: "complete",
  },
};

export function initTosMenu(bot: Bot<ParseModeFlavor<BotContext>>): void {
  async function sendAgreement(
    ctx: ParseModeFlavor<BotContext>,
    agreementNumber: number
  ) {
    try {
      const agreement = AGREEMENTS[agreementNumber];
      if (!agreement) return;

      await ctx.reply(agreement.title);

      const agreementKeyboard = new InlineKeyboard()
        .text(
          "✅ Ya, saya memahami dan menyetujui",
          `agreement_agree_${agreementNumber}`
        )
        .text("❌ Tidak", `disagree_agreement_${agreementNumber}`);

      await ctx.reply(agreement.content, {
        reply_markup: agreementKeyboard,
      });
    } catch (error) {
      console.error(`Error sending agreement ${agreementNumber}:`, error);
    }
  }
  bot.on("message", async (ctx, next) => {
    if (
      ["agreement1", "agreement2", "agreement3"].includes(
        ctx.session.registerStep
      )
    ) {
      const userId = ctx.from?.id;
      if (!userId) return;

      const agreementStep = ctx.session.registerStep;
      const agreementNumber = parseInt(agreementStep.replace("agreement", ""));

      await sendAgreement(ctx, agreementNumber);
    } else {
      await next();
      return;
    }
  });

  bot.callbackQuery(/^agreement_agree_(\d+)$/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !ctx.match[1]) return;

    try {
      const agreementNumber = parseInt(ctx.match[1]);
      const agreement = AGREEMENTS[agreementNumber];

      if (!agreement) {
        await ctx.answerCallbackQuery("Invalid agreement");
        return;
      }

      if (agreementNumber === 1) {
        ctx.session.agreement1 = true;
      } else if (agreementNumber === 2) {
        ctx.session.agreement2 = true;
      } else if (agreementNumber === 3) {
        ctx.session.agreement3 = true;
      }

      ctx.session.registerStep = agreement.nextStep;

      const message = ctx.update?.callback_query?.message;
      if (!message || !message.text) {
        console.warn("Could not get message text for agreement acceptance");
      } else {
        const footer = `\n\n<i>Anda telah memahami dan setuju akan mematuhi ketentuan di atas</i>\n\nTerimakasih ❣️`;
        await ctx.api.editMessageText(
          message.chat.id,
          message.message_id,
          message.text + footer,
          { parse_mode: "HTML" }
        );
      }

      if (agreement.nextStep !== "complete") {
        const nextAgreementNumber = agreementNumber + 1;
        await sendAgreement(ctx, nextAgreementNumber);
      } else {
        await db.collection("users").doc(userId.toString()).update({
          agreement1: true,
          agreement2: true,
          agreement3: true,
          registerStep: "complete",
          agreementSignAt: new Date(),
        });
        await ctx.reply(
          `🌟✨ Terimakasih! kamu sudah menyetujui semua ketentuan dan peraturan dari BOT ${botConfig.botUserName} dan channel ${botConfig.channelId}.\n\n` +
            "🔅 Sekarang kamu dapat menggunakan semua fitur Bulaksumur Menfess Bot.\n" +
            "💌 Ketik /menu untuk mulai mengirim menfess! 🚀"
        );
      }
    } catch (error) {
      console.error("Error handling agreement acceptance:", error);
      await ctx.answerCallbackQuery("Terjadi kesalahan. Silahkan coba lagi.");
    }
  });

  bot.callbackQuery(/^disagree_agreement_(\d+)$/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !ctx.match[1]) return;

    try {
      const agreementNumber = parseInt(ctx.match[1]);

      await ctx.answerCallbackQuery(
        "Anda harus menyetujui pernyataan ini untuk melanjutkan"
      );

      const message = ctx.update?.callback_query?.message;
      if (message && message.chat && message.message_id) {
        await ctx.api.editMessageText(
          message.chat.id,
          message.message_id,
          "..."
        );
        await sendAgreement(ctx, agreementNumber);
      } else {
        await sendAgreement(ctx, agreementNumber);
      }
    } catch (error) {
      console.error("Error handling agreement rejection:", error);
      await ctx.answerCallbackQuery("Terjadi kesalahan. Silahkan coba lagi.");
    }
  });
}
