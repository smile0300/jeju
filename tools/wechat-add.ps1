<#
  위챗(PC 4.x) 친구 추가 — 위챗 ID를 '위챗 ID 검색'(Add Contacts 창)으로 찾아 이미 친구인지 보고, 아니면 친구 요청을 보낸다.
  화면 글자를 OCR로 읽지 않고 UI Automation 값만 쓴다(프로필의 "WeChat ID:" 값이 검색한 ID와 정확히 같을 때만 진행).

    powershell -STA -ExecutionPolicy Bypass -File tools\wechat-add.ps1 -WechatId abc123 [-Remark JL635] [-Hello "인사말"] [-DryRun] [-Dump]

  출력 마지막 줄: OK friend(이미 친구) | OK requested(요청 보냄) | OK dry-run … | FAIL <이유>
  조건: 위챗 로그인·창 열림, PC 잠금 아님. 2~5초 동안 위챗이 앞으로 나오고 클립보드를 잠깐 쓴다(끝나면 되돌림).
#>
# -CheckOnly : 친구인지만 본다(친구가 아니어도 요청을 보내지 않음 → OK not-friend)
# -Message   : 친구로 확인되면(이미 친구·방금 친구가 됨) 프로필의 Messages 버튼으로 그 사람 대화방을 열어 보낸다 → 끝에 ' sent' / ' send-fail <이유>'
# -NoEnter   : (시험용) 대화방에 붙여 넣기까지만 하고 지운다 — 실제로 보내지 않음 → ' typed-only'
# -Local     : 위챗 서버에 ID 검색을 하지 않고 내 연락처에서 备注($Remark, 접수 코드)로만 찾는다 — 친구 수락 여부 확인용(검색 횟수 제한 없음)
param([string]$WechatId, [string]$Remark, [string]$Hello, [string]$Message, [switch]$CheckOnly, [switch]$Local, [switch]$DryRun, [switch]$Dump, [switch]$NoEnter)
if ($Local -and -not $Remark) { "FAIL -Local 은 -Remark 필요"; exit 1 }
if (-not $Local -and -not $WechatId) { "FAIL -WechatId 필요"; exit 1 }
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Windows.Forms
Add-Type @'
using System; using System.Runtime.InteropServices;
public class WxA { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, UIntPtr e);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  // 위챗 메인 창 — 트레이로 숨겨져 있어도 찾는다 (따로 띄운 대화창이 있으면 Process.MainWindowHandle 은 그 창을 가리킨다)
  // 검색 팝업도 제목이 같은 별도 창이라 후보를 모두 돌려주고, 부르는 쪽이 창 종류(mmui::MainWindow)로 고른다
  public static System.Collections.Generic.List<IntPtr> TitledWindows(int[] pids) { var found = new System.Collections.Generic.List<IntPtr>();
    EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); if (Array.IndexOf(pids, (int)p) < 0) return true;
      var t = new System.Text.StringBuilder(64); GetWindowText(h, t, 64); string s = t.ToString();
      if (s == "WeChat" || s == "Weixin" || s == "微信") found.Add(h); return true; }, IntPtr.Zero);
    return found; }
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, int x, int y, uint d, UIntPtr e); }
'@
[WxA]::SetProcessDPIAware() | Out-Null
$A = [System.Windows.Automation.AutomationElement]
$TS = [System.Windows.Automation.TreeScope]
$True_ = [System.Windows.Automation.Condition]::TrueCondition
function Cond($prop, $val) { New-Object System.Windows.Automation.PropertyCondition($prop, $val) }
function Paste($text) { [System.Windows.Forms.Clipboard]::SetText($text); [System.Windows.Forms.SendKeys]::SendWait('^a'); [System.Windows.Forms.SendKeys]::SendWait('^v') }
function Click($el) {
  $r = $el.Current.BoundingRectangle
  [WxA]::SetCursorPos([int]($r.X + $r.Width / 2), [int]($r.Y + $r.Height / 2)) | Out-Null
  Start-Sleep -Milliseconds 150
  [WxA]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero); [WxA]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
}
# 위챗 프로세스의 최상위 창 중 클래스 이름이 맞는 것 (Add Contacts 창·친구 요청 창은 메인 창과 별개의 창)
function WxWindow($class) {
  foreach ($t in $A::RootElement.FindAll($TS::Children, (Cond $A::ClassNameProperty $class))) { if ($script:pids -contains $t.Current.ProcessId) { return $t } }
  $null
}
function CloseWin($w) { try { $w.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern).Close() } catch {} }
# 자동화 ID가 $suffix 로 끝나는 요소 (ID가 부모 경로까지 붙어 길다)
function BySuffix($root, $suffix) {
  foreach ($e in $root.FindAll($TS::Descendants, $True_)) { if ($e.Current.AutomationId -and $e.Current.AutomationId.EndsWith($suffix)) { return $e } }
  $null
}
function DumpTree($root) {
  foreach ($e in $root.FindAll($TS::Descendants, $True_)) {
    $c = $e.Current; $r = $c.BoundingRectangle
    if ($r.Width -le 0 -or $c.IsOffscreen -or (-not $c.Name -and $c.ControlType.ProgrammaticName -notmatch 'Edit|Button|CheckBox')) { continue }
    $id = ($c.AutomationId -split '\.')[-1]
    "  $($c.ControlType.ProgrammaticName -replace 'ControlType\.','') [$($c.ClassName)] id='$id' name='$($c.Name)' $([int]$r.X),$([int]$r.Y) $([int]$r.Width)x$([int]$r.Height)"
  }
}
function Done($line, $code) {
  foreach ($c in 'mmui::VerifyFriendWindow', 'mmui::AddFriendWindow') { $w = WxWindow $c; if ($w) { CloseWin $w } }
  if ($script:oldClip) { [System.Windows.Forms.Clipboard]::SetText($script:oldClip) }
  $line; exit $code
}
function Fail($why) { Done "FAIL $why" 1 }
# 메인 창에 $expect 이름의 대화방이 열려 있을 때만 붙여 넣고 보낸다. 돌려주는 값: 'sent' 또는 'send-fail <이유>'
function SendTo($expect, $text) {
  $input = $null
  for ($i = 0; $i -lt 10 -and -not $input; $i++) {
    Start-Sleep -Milliseconds 400
    $w = $null; try { $w = $A::FromHandle($proc.MainWindowHandle) } catch {}
    if ($w) { $input = $w.FindFirst($TS::Descendants, (Cond $A::AutomationIdProperty 'chat_input_field')) }
    if ($input -and $input.Current.Name.Trim() -ne $expect) { $input = $null }
  }
  if (-not $input) { return 'send-fail 그 고객 대화방이 열리지 않음' }
  [WxA]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
  Start-Sleep -Milliseconds 300
  if ([WxA]::GetForegroundWindow() -ne $proc.MainWindowHandle) { return 'send-fail 위챗 창이 앞에 있지 않음' }
  Click $input; Start-Sleep -Milliseconds 300
  # 클릭 뒤에도 같은 방인지 한 번 더 (그 사이 다른 대화가 열렸으면 보내지 않는다)
  $again = $A::FromHandle($proc.MainWindowHandle).FindFirst($TS::Descendants, (Cond $A::AutomationIdProperty 'chat_input_field'))
  # 입력창을 누르면 이름 뒤에 안내문이 붙는다('JL635Hold mouse to input by voice') → 방금 정확히 확인한 이름으로 시작하는지만 본다
  if (-not $again -or -not $again.Current.Name.StartsWith($expect)) { return 'send-fail 대화방이 바뀜' }
  Paste $text; Start-Sleep -Milliseconds 300
  if ($NoEnter) {
    $v = ''; try { $v = $again.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value } catch { $v = '(값 못 읽음)' }
    [System.Windows.Forms.SendKeys]::SendWait('^a{BS}')
    return "typed-only ($($v.Length)자)"
  }
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
  Start-Sleep -Milliseconds 600
  'sent'
}
# Add Contacts 창의 친구 프로필에서 Messages 버튼 → 그 사람 대화방 (프로필의 표시 이름 = 대화방 이름)
function SendFromProfile($add, $text) {
  $dn = BySuffix $add 'display_name_text'; $btn = BySuffix $add 'chat_img_button'
  $expect = if ($dn) { $dn.Current.Name.Trim() } else { '' }
  if (-not $btn -or -not $expect) { return 'send-fail 프로필에서 대화 버튼을 못 찾음' }
  Click $btn
  SendTo $expect $text
}

