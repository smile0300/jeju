<#
  위챗(PC 4.x) 자동 발송 — UI Automation(내레이터가 읽는 정보)로 검색창·입력창을 찾고,
  검색 결과에 "WeChat ID: <id>"가 보일 때만(Windows 내장 OCR로 확인) 대화방을 열어 보낸다.

    powershell -STA -ExecutionPolicy Bypass -File tools\wechat-send.ps1 -WechatId rww12312 -Message "test" [-DryRun]

  출력 마지막 줄: OK <대화방 이름> | FAIL <이유>
  조건: 위챗 로그인·창 열림, PC 잠금 아님, 상대가 친구(위챗 ID 검색에 나와야 함). 보내는 2~3초 동안 위챗이 앞으로 나오고 클립보드를 잠깐 쓴다(끝나면 되돌림).
#>
param([Parameter(Mandatory)][string]$WechatId, [Parameter(Mandatory)][string]$Message, [switch]$DryRun, [switch]$ShowOcr)
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
  (Await ($eng.RecognizeAsync($sb)) ([Windows.Media.Ocr.OcrResult])).Text
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
Paste $WechatId

# 검색 결과 팝업(검색창 바로 아래)을 읽어 "ID: <id>" 확인 — 닉네임만 비슷한 다른 사람에게 보내지 않도록
# OCR은 1↔l, 0↔o 를 자주 헷갈린다 → 양쪽 다 같은 규칙으로 바꿔서 비교. 결과가 늦게 그려질 수 있어 최대 4번 읽음
function Canon($s) { (($s -replace '\s', '').ToLower() -replace '[il|!]', '1' -replace 'o', '0') }
$want = '1d[:：]' + [regex]::Escape((Canon $WechatId))
$r = $search.Current.BoundingRectangle
$found = $false
for ($try = 0; $try -lt 4 -and -not $found; $try++) {
  Start-Sleep -Milliseconds 900
  $text = Ocr ([int]$r.X - 60) ([int]($r.Y + $r.Height)) 720 260
  if ($ShowOcr) { "OCR: $text" }
  $found = (Canon $text) -match $want
}
if (-not $found) {
  [System.Windows.Forms.SendKeys]::SendWait('{ESC}')
  Fail "검색 결과에 위챗 ID $WechatId 가 안 보임 (친구가 아니거나 ID가 다름)"
}
if ($DryRun) { [System.Windows.Forms.SendKeys]::SendWait('{ESC}'); if ($script:oldClip) { [System.Windows.Forms.Clipboard]::SetText($script:oldClip) }; "OK dry-run (ID 확인됨)"; exit 0 }

[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
Start-Sleep -Milliseconds 1000
$input = $win.FindFirst($TS::Descendants, (Cond $A::AutomationIdProperty 'chat_input_field'))
if (-not $input) { Fail '입력창을 못 찾음' }
$opened = $input.Current.Name
$input.SetFocus(); Start-Sleep -Milliseconds 200
Paste $Message
Start-Sleep -Milliseconds 300
[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
Start-Sleep -Milliseconds 600
if ($script:oldClip) { [System.Windows.Forms.Clipboard]::SetText($script:oldClip) }
"OK $opened"
