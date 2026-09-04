// ---- 말씀잔치 shared app.js ----
// Used by index.html, sermon/detail.html, greek/detail.html

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// ---- Font size ----
function setFontSize(size, btnEl) {
  document.body.classList.remove('font-sm', 'font-lg');
  if (size === 'sm' || size === 'lg') document.body.classList.add('font-' + size);
  document.querySelectorAll('.fontsize-btn').forEach(function (b) { b.classList.remove('active'); });
  if (btnEl) btnEl.classList.add('active');
  try { localStorage.setItem('wf-font-size', size); } catch (e) {}
}
function restoreFontSize() {
  var saved = null;
  try { saved = localStorage.getItem('wf-font-size'); } catch (e) {}
  if (saved && saved !== 'md') {
    document.body.classList.add('font-' + saved);
    document.querySelectorAll('.fontsize-btn').forEach(function (b) { b.classList.remove('active'); });
    var el = document.querySelector('.fontsize-btn[data-size="' + saved + '"]');
    if (el) el.classList.add('active');
  }
}

// ---- Voice narration (Web Speech API), Android/Samsung-safe ----
// speakToken 으로 취소된 발화의 뒤늦은 onend/onerror 콜백을 무효화한다.
// 배속 변경 등으로 cancel() 을 부르면 브라우저가 이전 발화의 콜백을
// 비동기로 실행하는데, 그 콜백이 재시작 로직과 충돌해 처음으로
// 돌아가던 버그가 있었다. 각 (재)시작마다 토큰을 올리고, 콜백은
// 자신이 시작될 때의 토큰이 아직 유효할 때만 동작하도록 한다.
var currentRate = 1;
var isSpeaking = false;
var paragraphsQueue = [];
var currentParaIndex = 0;
var ttsWatchdog = null;
var speakToken = 0;

function getActiveParagraphs() {
  var scope = document.querySelector('[data-tts-scope]') || document;
  var paras = scope.querySelectorAll('.persp-body .para, .scripture-body .scripture-para, .greek-summary');
  var arr = [];
  paras.forEach(function (p) { arr.push(p.textContent); });
  return arr;
}
// 사용 가능한 한국어 음성 중 가장 품질 좋은 것을 고른다.
// 신경망/클라우드 음성(구글, MS Natural, 애플 프리미엄 등)을 우선하고,
// 그다음 원격(네트워크) 음성, 마지막으로 아무 한국어 음성 순.
var _cachedVoice = null;
function pickKoreanVoice() {
  var voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  var ko = voices.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf('ko') === 0; });
  if (!ko.length) return voices[0];
  if (_cachedVoice && ko.indexOf(_cachedVoice) !== -1) return _cachedVoice; // 재생 중 음성 일관성 유지
  // 이름에 고품질 표식이 있으면 가점(높을수록 우선)
  var PREF = [
    { re: /neural|natural/i,            w: 100 }, // MS Neural/Natural, 클라우드 신경망
    { re: /google/i,                    w: 90  }, // 구글 클라우드 음성
    { re: /premium|enhanced|siri/i,     w: 85  }, // 애플 프리미엄/향상/시리
    { re: /yuna|sora|sunhi|heami|injoon|nara|hyunsu/i, w: 60 } // 알려진 고품질 한국어 음성명
  ];
  function score(v) {
    var s = 0, name = v.name || '';
    for (var i = 0; i < PREF.length; i++) if (PREF[i].re.test(name)) { s = PREF[i].w; break; }
    if (v.localService === false) s += 20; // 원격(클라우드) 음성 가점 — 대개 품질이 더 좋다
    if (v.default) s += 1;
    return s;
  }
  ko.sort(function (a, b) { return score(b) - score(a); });
  _cachedVoice = ko[0];
  return _cachedVoice;
}
function updateVoiceButton() {
  var btn = document.getElementById('voicePlayBtn');
  if (!btn) return;
  if (isSpeaking) { btn.textContent = '⏸ 정지'; btn.classList.add('speaking'); }
  else { btn.textContent = '▶ 듣기'; btn.classList.remove('speaking'); }
}
function startTtsWatchdog() {
  stopTtsWatchdog();
  ttsWatchdog = setInterval(function () {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 5000);
}
function stopTtsWatchdog() {
  if (ttsWatchdog) { clearInterval(ttsWatchdog); ttsWatchdog = null; }
}
function finishSpeaking() {
  isSpeaking = false;
  speakToken++;              // 남아 있는 콜백 무효화
  stopTtsWatchdog();
  updateVoiceButton();
}
// index 번째 문단부터 현재 설정(배속/음성)으로 (재)생성해 재생한다.
function speakFrom(index) {
  if (!window.speechSynthesis) return;
  if (index >= paragraphsQueue.length) { finishSpeaking(); return; }
  currentParaIndex = index;
  var myToken = ++speakToken;      // 이번 재생의 세대 번호. 이전 콜백은 모두 무효화
  window.speechSynthesis.cancel(); // 재생 중이던 발화 중단(뒤늦은 콜백은 토큰으로 걸러짐)
  setTimeout(function () {
    if (myToken !== speakToken || !isSpeaking) return;  // 이미 다른 동작으로 대체됨
    var utter = new SpeechSynthesisUtterance(paragraphsQueue[index]);
    utter.lang = 'ko-KR';
    utter.rate = currentRate;
    var v = pickKoreanVoice();
    if (v) utter.voice = v;
    utter.onend = function () {
      if (myToken !== speakToken || !isSpeaking) return; // 취소로 인한 stale 콜백은 무시
      speakFrom(index + 1);
    };
    utter.onerror = function () {
      if (myToken !== speakToken || !isSpeaking) return; // 배속 변경 등으로 취소된 발화
      if (index === 0 && !utter._retried) {              // 첫 문단은 음성 준비 지연 대비 1회 재시도
        utter._retried = true;
        setTimeout(function () { if (myToken === speakToken && isSpeaking) speakFrom(0); }, 300);
        return;
      }
      finishSpeaking();
    };
    window.speechSynthesis.speak(utter);
  }, 80);
}
function speakNow() {
  paragraphsQueue = getActiveParagraphs();
  currentParaIndex = 0;
  if (!paragraphsQueue.length || !window.speechSynthesis) return;
  isSpeaking = true;
  updateVoiceButton();
  function begin() { startTtsWatchdog(); speakFrom(0); }
  var voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    var fired = false;
    window.speechSynthesis.onvoiceschanged = function () { if (fired) return; fired = true; begin(); };
    setTimeout(function () { if (!fired) { fired = true; begin(); } }, 600);
  } else {
    begin();
  }
}
function toggleVoice() { if (isSpeaking) stopVoice(); else speakNow(); }
function stopVoice() {
  isSpeaking = false;
  speakToken++;              // cancel() 이 유발하는 뒤늦은 콜백이 재생을 잇지 못하게 함
  stopTtsWatchdog();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  updateVoiceButton();
}
// 재생 중 배속을 바꾸면 처음이 아니라 "현재 문단"을 새 배속으로 이어 재생한다.
// (Web Speech API 는 재생 중인 발화의 속도를 바꾸거나 문장 중간부터
//  시작할 수 없으므로, 현재 문단을 새 속도로 다시 시작하는 것이 최선이다.)
function setRate(r, btnEl) {
  currentRate = r;
  document.querySelectorAll('.rate-btn').forEach(function (b) { b.classList.remove('active'); });
  if (btnEl) btnEl.classList.add('active');
  if (isSpeaking) { speakFrom(currentParaIndex); }
}
window.addEventListener('beforeunload', stopVoice);

