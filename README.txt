Skilleaze CV Builder · customer site (cvbuilder.skilleaze.com)
No login. CVs are saved in the visitor's browser.

Pages
  /                       ATS CV Builder (index.html)
  /europass-cv-builder    Europass CV Builder

Go live
 1. New GitHub repo (e.g. skilleaze/cvbuilder) → put all these files in it → push.
 2. Vercel → Add New Project → import the repo → Deploy (no build settings).
 3. Vercel → Settings → Domains → add cvbuilder.skilleaze.com and add the CNAME it shows at your domain provider.
 4. AI: in Terminal, from the folder that has supabase/:
      supabase functions deploy ai-public --no-verify-jwt
    (uses the same ANTHROPIC_API_KEY you already set)

Payments (later)
  cv-builder/client-config.js → SKC_PAYMENTS.enabled:false keeps downloads open.
  When the gateway is ready, set enabled:true and point window.SKC_PAY at your checkout.

Unlimited JD CVs (Tailor to a job)
  Customers paste the job description and get a new CV tailored to that job.
  Subscription: cv-builder/client-config.js → SKC_SUB. enabled:false = free during launch.
