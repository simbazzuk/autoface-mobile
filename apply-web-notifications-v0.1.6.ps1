param([Parameter(Mandatory=$true)][string]$WebProjectRoot)
$ErrorActionPreference = 'Stop'
$patchRoot = Join-Path $PSScriptRoot 'web-patch'
$targets = @(
  @{ Source='app\api\mobile-push-token\route.ts'; Target='app\api\mobile-push-token\route.ts' },
  @{ Source='lib\server\push-notifications.ts'; Target='lib\server\push-notifications.ts' },
  @{ Source='lib\server\notifications.ts'; Target='lib\server\notifications.ts' }
)
foreach($item in $targets){
  $src=Join-Path $patchRoot $item.Source; $dst=Join-Path $WebProjectRoot $item.Target
  $dir=Split-Path $dst -Parent; New-Item -ItemType Directory -Force -Path $dir | Out-Null
  if(Test-Path $dst){Copy-Item $dst "$dst.v0.1.6.bak" -Force}
  Copy-Item $src $dst -Force
  Write-Host "Updated $($item.Target)"
}
Write-Host 'AutoFace v0.1.6 web notification patch applied.' -ForegroundColor Green
