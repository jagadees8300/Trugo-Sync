# Trugo Sync API smoke test - full surface
# Usage: powershell -ExecutionPolicy Bypass -File backend/scripts/api-smoke-test.ps1
#
# Coverage matrix (backend route -> frontend client)
# Auth:     POST login, GET/PATCH me, POST forgot/reset     -> authApi
# Users:    POST /, GET /, GET assignees                    -> usersApi
# Tasks:    POST/GET/PATCH/DELETE, status, comments, user   -> tasksApi
# Projects: CRUD, stages, detail, documents                 -> projectsApi (update/delete project not in FE yet)
# Dashboard: stats, my-stats, team, progress, deadlines, admin project detail -> dashboardApi
# Leave:    me/*, admin list/pending/dashboard/date/employee, approve/reject -> leaveApi
# Notifications: GET :userId, PATCH :id/read                -> notificationsApi
# Orphans:  GET / (health), empty RolesController           -> no FE client

$base = "http://localhost:5000"
$pass = 0
$fail = 0
$failures = @()
$tmpFile = Join-Path $env:TEMP "trugo-smoke-doc.txt"
$tmpImg = Join-Path $env:TEMP "trugo-smoke-avatar.png"

function Invoke-ApiTest {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Path,
    [string]$Token = $null,
    [object]$Body = $null,
    [int[]]$Expect = @(200, 201),
    [switch]$Multipart,
    [string]$FormFilePath = $null,
    [string]$FormFileField = "file",
    [hashtable]$FormFields = $null
  )
  try {
    if ($Multipart) {
      $curlArgs = @("-s", "-o", "$env:TEMP\trugo-smoke-body.txt", "-w", "%{http_code}", "-X", $Method, "$base$Path")
      if ($Token) { $curlArgs += @("-H", "Authorization: Bearer $Token") }
      if ($FormFields) {
        foreach ($k in $FormFields.Keys) {
          $curlArgs += @("-F", "$k=$($FormFields[$k])")
        }
      }
      if ($FormFilePath) {
        $curlArgs += @("-F", "${FormFileField}=@$FormFilePath")
      }
      $statusText = & curl.exe @curlArgs
      $status = [int]$statusText
      if (Test-Path "$env:TEMP\trugo-smoke-body.txt") {
        $script:lastBody = Get-Content "$env:TEMP\trugo-smoke-body.txt" -Raw -ErrorAction SilentlyContinue
      }
    } else {
      $params = @{
        Uri         = "$base$Path"
        Method      = $Method
        ContentType = "application/json"
        ErrorAction = "Stop"
      }
      if ($Token) { $params.Headers = @{ Authorization = "Bearer $Token" } }
      if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json -Depth 8) }
      $response = Invoke-WebRequest @params -UseBasicParsing
      $status = [int]$response.StatusCode
      $script:lastBody = $response.Content
    }
  } catch {
    $status = 0
    $script:lastBody = $null
    try {
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $status = [int]$_.Exception.Response.StatusCode.value__
        if (-not $status) { $status = [int]$_.Exception.Response.StatusCode }
      } elseif ($_.ErrorDetails -and $_.ErrorDetails.Message -match '"statusCode"\s*:\s*(\d+)') {
        $status = [int]$Matches[1]
      } elseif ($_.Exception.Message -match '\((\d{3})\)') {
        $status = [int]$Matches[1]
      }
    } catch { $status = 0 }
  }

  $ok = $Expect -contains $status
  if ($ok) { $script:pass++ } else { $script:fail++; $script:failures += "$Name => $status (expected $($Expect -join ','))" }
  Write-Host ("[{0}] {1} => {2}" -f ($(if ($ok) { "PASS" } else { "FAIL" }), $Name, $status))
  $script:lastOk = $ok
}

function Get-Json($Token, $Path) {
  return Invoke-RestMethod -Uri "$base$Path" -Headers @{ Authorization = "Bearer $Token" } -ErrorAction Stop
}

function Get-Token($email) {
  $body = @{ email = $email; password = "password" } | ConvertTo-Json
  return Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $body -ContentType "application/json"
}

