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

// Unlimited JD CVs subscription (₹1,000 / AED 50 / $20 per month).
// enabled:false = the module is free while you launch. To charge: enabled:true and set SKC_SUBSCRIBE
// to your gateway checkout; it must resolve true when the payment succeeds. Subscribers download free.
window.SKC_SUB={enabled:true,days:30};
window.SKC_SUBSCRIBE=window.SKC_SUBSCRIBE||null;
