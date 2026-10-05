<#
.SYNOPSIS
  Rotate a TASCK production credential stored in Key Vault, then roll tasck-api onto it.

.DESCRIPTION
  Production reads its credentials from Key Vault (kv-tasck-prod-dcycxfri) through
  Container App secret references and the managed identity id-tasck-prod. Rotation
  therefore needs no code or app configuration change:

    1. Create the new credential at the provider (keep the old one active for now).
    2. Run this script: it prompts for the new value (hidden), stores it as a new
       Key Vault version, and creates a new tasck-api revision, which reads the
       current secret versions when it starts. Traffic moves only when the new
       revision is healthy, so there is no downtime.
    3. Check the feature that uses it, then revoke the old credential at the provider.

  The value is never echoed, logged or passed on a command line. It exists only in
  memory and, for the moment Key Vault reads it, in a temp file readable only by you
  that is deleted immediately.

  This script does not touch the database, images, scale or any other setting.

.EXAMPLE
  ./deploy/azure/rotate-secret.ps1 -SecretName serpapi-api-key
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('serpapi-api-key', 'smtp-username', 'smtp-password', 'anthropic-api-key')]
    [string] $SecretName,

    [string] $ResourceGroup = 'rg-tasck-prod',
    [string] $VaultName = 'kv-tasck-prod-dcycxfri',
    [string] $AppName = 'tasck-api',
    [string] $WebApp = 'tasck-web'
)

$ErrorActionPreference = 'Stop'

function Read-HiddenValue([string] $Prompt) {
    $secure = Read-Host -Prompt $Prompt -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

# The app must already reference this Key Vault secret (it does for all four names).
$ref = az containerapp show -g $ResourceGroup -n $AppName `
    --query "properties.configuration.secrets[?name=='$SecretName'].keyVaultUrl | [0]" -o tsv
if (-not $ref -or $ref -notlike "https://$VaultName.vault.azure.net/secrets/$SecretName*") {
    throw "$AppName does not reference $VaultName/$SecretName (got '$ref'). Stopping without changes."
}
if ($ref -match '/secrets/[^/]+/[0-9a-f]{32}$') {
    throw "$AppName pins a specific version of $SecretName ($ref). Point it at the unversioned URL first."
}

$first = Read-HiddenValue "New value for $SecretName"
$second = Read-HiddenValue "Repeat the new value"
if ([string]::IsNullOrWhiteSpace($first)) { throw 'Empty value. Nothing changed.' }
if ($first -cne $second) { throw 'Values did not match. Nothing changed.' }
$second = $null

$tmp = [IO.Path]::Combine([IO.Path]::GetTempPath(), [IO.Path]::GetRandomFileName())
try {
    [IO.File]::WriteAllText($tmp, $first, (New-Object Text.UTF8Encoding $false))
    $first = $null
    icacls $tmp /inheritance:r /grant:r "$($env:USERNAME):(R,W,D)" | Out-Null
    $version = az keyvault secret set --vault-name $VaultName --name $SecretName --file $tmp --encoding utf-8 `
        --query "id" -o tsv
}
finally {
    if (Test-Path $tmp) { Remove-Item $tmp -Force }
}
Write-Host "Stored new Key Vault version: $($version.Split('/')[-1])"

$suffix = 'rot-' + (Get-Date).ToUniversalTime().ToString('yyyyMMddHHmm')
Write-Host "Creating revision $AppName--$suffix (same image and settings, fresh secret values)..."
az containerapp update -g $ResourceGroup -n $AppName --revision-suffix $suffix --only-show-errors -o none

$revision = "$AppName--$suffix"
for ($i = 0; $i -lt 60; $i++) {
    $state = az containerapp revision show -g $ResourceGroup -n $AppName --revision $revision `
        --query "properties.runningState" -o tsv 2>$null
    $ready = az containerapp show -g $ResourceGroup -n $AppName --query "properties.latestReadyRevisionName" -o tsv
    Write-Host "  $revision state=$state ready=$ready"
    if ($ready -eq $revision -and $state -in @('Running', 'RunningAtMaxScale')) { break }
    if ($state -in @('Failed', 'Degraded')) { throw "$revision failed to start. The previous revision keeps serving traffic; check the logs." }
    Start-Sleep -Seconds 10
}
if ($ready -ne $revision) { throw "$revision did not become ready in time. The previous revision keeps serving traffic." }

$fqdn = az containerapp show -g $ResourceGroup -n $WebApp --query "properties.configuration.ingress.fqdn" -o tsv
$health = Invoke-RestMethod -Uri "https://$fqdn/api/health" -TimeoutSec 30
Write-Host "API health through the web endpoint: $($health.status)"
Write-Host ''
Write-Host "Done. Check the feature that uses $SecretName, then revoke the OLD credential at the provider."
