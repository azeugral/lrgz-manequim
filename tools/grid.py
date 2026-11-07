import sys,cv2,numpy as np
for g in 'FM':
    a=cv2.imread(f'src/{g}.png'); print(g,a.shape,a[5,5],a[1000,1000],a[5,1000],a[1000,5])
    # mascara: distancia do fundo + canny preenchido
    bg=np.median(a[:30,:30].reshape(-1,3),axis=0)
    d=np.abs(a.astype(int)-bg).sum(2)
    print('d pct',np.percentile(d,[50,70,90]))
    o=cv2.resize(a,(1400,1400),interpolation=cv2.INTER_CUBIC); s=1400/1024
    for v in range(0,1024,50):
        c=(0,0,255) if v%100==0 else (0,200,255); p=int(v*s)
        cv2.line(o,(p,0),(p,1400),c,1); cv2.line(o,(0,p),(1400,p),c,1)
        if v%100==0:
            cv2.putText(o,str(v),(p+2,12),0,.45,(0,0,0),1); cv2.putText(o,str(v),(2,p+14),0,.45,(0,0,0),1)
    cv2.imwrite(f'grid{g}.jpg',o)