$procs = @(Get-Process -Name Weixin -ErrorAction SilentlyContinue)
$script:pids = @($procs | ForEach-Object { $_.Id })
$mainH = [IntPtr]::Zero
foreach ($h in [WxA]::TitledWindows([int[]]$script:pids)) {
  $cls = ''; try { $cls = $A::FromHandle($h).Current.ClassName } catch {}
  if ($cls -eq 'mmui::MainWindow') { $mainH = $h; break }
}
if ($mainH -eq [IntPtr]::Zero) { "FAIL 위챗 창이 없음"; exit 1 }
$proc = New-Object psobject -Property @{ MainWindowHandle = $mainH }
# 트레이로 숨겨진 상태(창 닫기·ESC)면 위챗의 '열기' 단축키 Ctrl+Alt+W 로 꺼낸다
# (ShowWindow 로 억지로 보이면 화면 요소가 비어 있고, Weixin.exe 를 다시 실행하면 로그인 창이 하나 더 뜬다 — 2026-11-14 확인)
if (-not [WxA]::IsWindowVisible($mainH)) {
  foreach ($k in 0x11, 0x12, 0x57) { [WxA]::keybd_event($k, 0, 0, [UIntPtr]::Zero) }
  foreach ($k in 0x57, 0x12, 0x11) { [WxA]::keybd_event($k, 0, 2, [UIntPtr]::Zero) }
  Start-Sleep -Milliseconds 1200
  if (-not [WxA]::IsWindowVisible($mainH)) { "FAIL 위챗 창이 트레이에 숨겨져 있고 단축키(Ctrl+Alt+W)로 열리지 않음"; exit 1 }
}
# 전에 열어 둔 Add Contacts 창이 남아 있으면 예전 사람의 프로필을 읽게 된다 → 먼저 닫는다
foreach ($c in 'mmui::VerifyFriendWindow', 'mmui::AddFriendWindow') { $stale = WxWindow $c; if ($stale) { CloseWin $stale; Start-Sleep -Milliseconds 400 } }

