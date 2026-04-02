@echo off
setlocal

set "ROOT=%~dp0"
set "PROJECT=%ROOT%ConnectMessager.Desktop\ConnectMessager.Desktop.csproj"
set "OUT=%ROOT%artifacts\framework-dependent"

echo Publishing ConnectMessager desktop shell...
dotnet publish "%PROJECT%" ^
  -c Release ^
  -r win-x64 ^
  --self-contained false ^
  /p:PublishSingleFile=false ^
  /p:DebugType=None ^
  /p:DebugSymbols=false ^
  -o "%OUT%"

if errorlevel 1 (
  echo Publish failed.
  exit /b 1
)

echo.
echo Done. Output: %OUT%
exit /b 0
