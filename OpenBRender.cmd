@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24.11 or newer to run OpenBRender.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4173 in Chrome or Edge.
echo Keep this window open while using OpenBRender.
node scripts/serve-local.mjs
if errorlevel 1 pause
