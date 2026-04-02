import { groq } from './llm.js';
import { getMessages, addMessage } from './db.js';
import { MARCO_SYSTEM_PROMPT } from './prompt.js';

export async function processMessage(userId: string, text: string): Promise<string> {
  // Guardar mensaje del usuario
  await addMessage(userId, 'user', text);

  // Obtener historial
  const history = await getMessages(userId, 30);
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: MARCO_SYSTEM_PROMPT },
    ...history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  ];

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const reply = completion.choices[0]?.message?.content || 'Sin respuesta.';

    // Guardar respuesta del asistente
    await addMessage(userId, 'assistant', reply);

    return reply;
  } catch (error: any) {
    console.error('Error Groq:', error.message);
    return 'Error conectando con el modelo. Inténtalo de nuevo en un momento.';
  }
}
