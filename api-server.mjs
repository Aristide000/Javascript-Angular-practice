import { createServer } from 'node:http';

const port = Number.parseInt(process.env.CHAT_API_PORT ?? '3001', 10);
const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const apiKey = process.env.OPENAI_API_KEY;

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(payload));
};

const readJsonBody = (req) => new Promise((resolve, reject) => {
  let body = '';

  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 64_000) {
      reject(new Error('Request body is too large'));
      req.destroy();
    }
  });

  req.on('end', () => {
    try {
      resolve(body ? JSON.parse(body) : {});
    } catch (error) {
      reject(error);
    }
  });

  req.on('error', reject);
});

const cleanText = (value, maxLength = 1200) =>
  String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

const formatMessages = (history) => {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-8)
    .map((entry) => {
      const role = entry?.role === 'assistant' ? 'assistant' : 'user';
      const content = cleanText(entry?.content);
      return content ? { role, content } : null;
    })
    .filter(Boolean);
};

const getResponseText = (payload) => {
  const content = payload?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : '';
};

const createChatReply = async ({ message, history }) => {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const userMessage = cleanText(message);
  if (!userMessage) {
    throw new Error('Message is required');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'developer',
          content: [
            "You are Aristide, a concise portfolio co-pilot for Aristide's website.",
            'Answer warmly in 1-3 short sentences.',
            'Help with questions about UX, design systems, frontend work, and contacting Aristide.',
            'If asked for private or unknown details, say you do not have that information and suggest using the contact section.',
          ].join(' '),
        },
        ...formatMessages(history),
        { role: 'user', content: userMessage },
      ],
      max_tokens: 180,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.error?.message || `OpenAI request failed with ${response.status}`;
    throw new Error(detail);
  }

  return getResponseText(payload) || "I'm here, but I couldn't shape a reply just now.";
};

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.url !== '/api/chat' || req.method !== 'POST') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const reply = await createChatReply(body);
    sendJson(res, 200, { reply });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Chat request failed',
    });
  }
});

server.listen(port, () => {
  console.log(`Chat API proxy listening on http://localhost:${port}`);
});
