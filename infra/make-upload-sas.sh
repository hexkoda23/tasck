#!/usr/bin/env bash
# Print a one-line curl command that uploads a file straight from the Emergent
# production shell into the TASCK Azure storage account (blob container
# `incoming`), using a short-lived, write-only SAS. Nothing else is needed on the
# Emergent side but curl and outbound HTTPS.
#
#   infra/make-upload-sas.sh production.archive.gz          # SAS valid 6 hours
#   infra/make-upload-sas.sh production.archive.gz 24        # SAS valid 24 hours
#
# Afterwards, fetch the blob to the operator workstation with
#   infra/make-upload-sas.sh --download production.archive.gz
set -euo pipefail
RG="${RG:-rg-tasck-prod}"
export MSYS_NO_PATHCONV=1
STORAGE="$(az storage account list -g "$RG" --query "[?starts_with(name,'sttasck')].name | [0]" -o tsv | tr -d '\r')"
KEY="$(az storage account keys list -g "$RG" -n "$STORAGE" --query "[0].value" -o tsv | tr -d '\r')"
CONTAINER=incoming
az storage container create --account-name "$STORAGE" --account-key "$KEY" --name "$CONTAINER" --public-access off -o none

if [[ "${1:-}" == "--download" ]]; then
  NAME="${2:?blob name}"
  DEST="$(command -v cygpath >/dev/null 2>&1 && cygpath -m -a "./$NAME" || realpath -m "./$NAME")"
  az storage blob download --account-name "$STORAGE" --account-key "$KEY" --container-name "$CONTAINER" --name "$NAME" --file "$DEST" -o none
  echo "downloaded ./$NAME ($(wc -c < "./$NAME") bytes)"
  exit 0
fi

NAME="${1:?file name to be uploaded, e.g. production.archive.gz}"
HOURS="${2:-6}"
EXPIRY="$(python -c "import datetime;print((datetime.datetime.utcnow()+datetime.timedelta(hours=$HOURS)).strftime('%Y-%m-%dT%H:%MZ'))")"
SAS="$(az storage blob generate-sas --account-name "$STORAGE" --account-key "$KEY" --container-name "$CONTAINER" --name "$NAME" --permissions cw --expiry "$EXPIRY" --https-only -o tsv | tr -d '\r')"
URL="https://$STORAGE.blob.core.windows.net/$CONTAINER/$NAME?$SAS"
echo "Run this on the machine that holds $NAME (valid until $EXPIRY UTC, write-only, this blob name only):"
echo
echo "curl -fsS -X PUT -H 'x-ms-blob-type: BlockBlob' -H 'x-ms-version: 2021-08-06' --data-binary @$NAME '$URL' && echo uploaded"
echo
echo "Then here:  infra/make-upload-sas.sh --download $NAME"