# Minimal 1x1 PNG
$pngBytes = [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
[IO.File]::WriteAllBytes($tmpImg, $pngBytes)
"smoke-doc-$(Get-Date -Format yyyyMMddHHmmss)" | Set-Content -Path $tmpFile -Encoding UTF8

Write-Host "=== Health / Swagger ===" -ForegroundColor Cyan
Invoke-ApiTest -Name "GET / (health)" -Method GET -Path "/" -Expect @(200)
Invoke-ApiTest -Name "GET /api (Swagger UI)" -Method GET -Path "/api" -Expect @(200)
Invoke-ApiTest -Name "GET /api-json" -Method GET -Path "/api-json" -Expect @(200)

Write-Host "`n=== Auth ===" -ForegroundColor Cyan
$admin = Get-Token "admin@trugosync.com"
$gopi = Get-Token "gopi@trugosync.com"
$adminToken = $admin.access_token
$gopiToken = $gopi.access_token
$adminId = $admin.user._id
$gopiId = $gopi.user._id
if (-not $adminId) { $adminId = $admin.user.id }
if (-not $gopiId) { $gopiId = $gopi.user.id }

Invoke-ApiTest -Name "POST /auth/login" -Method POST -Path "/auth/login" -Body @{ email = "admin@trugosync.com"; password = "password" }
Invoke-ApiTest -Name "POST /auth/login invalid" -Method POST -Path "/auth/login" -Body @{ email = "bad@test.com"; password = "wrong" } -Expect @(401)
Invoke-ApiTest -Name "POST /auth/forgot-password" -Method POST -Path "/auth/forgot-password" -Body @{ email = "admin@trugosync.com" }
Invoke-ApiTest -Name "GET /auth/me" -Method GET -Path "/auth/me" -Token $adminToken
Invoke-ApiTest -Name "PATCH /auth/me (profile text)" -Method PATCH -Path "/auth/me" -Token $adminToken -Multipart -FormFields @{ name = "Admin"; designation = "Lead" }
Invoke-ApiTest -Name "PATCH /auth/me (avatar)" -Method PATCH -Path "/auth/me" -Token $adminToken -Multipart -FormFilePath $tmpImg -FormFileField "avatar" -FormFields @{ name = "Admin" }
Invoke-ApiTest -Name "GET /auth/me (employee)" -Method GET -Path "/auth/me" -Token $gopiToken

Write-Host "`n=== Users ===" -ForegroundColor Cyan
Invoke-ApiTest -Name "GET /users (admin)" -Method GET -Path "/users" -Token $adminToken
Invoke-ApiTest -Name "GET /users (employee)" -Method GET -Path "/users" -Token $gopiToken -Expect @(403)
Invoke-ApiTest -Name "GET /users/assignees" -Method GET -Path "/users/assignees" -Token $adminToken
Invoke-ApiTest -Name "POST /users no auth" -Method POST -Path "/users" -Body @{ name = "T"; email = "t@t.com"; password = "pass12" } -Expect @(401)
Invoke-ApiTest -Name "POST /users (employee denied)" -Method POST -Path "/users" -Token $gopiToken -Body @{ name = "T"; email = "t2@t.com"; password = "pass12" } -Expect @(403)
$smokeEmail = "smokeemp$(Get-Random -Maximum 99999)@trugosync.com"
Invoke-ApiTest -Name "POST /users (admin create employee)" -Method POST -Path "/users" -Token $adminToken -Body @{
  name = "Smoke Employee"
  email = $smokeEmail
  password = "password"
  designation = "QA"
}

Write-Host "`n=== Dashboard ===" -ForegroundColor Cyan
Invoke-ApiTest -Name "GET /dashboard/stats" -Method GET -Path "/dashboard/stats" -Token $adminToken
Invoke-ApiTest -Name "GET /dashboard/stats (employee)" -Method GET -Path "/dashboard/stats" -Token $gopiToken -Expect @(403)
Invoke-ApiTest -Name "GET /dashboard/my-stats" -Method GET -Path "/dashboard/my-stats" -Token $gopiToken
Invoke-ApiTest -Name "GET /dashboard/team-status" -Method GET -Path "/dashboard/team-status" -Token $adminToken
Invoke-ApiTest -Name "GET /dashboard/project-progress" -Method GET -Path "/dashboard/project-progress" -Token $adminToken
Invoke-ApiTest -Name "GET /dashboard/deadlines" -Method GET -Path "/dashboard/deadlines" -Token $adminToken

Write-Host "`n=== Projects (write + detail + docs) ===" -ForegroundColor Cyan
Invoke-ApiTest -Name "GET /projects (admin)" -Method GET -Path "/projects" -Token $adminToken
Invoke-ApiTest -Name "GET /projects (employee)" -Method GET -Path "/projects" -Token $gopiToken
Invoke-ApiTest -Name "POST /projects" -Method POST -Path "/projects" -Token $adminToken -Body @{
  name = "Smoke Project $(Get-Random -Maximum 9999)"
  clientName = "Smoke Client"
  description = "API smoke"
  teamMembers = @($gopiId)
  deadline = "2026-12-31"
}
$projects = Get-Json $adminToken "/projects"
$projectId = $projects[0]._id
if ($script:lastOk -and $script:lastBody) {
  try {
    $created = $script:lastBody | ConvertFrom-Json
    if ($created._id) { $projectId = $created._id }
  } catch { }
}
Invoke-ApiTest -Name "GET /projects/:id" -Method GET -Path "/projects/$projectId" -Token $adminToken
Invoke-ApiTest -Name "GET /projects/:id/detail (admin)" -Method GET -Path "/projects/$projectId/detail" -Token $adminToken
Invoke-ApiTest -Name "GET /projects/:id/detail (employee)" -Method GET -Path "/projects/$projectId/detail" -Token $gopiToken -Expect @(200)
Invoke-ApiTest -Name "GET /dashboard/projects/:id" -Method GET -Path "/dashboard/projects/$projectId" -Token $adminToken
Invoke-ApiTest -Name "GET /dashboard/projects/:id (employee)" -Method GET -Path "/dashboard/projects/$projectId" -Token $gopiToken -Expect @(403)
Invoke-ApiTest -Name "POST /projects/:id/stages" -Method POST -Path "/projects/$projectId/stages" -Token $adminToken -Body @{ name = "Smoke Stage $(Get-Random -Maximum 99)" }
Invoke-ApiTest -Name "GET /projects/:id/documents" -Method GET -Path "/projects/$projectId/documents" -Token $adminToken
Invoke-ApiTest -Name "POST /projects/:id/documents" -Method POST -Path "/projects/$projectId/documents" -Token $adminToken -Multipart -FormFilePath $tmpFile -FormFileField "file"
$docId = $null
if ($script:lastOk -and $script:lastBody) {
  try {
    $doc = $script:lastBody | ConvertFrom-Json
    $docId = $doc._id
  } catch { }
}
if (-not $docId) {
  try {
    $docs = Get-Json $adminToken "/projects/$projectId/documents"
    if ($docs -and $docs.Count -gt 0) { $docId = $docs[0]._id }
  } catch { }
}
if ($docId) {
  Invoke-ApiTest -Name "GET /projects/:id/documents/:docId" -Method GET -Path "/projects/$projectId/documents/${docId}?disposition=attachment" -Token $adminToken
  Invoke-ApiTest -Name "DELETE /projects/:id/documents/:docId" -Method DELETE -Path "/projects/$projectId/documents/$docId" -Token $adminToken
} else {
  Write-Host "[SKIP] document download/delete - no doc id" -ForegroundColor Yellow
}
Invoke-ApiTest -Name "PATCH /projects/:id" -Method PATCH -Path "/projects/$projectId" -Token $adminToken -Body @{ description = "Updated by smoke" }
Invoke-ApiTest -Name "DELETE /projects/:id (employee denied)" -Method DELETE -Path "/projects/$projectId" -Token $gopiToken -Expect @(403)

Write-Host "`n=== Tasks ===" -ForegroundColor Cyan
Invoke-ApiTest -Name "GET /tasks" -Method GET -Path "/tasks" -Token $adminToken
Invoke-ApiTest -Name "GET /tasks/user/:userId" -Method GET -Path "/tasks/user/$gopiId" -Token $adminToken
Invoke-ApiTest -Name "POST /tasks" -Method POST -Path "/tasks" -Token $adminToken -Body @{
  title = "Smoke Task $(Get-Random -Maximum 9999)"
  description = "API smoke"
  assignedTo = $gopiId
  projectId = "$projectId"
  priority = "MEDIUM"
  deadline = "2026-12-15"
}
$taskId = $null
if ($script:lastOk -and $script:lastBody) {
  try {
    $t = $script:lastBody | ConvertFrom-Json
    $taskId = $t._id
  } catch { }
}
if (-not $taskId) {
  $tasks = Get-Json $adminToken "/tasks"
  $taskId = $tasks[0]._id
}
Invoke-ApiTest -Name "GET /tasks/:id" -Method GET -Path "/tasks/$taskId" -Token $adminToken
Invoke-ApiTest -Name "PATCH /tasks/:id/status" -Method PATCH -Path "/tasks/$taskId/status" -Token $adminToken -Body @{ status = "IN_PROGRESS" }
Invoke-ApiTest -Name "PATCH /tasks/:id" -Method PATCH -Path "/tasks/$taskId" -Token $adminToken -Body @{ priority = "HIGH" }
Invoke-ApiTest -Name "POST /tasks/:id/comments" -Method POST -Path "/tasks/$taskId/comments" -Token $adminToken -Body @{ text = "API smoke comment" }
Invoke-ApiTest -Name "GET /tasks (employee)" -Method GET -Path "/tasks" -Token $gopiToken

Write-Host "`n=== Leave ===" -ForegroundColor Cyan
Invoke-ApiTest -Name "GET /leaves (admin)" -Method GET -Path "/leaves" -Token $adminToken
Invoke-ApiTest -Name "GET /leaves (employee)" -Method GET -Path "/leaves" -Token $gopiToken -Expect @(403)
Invoke-ApiTest -Name "GET /leaves/me" -Method GET -Path "/leaves/me" -Token $gopiToken
Invoke-ApiTest -Name "GET /leaves/me/summary" -Method GET -Path "/leaves/me/summary" -Token $gopiToken
Invoke-ApiTest -Name "GET /leaves/me/calendar" -Method GET -Path "/leaves/me/calendar" -Token $gopiToken
Invoke-ApiTest -Name "GET /leaves/pending" -Method GET -Path "/leaves/pending" -Token $adminToken
Invoke-ApiTest -Name "GET /leaves/dashboard" -Method GET -Path "/leaves/dashboard" -Token $adminToken
Invoke-ApiTest -Name "GET /leaves/date/:date" -Method GET -Path "/leaves/date/2026-07-09" -Token $adminToken
Invoke-ApiTest -Name "GET /leaves/attendance/:date" -Method GET -Path "/leaves/attendance/2026-07-09" -Token $adminToken
Invoke-ApiTest -Name "GET /leaves/attendance/:date (employee denied)" -Method GET -Path "/leaves/attendance/2026-07-09" -Token $gopiToken -Expect @(403)
Invoke-ApiTest -Name "GET /leaves/employee/:id" -Method GET -Path "/leaves/employee/$gopiId" -Token $gopiToken
$from = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
$to = (Get-Date).AddDays(31).ToString("yyyy-MM-dd")
Invoke-ApiTest -Name "POST /leaves" -Method POST -Path "/leaves" -Token $gopiToken -Body @{
  employeeId = $gopiId
  fromDate = $from
  toDate = $to
  leaveType = "CASUAL"
}
$leaveId = $null
if ($script:lastOk -and $script:lastBody) {
  try {
    $leaveRes = $script:lastBody | ConvertFrom-Json
    if ($leaveRes._id) { $leaveId = $leaveRes._id }
    elseif ($leaveRes.leave._id) { $leaveId = $leaveRes.leave._id }
  } catch { }
}
if (-not $leaveId) {
  try {
    $pending = Get-Json $adminToken "/leaves/pending"
    if ($pending -and $pending.Count -gt 0) { $leaveId = $pending[0]._id }
  } catch { }
}
if ($leaveId) {
  Invoke-ApiTest -Name "PATCH /leaves/:id/approve" -Method PATCH -Path "/leaves/$leaveId/approve" -Token $adminToken
  # Revert smoke leave so DB stays free of test leave rows lasting for Gopi
  Invoke-ApiTest -Name "PATCH /leaves/:id/reject (cleanup approved smoke)" -Method PATCH -Path "/leaves/$leaveId/reject" -Token $adminToken
} else {
  Write-Host "[SKIP] leave approve - no leave id" -ForegroundColor Yellow
}
$from2 = (Get-Date).AddDays(40).ToString("yyyy-MM-dd")
$to2 = (Get-Date).AddDays(41).ToString("yyyy-MM-dd")
Invoke-ApiTest -Name "POST /leaves (for reject)" -Method POST -Path "/leaves" -Token $gopiToken -Body @{
  employeeId = $gopiId
  fromDate = $from2
  toDate = $to2
  leaveType = "SICK"
}
$leaveId2 = $null
if ($script:lastOk -and $script:lastBody) {
  try {
    $leaveRes2 = $script:lastBody | ConvertFrom-Json
    if ($leaveRes2._id) { $leaveId2 = $leaveRes2._id }
    elseif ($leaveRes2.leave._id) { $leaveId2 = $leaveRes2.leave._id }
  } catch { }
}
if (-not $leaveId2) {
  try {
    $pending2 = Get-Json $adminToken "/leaves/pending"
    if ($pending2 -and $pending2.Count -gt 0) { $leaveId2 = $pending2[0]._id }
  } catch { }
}
if ($leaveId2) {
  Invoke-ApiTest -Name "PATCH /leaves/:id/reject" -Method PATCH -Path "/leaves/$leaveId2/reject" -Token $adminToken
} else {
  Write-Host "[SKIP] leave reject - no leave id" -ForegroundColor Yellow
}

Invoke-ApiTest -Name "GET /leaves/holidays" -Method GET -Path "/leaves/holidays" -Token $adminToken
Invoke-ApiTest -Name "GET /leaves/balances/me" -Method GET -Path "/leaves/balances/me" -Token $gopiToken
Invoke-ApiTest -Name "GET /attendance/me/today" -Method GET -Path "/attendance/me/today" -Token $gopiToken
Invoke-ApiTest -Name "GET /attendance/office-config" -Method GET -Path "/attendance/office-config" -Token $gopiToken
Invoke-ApiTest -Name "POST /attendance/check-location (at office)" -Method POST -Path "/attendance/check-location" -Token $gopiToken -Body @{
  latitude = 11.669207222195348
  longitude = 78.14333126167497
}
Invoke-ApiTest -Name "POST /attendance/check-location (outside)" -Method POST -Path "/attendance/check-location" -Token $gopiToken -Body @{
  latitude = 11.65
  longitude = 78.10
} -Expect @(200)
Invoke-ApiTest -Name "POST /attendance/clock-in (outside blocked)" -Method POST -Path "/attendance/clock-in" -Token $gopiToken -Body @{
  latitude = 11.65
  longitude = 78.10
} -Expect @(400)
Invoke-ApiTest -Name "POST /attendance/clock-in (at office)" -Method POST -Path "/attendance/clock-in" -Token $gopiToken -Body @{
  latitude = 11.669207222195348
  longitude = 78.14333126167497
} -Expect @(200, 201, 400)
Invoke-ApiTest -Name "POST /attendance/work-from-home (blocked if already in)" -Method POST -Path "/attendance/work-from-home" -Token $gopiToken -Body @{} -Expect @(200, 201, 400)
Invoke-ApiTest -Name "GET /reports/leave" -Method GET -Path "/reports/leave" -Token $adminToken
Invoke-ApiTest -Name "GET /reports/utilization" -Method GET -Path "/reports/utilization" -Token $adminToken
Invoke-ApiTest -Name "GET /reports/projects" -Method GET -Path "/reports/projects" -Token $adminToken

Write-Host "`n=== Notifications ===" -ForegroundColor Cyan
Invoke-ApiTest -Name "GET /notifications/me" -Method GET -Path "/notifications/me" -Token $gopiToken
Invoke-ApiTest -Name "GET /notifications/me/unread-count" -Method GET -Path "/notifications/me/unread-count" -Token $gopiToken
Invoke-ApiTest -Name "GET /notifications/:userId (assignee)" -Method GET -Path "/notifications/$gopiId" -Token $gopiToken
$notifId = $null
try {
  $notifs = Get-Json $gopiToken "/notifications/me"
  if ($notifs -and $notifs.Count -gt 0) { $notifId = $notifs[0]._id }
} catch { }
if ($notifId) {
  Invoke-ApiTest -Name "PATCH /notifications/:id/read" -Method PATCH -Path "/notifications/$notifId/read" -Token $gopiToken
} else {
  Write-Host "[SKIP] mark-read - no notification" -ForegroundColor Yellow
}

Write-Host "`n=== Cleanup smoke data ===" -ForegroundColor Cyan
if ($taskId) {
  Invoke-ApiTest -Name "DELETE /tasks/:id" -Method DELETE -Path "/tasks/$taskId" -Token $adminToken
}
if ($projectId) {
  Invoke-ApiTest -Name "DELETE /projects/:id (cleanup smoke project)" -Method DELETE -Path "/projects/$projectId" -Token $adminToken
}

Remove-Item -Path $tmpFile, $tmpImg -ErrorAction SilentlyContinue

Write-Host "`n========== SUMMARY ==========" -ForegroundColor Yellow
Write-Host "PASS: $pass  FAIL: $fail  TOTAL: $($pass + $fail)"
Write-Host "Note: projects/tasks/leave are created only via API in this test, then deleted."
Write-Host "FE gaps (backend exists, no client): PATCH/DELETE /projects/:id"
Write-Host "Backend orphans (no FE): GET /, empty RolesController"
if ($fail -gt 0) {
  $failures | ForEach-Object { Write-Host $_ -ForegroundColor Red }
  exit 1
}
Write-Host "All tested endpoints passed." -ForegroundColor Green
exit 0
