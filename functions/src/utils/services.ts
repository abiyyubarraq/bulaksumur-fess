import { collections, db } from "./firebase";
import type { SessionStatus, UserSession } from "./types";

export const getUserSession = async (
  userId: number
): Promise<UserSession | null> => {
  try {
    const sessionDocRef = db
      .collection(collections.sessions)
      .doc(userId.toString());
    const sessionDoc = await sessionDocRef.get();

    if (!sessionDoc.exists) {
      return null;
    }

    return sessionDoc.data() as UserSession;
  } catch (error) {
    console.error("Error getting user session:", error);
    throw error;
  }
};

export const createUserSession = async (
  userId: number,
  status: SessionStatus,
  username?: string
): Promise<void> => {
  try {
    const sessionData: UserSession = {
      userId,
      username,
      status,
      lastActivity: new Date() as any,
    };

    if (status === "registered") {
      sessionData.registeredAt = new Date() as any;
    }

    await db
      .collection(collections.sessions)
      .doc(userId.toString())
      .set(sessionData);
  } catch (error) {
    console.error("Error creating user session:", error);
    throw error;
  }
};

export const updateUserSession = async (
  userId: number,
  sessionData: Partial<UserSession>
): Promise<void> => {
  try {
    await db
      .collection(collections.sessions)
      .doc(userId.toString())
      .update({
        ...sessionData,
        lastActivity: new Date(),
      });
  } catch (error) {
    console.error("Error updating user session:", error);
    throw error;
  }
};

// Generic document operations
// export const saveDocument = async <T extends DocumentData>(
//   collection: string,
//   id: string,
//   data: T
// ): Promise<void> => {
//   try {
//     await db.collection(collection).doc(id).set(data, { merge: true });
//   } catch (error) {
//     console.error(`Error saving document to ${collection}:`, error);
//     throw error;
//   }
// };

// export const getDocument = async <T>(
//   collection: string,
//   id: string
// ): Promise<T | null> => {
//   try {
//     const doc = await db.collection(collection).doc(id).get();
//     return doc.exists ? (doc.data() as T) : null;
//   } catch (error) {
//     console.error(`Error getting document from ${collection}:`, error);
//     throw error;
//   }
// };

// // Menfess post operations
// export const saveMenfessPost = async (post: MenfessPost): Promise<string> => {
//   try {
//     const docRef = await db.collection(collections.menfess).add({
//       ...post,
//       timestamp: new Date(), // Ensure timestamp is a Firestore timestamp
//     });
//     return docRef.id;
//   } catch (error) {
//     console.error("Error saving menfess post:", error);
//     throw error;
//   }
// };

// export const getMenfessPostByMessageId = async (
//   messageId: number
// ): Promise<MenfessPost | null> => {
//   try {
//     const snapshot = await db
//       .collection(collections.menfess)
//       .where("messageId", "==", messageId)
//       .limit(1)
//       .get();

//     if (snapshot.empty) {
//       return null;
//     }

//     return snapshot.docs[0]?.data() as MenfessPost;
//   } catch (error) {
//     console.error("Error getting menfess post by message ID:", error);
//     throw error;
//   }
// };

// // User operations
// export const updateUserActivity = async (
//   userId: number,
//   username?: string
// ): Promise<void> => {
//   try {
//     const userDocRef = db.collection(collections.users).doc(userId.toString());
//     const userDoc = await userDocRef.get();

//     if (!userDoc.exists) {
//       // New user
//       await userDocRef.set({
//         userId,
//         username,
//         postsCount: 1,
//         lastActive: new Date(),
//         isBanned: false,
//       });
//     } else {
//       const userData = userDoc.data();
//       // Existing user
//       await userDocRef.update({
//         username: username || (userData ? userData.username : undefined),
//         postsCount: (userData ? userData.postsCount || 0 : 0) + 1,
//         lastActive: new Date(),
//       });
//     }
//   } catch (error) {
//     console.error("Error updating user activity:", error);
//     throw error;
//   }
// };

// Session management operations

// // Interaction operations
// export const saveInteraction = async (
//   interaction: Interaction
// ): Promise<string> => {
//   try {
//     const docRef = await db.collection(collections.interactions).add({
//       ...interaction,
//       timestamp: new Date(),
//     });
//     return docRef.id;
//   } catch (error) {
//     console.error("Error saving interaction:", error);
//     throw error;
//   }
// };

// // Reports handling
// export const saveReport = async (
//   postId: number,
//   userId: number,
//   reason?: string
// ): Promise<void> => {
//   try {
//     await db.collection(collections.reports).add({
//       postId,
//       userId,
//       reason,
//       timestamp: new Date(),
//     });
//   } catch (error) {
//     console.error("Error saving report:", error);
//     throw error;
//   }
// };
