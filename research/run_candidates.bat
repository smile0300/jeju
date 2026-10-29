@echo off
rem Runs 5 regions x 3 sizes (local, large, small) = 15 surveys in order.
rem A survey is skipped when its result file already exists, and retried up to 3 times when no file comes out.
rem So this file can be run again at any time: it only does what is still missing.
rem To run only some, shorten the two lists below.
setlocal
set REGIONS=east west south north mid
set SIZES=local large small
set MAX_TRIES=3

cd /d "%~dp0.."
for %%R in (%REGIONS%) do (
  for %%S in (%SIZES%) do call :survey %%R %%S
)

echo.
echo ===== Result =====
for %%R in (%REGIONS%) do (
  for %%S in (%SIZES%) do (
    if exist "research\candidates_%%R_%%S.csv" (echo [done]    %%R %%S) else (echo [missing] %%R %%S)
  )
)
endlocal
exit /b

:survey
set OUT=research\candidates_%1_%2.csv
if exist "%OUT%" (
  echo [skip] %1 %2 - already collected
  exit /b
)
set TRY=0
:retry
set /a TRY+=1
echo ===== %1 / %2  (try %TRY% of %MAX_TRIES%)  %date% %time% =====
agy --dangerously-skip-permissions --print "Follow the instructions in research/prompt_1_candidates.md. region: %1. size: %2." >> "research\run_log.txt" 2>&1
if exist "%OUT%" (
  echo [done] %1 %2
  exit /b
)
if %TRY% lss %MAX_TRIES% goto retry
echo [failed] %1 %2 - no result file after %MAX_TRIES% tries
exit /b
