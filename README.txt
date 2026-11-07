META PURCHASE FIX (cvbuilder.skilleaze.com)

1) Supabase > SQL Editor: paste meta-purchase-fix.sql, Run.
2) Supabase > Edge Functions:
   - dodo-checkout -> replace code with cvbuilder/supabase/functions/dodo-checkout/index.ts, Deploy.
   - dodo-webhook  -> replace code with cvbuilder/supabase/functions/dodo-webhook/index.ts, Deploy (Verify JWT OFF).
3) Supabase > Edge Functions > Secrets:
   META_CAPI_TOKEN      = token from Events Manager > dataset 1109298925311765 > Settings > Conversions API > Generate access token
   META_GRAPH_VERSION   = v21.0 (or the current version in Meta's docs)
   META_TEST_EVENT_CODE = TESTxxxxx from Events Manager > Test events (ONLY while testing, delete after)
4) Copy the cvbuilder/ HTML files and cv-builder/dodo-pay.js into the cvbuilder.skilleaze.com repo (Replace). Commit + Push.
5) Test: one small real purchase. In Test events you should see Purchase twice (Browser + Server) with the same event ID.
   Then delete META_TEST_EVENT_CODE.
6) Events Manager > Settings > Traffic permissions: allow only your real domains (not claude.ai / claudeusercontent.com).
