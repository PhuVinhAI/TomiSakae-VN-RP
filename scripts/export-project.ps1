param(
  [string]$OutputPath,
  [switch]$ListOnly
)

$ErrorActionPreference = "Stop"

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$workingRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptDirectory ".."))
$gitRootText = (& git -C $workingRoot rev-parse --show-toplevel 2>$null | Out-String).Trim()

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($gitRootText)) {
  throw "Git worktree not found."
}

$repositoryRoot = [System.IO.Path]::GetFullPath($gitRootText)
$repositoryPrefix = $repositoryRoot.TrimEnd("\", "/") + [System.IO.Path]::DirectorySeparatorChar
$relativeFiles = @(
  & git -C $repositoryRoot ls-files --cached --others --exclude-standard |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
)

if ($LASTEXITCODE -ne 0) {
  throw "Unable to read the Git file list."
}

$includedFiles = @(
  foreach ($relativeFile in $relativeFiles) {
    $localRelativePath = $relativeFile.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    $sourcePath = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot $localRelativePath))

    if ($sourcePath.StartsWith($repositoryPrefix, [System.StringComparison]::OrdinalIgnoreCase) -and
        (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
      $relativeFile
    }
  }
)

if ($includedFiles.Count -eq 0) {
  throw "No eligible files found."
}

if ($ListOnly) {
  $includedFiles
  Write-Host "`nTotal: $($includedFiles.Count) files (respecting .gitignore)."
  exit 0
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $repositoryName = Split-Path -Leaf $repositoryRoot
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutputPath = Join-Path $repositoryRoot "exports\$repositoryName-handoff-$timestamp.zip"
} elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath = Join-Path $repositoryRoot $OutputPath
}

$archivePath = [System.IO.Path]::GetFullPath($OutputPath)
$archiveDirectory = Split-Path -Parent $archivePath
New-Item -ItemType Directory -Path $archiveDirectory -Force | Out-Null

$includedFiles = @(
  $includedFiles | Where-Object {
    $localRelativePath = $_.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot $localRelativePath)) -ne $archivePath
  }
)

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$fileStream = [System.IO.File]::Open(
  $archivePath,
  [System.IO.FileMode]::Create,
  [System.IO.FileAccess]::ReadWrite,
  [System.IO.FileShare]::None
)
$zipArchive = [System.IO.Compression.ZipArchive]::new(
  $fileStream,
  [System.IO.Compression.ZipArchiveMode]::Create,
  $false
)
try {
  foreach ($relativeFile in $includedFiles) {
    $localRelativePath = $relativeFile.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    $sourcePath = Join-Path $repositoryRoot $localRelativePath
    $entryName = $relativeFile.Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zipArchive,
      $sourcePath,
      $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $zipArchive.Dispose()
  $fileStream.Dispose()
}

$archive = Get-Item -LiteralPath $archivePath
Write-Host "Created: $($archive.FullName)"
Write-Host "Files: $($includedFiles.Count)"
Write-Host "Size: $([Math]::Round($archive.Length / 1KB, 1)) KB"
