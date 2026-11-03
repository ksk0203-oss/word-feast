var SEAS={advent:'대림절',christmas:'성탄절',epiphany:'주현절',lent:'사순절',holy:'고난주간',easter:'부활절',pentecost:'성령강림',ordinary:'성령강림절 후',king:'왕이신 그리스도'};
var WD=['일','월','화','수','목','금','토'];
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function pd(s){var a=s.split('-');return new Date(+a[0],+a[1]-1,+a[2])}
function $(i){return document.getElementById(i)}

/* theme */
(function(){try{var t=localStorage.getItem('wf27-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}})();
if($('themeBtn'))$('themeBtn').onclick=function(){
  var r=document.documentElement,cur=r.getAttribute('data-theme');
  var dark=cur?cur==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;
  var nx=dark?'light':'dark';r.setAttribute('data-theme',nx);try{localStorage.setItem('wf27-theme',nx)}catch(e){}
};

/* ---- font size ---- */
function setFS(v){document.documentElement.style.setProperty('--fs',v);document.querySelectorAll('.fs-btn').forEach(function(b){b.classList.toggle('on',b.dataset.fs==v)});try{localStorage.setItem('wf27-fs',v)}catch(e){}}
document.querySelectorAll('.fs-btn').forEach(function(b){b.onclick=function(){setFS(b.dataset.fs)}});
try{var sv=localStorage.getItem('wf27-fs');if(sv)setFS(sv)}catch(e){}

/* ---- print ---- */
function doPrint(){
  var ua=navigator.userAgent||'';
  if(/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(ua)){toast('앱 내 브라우저에서는 인쇄가 지원되지 않을 수 있어요. Safari/Chrome에서 열어 주세요.');return}
  try{window.print()}catch(e){toast('이 브라우저에서는 인쇄를 지원하지 않습니다.')}
}
function toast(m){var t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove()},3200)}

/* ---- TTS (sentence queue, best available ko voice, 1 / 1.25 / 1.5) ---- */
var rate=1,queue=[],qi=0,speaking=false,voice=null,wd=null;
function pickVoice(){
  var vs=speechSynthesis.getVoices().filter(function(v){return /^ko/i.test(v.lang)});
  if(!vs.length)return null;
  var score=function(v){var n=v.name;return (/premium|enhanced|neural|natural|online/i.test(n)?4:0)+(/google/i.test(n)?3:0)+(/yuna|sun-?hi|heami|seoyeon/i.test(n)?2:0)+(v.localService?0:1)};
  vs.sort(function(a,b){return score(b)-score(a)});return vs[0];
}
function sentences(){
  var txt=[];document.querySelectorAll('#ttsScope .persp-body p:not(.note):not(.author), #ttsScope .persp-body h4, #ttsScope .scripture p').forEach(function(p){txt.push(p.textContent)});
  var out=[];txt.join('\n').split(/\n+/).forEach(function(par){(par.match(/[^.!?。]+[.!?。]?["”’)]*/g)||[]).forEach(function(s){s=s.trim();if(s.length>1)out.push(s)})});return out;
}
function speakAt(i){
  if(!speaking)return;
  if(i>=queue.length){stopVoice();return}
  qi=i;speechSynthesis.cancel();
  setTimeout(function(){
    if(!speaking)return;
    var u=new SpeechSynthesisUtterance(queue[i]);u.lang='ko-KR';u.rate=rate;if(voice)u.voice=voice;
    u.onend=function(){if(speaking&&qi===i)speakAt(i+1)};
    u.onerror=function(ev){if(speaking&&ev.error!=='canceled'&&ev.error!=='interrupted')setTimeout(function(){speakAt(i+1)},150)};
    speechSynthesis.speak(u);
  },80);
}
function startVoice(){
  if(!('speechSynthesis' in window)){toast('이 브라우저는 음성 듣기를 지원하지 않습니다.');return}
  voice=pickVoice();queue=sentences();if(!queue.length)return;
  speaking=true;$('voiceBtn').textContent='■ 멈춤';$('voiceBtn').classList.add('playing');speakAt(0);
  clearInterval(wd);wd=setInterval(function(){if(speaking&&speechSynthesis.speaking){speechSynthesis.pause();speechSynthesis.resume()}},5000);
}
function stopVoice(){speaking=false;clearInterval(wd);try{speechSynthesis.cancel()}catch(e){}var b=$('voiceBtn');if(b){b.textContent='▶ 듣기';b.classList.remove('playing')}}
if($('voiceBtn'))$('voiceBtn').onclick=function(){speaking?stopVoice():startVoice()};
document.querySelectorAll('.rate-btn').forEach(function(b){b.onclick=function(){
  rate=parseFloat(b.dataset.r);document.querySelectorAll('.rate-btn').forEach(function(x){x.classList.toggle('on',x===b)});
  if(speaking)speakAt(qi); /* restart from start of the current sentence */
}});
if('speechSynthesis' in window){speechSynthesis.onvoiceschanged=function(){voice=pickVoice()}}

/* ---- scroll: FAB + mobile drag bar ---- */
var thumb=$('thumb'),track=$('track'),fab=$('fab');
function syncThumb(){
  var H=document.documentElement,max=H.scrollHeight-innerHeight,r=max>0?scrollY/max:0;
  var th=Math.max(44,track.clientHeight*innerHeight/H.scrollHeight);thumb.style.height=th+'px';thumb.style.top=(r*(track.clientHeight-th))+'px';
  fab.classList.toggle('show',scrollY>500);
}
addEventListener('scroll',syncThumb,{passive:true});addEventListener('resize',syncThumb);
fab.onclick=function(){scrollTo({top:0,behavior:'smooth'})};
(function(){var drag=false;
  function mv(y){var rc=track.getBoundingClientRect(),th=thumb.offsetHeight,r=Math.min(1,Math.max(0,(y-rc.top-th/2)/(rc.height-th)));scrollTo(0,r*(document.documentElement.scrollHeight-innerHeight))}
  thumb.addEventListener('pointerdown',function(e){drag=true;thumb.setPointerCapture(e.pointerId);thumb.style.opacity=.9});
  thumb.addEventListener('pointermove',function(e){if(drag)mv(e.clientY)});
  thumb.addEventListener('pointerup',function(){drag=false;thumb.style.opacity=''});
})();


syncThumb();
