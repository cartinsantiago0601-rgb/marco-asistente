import admin from 'firebase-admin';
import { config } from './config.js';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.FIREBASE_PROJECT_ID,
      clientEmail: config.FIREBASE_CLIENT_EMAIL,
      privateKey: config.FIREBASE_PRIVATE_KEY,
    }),
  });
}

const db = admin.firestore();

// Estructura: marco_chats/{userId}/messages/{autoId}
// Así cada usuario tiene su subcolección — no necesita índice compuesto.

export async function getMessages(userId: string, limit: number = 30): Promise<Array<{ role: string; content: string }>> {
  const snapshot = await db
    .collection('marco_chats')
    .doc(userId)
    .collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs
    .map(doc => {
      const data = doc.data();
      return { role: data.role, content: data.content };
    })
    .reverse();
}

export async function addMessage(
  userId: string,
  role: string,
  content: string
): Promise<void> {
  await db
    .collection('marco_chats')
    .doc(userId)
    .collection('messages')
    .add({
      role,
      content,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}
