import { groq } from './llm.js';
import { getMessages, addMessage, getNotes } from './db.js';
import { MARCO_SYSTEM_PROMPT, buildDynamicContext, extractMemos, cleanMemos } from './prompt.js';
import { addNote } from './db.js';

const TEXT_MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export async function processMessage(userId: string, text: string, imageUrl?: string): Promise<string> {
  // Guardar mensaje del usuario
  await addMessage(userId, 'user', imageUrl ? `[Imagen enviada] ${text || ''}` : text);

  // Obtener historial + notas en paralelo
  const [history, notes] = await Promise.all([
    getMessages(userId, 30),
    getNotes(userId),
  ]);

  const useVision = !!imageUrl;

  // Sistema: prompt base + contexto dinámico
  const dynamicContext = buildDynamicContext(notes);
  const messages: any[] = [
    { role: 'system', content: MARCO_SYSTEM_PROMPT },
    { role: 'system', content: dynamicContext },
  ];

  // Historial previo (todo menos el último mensaje que acabamos de añadir)
  for (const msg of history.slice(0, -1)) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Último mensaje: con imagen o solo texto
  if (useVision) {
    const content: any[] = [];
    content.push({ type: 'text', text: text || 'Analiza esta imagen y dame tu diagnóstico o solución.' });
    content.push({ type: 'image_url', image_url: { url: imageUrl } });
    messages.push({ role: 'user', content });
  } else {
    messages.push({ role: 'user', content: text });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: useVision ? VISION_MODEL : TEXT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const rawReply = completion.choices[0]?.message?.content || 'Sin respuesta.';

    // Extraer y guardar MEMOs antes de limpiar
    const memos = extractMemos(rawReply);
    if (memos.length > 0) {
      await Promise.all(memos.map(memo => addNote(userId, memo.category, memo.content)));
    }

    // Limpiar MEMOs del texto visible
    const reply = cleanMemos(rawReply);

    await addMessage(userId, 'assistant', reply);
    return reply;
  } catch (error: any) {
    console.error('Error Groq:', error.message);
    return 'Error conectando con el modelo. Inténtalo de nuevo en un momento.';
  }
}
