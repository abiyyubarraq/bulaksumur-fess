# Setting Up Your Telegram Channel and Group for Bulaksumur Menfess Bot

This guide will help you set up a Telegram channel and link it with a discussion group for your Bulaksumur Menfess Bot.

## 1. Create a Telegram Channel

1. Open Telegram and tap on the pencil icon (new message).
2. Select "New Channel".
3. Enter a name for your channel (e.g., "Bulaksumur Menfess").
4. Add a description explaining the purpose of the channel.
5. Choose whether you want a public or private channel.
   - Public: Choose a unique URL for the channel.
   - Private: The channel will be accessible only via invite link.
6. Click "Create" to finish.

## 2. Create a Discussion Group

1. Open Telegram and tap on the pencil icon (new message).
2. Select "New Group".
3. Add a few participants (you can remove them later).
4. Enter a name for your group (e.g., "Bulaksumur Menfess Discussion").
5. Tap "Create" to finish.

## 3. Link the Channel to the Discussion Group

1. Go to your channel.
2. Tap on the channel name at the top.
3. Select "Manage Channel".
4. Tap on "Discussion".
5. Select "Connect Group".
6. Choose the group you created.
7. Tap "Connect" to link them.

## 4. Set Bot as Administrator

### In the Channel:

1. Go to your channel.
2. Tap on the channel name at the top.
3. Select "Manage Channel".
4. Tap on "Administrators".
5. Tap "Add Administrator".
6. Search for your bot's username and select it.
7. Give it the following permissions:
   - Post Messages
   - Edit Messages
   - Delete Messages
8. Tap "Done" to save.

### In the Discussion Group:

1. Go to your discussion group.
2. Tap on the group name at the top.
3. Select "Manage Group".
4. Tap on "Administrators".
5. Tap "Add Administrator".
6. Search for your bot's username and select it.
7. Give it the following permissions:
   - Delete Messages
   - Ban Users
   - Pin Messages
8. Tap "Done" to save.

## 5. Get Channel and Group IDs

### Public Channel:
If your channel is public, you can use its username as the CHANNEL_ID in your .env file:
```
CHANNEL_ID=@yourchannelname
```

### Private Channel or Group:
For private channels or groups, you'll need to get their numeric ID:

1. Forward a message from the channel/group to [@userinfobot](https://t.me/userinfobot).
2. The bot will reply with information about the message, including the channel/group ID.
3. For channels, the ID will look like: `-100xxxxxxxxxx`
4. For groups, the ID will look like: `-100xxxxxxxxxx`

Use these IDs in your .env file:
```
CHANNEL_ID=-100xxxxxxxxxx
GROUP_CHAT_ID=-100xxxxxxxxxx
```

## 6. Configure the Bot

Once you have all the required IDs, update your `.env` file with:

```
BOT_TOKEN=your_bot_token_from_botfather
CHANNEL_ID=your_channel_id
GROUP_CHAT_ID=your_group_chat_id
POST_TRIGGER=menfess
```

Now your bot is ready to post anonymous messages to your channel with discussions in the linked group! 