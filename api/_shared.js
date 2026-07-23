const contactRateLimit = new Map();

const chatSystemInstruction = [
  "You are Aristide's assistant, a concise portfolio chatbot for Aristide's website.",
  'Answer warmly in 1-3 short sentences.',
  'Help with questions about UX, design systems, frontend work, and contacting Aristide.',
  'If asked for private or unknown details, say you do not have that information and suggest using the contact section.',
].join(' ');

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

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
  if (req.body && typeof req.body === 'object') {
    resolve(req.body);
    return;
  }

  if (typeof req.body === 'string') {
    try {
      resolve(req.body ? JSON.parse(req.body) : {});
    } catch (error) {
      reject(error);
    }
    return;
  }

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

const cleanMultilineText = (value, maxLength = 5000) =>
  String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const isEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getClientIp = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  return forwardedFor || req.socket?.remoteAddress || 'unknown';
};

const checkContactRateLimit = (req) => {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 5;
  const key = getClientIp(req);
  const recent = (contactRateLimit.get(key) ?? []).filter(
    (timestamp) => now - timestamp < windowMs
  );

  if (recent.length >= maxRequests) {
    contactRateLimit.set(key, recent);
    return false;
  }

  recent.push(now);
  contactRateLimit.set(key, recent);
  return true;
};

const normalizeGeminiModelPath = (value) => {
  const modelName = String(value ?? '')
    .trim()
    .replace(/^models\//, '');

  return `models/${modelName || 'gemini-3.1-flash-lite'}`;
};

const formatGeminiContents = (history) => {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-8)
    .map((entry) => {
      const role = entry?.role === 'assistant' ? 'model' : 'user';
      const content = cleanText(entry?.content);
      return content ? { role, parts: [{ text: content }] } : null;
    })
    .filter(Boolean);
};

const getResponseText = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';

  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
};

const createChatReply = async ({ message, history }) => {
  const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite';

  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const userMessage = cleanText(message);
  if (!userMessage) {
    throw new Error('Message is required');
  }

  const modelPath = normalizeGeminiModelPath(geminiModel);
  const query = new URLSearchParams({ key: geminiApiKey });
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?${query}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: chatSystemInstruction }],
      },
      contents: [
        ...formatGeminiContents(history),
        { role: 'user', parts: [{ text: userMessage }] },
      ],
      generationConfig: {
        maxOutputTokens: 180,
        temperature: 0.7,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.error?.message || `Gemini request failed with ${response.status}`;
    throw new Error(detail);
  }

  return getResponseText(payload) || "I'm here, but I couldn't shape a reply just now.";
};

const sendContactEmail = async (body) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  const contactToEmail = process.env.CONTACT_TO_EMAIL ?? 'arystoto47@gmail.com';
  const contactFromEmail =
    process.env.RESEND_FROM_EMAIL ?? 'Aristide Portfolio <onboarding@resend.dev>';
  const name = cleanText(body?.name, 100);
  const email = cleanText(body?.email, 180).toLowerCase();
  const message = cleanMultilineText(body?.message, 5000);
  const website = cleanText(body?.website, 200);

  if (website) return { id: 'filtered' };

  if (name.length < 2) {
    throw new ApiError(400, 'Please enter your name');
  }
  if (!isEmail(email)) {
    throw new ApiError(400, 'Please enter a valid email address');
  }
  if (message.length < 10) {
    throw new ApiError(400, 'Please enter a little more detail about your project');
  }
  if (!resendApiKey) {
    throw new ApiError(
      503,
      'Email service is not configured. Add RESEND_API_KEY to Vercel and redeploy.'
    );
  }

  const emailSubject = 'New contact message from the website';
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(emailSubject);
  const safeMessage = escapeHtml(message).replaceAll('\n', '<br>');
  const text = [
    `New portfolio enquiry from ${name}`,
    '',
    `Email: ${email}`,
    `Subject: ${emailSubject}`,
    '',
    message,
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: contactFromEmail,
      to: [contactToEmail],
      reply_to: email,
      subject: emailSubject,
      text,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#161616;max-width:640px">
          <p style="margin:0 0 8px;color:#666;font-size:13px">New portfolio enquiry</p>
          <h1 style="margin:0 0 24px;font-size:26px">${safeSubject}</h1>
          <p><strong>From:</strong> ${safeName}</p>
          <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
          <div style="margin-top:24px;padding:20px;background:#f5f5f3;border-radius:12px">
            ${safeMessage}
          </div>
        </div>
      `,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.message || `Resend request failed with ${response.status}`;
    throw new ApiError(502, detail);
  }

  return payload;
};

const handleChatRequest = async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const reply = await createChatReply(body);
    sendJson(res, 200, { reply });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Request failed',
    });
  }
};

const handleContactRequest = async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  try {
    const body = await readJsonBody(req);

    if (!checkContactRateLimit(req)) {
      sendJson(res, 429, { error: 'Too many messages. Please try again in a few minutes.' });
      return;
    }

    await sendContactEmail(body);
    sendJson(res, 200, { success: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    sendJson(res, status, {
      error: error instanceof Error ? error.message : 'Request failed',
    });
  }
};

module.exports = {
  handleChatRequest,
  handleContactRequest,
};
