// This is an example file showing how to use Firebase services
import { auth, collections, db, storage } from "../utils/firebase";

/**
 * Example: Working with Firestore
 */
async function firestoreExample() {
  try {
    // Adding a document
    const docRef = await db.collection(collections.menfess).add({
      text: "Hello world!",
      timestamp: new Date(),
    });
    console.log("Document written with ID:", docRef.id);

    // Reading a document
    const doc = await db.collection(collections.menfess).doc(docRef.id).get();
    if (doc.exists) {
      console.log("Document data:", doc.data());
    } else {
      console.log("No such document!");
    }

    // Querying documents
    const snapshot = await db
      .collection(collections.menfess)
      .where("text", "==", "Hello world!")
      .get();

    snapshot.forEach((doc) => {
      console.log(doc.id, "=>", doc.data());
    });

    // Updating a document
    await db.collection(collections.menfess).doc(docRef.id).update({
      text: "Updated text",
    });

    // Deleting a document
    await db.collection(collections.menfess).doc(docRef.id).delete();
  } catch (error) {
    console.error("Error working with Firestore:", error);
  }
}

/**
 * Example: Working with Auth
 */
async function authExample() {
  try {
    // List users
    const listUsersResult = await auth.listUsers(1000);
    listUsersResult.users.forEach((userRecord) => {
      console.log("User:", userRecord.toJSON());
    });

    // Get user by ID
    const userId = "some-user-id";
    try {
      const userRecord = await auth.getUser(userId);
      console.log("Successfully fetched user data:", userRecord.toJSON());
    } catch (error) {
      console.log("Error fetching user data:", error);
    }
  } catch (error) {
    console.error("Error working with Auth:", error);
  }
}

/**
 * Example: Working with Storage
 */
async function storageExample() {
  try {
    // Get bucket
    const bucket = storage.bucket();

    // List files in bucket
    const [files] = await bucket.getFiles();
    console.log("Files:");
    files.forEach((file) => {
      console.log(file.name);
    });

    // Upload a file from a local path
    // const fileName = "test.txt";
    // await bucket.upload('/local/path/to/file.txt', {
    //   destination: fileName,
    // });
    // console.log(`${fileName} uploaded.`);
  } catch (error) {
    console.error("Error working with Storage:", error);
  }
}

/**
 * Run the examples
 */
// Uncomment to run the examples
// firestoreExample();
// authExample();
// storageExample();
