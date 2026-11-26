import json, os, soundfile as sf, numpy as np
from kokoro import KPipeline
lines=json.load(open('lines.json'))
for lang,voices in [('a',['af_heart','am_michael']),('b',['bf_emma','bm_george'])]:
    p=KPipeline(lang_code=lang)
    for v in voices:
        os.makedirs('out/'+v,exist_ok=True)
        for k,t in lines:
            aud=[a for _,_,a in p(t,voice=v,speed=1.0)]
            a=np.concatenate([np.asarray(x) for x in aud])
            sf.write(f'out/{v}/{k}.wav',a,24000)
            print(v,k,len(a)/24000)
