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
var currentRate = 1;
var isSpeaking = false;
var paragraphsQueue = [];
var currentParaIndex = 0;
var ttsWatchdog = null;

function getActiveParagraphs() {
  var scope = document.querySelector('[data-tts-scope]') || document;
  var paras = scope.querySelectorAll('.persp-body .para, .scripture-body .scripture-para, .greek-summary');
  var arr = [];
  paras.forEach(function (p) { arr.push(p.textContent); });
  return arr;
}
function pickKoreanVoice() {
  var voices = window.speechSynthesis.getVoices();
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].lang && voices[i].lang.indexOf('ko') === 0) return voices[i];
  }
  return voices.length ? voices[0] : null;
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
function speakParagraphNow(index) {
  if (index >= paragraphsQueue.length) { isSpeaking = false; stopTtsWatchdog(); updateVoiceButton(); return; }
  var utter = new SpeechSynthesisUtterance(paragraphsQueue[index]);
  utter.lang = 'ko-KR';
  utter.rate = currentRate;
  var v = pickKoreanVoice();
  if (v) utter.voice = v;
  utter.onend = function () {
    if (!isSpeaking) return;
    currentParaIndex = index + 1;
    speakParagraph(currentParaIndex);
  };
  utter.onerror = function () {
    if (!index && !utter._retried) {
      utter._retried = true;
      setTimeout(function () { speakParagraphNow(index); }, 300);
      return;
    }
    isSpeaking = false;
    stopTtsWatchdog();
    updateVoiceButton();
  };
  window.speechSynthesis.speak(utter);
}
function speakParagraph(index) {
  if (index >= paragraphsQueue.length) { isSpeaking = false; stopTtsWatchdog(); updateVoiceButton(); return; }
  window.speechSynthesis.cancel();
  setTimeout(function () { speakParagraphNow(index); }, 80);
}
function speakNow() {
  paragraphsQueue = getActiveParagraphs();
  currentParaIndex = 0;
  if (!paragraphsQueue.length || !window.speechSynthesis) return;
  isSpeaking = true;
  updateVoiceButton();
  function begin() { startTtsWatchdog(); speakParagraph(currentParaIndex); }
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
  stopTtsWatchdog();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  updateVoiceButton();
}
function setRate(r, btnEl) {
  currentRate = r;
  document.querySelectorAll('.rate-btn').forEach(function (b) { b.classList.remove('active'); });
  if (btnEl) btnEl.classList.add('active');
  if (isSpeaking) { window.speechSynthesis.cancel(); speakParagraph(currentParaIndex); }
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
