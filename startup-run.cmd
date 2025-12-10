@echo off
cd /d %~dp0
powershell -NoProfile -ExecutionPolicy Bypass -Command "cd '%CD%'; npm run live"
