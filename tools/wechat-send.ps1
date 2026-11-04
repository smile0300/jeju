<#
  위챗(PC 4.x) 자동 발송 — UI Automation(내레이터가 읽는 정보)로 검색창·입력창을 찾고,
  검색 결과에 "WeChat ID: <id>"가 보일 때만(Windows 내장 OCR로 확인) 대화방을 열어 보낸다.

    powershell -STA -ExecutionPolicy Bypass -File tools\wechat-send.ps1 -WechatId rww12312 -Message "test" [-DryRun]

  출력 마지막 줄: OK <대화방 이름> | FAIL <이유>
  조건: 위챗 로그인·창 열림, PC 잠금 아님, 상대가 친구(위챗 ID 검색에 나와야 함). 보내는 2~3초 동안 위챗이 앞으로 나오고 클립보드를 잠깐 쓴다(끝나면 되돌림).
#>
# -Remark JL612 : 운영자가 친구 수락 때 달아 둔 备注(접수 코드)로 찾는다 — 위챗 ID 검색보다 확실하고 번호만 적은 고객도 된다
param([string]$WechatId, [string]$Remark, [Parameter(Mandatory)][string]$Message, [switch]$DryRun, [switch]$ShowOcr)
if (-not $WechatId -and -not $Remark) { "FAIL -WechatId 또는 -Remark 필요"; exit 1 }
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Windows.Forms, System.Drawing, System.Runtime.WindowsRuntime
Add-Type @'
using System; using System.Runtime.InteropServices;
public class WxW { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); }
'@
[WxW]::SetProcessDPIAware() | Out-Null
$A = [System.Windows.Automation.AutomationElement]
$TS = [System.Windows.Automation.TreeScope]
function Cond($prop, $val) { New-Object System.Windows.Automation.PropertyCondition($prop, $val) }
function Fail($why) { if ($script:oldClip) { [System.Windows.Forms.Clipboard]::SetText($script:oldClip) }; "FAIL $why"; exit 1 }
function Paste($text) { [System.Windows.Forms.Clipboard]::SetText($text); [System.Windows.Forms.SendKeys]::SendWait('^a'); [System.Windows.Forms.SendKeys]::SendWait('^v') }

# Windows 내장 OCR (WinRT) — 화면 일부의 글자를 읽는다
function Ocr($x, $y, $w, $h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  [System.Drawing.Graphics]::FromImage($bmp).CopyFromScreen($x, $y, 0, 0, $bmp.Size)
  $path = Join-Path $env:TEMP 'wx_ocr.png'; $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  $null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
  $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
  function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(); $t.Result }
  $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($path)) ([Windows.Storage.StorageFile])
  $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $sb = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $eng = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  # 줄 단위로 돌려준다 — 어느 줄에서 ID가 보였는지 가려야 하므로
  @((Await ($eng.RecognizeAsync($sb)) ([Windows.Media.Ocr.OcrResult])).Lines | ForEach-Object { $_.Text })
}

$proc = Get-Process -Name Weixin -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1
if (-not $proc) { Fail '위챗 창이 없음' }
$win = $A::RootElement.FindFirst($TS::Children, (Cond $A::ProcessIdProperty $proc.Id))
$search = $win.FindFirst($TS::Descendants, (New-Object System.Windows.Automation.AndCondition((Cond $A::ClassNameProperty 'mmui::XValidatorTextEdit'), (Cond $A::NameProperty 'Search'))))
if (-not $search) { Fail '검색창을 못 찾음' }

$script:oldClip = [System.Windows.Forms.Clipboard]::GetText()
[WxW]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null
# 다른 창이 앞에 있으면 Windows가 창 전환을 막는다 → Alt 키를 한 번 눌렀다 떼면 허용됨
[WxW]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [WxW]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
[WxW]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 500
if ([WxW]::GetForegroundWindow() -ne $proc.MainWindowHandle) { Fail '위챗 창을 앞으로 가져오지 못함' }
$search.SetFocus(); Start-Sleep -Milliseconds 200
Paste $(if ($Remark) { $Remark } else { $WechatId })

