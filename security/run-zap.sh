#!/usr/bin/env bash
# Ejecuta el plan de OWASP ZAP contra el entorno de PRUEBA (nunca contra producción).
# Uso: ZAP_HOME=/ruta/ZAP_2.17.0 ZAP_WEB_URL=... ZAP_API_URL=... ZAP_ADMIN_TOKEN=... ZAP_OUT_DIR=... security/run-zap.sh
# ZAP no sustituye variables de entorno en algunos campos (p. ej. la url del Replacer),
# por eso se genera un plan concreto en un archivo temporal privado que se borra al terminar.
set -euo pipefail
: "${ZAP_HOME:?}" "${ZAP_WEB_URL:?}" "${ZAP_API_URL:?}" "${ZAP_ADMIN_TOKEN:?}" "${ZAP_OUT_DIR:?}"
case "$ZAP_API_URL$ZAP_WEB_URL" in
  *127.0.0.1*|*localhost*) ;;
  *) echo "Solo se permite escanear un entorno local de prueba" >&2; exit 1 ;;
esac
umask 077
plan="$(mktemp --suffix=.yaml)"
trap 'rm -f "$plan"' EXIT
python3 -I - "$(dirname "$0")/zap-plan.yaml" "$plan" <<'PY'
import os, sys
src, dst = sys.argv[1], sys.argv[2]
text = open(src).read()
for k in ("ZAP_WEB_URL", "ZAP_API_URL", "ZAP_ADMIN_TOKEN", "ZAP_OUT_DIR"):
    text = text.replace("${%s}" % k, os.environ[k])
open(dst, "w").write(text)
PY
mkdir -p "$ZAP_OUT_DIR"
"$ZAP_HOME/zap.sh" -cmd -dir "${ZAP_DIR:-$ZAP_OUT_DIR/.zap-home}" -autorun "$plan"