// ---- Print (with in-app browser fallback) ----
function isInAppBrowser() {
  var ua = navigator.userAgent || '';
  return /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line/i.test(ua);
}
function handlePrint() {
  if (isInAppBrowser()) { showPrintNotice(); return; }
  try { window.print(); } catch (e) { showPrintNotice(); }
}
function showPrintNotice() {
  var existing = document.getElementById('printNotice');
  if (existing) existing.remove();
  var notice = document.createElement('div');
  notice.id = 'printNotice';
  notice.className = 'print-notice';
  notice.innerHTML =
    '<div class="print-notice-box">' +
    '<p><strong>이 브라우저에서는 인쇄가 지원되지 않아요.</strong></p>' +
    '<p>우측 상단 메뉴(⋮ 또는 ···)에서 <b>"다른 브라우저로 열기"</b> 또는 <b>"Safari/Chrome에서 열기"</b>를 선택한 뒤 다시 인쇄해 주세요.</p>' +
    '<button onclick="document.getElementById(\'printNotice\').remove()" class="print-notice-close">닫기</button>' +
    '</div>';
  document.body.appendChild(notice);
}

// ---- Scroll to top + custom scroll bar (mobile) ----
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

function updateFab() {
  var fabTop = document.getElementById('fabTop');
  if (!fabTop) return;
  var scrolled = window.scrollY > 300;
  if (scrolled) fabTop.classList.add('show'); else fabTop.classList.remove('show');
}
window.addEventListener('scroll', updateFab);

var scrollTrack, scrollThumb, isDraggingThumb = false;
function updateScrollThumb() {
  if (!scrollTrack || !scrollThumb) return;
  var trackHeight = scrollTrack.clientHeight;
  var docHeight = document.documentElement.scrollHeight;
  var winHeight = window.innerHeight;
  var scrollableHeight = docHeight - winHeight;
  var thumbHeight = Math.max(36, trackHeight * (winHeight / docHeight));
  scrollThumb.style.height = thumbHeight + 'px';
  if (scrollableHeight <= 0) { scrollThumb.style.top = '0px'; return; }
  var ratio = window.scrollY / scrollableHeight;
  scrollThumb.style.top = (ratio * (trackHeight - thumbHeight)) + 'px';
}
function scrollToRatioFromClientY(clientY) {
  var trackRect = scrollTrack.getBoundingClientRect();
  var trackHeight = scrollTrack.clientHeight;
  var thumbHeight = scrollThumb.offsetHeight;
  var relativeY = clientY - trackRect.top - (thumbHeight / 2);
  var maxThumbTop = trackHeight - thumbHeight;
  var ratio = Math.min(1, Math.max(0, relativeY / maxThumbTop));
  var scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, ratio * scrollableHeight);
}
function initScrollBar() {
  scrollTrack = document.getElementById('scrollTrack');
  scrollThumb = document.getElementById('scrollThumb');
  if (!scrollTrack || !scrollThumb) return;
  scrollThumb.addEventListener('pointerdown', function (e) {
    isDraggingThumb = true; scrollThumb.classList.add('dragging'); e.preventDefault();
  });
  scrollTrack.addEventListener('pointerdown', function (e) {
    if (e.target === scrollThumb) return;
    scrollToRatioFromClientY(e.clientY);
    isDraggingThumb = true; scrollThumb.classList.add('dragging');
  });
  window.addEventListener('pointermove', function (e) { if (isDraggingThumb) scrollToRatioFromClientY(e.clientY); });
  window.addEventListener('pointerup', function () { isDraggingThumb = false; scrollThumb.classList.remove('dragging'); });
  window.addEventListener('scroll', updateScrollThumb);
  window.addEventListener('resize', updateScrollThumb);
  updateScrollThumb();
}

document.addEventListener('DOMContentLoaded', function () {
  restoreFontSize();
  initScrollBar();
  updateFab();
});
