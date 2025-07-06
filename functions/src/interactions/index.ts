import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { Bot, InlineKeyboard } from "grammy";
import moment from "moment";
import { customAlphabet } from "nanoid";
import { anonGuideText } from "../anonChat";
import { botConfig } from "../utils/config";
import { db } from "../utils/firebase";
import {
  extractMenfessUID,
  getAgeAndGender,
  sliceMenfessText,
} from "../utils/helpers";
import { GoldRate } from "../utils/premium.helpers";
import type { BotContext, MenfessDbData } from "../utils/types";

export const getMenfessText = (type: string): string => {
  const texts = {
    hitme: "👊 Hit Me!",
    hitme_plus: "👊 Hit Me! ✚",
    who: "🕵️ Who?",
    who_plus: "🕵️ Who? ✚",
    talk: "💬 Talk!",
    talk_plus: "💬 Talk! ✚",
    report: "🚫 Report",
  };
  return texts[type as keyof typeof texts] || "";
};

export const updateInteractUsers = async (
  menfessUID: string,
  userId: number,
  action: string,
  isUseSenderFreeQuota: boolean
) => {
  await db
    .collection("menfess")
    .doc(menfessUID)
    .update({
      interactUsers: FieldValue.arrayUnion({
        userId: userId,
        action: getMenfessText(action),
      }),
      ...(isUseSenderFreeQuota && {
        freeInteractQuota: FieldValue.increment(-1),
      }),
    });
};

export const handleMaxInteractionsReached = async (
  ctx: BotContext,
  menfessDbData: MenfessDbData,
  menfessUID: string,
  menfessText: string | undefined,
  action: string,
  userId: number
) => {
  const keyboard = new InlineKeyboard().url(
    "🔗 Menfess",
    `t.me/${botConfig.channelId.replace("@", "")}/${menfessDbData.channelChatId}`
  );

  await ctx.api.sendMessage(
    menfessDbData.senderId,
    `✨ *Hallooo!* ✨\n\n` +
      `📝 Menfess kamu ini: \n` +
      `❝${menfessText}...❞\n\n` +
      `🎯 Mendapatkan interaksi sebanyak ${menfessDbData.interactUsers.length + 1}X:\n` +
      menfessDbData.interactUsers.map((x) => x.action + "\n") +
      getMenfessText(action) +
      "\n" +
      `\n😔 Namun sayang sekali free Kuota menerima Interaksi Kamu sudah habis.\n\n✨ Silahkan Upgrade Membership Kamu agar mendapatkan free Kuota Interaksi lebih banyak yaaa 🚀 ⭐️ 💫`,
    {
      reply_markup: keyboard,
    }
  );

  await updateInteractUsers(menfessUID, userId, action, false);
  ctx.session.lastSentInteract = new Date();
};

export async function postMenfessInteraction(
  ctx: BotContext,
  bot: Bot<BotContext>
) {
  const keyboard = new InlineKeyboard()
    .text("👊 Hit Me!", "hitme")
    .text("🕵️ Who?", "who")
    .row()
    .text("💬 Talk!", "talk")
    .text("🚫 Report", "report");

  try {
    const interactionButton = await bot.api.sendMessage(
      botConfig.groupChatId,
      "💬 INTERAKSI MENFESS",
      {
        reply_to_message_id: ctx.message?.message_id,
        reply_markup: keyboard,
      }
    );
    const menfessUID = extractMenfessUID(
      ctx.message?.text || ctx.message?.caption
    );
    if (menfessUID) {
      await db.collection("menfess").doc(menfessUID).update({
        groupChatId: ctx.message?.message_id,
        groupChatButtonId: interactionButton.message_id,
      });

      console.log(
        `groupChatId: ${ctx.message?.message_id} | Added interaction buttons to menfess`
      );
    }
  } catch (error) {
    console.error("Error adding interaction buttons:", error);
  }
}

