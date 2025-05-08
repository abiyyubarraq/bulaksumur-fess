# Bulaksumur Menfess Bot

A Telegram bot for anonymous posting (menfess) with Firestore integration.

## Features

- Anonymous posting to a Telegram channel
- Modular structure with separate components for core functions
- Interactive buttons on posts
- Firestore integration for data persistence

## Getting Started

### Prerequisites

- Node.js 14+ or Bun
- Telegram Bot Token (from @BotFather)
- Firebase Project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bulaksumur-fess.git
cd bulaksumur-fess/functions
```

2. Install dependencies:
```bash
bun install
```

3. Create a `.env` file based on the sample:
```
# Bot Configuration
BOT_TOKEN=your_bot_token_here
CHANNEL_ID=@your_channel_username
GROUP_CHAT_ID=@your_group_chat_username
CHANNEL_GROUP_CHAT_ID_NUMBER=-1001234567890
GROUP_CHAT_ID_NUMBER=-1001234567890

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_USE_EMULATOR=false
```

### Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)

2. Enable Firestore in your Firebase project

3. Set up Firebase credentials:

   **Option 1: Using Service Account (recommended for production)**
   
   - Generate a service account key from Firebase Console > Project Settings > Service Accounts
   - Save it securely and add to your `.env` file:
   ```
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"..."}
   ```

   **Option 2: Using Application Default Credentials**
   
   - Install Firebase CLI: `npm install -g firebase-tools`
   - Login: `firebase login`
   - Use application defaults: `firebase use --add your-project-id`

4. Start the bot:
```bash
bun run dev
```

## Firestore Data Structure

The bot uses the following Firestore collections:

- **menfess**: Stores all posted messages
  - messageId: Original message ID
  - senderId: User ID who sent the message
  - text: Message text
  - mediaType: Type of media (photo)
  - mediaId: File ID for media
  - timestamp: Posting time
  - channelMessageId: Message ID in the channel
  - groupMessageId: Message ID in the group (if known)

- **interactions**: Records user interactions with posts
  - postId: Message ID being interacted with
  - type: Interaction type (hitme, who, talk, report)
  - userId: User ID performing the interaction
  - timestamp: Interaction time

- **reports**: Stores reported posts
  - postId: Message ID being reported
  - userId: User ID reporting the post
  - reason: Report reason (optional)
  - timestamp: Report time

- **users**: Tracks user activity
  - userId: Unique user identifier
  - username: Telegram username (optional)
  - postsCount: Number of posts
  - lastActive: Last activity timestamp
  - isBanned: Ban status

## License

MIT
