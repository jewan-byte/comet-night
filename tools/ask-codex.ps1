# Claude → Codex 요청을 보내고, 질문과 답을 docs/협업로그.md 에 남긴다
# 사용: powershell -File tools/ask-codex.ps1 -Title "제목" -PromptFile 요청.txt
param(
  [Parameter(Mandatory = $true)][string]$Title,
  [Parameter(Mandatory = $true)][string]$PromptFile
)

$ErrorActionPreference = 'Continue'
$env:Path = "C:\Program Files\nodejs;$env:APPDATA\npm;C:\Program Files\Git\cmd;$env:Path"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$enc = New-Object System.Text.UTF8Encoding($false)
$prompt = [IO.File]::ReadAllText((Resolve-Path $PromptFile), $enc)

# 한글이 깨지지 않게 콘솔·파이프를 UTF-8로 (Codex 가 파일을 읽을 때도 이 콘솔을 쓴다)
chcp 65001 > $null
[Console]::OutputEncoding = $enc
$OutputEncoding = $enc

# Codex 는 읽기 전용으로만 — 파일은 Claude 가 고친다.
# 요청은 표준 입력(-)으로: .cmd 실행기는 인자 속 줄바꿈에서 잘라 버린다
$out = $prompt | & "$env:APPDATA\npm\codex.cmd" exec --sandbox read-only --skip-git-repo-check - 2>&1 | Out-String
# 마지막 답만 (codex exec 는 작업 과정을 먼저 찍고 끝에 최종 답을 한 번 더 찍는다)
$lines = $out -split "`r?`n"
$tok = [Array]::FindLastIndex($lines, [Predicate[string]]{ param($l) $l -match '^tokens used' })
$answer = if ($tok -ge 0 -and $tok + 2 -lt $lines.Length) { ($lines[($tok + 2)..($lines.Length - 1)] -join "`n").Trim() } else { $out.Trim() }

$log = Join-Path $root 'docs\협업로그.md'
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
$entry = @"

---

## $stamp — $Title

### 🟣 Claude → Codex
$prompt

### 🟢 Codex → Claude
$answer

"@
[IO.File]::AppendAllText($log, $entry, $enc)
Write-Output $answer