[WxA]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null
$search = $null
for ($i = 0; $i -lt 5 -and -not $search; $i++) {
  if ($i) { Start-Sleep -Milliseconds 600 }
  $win = $null; try { $win = $A::FromHandle($proc.MainWindowHandle) } catch {}   # 다른 창이 닫히는 순간에는 잠깐 실패한다
  if ($win) { $search = $win.FindFirst($TS::Descendants, (New-Object System.Windows.Automation.AndCondition((Cond $A::ClassNameProperty 'mmui::XValidatorTextEdit'), (Cond $A::NameProperty 'Search')))) }
}
if (-not $search) { "FAIL 검색창을 못 찾음"; exit 1 }
$script:oldClip = [System.Windows.Forms.Clipboard]::GetText()
# 다른 창이 앞에 있으면 Windows가 창 전환을 막는다 → Alt 키를 한 번 눌렀다 떼면 허용됨
[WxA]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero); [WxA]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
[WxA]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 500
if ([WxA]::GetForegroundWindow() -ne $proc.MainWindowHandle) { Fail '위챗 창을 앞으로 가져오지 못함' }
Click $search; Start-Sleep -Milliseconds 300
if ($Local) {
  # 내 연락처 검색(서버 조회 없음): 팝업 목록에 이름이 접수 코드와 정확히 같은 줄이 있으면 친구
  Paste $Remark
  $hit = $null
  for ($i = 0; $i -lt 5 -and -not $hit; $i++) {
    Start-Sleep -Milliseconds 500
    $list = $win.FindFirst($TS::Descendants, (Cond $A::AutomationIdProperty 'search_list'))
    if ($list) {
      if ($Dump -and $i -eq 4) { DumpTree $list }
      # 연락처 줄만 인정한다 (class SearchContentCellView). 전에 검색했던 말이 '검색 기록' 줄(XTableCell)로 같은 이름으로 뜬다
      foreach ($li in $list.FindAll($TS::Children, $True_)) { if ($li.Current.ClassName -eq 'mmui::SearchContentCellView' -and $li.Current.Name.Trim() -eq $Remark) { $hit = $li; break } }
    }
  }
  if ($Dump -and $hit) { "HIT [$($hit.Current.ClassName)] id='$($hit.Current.AutomationId)'" }
  # ESC 는 위챗 창을 트레이로 숨겨 버린다 → 검색어만 지운다
  if (-not $hit) { [System.Windows.Forms.SendKeys]::SendWait('^a{BS}'); Done 'OK not-friend' 0 }
  if (-not $Message -or $DryRun) { [System.Windows.Forms.SendKeys]::SendWait('^a{BS}'); Done 'OK friend' 0 }
  Click $hit
  Done "OK friend $(SendTo $Remark $Message)" 0
}
Paste $WechatId

