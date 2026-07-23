# Contact form email setup

The website sends the contact forms and chatbot requests through the Node API.
In development, `npm start` launches Angular and the API together. In production,
the same API server can also serve the built Angular site.

1. Create a Resend account using `arystoto47@gmail.com`.
2. Create an API key in the Resend dashboard.
3. Open the existing `.env` file.
4. Paste your key after `RESEND_API_KEY=`.
5. For local development, start the website with `npm start`.
6. For production, build and run the combined site/API server:

   ```sh
   npm run build
   npm run serve
   ```

Set `GEMINI_API_KEY` in the deployed service environment so the chatbot can talk
to Gemini. Do not put the Gemini key directly in Angular/browser code.

## Vercel

Vercel does not run `api-server.mjs` for a static Angular deployment. The live
chatbot and contact form use the Vercel Functions in `api/chat.js` and
`api/contact.js`.

In Vercel, add these project environment variables, then redeploy:

```sh
GEMINI_API_KEY=your_gemini_key
RESEND_API_KEY=your_resend_key
```

The default sender is `Aristide Portfolio <onboarding@resend.dev>`. Resend permits
that testing sender when the recipient is the email associated with the Resend
account. For production, verify your own domain and replace
`RESEND_FROM_EMAIL` with an address on that domain.
