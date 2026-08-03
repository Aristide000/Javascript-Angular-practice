import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

try {
  loadEnvFile();
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

const port = Number.parseInt(process.env.PORT ?? process.env.CHAT_API_PORT ?? '3001', 10);
const staticSiteDir = resolve(
  process.env.STATIC_SITE_DIR ?? resolve(__dirname, 'dist', 'angular-forms-demo', 'browser')
);
const geminiModel = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite';
const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const contactToEmail = process.env.CONTACT_TO_EMAIL ?? 'arystoto47@gmail.com';
const contactFromEmail =
  process.env.RESEND_FROM_EMAIL ?? 'Aristide Portfolio <onboarding@resend.dev>';
const contactRateLimit = new Map();
const chatSystemInstruction = [
  "You are Aristide's assistant, a concise portfolio chatbot for Aristide's website.",
  'Answer warmly in 1-3 short sentences.',
  'Help with questions about UX, design systems, frontend work, and contacting Aristide.',
  'If asked for private or unknown details, say you do not have that information and suggest using the contact section.',
].join(' ');

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

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

const sendPlainText = (res, status, message) => {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  res.end(message);
};

const getRequestPathname = (req) => {
  try {
    return new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;
  } catch (_) {
    return '/';
  }
};

const isApiPath = (req) => getRequestPathname(req).startsWith('/api/');

const getStaticFilePath = async (pathname) => {
  let safePathname = '/';

  try {
    safePathname = decodeURIComponent(pathname).replaceAll('\\', '/');
  } catch (_) {
    return null;
  }

  const requestedPath = safePathname === '/' ? '/index.html' : safePathname;
  const candidatePath = resolve(staticSiteDir, `.${requestedPath}`);
  const relativePath = relative(staticSiteDir, candidatePath);

  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    return null;
  }

  try {
    const fileStats = await stat(candidatePath);
    if (fileStats.isFile()) return candidatePath;
  } catch (_) {}

  if (!extname(requestedPath)) {
    return resolve(staticSiteDir, 'index.html');
  }

  return null;
};

const serveStaticSite = async (req, res) => {
  const pathname = getRequestPathname(req);
  const filePath = await getStaticFilePath(pathname);

  if (!filePath) {
    sendPlainText(res, 404, 'Not found');
    return;
  }

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendPlainText(res, 404, 'Not found');
      return;
    }

    res.writeHead(200, {
      'Cache-Control': extname(filePath) === '.html'
        ? 'no-cache'
        : 'public, max-age=31536000, immutable',
      'Content-Length': fileStats.size,
      'Content-Type': contentTypes.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    createReadStream(filePath).pipe(res);
  } catch (_) {
    sendPlainText(
      res,
      503,
      'The Angular build was not found. Run "npm run build" before starting the production server.'
    );
  }
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

const checkContactRateLimit = (req) => {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 5;
  const key = req.socket.remoteAddress ?? 'unknown';
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
  const name = cleanText(body?.name, 100);
  const email = cleanText(body?.email, 180).toLowerCase();
  const message = cleanMultilineText(body?.message, 5000);
  const website = cleanText(body?.website, 200);

  // Honeypot fields are invisible to real visitors.
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
      'Email service is not configured. Add RESEND_API_KEY to the .env file and restart the server.'
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

const server = createServer(async (req, res) => {
  if (!isApiPath(req)) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendPlainText(res, 404, 'Not found');
      return;
    }

    await serveStaticSite(req, res);
    return;
  }

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

    if (req.url === '/api/chat') {
      const reply = await createChatReply(body);
      sendJson(res, 200, { reply });
      return;
    }

    if (req.url === '/api/contact') {
      if (!checkContactRateLimit(req)) {
        sendJson(res, 429, { error: 'Too many messages. Please try again in a few minutes.' });
        return;
      }

      await sendContactEmail(body);
      sendJson(res, 200, { success: true });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    sendJson(res, status, {
      error: error instanceof Error ? error.message : 'Request failed',
    });
  }
});

server.listen(port, () => {
  console.log(`Portfolio site and API listening on http://localhost:${port}`);
});
