/**
 * minwon24 분실물 신고서 자동 채우기 — 브라우저(경찰민원24 페이지) 안에서 실행된다.
 * Worker가 GET /fill.js 로 이 함수 소스를 내려주고, Claude(javascript_tool)나 북마클릿이 불러 쓴다.
 * 제출(신청하기)은 하지 않는다. 사람이 확인하고 누른다.
 *
 * jejuFill(form, { api, secret })
 *   form   : Worker /form 의 form 값 (buildPoliceForm)
 *   api    : Worker 주소. secret 이 있으면 사진도 /photo 에서 받아 첨부 (없으면 사진은 따로 첨부)
 * jejuRecord({ api, secret }) : 신청완료 페이지에서 접수번호를 작업 큐·운영 시트에 기록
 *
 * 필드 ID는 2026-11-03 양식 기준. 양식이 바뀌면 여기만 고친다.
 */
export async function jejuFill(form, opts = {}) {
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const fire = (el) => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const setVal = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : el.tagName === 'SELECT' ? HTMLSelectElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
    fire(el);
  };
  const waitFor = async (fn, ms = 5000) => { for (let t = 0; t < ms; t += 200) { const v = fn(); if (v) return v; await sleep(200); } return null; };
  const pickOption = (sel, test) => [...sel.options].find(o => o.value && test(o));
  const problems = [];

  // 1) 약관 모두 동의
  const terms = $('chk_terms_all');
  if (terms && !terms.checked) terms.click();

  // 2) 관할 관서: 팝업에서 시·도 → (본문에 나온) 구·군 → 검색 → 첫 경찰서
  const officeInput = $('tkcgInstNm');
  // 관서 입력칸 바로 뒤의 '검색' 버튼
  const officeBtn = officeInput && [...document.querySelectorAll('button')]
    .find(b => b.textContent.trim() === '검색' && (officeInput.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
  officeBtn?.click();
  const si = await waitFor(() => $('plcstFindSi'));
  let guName = '';
  if (si) {
    const siOpt = pickOption(si, o => o.text.startsWith(form.sido));
    if (siOpt) setVal(si, siOpt.value); else problems.push('관서 시·도 못 찾음: ' + form.sido);
    const gun = $('plcstFindGun');
    await waitFor(() => gun.options.length > 1);
    // Jev가 고른 구·군(form.gu)이 우선, 없으면 문장에 구 이름이 그대로 나오는지
    const guOpt = (form.gu && pickOption(gun, o => o.text === form.gu)) || pickOption(gun, o => {
      const base = o.text.replace(/(구|군|시)$/, '');
      return base.length >= 2 && form.guText.includes(base);
    });
    const modal = si.closest('.krds-modal') || document;
    if (guOpt) {
      setVal(gun, guOpt.value);
      guName = guOpt.text;
      ($('policeSearchBtn') || [...modal.querySelectorAll('button')].find(b => b.textContent.trim() === '검색'))?.click();
      // 결과는 <td role="button">경찰청 ○○청 ○○경찰서</td>
      const station = await waitFor(() => [...modal.querySelectorAll('[role=button], button')].find(b => /경찰서$/.test(b.textContent.trim())));
      if (station) station.click(); else problems.push('관서 검색 결과 없음 — 관서 찾기에서 직접 선택');
    } else {
      // 시·도 전체 목록의 첫 경찰서를 고르면 엉뚱한 관할이 되므로 팝업을 열어 둔 채 사람에게 넘긴다
      problems.push(`구·군을 못 정함 — 관서 찾기 팝업에서 ${form.sido} 구·군을 직접 선택`);
    }
  } else problems.push('관서 찾기 팝업이 안 열림');

  // 3) 분실 정보
  setVal($('rgnCd'), form.rgnCd);
  setVal($('sggNm'), guName || form.gu || form.sido);
  setVal($('lostPlcNm'), form.lostPlcNm);
  setVal($('lostPlcSeCd'), form.lostPlcSeCd);
  setVal($('lostYmd'), form.lostYmd);
  setVal($('lostCmdtyLostHrCn'), form.hour);

  // 4) 물품 정보 — 소분류는 대분류를 고른 뒤 채워진다. '기타'가 있으면 그것, 없으면 첫 항목
  setVal($('lostCmdtyLclsfCd'), form.lclsf);
  const mid = $('lostCmdtyMclsfCd');
  await waitFor(() => mid.options.length > 1);
  const midOpt = pickOption(mid, o => o.text.includes('기타')) || pickOption(mid, () => true);
  if (midOpt) setVal(mid, midOpt.value); else problems.push('소분류 없음');
  setVal($('cmdtyColrCd'), form.color);
  setVal($('lostQty'), String(form.qty || 1));
  setVal($('lostItemCn'), form.itemName);
  setVal($('pstCn'), form.title);
  setVal($('excptnMttr'), form.content);

  // 5) 사진 (secret 있을 때만 — Claude는 file_upload로 따로 첨부)
  let photos = 0;
  if (opts.secret && form.photoIds?.length) {
    const dt = new DataTransfer();
    for (const id of form.photoIds.slice(0, 3)) {
      const r = await fetch(`${opts.api}/photo?id=${id}`, { headers: { 'x-task-secret': opts.secret } });
      if (r.ok) { const b = await r.blob(); dt.items.add(new File([b], `lost_${form.lostRow}_${dt.items.length + 1}.jpg`, { type: b.type || 'image/jpeg' })); }
    }
    const input = $('file-upload-multi1');
    if (dt.files.length && input) { input.files = dt.files; fire(input); photos = dt.files.length; }
    else problems.push('사진 첨부 실패');
  }

  // 완료 페이지에서 기록할 수 있게 어떤 건인지 남겨 둔다
  try { localStorage.setItem('jejuPending', JSON.stringify({ queueRow: opts.queueRow, lostRow: form.lostRow, office: $('tkcgInstNm')?.value || '' })); } catch (e) { /* 기록은 수동으로 */ }

  const text = (id) => { const el = $(id); return el?.tagName === 'SELECT' ? el.options[el.selectedIndex]?.text : el?.value; };
  return {
    problems,
    관서: text('tkcgInstNm'), 지역: `${text('rgnCd')} ${text('sggNm')}`, 장소: text('lostPlcNm'), 장소분류: text('lostPlcSeCd'),
    일시: `${text('lostYmd')} ${text('lostCmdtyLostHrCn')}시`, 분류: `${text('lostCmdtyLclsfCd')} > ${text('lostCmdtyMclsfCd')}`,
    색상: text('cmdtyColrCd'), 물품명: text('lostItemCn'), 제목: text('pstCn'), 약관: !!$('chk_terms_all')?.checked,
    사진: photos || ($('file-upload-multi1')?.files.length ?? 0)
  };
}

export async function jejuRecord(opts = {}) {
  const sn = new URLSearchParams(location.search).get('aplyCvlcptSn');
  if (!sn) return { error: '신청완료 페이지가 아님' };
  const pending = JSON.parse(localStorage.getItem('jejuPending') || '{}');
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const office = (pending.office || '').split(' ').pop();
  const post = (body) => fetch(`${opts.api}/run`, { method: 'POST', headers: { 'x-task-secret': opts.secret, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
  const out = { sn, pending };
  if (pending.queueRow) out.queue = await post({ queueRow: pending.queueRow, fields: { '상태': '완료', '처리일시': `${today} 경찰청 분실신고 접수 ${sn} (${office})` } });
  if (pending.lostRow) out.lost = await post({ lostRow: pending.lostRow, fields: { '경찰접수번호': sn, '경찰접수일': today, '경찰관서': office } });
  localStorage.removeItem('jejuPending');
  return out;
}
