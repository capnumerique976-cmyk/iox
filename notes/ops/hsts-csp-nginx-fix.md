# HSTS + CSP — Correction Nginx VPS

## Problème
HSTS et CSP absents des headers HTTP sur iox.mycloud.yt.
Détecté par Agent 5 smoke test M116A.

## Correction recommandée (à appliquer sur rahiss-vps)

Dans le vhost nginx de iox.mycloud.yt, dans le bloc `server` HTTPS :

```nginx
# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# CSP — mode permissif initial (à durcir progressivement)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none';" always;
```

## Procédure
1. `ssh rahiss-vps "cat /etc/nginx/sites-enabled/iox.mycloud.yt"` — localiser le vhost
2. Backup : `ssh rahiss-vps "cp /etc/nginx/sites-enabled/iox.mycloud.yt{,.bak.$(date +%Y%m%d)}"`
3. Ajouter les headers dans le bloc server HTTPS
4. Tester : `ssh rahiss-vps "nginx -t"`
5. Recharger : `ssh rahiss-vps "systemctl reload nginx"`
6. Vérifier : `curl -sI https://iox.mycloud.yt/ | grep -i strict`

## Note
NE PAS ajouter HSTS en HTTP (bloc port 80) — uniquement HTTPS.
Le CSP permissif est un point de départ ; à durcir après audit des sources réelles.
