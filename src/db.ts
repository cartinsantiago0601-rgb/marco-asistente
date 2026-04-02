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

// ─── Historial de conversación ────────────────────────────────────────────────
// marco_chats/{userId}/messages/{autoId}

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

export async function addMessage(userId: string, role: string, content: string): Promise<void> {
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

export async function clearHistory(userId: string): Promise<void> {
  const snapshot = await db
    .collection('marco_chats')
    .doc(userId)
    .collection('messages')
    .limit(500)
    .get();

  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

// ─── Memoria estructurada (notas persistentes) ────────────────────────────────
// marco_notes/{userId}/items/{autoId}

export interface Note {
  category: string;
  content: string;
  timestamp: Date;
}

export async function getNotes(userId: string): Promise<Note[]> {
  const snapshot = await db
    .collection('marco_notes')
    .doc(userId)
    .collection('items')
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      category: data.category,
      content: data.content,
      timestamp: data.timestamp?.toDate() || new Date(),
    };
  });
}

export async function addNote(userId: string, category: string, content: string): Promise<void> {
  await db
    .collection('marco_notes')
    .doc(userId)
    .collection('items')
    .add({
      category,
      content,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}

export async function deleteNote(userId: string, index: number): Promise<boolean> {
  const snapshot = await db
    .collection('marco_notes')
    .doc(userId)
    .collection('items')
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();

  if (index < 0 || index >= snapshot.docs.length) return false;
  await snapshot.docs[index].ref.delete();
  return true;
}
