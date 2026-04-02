@echo off
setlocal

set "ROOT=%~dp0"
set "PROJECT=%ROOT%ConnectMessager.Desktop\ConnectMessager.Desktop.csproj"
set "OUT=%ROOT%artifacts\single-file-offline"

echo Publishing ConnectMessager single-file offline build...
dotnet publish "%PROJECT%" ^
  -c Release ^
  -r win-x64 ^
  --self-contained true ^
  /p:PublishSingleFile=true ^
  /p:IncludeAllContentForSelfExtract=true ^
  /p:EnableCompressionInSingleFile=true ^
  /p:PublishTrimmed=false ^
  /p:DebugType=None ^
  /p:DebugSymbols=false ^
  -o "%OUT%"

if errorlevel 1 (
  echo Publish failed.
  exit /b 1
)

echo.
echo Done. Output: %OUT%
echo Note: the next step is an offline installer that bundles WebView2 Runtime and .NET Desktop Runtime.
exit /b 0
