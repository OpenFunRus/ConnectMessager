@echo off
setlocal EnableExtensions

set "PROJECT_ROOT=%~dp0"
for %%I in ("%PROJECT_ROOT%.") do set "PROJECT_ROOT=%%~fI"

echo [1/3] Stopping ConnectMessager-related processes...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = [System.IO.Path]::GetFullPath('%PROJECT_ROOT%');" ^
  "$targets = @('connectmessager-server.exe','opencord-server.exe','bun.exe','node.exe');" ^
  "$procs = Get-CimInstance Win32_Process | Where-Object {" ^
    "$targets -contains $_.Name -and (" ^
      "$_.Name -in @('connectmessager-server.exe','opencord-server.exe') -or " ^
      "($_.CommandLine -and (" ^
        "$_.CommandLine -match 'connectmessager|opencord' -or " ^
        "$_.CommandLine -like ('*' + $root + '*')" ^
      "))" ^
    ")" ^
  "};" ^
  "if (-not $procs) { Write-Host 'No related processes found.'; exit 0 };" ^
  "$procs | ForEach-Object {" ^
    "Write-Host ('Stopping PID ' + $_.ProcessId + ' (' + $_.Name + ')');" ^
    "Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue" ^
  "}"

echo.
echo [2/3] Building Windows executable...
pushd "%PROJECT_ROOT%\apps\server" || (echo Failed to open apps\server folder.& exit /b 1)
call bun run build:windows
set "BUILD_EXIT_CODE=%ERRORLEVEL%"
popd

if not "%BUILD_EXIT_CODE%"=="0" (
  echo.
  echo Build failed with code %BUILD_EXIT_CODE%.
  exit /b %BUILD_EXIT_CODE%
)

echo.
echo [3/3] Build completed:
echo %PROJECT_ROOT%\apps\server\build\out\connectmessager-server.exe
exit /b 0
