// Skilleaze CV Builder (customer site) settings.
window.SKP_CONFIG={
  supabaseUrl:'https://ojshkwpvkzrkiwannqkk.supabase.co',
  supabaseAnonKey:'sb_publishable_m8RvHOepsDfqbMQxLDH_NA_qfv6Vc5G',
  aiEnabled:true,
  aiFunction:'ai-public'
};
// Payments run through Dodo Payments (cv-builder/dodo-pay.js sets SKC_PAY and SKC_SUBSCRIBE). No sample checkout.
window.SKC_PAYMENTS={enabled:true};
window.SKC_PAY=window.SKC_PAY||null;

// Unlimited JD CVs subscription (₹990 / AED 49 / $19.99 per month). Prices live in SUBT in ats-cv-builder.html and must match index.html and tailor.html.
// enabled:false = the module is free while you launch. To charge: enabled:true and set SKC_SUBSCRIBE
// to your gateway checkout; it must resolve true when the payment succeeds. Subscribers download free.
// trial: free days before the first charge (set the same Trial period on the Dodo product).
window.SKC_SUB={enabled:true,days:30,trial:2};
window.SKC_SUBSCRIBE=window.SKC_SUBSCRIBE||null;
