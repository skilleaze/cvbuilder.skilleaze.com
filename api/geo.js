// Vercel function: returns the visitor's country from Vercel's own location header.
// Lives at /api/geo on cvbuilder.skilleaze.com. No setup needed beyond pushing this file.
export default function handler(req, res) {
  const c = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({ country: /^[A-Z]{2}$/.test(c) ? c : '' }));
}