export function initInteractionHandlers(bot: Bot<BotContext>): void {
  bot.callbackQuery(["hitme", "who", "talk", "report"], async (ctx) => {
    const action = ctx.callbackQuery.data;
    const userId = ctx.from?.id;
    const userName = ctx.from?.username;

    if (!userId) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "User ID not found",
      });
      return;
    }

    const menfessOnGroup = ctx.callbackQuery.message?.reply_to_message;
    const menfessOnGroupId = menfessOnGroup?.message_id;
    const menfessOnGroupText = sliceMenfessText(
      menfessOnGroup?.text || menfessOnGroup?.caption || ""
    );

    const menfessUID = extractMenfessUID(
      menfessOnGroup?.text || menfessOnGroup?.caption
    );

    if (!menfessOnGroupId || !menfessUID) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "🌪️ Waduh! Pesan aslinya tidak dapat ditemukan nih 🍃",
      });
      return;
    }

    const menfessDbData = await db
      .collection("menfess")
      .doc(menfessUID)
      .get()
      .then((doc) => doc.data() as MenfessDbData | undefined);

    if (!menfessDbData) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "🎪 Ups! Pesan aslinya tidak dapat ditemukan nih 🎭",
      });
      return;
    }

    if (menfessDbData.senderId === userId) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "🎪 Ehh.. Kamu tidak bisa berinteraksi dengan menfess kamu sendiri 🎭",
      });
      return;
    }

    if (
      menfessDbData.interactUsers.some((user) => user.userId === userId) &&
      ctx.session.premiumStatus !== 3
    ) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "🎪 Kamu sudah berinteraksi dengan menfess ini sebelumnya 🎭",
      });
      return;
    }

    if (moment().diff(ctx.session.lastSentInteract, "seconds") < 10) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "Sabar ya, kamu baru saja mengirim interaksi sebelumnya. Tunggu 10 detik lagi ya!",
      });
      return;
    }

    if (action === "report") {
      if (
        menfessDbData.interactUsers.find(
          (user) => user.userId === userId && user.action === "report"
        )
      ) {
        await ctx.answerCallbackQuery(
          "Kamu sudah melaporkan menfess ini sebelumnya 🤚"
        );
        return;
      }
      await db.collection(`users/${menfessDbData.senderId}/reports`).add({
        reporterId: userId,
        reporterUsername: userName?.toLowerCase() || "",
        menfessUID: menfessUID,
        menfessText: menfessOnGroupText,
        userId: menfessDbData.senderId,
        userName: menfessDbData.senderUserName.toLowerCase(),
        menfessChannelChatId: menfessDbData.channelChatId,
        menfessGroupChatId: menfessDbData.groupChatId,
        createdAt: new Date(),
        isFromMenfess: true,
        isRead: false,
      });

      await ctx.answerCallbackQuery(
        "Your report has been sent to the admin 🫡"
      );
      ctx.session.lastSentInteract = new Date();
      return;
    }

    const hasReachedMaxFreeQuotas =
      ctx.session.dailyGoldQuota < GoldRate.INTERACT &&
      menfessDbData.freeInteractQuota < 1;
    const channelUrl = `t.me/${botConfig.channelId.replace("@", "")}/${menfessDbData.channelChatId}`;
    const isUseSenderFreeQuota =
      ctx.session.dailyGoldQuota < GoldRate.INTERACT &&
      menfessDbData.freeInteractQuota >= 1;

    if (hasReachedMaxFreeQuotas) {
      await bot.api.answerCallbackQuery(ctx.callbackQuery.id, {
        show_alert: true,
        text: "💥 Ups! Goldmu tidak cukup dan menfess sudah kehabisan free kuota 🥲",
      });
      await handleMaxInteractionsReached(
        ctx,
        menfessDbData,
        menfessUID,
        menfessOnGroupText,
        action,
        userId
      );
      return;
    }

    if (action === "hitme") {
      const keyboard = new InlineKeyboard()
        .text(
          "🥂 Chat Me!",
          `interact_chat_me_${menfessDbData.channelChatId}_${userId}`
        )
        .url("🕵️ Profile?", `tg://user?id=${userId}`)
        .row()
        .url("🔗 Menfess", channelUrl);

      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `✨ *Hallooo!* ✨\n\n` +
          `🎉 Seorang ${getAgeAndGender(ctx.session)}\n` +
          `dengan username @${userName} tertarik dengan menfess kamu! 💫\n\n` +
          `📝 Menfess kamu:\n\n` +
          `❝${menfessOnGroupText}❞\n\n` +
          `💝 Cek profilnya di bawah ini! 👇`,
        { reply_markup: keyboard }
      );
    } else if (action === "who") {
      const keyboard = new InlineKeyboard()
        .text(
          "🫗 Spill Me!",
          `interact_spill_me_${menfessDbData.channelChatId}_${userId}`
        )
        .url("🔗 Menfess", channelUrl)
        .row();

      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `✨ *Heyy!* ✨\n\n` +
          `🎉 Seorang ${getAgeAndGender(ctx.session)}\n` +
          `penasaran dan ingin mengetahui siapa yang mengirim menfess ini! 🤔\n\n` +
          `📝 *Menfess kamu:*\n\n` +
          `❝${menfessOnGroupText}❞\n\n` +
          `💫 Apakah kamu ingin memberi tahu identitasmu? 👀`,
        { reply_markup: keyboard }
      );
    } else if (action === "talk") {
      const keyboard = new InlineKeyboard()
        .text(
          "🦜 Let's Talk!",
          `interact_talk_${menfessDbData.channelChatId}_${userId}`
        )
        .url("🔗 Menfess", channelUrl)
        .row();

      await ctx.api.sendMessage(
        menfessDbData.senderId,
        `✨ *Eyyoo!* ✨\n\n` +
          `🎉 Seorang ${getAgeAndGender(ctx.session)}\n` +
          `Mengajakmu untuk melakukan anonymous chat! 💬\n\n` +
          `📝 *Menfess kamu:*\n\n` +
          `❝${menfessOnGroupText}❞\n\n` +
          `💫 Apakah kamu ingin menerima anonymous chat? 🤔`,
        { reply_markup: keyboard }
      );
    }

    await ctx.answerCallbackQuery(
      "Request kamu telah disampaikan ke sender 💖"
    );

    await updateInteractUsers(menfessUID, userId, action, isUseSenderFreeQuota);
    ctx.session.lastSentInteract = new Date();
    if (!isUseSenderFreeQuota)
      ctx.session.dailyGoldQuota =
        ctx.session.dailyGoldQuota - GoldRate.INTERACT;
  });

  const handleInteractionResponse = async (ctx: BotContext, type: string) => {
    const senderMenfessId = ctx.from?.id;
    const senderMenfessUsername = ctx.from?.username;
    const interactReqData = ctx.callbackQuery?.data?.match(
      new RegExp(`^interact_${type}_(.+)$`)
    );

    if (!interactReqData || !interactReqData[1]) {
      await ctx.answerCallbackQuery({
        text: "Cant find menfess data",
        show_alert: true,
      });
      return;
    }

    const [channelChatId, userInteractId] = interactReqData[1].split("_");

    if (!channelChatId || !userInteractId) {
      await ctx.answerCallbackQuery({
        text: "Cant find menfess data",
        show_alert: true,
      });
      return;
    }

    const keyboard = new InlineKeyboard()
      .url(`👯 Sender`, `tg://user?id=${senderMenfessId}`)
      .url(
        "🖇️ Menfess",
        `https://t.me/${botConfig.channelId.replace("@", "")}/${channelChatId}`
      )
      .row();

    const textMessage =
      ctx.update.callback_query?.message?.text ||
      ctx.update.callback_query?.message?.caption;
    const messageKeyboard =
      ctx.update.callback_query?.message?.reply_markup?.inline_keyboard;

    const extractMenfessText = (text: string): string => {
      const match = text.match(/❝(.*?)❞/);
      return match ? match[1] || "" : "";
    };
    const menfessTextPreview = extractMenfessText(textMessage || "");

    const messages = {
      chat_me:
        "💌💌\n\n" +
        "User @" +
        senderMenfessUsername +
        " dari menfess yang kamu 👊 Hit Me! ingin berbicara dengan kamu! 💘\n\n" +
        "<blockquote>❝" +
        menfessTextPreview +
        "❞</blockquote>",
      spill_me:
        "💌💌\n\n" +
        "User @" +
        senderMenfessUsername +
        " dari menfess yang kamu 🕵️ Who? setuju untuk ngespill profilenya ke kamu! 🫗\n\n" +
        "<blockquote>❝" +
        menfessTextPreview +
        "❞</blockquote>",
      talk:
        "💌💌\n\n" +
        "User dari menfess yang kamu ajak 💬 Talk! setuju untuk melakukan anonymous chat dengan kamu! 📫\n\n" +
        "<blockquote>❝" +
        menfessTextPreview +
        "❞</blockquote>",
    };

    let actionText = "";

    if (type === "chat_me") {
      actionText = "🥂 Chat Me!";
    } else if (type === "spill_me") {
      actionText = "🫗 Spill Me!";
    } else if (type === "talk") {
      actionText = "🦜 Let's Talk!";
    }

    const editedMessage = `${textMessage}\n\n <u>Kamu memilih "${actionText}", jawaban kamu sudah dikirim ke user yang tertarik dengan menfess kamu!</u> 📤`;

    if (type === "chat_me") {
      await ctx.api.sendMessage(
        userInteractId,
        messages[type as keyof typeof messages] +
          `Silahkan klik tombol dibawah untuk langsung ke profile sender! 💫`,
        { reply_markup: keyboard, parse_mode: "HTML" }
      );

      const userUrl = (messageKeyboard?.[0]?.[1] as { url: string }).url;
      const menfessUrl = (messageKeyboard?.[1]?.[0] as { url: string }).url;

      const keyboardMarkupChatMe = new InlineKeyboard()
        .url("👤 Sender", userUrl)
        .url("🔗 Menfess", menfessUrl)
        .row();

      await ctx.editMessageText(editedMessage, {
        parse_mode: "HTML",
        reply_markup: keyboardMarkupChatMe,
      });
    } else if (type === "spill_me") {
      await ctx.api.sendMessage(
        userInteractId,
        messages[type as keyof typeof messages] +
          `Silahkan klik tombol dibawah untuk langsung ke profile sender! 💫`,
        { reply_markup: keyboard, parse_mode: "HTML" }
      );

      const menfessUrl = (messageKeyboard?.[0]?.[1] as { url: string }).url;

      const keyboardMarkupSpillMe = new InlineKeyboard()
        .url("🔗 Menfess", menfessUrl)
        .row();

      await ctx.editMessageText(editedMessage, {
        parse_mode: "HTML",
        reply_markup: keyboardMarkupSpillMe,
      });
    } else if (type === "talk") {
      const nanoid = customAlphabet(
        "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
        Math.floor(Math.random() * (13 - 7 + 1)) + 7
      );
      const anonChatId = nanoid();

      const menfessUrl = (messageKeyboard?.[0]?.[1] as { url: string }).url;

      const keyboardMarkupTalk = new InlineKeyboard()
        .url("🔗 Menfess", menfessUrl)
        .row();

      const messageSender = await ctx.editMessageText(editedMessage, {
        parse_mode: "HTML",
        reply_markup: keyboardMarkupTalk,
      });

      const keyboardAgreement = new InlineKeyboard()
        .text("👎 Tidak Setuju", `disagree_talk_TOS_${anonChatId}`)
        .text("👍 Setuju", `agree_talk_TOS_${anonChatId}`)
        .row();

      const messageRequestor = await ctx.api.sendMessage(
        userInteractId,
        messages[type as keyof typeof messages],
        { parse_mode: "HTML", reply_markup: keyboardMarkupTalk }
      );

      await ctx.api.sendMessage(
        userInteractId,
        `Halo! \n` +
          `Kamu akan melakukan Anonymous Chat code: <code>${anonChatId}</code> dengan ${getAgeAndGender(ctx.session)}\n\n` +
          "Dilarang keras mengirim Anonymous Chat yang bersifat sebagai berikut:\n" +
          "🚫 Melanggar Peraturan & Ketentuan Umum Base.\n" +
          "🚫 Berisi identitas pribadi dan sensitif.\n" +
          "\n" +
          "Dengan mengirim pernyataan ini berarti Anda setuju dan bertanggung jawab atas Anonymous Chat anda?",
        {
          reply_markup: keyboardAgreement,
          parse_mode: "HTML",
          reply_to_message_id: messageRequestor.message_id,
        }
      );

      const extractAgeAndGender = (text: string): string => {
        const lines = text.split("\n");
        if (lines.length >= 3) {
          const thirdLine = lines[2];
          if (thirdLine) {
            const match = thirdLine.match(
              /(?:🕺|💃)#[MF](?:\d+|[✘✘]+|[⁕⁕]+|-)/
            );
            return match ? match[0] : "";
          }
        }
        return "";
      };

      const requestorInfo = extractAgeAndGender(textMessage || "");

      await ctx.reply(
        `Halo @${senderMenfessUsername}! \n` +
          `Kamu akan melakukan Anonymous Chat code: <code>${anonChatId}</code> dengan ${requestorInfo}\n\n` +
          "Dilarang keras mengirim Anonymous Chat yang bersifat sebagai berikut:\n" +
          "🚫 Melanggar Peraturan & Ketentuan Umum Base.\n" +
          "🚫 Berisi identitas pribadi dan sensitif.\n" +
          "\n" +
          "Dengan mengirim pernyataan ini berarti Anda setuju dan bertanggung jawab atas Anonymous Chat anda?",
        {
          reply_markup: keyboardAgreement,
          parse_mode: "HTML",
          reply_to_message_id: (messageSender as { message_id: number })
            .message_id,
        }
      );
    }
  };

  bot.callbackQuery(/^interact_chat_me_(.+)$/, async (ctx) => {
    await handleInteractionResponse(ctx, "chat_me");
  });

  bot.callbackQuery(/^interact_spill_me_(.+)$/, async (ctx) => {
    await handleInteractionResponse(ctx, "spill_me");
  });

  bot.callbackQuery(/^interact_talk_(.+)$/, async (ctx) => {
    await handleInteractionResponse(ctx, "talk");
  });

  bot.callbackQuery(/^agree_talk_TOS_(.+)$/, async (ctx) => {
    const anonChatId = ctx.callbackQuery.data.match(
      /^agree_talk_TOS_(.+)$/
    )?.[1]!;

    const textMessage = ctx.update.callback_query?.message?.text;
    const userId = ctx.from?.id;

    const anonChatDoc = await db.collection("anonChats").doc(anonChatId).get();

    if (!anonChatDoc.exists) {
      await db
        .collection("anonChats")
        .doc(anonChatId)
        .set({
          [String(userId)]: {
            isAgree: true,
            userName: ctx.from?.username?.toLowerCase() || "",
            gender: ctx.session.gender,
          },
          isEnded: false,
          createdAt: new Date(),
        });

      const editedMessage = `${textMessage}\n\n<u>Kamu memilih 👍 Setuju dengan ketentuan di atas dan bertanggung jawab penuh atas Anonymous Chat yang akan dikirim. 🥰</u>`;
      await ctx.editMessageText(editedMessage, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [] },
      });
      await ctx.reply(
        "Menunggu lawan chatmu untuk setuju dengan ketentuan di atas..."
      );

      const anonChatListener = db
        .collection("anonChats")
        .doc(anonChatId)
        .onSnapshot(async (doc) => {
          const { createdAt, isEnded, ...anonChatData } = doc.data() as {
            [key: string]: {
              isAgree: boolean;
              userName: string;
              gender: string;
            };
          };

          if (isEnded) {
            ctx.session.messageIdOnOtherUserSent = [];
            ctx.session.route = "idle";
            ctx.session.startAnonChatAt = null;
            ctx.session.myMessageIdOnOtherUserSent = [];
            anonChatListener();
            await ctx.answerCallbackQuery();
            return;
          }

          if (
            Object.keys(anonChatData).length === 2 &&
            Object.values(anonChatData).every((value) => value.isAgree === true)
          ) {
            const otherUser = Object.keys(anonChatData).find(
              (id) => id !== userId?.toString()
            );
            if (otherUser) {
              ctx.session.route = `anonChat_${anonChatId}_${otherUser}`;
              ctx.session.startAnonChatAt = new Date();
              const keyboard = new InlineKeyboard().text(
                "🛑 End Chat",
                `end_chat`
              );
              await ctx.reply(anonGuideText, {
                reply_markup: keyboard,
                parse_mode: "HTML",
              });
              await ctx.reply(
                `<i>Kamu sedang berada di room anonymous chat dengan code:</i> <code>${anonChatId}</code> <b>Silahkann say HII!!! 🤚😇👻</b>`,
                { parse_mode: "HTML" }
              );
              await ctx.api.sendMessage(otherUser, anonGuideText, {
                reply_markup: keyboard,
                parse_mode: "HTML",
              });
              await ctx.api.sendMessage(
                otherUser,
                `<i>Kamu sedang berada di room anonymous chat dengan code:</i> <code>${anonChatId}</code> <b>Silahkann say HII!!! 🤚😇👻</b>`,
                { parse_mode: "HTML" }
              );
            }
          }
        });
    } else if (anonChatDoc.exists) {
      const anonChatData = anonChatDoc.data() as {
        [key: string]:
          | {
              isAgree: boolean;
              userName: string;
              gender: string;
            }
          | Timestamp;
      };
      const { isEnded, createdAt, ...restAnonChatData } = anonChatData;
      if (
        moment().diff(moment((createdAt as Timestamp).toDate()), "minutes") > 59
      ) {
        await db.collection("anonChats").doc(anonChatId).update({
          isEnded: true,
        });
        await ctx.editMessageText(
          `${textMessage}\n\n<u>Anon Chat code: <code>${anonChatId}</code> telah kadaluarsa. 😔</u>`,
          {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [] },
          }
        );
        await ctx.answerCallbackQuery();
        return;
      }

      if (
        Object.values(restAnonChatData).some(
          (value) =>
            (value as { isAgree: boolean; userName: string; gender: string })
              .isAgree === false
        )
      ) {
        const editedMessage = `${textMessage}\n\n<u>Anon Chat code: <code>${anonChatId}</code> dibatalkan karena lawan chatmu tidak setuju dengan ketentuan di atas. 😔</u>`;
        await ctx.editMessageText(editedMessage, {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] },
        });
      } else {
        const otherUser = Object.keys(restAnonChatData)[0];

        await db
          .collection("anonChats")
          .doc(anonChatId)
          .update({
            [String(userId)]: {
              isAgree: true,
              userName: ctx.from?.username?.toLowerCase() || "",
              gender: ctx.session.gender,
            },
            isEnded: false,
          });

        const editedMessage = `${textMessage}\n\n<u>Kamu memilih 👍 Setuju dengan ketentuan di atas dan bertanggung jawab penuh atas Anonymous Chat yang akan dikirim. 🥰</u>`;
        await ctx.editMessageText(editedMessage, {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] },
        });

        ctx.session.route = `anonChat_${anonChatId}_${otherUser}`;
        ctx.session.startAnonChatAt = new Date();
        const anonChatListener = db
          .collection("anonChats")
          .doc(anonChatId)
          .onSnapshot(async (doc) => {
            const { isEnded } = doc.data() as { isEnded: boolean };

            if (isEnded) {
              ctx.session.messageIdOnOtherUserSent = [];
              ctx.session.route = "idle";
              ctx.session.startAnonChatAt = null;
              ctx.session.myMessageIdOnOtherUserSent = [];
              anonChatListener();
              await ctx.answerCallbackQuery();
              return;
            }
          });
      }
      await ctx.answerCallbackQuery();
    }
  });

  bot.callbackQuery(/^disagree_talk_TOS_(.+)$/, async (ctx) => {
    const anonChatId = ctx.callbackQuery.data.match(
      /^disagree_talk_TOS_(.+)$/
    )?.[1]!;

    const userId = ctx.from?.id;
    const anonChatDoc = await db.collection("anonChats").doc(anonChatId).get();

    if (!anonChatDoc.exists) {
      await db
        .collection("anonChats")
        .doc(anonChatId)
        .set({
          [String(userId)]: {
            isAgree: false,
            userName: ctx.from?.username?.toLowerCase() || "",
            gender: ctx.session.gender,
          },
          createdAt: new Date(),
          isEnded: true,
        });
    } else if (anonChatDoc.exists) {
      const anonChatData = anonChatDoc.data() as {
        [key: string]: { isAgree: boolean; userName: string; gender: string };
      };
      const { isEnded, createdAt, ...restAnonChatData } = anonChatData;
      if (Object.keys(restAnonChatData)[0]) {
        const otherUser = Object.keys(restAnonChatData)[0];
        const editedMessage = `<u>Anon Chat code: <code>${anonChatId}</code> dibatalkan karena lawan chatmu tidak setuju dengan ketentuan di atas. 😔</u>`;
        await ctx.api.sendMessage(otherUser!, editedMessage, {
          parse_mode: "HTML",
        });
        await db
          .collection("anonChats")
          .doc(anonChatId)
          .update({
            [String(userId)]: {
              isAgree: false,
              userName: ctx.from?.username?.toLowerCase() || "",
              gender: ctx.session.gender,
            },
            isEnded: true,
          });
      }
    }

    const textMessage = ctx.update.callback_query?.message?.text;

    const editedMessage = `${textMessage}\n\n<u>Kamu memilih 👎 Tidak Setuju, anon chat dibatalkan 🦀</u>`;
    await ctx.editMessageText(editedMessage, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [] },
    });
    await ctx.answerCallbackQuery();
  });
}