# 검색 팝업의 'Search WeChat ID'(위챗 ID로 찾기) 줄 → Add Contacts 창이 그 ID의 프로필을 띄운다
$item = $null
for ($i = 0; $i -lt 8 -and -not $item; $i++) {
  Start-Sleep -Milliseconds 500
  $list = $win.FindFirst($TS::Descendants, (Cond $A::AutomationIdProperty 'search_list'))
  if ($list) { foreach ($li in $list.FindAll($TS::Children, $True_)) { if ($li.Current.Name -match '^(Search WeChat ID|搜索微信号|查找微信号)$') { $item = $li } } }
}
if (-not $item) { [System.Windows.Forms.SendKeys]::SendWait('^a{BS}'); Fail "검색 팝업에 '위챗 ID 검색' 줄이 없음" }
Click $item

# 프로필이 뜰 때까지 기다린다 — 친구면 아래에 Messages(대화) 버튼, 아니면 Add to Contacts 버튼이 생긴다
# (없는 ID·검색 차단이면 둘 다 안 생기고 안내문만 나온다)
$add = $null; $chatBtn = $null; $addBtn = $null
for ($i = 0; $i -lt 16 -and -not $chatBtn -and -not $addBtn; $i++) {
  Start-Sleep -Milliseconds 500
  $add = WxWindow 'mmui::AddFriendWindow'
  if ($add) { $chatBtn = BySuffix $add 'chat_img_button'; $addBtn = BySuffix $add 'add_friend_button' }
}
if (-not $add) { Fail 'Add Contacts 창이 열리지 않음' }
if ($Dump) { DumpTree $add }
if (-not $chatBtn -and -not $addBtn) {
  $said = @($add.FindAll($TS::Descendants, (Cond $A::ClassNameProperty 'mmui::XTextView')) | ForEach-Object { $_.Current.Name } | Where-Object { $_ -and $_ -notmatch '^(Add Contacts|Search)$' }) -join ' / '
  Fail "그 위챗 ID를 찾을 수 없음 (없는 ID이거나 ID 검색을 막아 둠)$(if ($said) { ': ' + $said })"
}
# 이 창이 정말 우리가 넣은 ID를 찾은 결과인지 — 창의 검색칸 값이 그 ID여야 한다
$box = $add.FindFirst($TS::Descendants, (Cond $A::ClassNameProperty 'mmui::XValidatorTextEdit'))
$boxText = ''; try { $boxText = $box.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value } catch {}
if ($boxText.Trim().ToLower() -ne $WechatId.Trim().ToLower()) { Fail "Add Contacts 창의 검색어가 다름" }

if ($chatBtn) {
  # 친구 프로필에는 "WeChat ID:" 값이 보인다 → 검색한 ID와 같아야 한다
  # 备注가 달린 친구는 이름 아래에 닉네임 줄이 먼저 온다 → 머리 부분의 값들 중 하나가 ID와 같으면 된다. 값이 늦게 채워져 몇 번 다시 본다
  $idOk = $false
  for ($i = 0; $i -lt 8; $i++) {
    foreach ($e in $add.FindAll($TS::Descendants, (Cond $A::ClassNameProperty 'mmui::ProfileTextView'))) {
      if ($e.Current.AutomationId -match 'user_info_center_view' -and $e.Current.Name.Trim().ToLower() -eq $WechatId.Trim().ToLower()) { $idOk = $true }
    }
    if ($idOk) { break }
    Start-Sleep -Milliseconds 400
  }
  if (-not $idOk) { Fail '프로필의 위챗 ID가 검색한 ID와 다름' }
  # 고객이 먼저 친구 추가를 걸어 온 경우 备注가 비어 있어 대화 목록에 본인 별명으로 보인다 → 접수 코드로 단다
  # 이미 다른 备注가 있으면(운영자가 직접 단 이름, 예전 접수 코드) 건드리지 않는다
  $rv = BySuffix $add 'value_remark_view'
  $cur = if ($rv) { $rv.Current.Name.Trim() } else { '' }
  $tag = 'OK friend'
  if (-not $Remark -or -not $rv -or $cur -eq $Remark) { }
  elseif ($cur) { $tag = 'OK friend (다른 备注가 이미 있음 — 그대로 둠)' }
  elseif ($DryRun) { Done 'OK dry-run (친구 · 备注 없음 → 달 수 있음)' 0 }
  else { $tag = '' }
  if ($tag) {
    if ($Message -and -not $DryRun) { $tag += ' ' + (SendFromProfile $add $Message) }
    Done $tag 0
  }
  Click $rv; Start-Sleep -Milliseconds 600
  if ($Dump) { "AFTER remark click"; DumpTree $add }
  $redit = $null
  foreach ($e in $add.FindAll($TS::Descendants, (Cond $A::ControlTypeProperty ([System.Windows.Automation.ControlType]::Edit)))) {
    if ($e.Current.ClassName -ne 'mmui::XValidatorTextEdit') { $redit = $e }
  }
  if (-not $redit) { Fail '친구이지만 备注 입력 칸이 열리지 않음' }
  Paste $Remark; Start-Sleep -Milliseconds 300
  $typed = ''; try { $typed = $redit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value } catch {}
  if ($typed -ne $Remark) { [System.Windows.Forms.SendKeys]::SendWait('{ESC}'); Fail '친구이지만 备注가 들어가지 않음' }
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
  for ($i = 0; $i -lt 8; $i++) {
    Start-Sleep -Milliseconds 400
    $rv = BySuffix $add 'value_remark_view'
    if ($rv -and $rv.Current.Name.Trim() -eq $Remark) {
      # 프로필 머리의 표시 이름이 备注로 바뀐 뒤에 대화방을 연다
      Start-Sleep -Milliseconds 500
      Done "OK friend remarked$(if ($Message) { ' ' + (SendFromProfile $add $Message) })" 0
    }
  }
  Fail '친구이지만 备注 저장을 확인하지 못함 — 직접 확인 필요'
}

