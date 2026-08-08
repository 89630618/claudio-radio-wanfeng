$ErrorActionPreference = "Stop"

$repoUrl = "https://github.com/MakcRe/KuGouMusicApi.git"
$repoRef = "06560e3e053bda1ab830750db6f645bab703f824"
$apiDir = Join-Path (Get-Location) ".data\external\kugou-api"
$sourceDir = $env:KUGOU_API_SOURCE_DIR
$port = if ($env:KUGOU_API_PORT) { $env:KUGOU_API_PORT } else { "3400" }
$hostName = if ($env:KUGOU_API_HOST) { $env:KUGOU_API_HOST } else { "127.0.0.1" }

Write-Host "Claudio KuGou API setup"
Write-Host "Target: $apiDir"
Write-Host "Host:   $hostName"
Write-Host "Port:   $port"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git is required to clone MakcRe/KuGouMusicApi."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm is required to install and run KuGouMusicApi."
}

New-Item -ItemType Directory -Force (Split-Path -Parent $apiDir) | Out-Null

if (Test-Path (Join-Path $apiDir ".git")) {
  Write-Host "Repository already exists; checking out the reviewed revision..."
  git -C $apiDir fetch --depth 1 origin $repoRef
  if ($LASTEXITCODE -ne 0) {
    throw "Could not fetch the reviewed KuGouMusicApi revision."
  }
  git -C $apiDir checkout --detach $repoRef
  if ($LASTEXITCODE -ne 0) {
    throw "Could not check out the reviewed KuGouMusicApi revision."
  }
} elseif (Test-Path $apiDir) {
  throw "Target directory exists but is not a git repository: $apiDir"
} elseif ($sourceDir -and (Test-Path (Join-Path $sourceDir "package.json"))) {
  Write-Host "Copying KuGouMusicApi from local source: $sourceDir"
  New-Item -ItemType Directory -Force $apiDir | Out-Null
  Copy-Item -Path (Join-Path $sourceDir "*") -Destination $apiDir -Recurse -Force
} else {
  Write-Host "Cloning KuGouMusicApi at the reviewed revision..."
  git clone --depth 1 $repoUrl $apiDir
  if ($LASTEXITCODE -ne 0) {
    throw "Clone failed. Check GitHub network access, then rerun this script."
  }
  git -C $apiDir fetch --depth 1 origin $repoRef
  if ($LASTEXITCODE -ne 0) {
    throw "Could not fetch the reviewed KuGouMusicApi revision."
  }
  git -C $apiDir checkout --detach $repoRef
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $apiDir ".git"))) {
    throw "Could not check out the reviewed KuGouMusicApi revision."
  }
}

Push-Location $apiDir
try {
  if ((Test-Path ".env.example") -and -not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
  }

  $envLines = @(
    "PORT=$port",
    "HOST=$hostName",
    "platform=lite"
  )
  Set-Content -LiteralPath ".env.claudio" -Value $envLines -Encoding UTF8

  Write-Host "Installing runtime dependencies..."
  npm install --omit=dev

  Write-Host ""
  Write-Host "KuGou API is ready."
  Write-Host "Start it with:"
  Write-Host "  cd `"$apiDir`""
  Write-Host "  `$Env:PORT='$port'; `$Env:HOST='$hostName'; node app.js"
  Write-Host ""
  Write-Host "Claudio should use:"
  Write-Host "  KUGOU_API_BASE_URL=http://$hostName`:$port"
} finally {
  Pop-Location
}
