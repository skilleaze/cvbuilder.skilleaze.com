Skilleaze CV Builder (Midnight Glass) - cvbuilder.skilleaze.com

Pages
  /                      index.html                Landing page (Midnight Glass)
  /tailor                tailor.html               Tailor to each job
  /ats-cv-builder        ats-cv-builder.html       International ATS CV builder (99 templates)
  /europass-cv-builder   europass-cv-builder.html  Europass CV builder

Push with GitHub Desktop
  1. In GitHub Desktop open your cvbuilder repo > Repository > Show in Finder.
  2. Delete everything in that folder EXCEPT the hidden .git folder.
  3. Copy all files from this folder into it.
  4. Back in GitHub Desktop: type a summary, Commit to main, then Push origin.

After deploy
  Supabase > Authentication > URL Configuration > Redirect URLs, add:
    https://cvbuilder.skilleaze.com/ats-cv-builder
    https://cvbuilder.skilleaze.com/europass-cv-builder