# 검색 결과 팝업(검색창 바로 아래)을 읽어 "ID: <id>" 확인 — 닉네임만 비슷한 다른 사람에게 보내지 않도록
# OCR은 1↔l, 0↔o 를 자주 헷갈린다 → 양쪽 다 같은 규칙으로 바꿔서 비교. 결과가 늦게 그려질 수 있어 최대 4번 읽음
function Canon($s) { (($s -replace '\s', '').ToLower() -replace '[il|!]', '1' -replace 'o', '0') }
# 검색어를 되풀이하는 줄("Search mobile/QQ ID: …", "Internet search results …", 搜索/查找/网络…)은 연락처가 아니다.
# 2026-11-04 이 줄의 "QQ ID: <검색어>" 때문에 친구가 아닌데도 통과 → 이미 열려 있던 다른 고객 대화방으로 오발송됨.
$echo = '(?i)search|qq|internet|mobile|phone|搜索|搜一搜|查找|网络|手机'
$idLine = '(1d|微信号)[:：]'
$want = $idLine + [regex]::Escape((Canon $WechatId)) + '$'   # 끝까지 정확히 일치 (abc 가 abc123 에 걸리지 않게)
if ($Remark) {
  # 备注 모드: 연락처 이름 줄이 코드와 정확히 같아야 함 (JL61 이 JL612 에 걸리지 않게)
  $idLine = '^j1\d'   # 접수 코드 모양(JL+숫자) 줄만 후보 — "Contacts" 같은 머리글은 빼고 다른 코드가 같이 뜨면 막힌다
  $want = '^' + [regex]::Escape((Canon $Remark)) + '$'
}
$r = $search.Current.BoundingRectangle
$found = $false; $others = 0
for ($try = 0; $try -lt 4 -and -not $found; $try++) {
  Start-Sleep -Milliseconds 900
  $lines = Ocr ([int]$r.X - 60) ([int]($r.Y + $r.Height)) 720 260
  if ($ShowOcr) { $lines | ForEach-Object { "OCR: $_" } }
  # OCR이 "ID:" 와 값을 두 줄로 나누기도 한다 → 검색어 줄이 아닌 줄은 다음 줄과 붙여서도 본다
  $cands = @(for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $echo) { continue }
    $c = Canon $lines[$i]
    if ($c -match ($idLine + '$') -and $i + 1 -lt $lines.Count) { $c += Canon $lines[$i + 1] }
    if ($c -match $idLine) { $c }
  })
  $found = @($cands | Where-Object { $_ -match $want }).Count -gt 0
  $others = @($cands | Where-Object { $_ -notmatch $want }).Count
}
if (-not $found) {
  [System.Windows.Forms.SendKeys]::SendWait('{ESC}')
  Fail '검색 결과에 그 위챗 ID의 연락처가 없음 (친구가 아니거나 ID가 다름) — 직접 안내 필요'
}
if ($others -gt 0) {
  # 다른 ID의 연락처도 같이 나오면 ENTER가 누구를 열지 모른다
  [System.Windows.Forms.SendKeys]::SendWait('{ESC}')
  Fail '검색 결과에 다른 연락처도 함께 나옴 — 직접 안내 필요'
}
if ($DryRun) { [System.Windows.Forms.SendKeys]::SendWait('{ESC}'); if ($script:oldClip) { [System.Windows.Forms.Clipboard]::SetText($script:oldClip) }; "OK dry-run (ID 확인됨)"; exit 0 }

# ENTER 전에 열려 있던 대화방 — ENTER 뒤에도 같으면 새 방이 안 열린 것(이전 고객 방에 붙여넣게 됨)
$before = $win.FindFirst($TS::Descendants, (Cond $A::AutomationIdProperty 'chat_input_field'))
$beforeName = if ($before) { $before.Current.Name } else { $null }
[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
Start-Sleep -Milliseconds 1000
$input = $win.FindFirst($TS::Descendants, (Cond $A::AutomationIdProperty 'chat_input_field'))
if (-not $input) { Fail '입력창을 못 찾음' }
$opened = $input.Current.Name
if ($beforeName -and $opened -eq $beforeName) {
  # 그 고객 방이 원래 열려 있던 경우도 여기서 막힌다 — 오발송보다 실패가 낫다
  [System.Windows.Forms.SendKeys]::SendWait('{ESC}')
  Fail '대화방이 바뀌지 않음 (새 방이 열리지 않았거나 이미 그 방이 열려 있었음) — 직접 확인 필요'
}
if ($Remark -and $opened -ne $Remark) {
  # 备注 모드에서는 열린 대화방 이름이 곧 코드여야 한다
  [System.Windows.Forms.SendKeys]::SendWait('{ESC}')
  Fail '열린 대화방 이름이 접수 코드와 다름 — 직접 확인 필요'
}
$input.SetFocus(); Start-Sleep -Milliseconds 200
Paste $Message
Start-Sleep -Milliseconds 300
[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
Start-Sleep -Milliseconds 600
if ($script:oldClip) { [System.Windows.Forms.Clipboard]::SetText($script:oldClip) }
"OK $opened"
