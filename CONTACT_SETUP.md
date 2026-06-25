# Contact form email setup

The website sends both contact forms through the local Node API and Resend.

1. Create a Resend account using `arystoto47@gmail.com`.
2. Create an API key in the Resend dashboard.
3. Open the existing `.env` file.
4. Paste your key after `RESEND_API_KEY=`.
5. Start the website with `npm start`. This now launches both Angular and the
   email API.

The default sender is `Aristide Portfolio <onboarding@resend.dev>`. Resend permits
that testing sender when the recipient is the email associated with the Resend
account. For production, verify your own domain and replace
`RESEND_FROM_EMAIL` with an address on that domain.
