import { groq } from './llm.js';
import { getMessages, addMessage } from './db.js';
import { MARCO_SYSTEM_PROMPT } from './prompt.js';

const TEXT_MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'llama-4-scout-17b-16e-instruct';

export async function processMessage(userId: string, text: string, imageUrl?: string): Promise<string> {
  // Guardar mensaje del usuario (texto o descripción de imagen)
  await addMessage(userId, 'user', imageUrl ? `[Imagen enviada] ${text || ''}` : text);

  // Obtener historial
  const history = await getMessages(userId, 30);

  const useVision = !!imageUrl;

  // Construir mensajes
  const messages: any[] = [
    { role: 'system', content: MARCO_SYSTEM_PROMPT },
  ];

  // Añadir historial (siempre como texto)
  for (const msg of history.slice(0, -1)) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Último mensaje del usuario: con imagen o solo texto
  if (useVision) {
    const content: any[] = [];
    if (text) {
      content.push({ type: 'text', text });
    } else {
      content.push({ type: 'text', text: 'Analiza esta imagen y dame tu diagnóstico o solución.' });
    }
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

    const reply = completion.choices[0]?.message?.content || 'Sin respuesta.';

    await addMessage(userId, 'assistant', reply);
    return reply;
  } catch (error: any) {
    console.error('Error Groq:', error.message);
    return 'Error conectando con el modelo. Inténtalo de nuevo en un momento.';
  }
}
