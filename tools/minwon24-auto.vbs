' Run by Windows Task Scheduler every 30 min (task: jeju-live minwon24 auto).
' Runs tools/minwon24-auto.js without a console window; output appended to tools/minwon24-auto.local.txt
' Waits until done (True) so the scheduler skips a new run while the previous one is still running.
CreateObject("WScript.Shell").Run "cmd /c cd /d C:\jeju-live && ""C:\Program Files\nodejs\node.exe"" tools\minwon24-auto.js >> tools\minwon24-auto.local.txt 2>&1", 0, True