if ($CheckOnly) { Done 'OK not-friend' 0 }
# 친구 요청 창(Confirm Friend Request): 备注 칸(ModifyRemark) + 상대가 확인을 요구하면 인사말 칸이 하나 더 있다
Click $addBtn
$ver = $null
for ($i = 0; $i -lt 10 -and -not $ver; $i++) { Start-Sleep -Milliseconds 400; $ver = WxWindow 'mmui::VerifyFriendWindow' }
if (-not $ver) { Fail '친구 요청 창이 열리지 않음 (요청 횟수 제한일 수 있음)' }
Start-Sleep -Milliseconds 500
if ($Dump) { "WINDOW VerifyFriendWindow"; DumpTree $ver }
$edits = @($ver.FindAll($TS::Descendants, (Cond $A::ControlTypeProperty ([System.Windows.Automation.ControlType]::Edit))))
$remarkEdit = $edits | Where-Object { $_.Current.Name -eq 'ModifyRemark' } | Select-Object -First 1
$helloEdit = $edits | Where-Object { $_.Current.Name -ne 'ModifyRemark' } | Select-Object -First 1
if ($Hello -and $helloEdit) { Click $helloEdit; Start-Sleep -Milliseconds 200; Paste $Hello; Start-Sleep -Milliseconds 200 }
if ($Remark) {
  if (-not $remarkEdit) { Fail '备注 칸을 못 찾음' }
  Click $remarkEdit; Start-Sleep -Milliseconds 200; Paste $Remark; Start-Sleep -Milliseconds 300
  $now = ''; try { $now = $remarkEdit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value } catch {}
  if ($now -ne $Remark) { Fail "备注가 들어가지 않음" }
}
$ok = $ver.FindFirst($TS::Descendants, (New-Object System.Windows.Automation.AndCondition((Cond $A::ControlTypeProperty ([System.Windows.Automation.ControlType]::Button)), (Cond $A::NameProperty 'OK'))))
if (-not $ok) { Fail '요청 창의 OK 버튼을 못 찾음' }
if ($DryRun) { Done "OK dry-run (친구 아님 — 요청 가능, 인사말 칸 $(if ($helloEdit) { '있음' } else { '없음' }))" 0 }
Click $ok
# 창이 닫히면 접수된 것. 상대가 확인 없이 받는 설정이면 바로 친구가 되어 Messages 버튼이 생긴다
for ($i = 0; $i -lt 12 -and (WxWindow 'mmui::VerifyFriendWindow'); $i++) { Start-Sleep -Milliseconds 500 }
if (WxWindow 'mmui::VerifyFriendWindow') { Fail 'OK를 눌렀지만 요청 창이 닫히지 않음 (횟수 제한·오류 가능) — 직접 확인 필요' }
Start-Sleep -Milliseconds 1500
$add = WxWindow 'mmui::AddFriendWindow'
if ($add -and (BySuffix $add 'chat_img_button')) { Done "OK added$(if ($Message) { ' ' + (SendFromProfile $add $Message) })" 0 }
Done 'OK requested' 0
