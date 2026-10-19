(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = "typeboost-v1";
  const passages = {
    beginner: [
      "A good habit starts with a small step. Sit comfortably, keep your hands relaxed, and look at the screen as you type. Take your time and focus on accuracy before trying to go faster.",
      "The quick brown fox jumps over the lazy dog. Typing is a useful skill that helps you communicate clearly. Practise every day and you will see progress in your speed and confidence.",
      "Learning something new takes patience. Start with simple words, use the correct fingers, and take short breaks. A little practice each day can make a big difference over time.",
      "Today is a great day to learn. Keep your shoulders relaxed and your wrists straight. Let your fingers return to the home row, and remember that steady practice builds skill."
    ],
    medium: [
      "Strong typing skills come from a balance of rhythm, accuracy, and focus. Rather than looking down at the keyboard, learn where each key lives and trust your fingers to find the right position.",
      "Technology helps people share ideas, solve problems, and work together. Clear communication matters, and accurate typing makes it easier to turn your thoughts into useful words without losing your train of thought.",
      "Set a realistic goal and track your results over time. Progress may feel slow on some days, but consistent practice creates lasting improvement. Celebrate small wins and keep challenging yourself."
    ],
    advanced: [
      "Efficiency is not simply a matter of pressing keys quickly; it is the result of anticipation, precision, ergonomic technique, and an ability to maintain concentration while processing complex ideas.",
      "When learning a demanding skill, deliberate practice is more effective than repetition without feedback. Identify recurring mistakes, isolate the difficult patterns, and measure improvement with reliable, consistent tests.",
      "A thoughtful workflow combines speed with accuracy, adaptability, and patience. By reducing unnecessary movements and building dependable habits, you can improve both productivity and confidence over the long term."
    ]
  };
  const achievementDefs = [
    {id:"first",icon:"🌱",name:"First Steps",desc:"Complete your first typing test.",test:s=>s.sessions.length>=1,goal:"Complete 1 test"},
    {id:"three",icon:"🎯",name:"Getting Started",desc:"Complete three typing tests.",test:s=>s.sessions.length>=3,goal:"Complete 3 tests"},
    {id:"speed10",icon:"⚡",name:"Speed Starter",desc:"Reach 10 WPM in a test.",test:s=>s.sessions.some(x=>x.wpm>=10),goal:"Reach 10 WPM"},
    {id:"speed30",icon:"🚀",name:"Speedster",desc:"Reach 30 WPM in a test.",test:s=>s.sessions.some(x=>x.wpm>=30),goal:"Reach 30 WPM"},
    {id:"accuracy",icon:"💎",name:"Careful Typist",desc:"Get 95% accuracy or better.",test:s=>s.sessions.some(x=>x.accuracy>=95),goal:"Reach 95% accuracy"},
    {id:"perfect",icon:"✨",name:"Perfectionist",desc:"Finish a test with 100% accuracy.",test:s=>s.sessions.some(x=>x.accuracy===100),goal:"Get 100% accuracy"},
    {id:"daily",icon:"📅",name:"Daily Habit",desc:"Complete 3 tests in one day.",test:s=>dailyCount(s)>=3,goal:"3 tests in one day"},
    {id:"ten",icon:"🏆",name:"Dedicated Learner",desc:"Complete ten typing tests.",test:s=>s.sessions.length>=10,goal:"Complete 10 tests"}
  ];
  const initialState = () => ({name:"",sessions:[],sound:true,level:"beginner",duration:60,lastDay:"",dailyTests:0});
  let state = loadState(), currentPassage = "", timer = null, startAt = 0, deadline = 0, running = false, finished = false, currentLevel = "beginner", currentDuration = 60, lastTypedLength = 0, audioContext = null, toastTimeout;
  let isFirstVisit = false;
  try {
    isFirstVisit = localStorage.getItem("typeboost-visited-v1") !== "yes";
    localStorage.setItem("typeboost-visited-v1", "yes");
  } catch { isFirstVisit = !state.name; }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return saved && Array.isArray(saved.sessions) ? {...initialState(), ...saved} : initialState();
    } catch { return initialState(); }
  }
  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { showToast("Could not save locally. Check your browser storage settings."); } }
  function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  function dailyCount(s=state) { return s.lastDay === todayKey() ? (s.dailyTests || 0) : 0; }
  function todayDate() { return new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric"}).format(new Date()); }
  function showToast(message) {
    const el=$("#toast"); el.textContent=message; el.classList.add("show");
    clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>el.classList.remove("show"),2600);
  }
  function playTone(kind="key") {
    if (!state.sound) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioContext ||= new AudioCtx();
      if (audioContext.state === "suspended") audioContext.resume();
      const osc=audioContext.createOscillator(), gain=audioContext.createGain();
      osc.type="sine"; osc.frequency.value=kind==="error"?180:kind==="success"?740:kind==="finish"?520:440;
      gain.gain.setValueAtTime(0.035,audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001,audioContext.currentTime+0.055);
      osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+0.06);
    } catch {}
  }
  function setName(name) {
    state.name = (name || "Learner").trim().slice(0,24) || "Learner"; saveState(); renderName();
  }
  function renderName() {
    const name=state.name||"Learner";
    $("#welcomeName").textContent=name;
    const greeting = $("#welcomeName");
    const heading = greeting && greeting.parentElement;
    if (heading) {
      const prefix = isFirstVisit ? "Welcome, " : "Welcome back, ";
      heading.innerHTML = `${prefix}<span id="welcomeName">${escapeHtml(name)}${isFirstVisit ? "!" : "!"}</span>`;
    }
    $("#userLabel").textContent=name; $("#avatar").textContent=name[0].toUpperCase();
  }
  function navigate(view) {
    const valid=["home","typing","lessons","stats","achievements"];
    if(!valid.includes(view)) view="home";
    $$(".view").forEach(el=>el.classList.toggle("active",el.id===`view-${view}`));
    $$(".nav-link").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
    $("#pageName").textContent=({home:"Home",typing:"Typing Test",lessons:"Finger Lessons",stats:"My Progress",achievements:"Achievements"})[view];
    $("#sidebar").classList.remove("open");
    if(view==="stats") renderStats();
    if(view==="achievements") renderAchievements();
    if(view==="typing") renderKeyboard();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function randomPassage(level=currentLevel) {
    const options=passages[level]||passages.beginner;
    let p=options[Math.floor(Math.random()*options.length)];
    if(p===currentPassage && options.length>1) p=options[(options.indexOf(p)+1)%options.length];
    return p;
  }
  function setPassage(text) {
    currentPassage=text; $("#passage").innerHTML="";
    [...text].forEach((char,i)=>{
      const span=document.createElement("span");span.textContent=char;
      if(i===0) span.classList.add("current");
      $("#passage").appendChild(span);
    });
  }
  function resetTest(newPassage=true) {
    clearInterval(timer);timer=null;running=false;finished=false;startAt=0;deadline=0;lastTypedLength=0;
    currentDuration=Number($("#durationSelect").value)||60;
    $("#typingInput").value="";$("#typingInput").disabled=false;
    $("#timeLeft").textContent=currentDuration;$("#liveWps").textContent="0.00";$("#liveWpmSecondary").textContent="0 WPM";
    $("#liveAccuracy").textContent="100";$("#liveErrors").textContent="0";$("#liveProgress").textContent="0";$("#typedCount").textContent="0";
    $("#testStatus").textContent="READY WHEN YOU ARE";$("#testHint").textContent="Your timer starts with your first keystroke.";
    $("#startTest").innerHTML='Start test <span>→</span>';$("#resultBox").classList.add("hidden");
    if(newPassage || !currentPassage) setPassage(randomPassage(currentLevel)); else renderPassage("");
    renderKeyboard();
  }
  function renderPassage(typed) {
    const spans=$$("#passage span");let errors=0,correct=0;
    spans.forEach((span,i)=>{
      span.classList.remove("correct","incorrect","current");
      if(i<typed.length){if(typed[i]===currentPassage[i]){span.classList.add("correct");correct++;}else{span.classList.add("incorrect");errors++;}}
      if(i===typed.length&&!finished) span.classList.add("current");
    });
    return {errors,correct};
  }
  function startTimer() {
    if(running||finished)return;
    running=true;startAt=Date.now();deadline=startAt+currentDuration*1000;
    $("#testStatus").textContent="TEST IN PROGRESS";$("#testHint").textContent="Keep going — you’re doing great!";
    $("#startTest").textContent="Test running…";$("#typingInput").focus();
    timer=setInterval(tick,100);
  }
  function tick() {
    const remain=Math.max(0,(deadline-Date.now())/1000);
    $("#timeLeft").textContent=Math.ceil(remain);
    updateLive();
    if(remain<=0) finishTest();
  }
  function updateLive() {
    const typed=$("#typingInput").value;
    const elapsed=running?Math.max(.1,(Date.now()-startAt)/1000):0;
    const {errors,correct}=renderPassage(typed);
    const accuracy=typed.length?Math.round(correct/typed.length*100):100;
    const wpm=elapsed?Math.round((correct/5)/(elapsed/60)):0;
    const wps=elapsed?(correct/5)/elapsed:0;
    $("#liveWps").textContent=wps.toFixed(2);$("#liveWpmSecondary").textContent=`${wpm} WPM`;
    $("#liveAccuracy").textContent=accuracy;$("#liveErrors").textContent=errors;
    $("#typedCount").textContent=typed.length;
    $("#liveProgress").textContent=Math.min(100,Math.round(typed.length/currentPassage.length*100));
    $("#heroSpeed").textContent=wpm;
    const next=typed.length;
    if(next>lastTypedLength) {
      const char=typed[next-1],expected=currentPassage[next-1];
      if(char!==expected) playTone("error"); else playTone("key");
    }
    lastTypedLength=next;
    renderKeyboard(typed.at(-1));
  }
  function finishTest() {
    if(finished)return;
    finished=true;running=false;clearInterval(timer);timer=null;
    $("#typingInput").disabled=true;$("#testStatus").textContent="TEST COMPLETE";$("#startTest").textContent="Try again →";
    const typed=$("#typingInput").value,{errors,correct}=renderPassage(typed);
    const elapsed=Math.max(1,Math.min(currentDuration,(Date.now()-startAt)/1000));
    const wpm=Math.max(0,Math.round((correct/5)/(elapsed/60)));
    const wps=(correct/5)/elapsed;
    const accuracy=typed.length?Math.round(correct/typed.length*100):100;
    const session={date:new Date().toISOString(),level:currentLevel,duration:currentDuration,elapsed:Math.round(elapsed),wpm,wps:Number(wps.toFixed(2)),accuracy,errors,chars:typed.length,correct,completed:typed.length>=currentPassage.length};
    state.sessions.push(session);state.sessions=state.sessions.slice(-200);
    const day=todayKey();if(state.lastDay!==day){state.lastDay=day;state.dailyTests=0;}state.dailyTests=(state.dailyTests||0)+1;
    saveState();renderDashboard();renderStats();renderAchievements();playTone("finish");
    $("#resultBox").classList.remove("hidden");
    $("#resultBox").innerHTML=`<h3>Nice work — test complete!</h3><p>${session.completed?"You completed the full passage.": "You showed up and practised. Keep going to improve your score."}</p><div class="result-metrics"><div><strong>${wpm}</strong><small>WPM</small></div><div><strong>${wps.toFixed(2)}</strong><small>WPS</small></div><div><strong>${accuracy}%</strong><small>Accuracy</small></div><div><strong>${errors}</strong><small>Errors</small></div></div>`;
    $("#testHint").textContent="Your result has been saved on this device.";
    showToast("Test saved! Keep up the good work.");
  }
  function renderKeyboard(activeChar="") {
    const rows=["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
    const keyEl=(key)=>{const span=document.createElement("span");span.className="key";span.textContent=key;if("ASDFJKL;".includes(key))span.classList.add("home-key");if(activeChar&&activeChar.toUpperCase()===key)span.classList.add("active-key");return span;};
    const keyboard=$("#keyboard");keyboard.innerHTML="";
    rows.forEach(row=>{const rowEl=document.createElement("div");rowEl.className="key-row";[...row].forEach(k=>rowEl.appendChild(keyEl(k)));keyboard.appendChild(rowEl);});
    const row=document.createElement("div");row.className="key-row";const space=keyEl("SPACE");space.classList.add("space");row.appendChild(space);keyboard.appendChild(row);
  }
  function renderDashboard() {
    const sessions=state.sessions;
    const bestWpm=sessions.reduce((m,s)=>Math.max(m,s.wpm||0),0);
    const bestAcc=sessions.length?Math.max(...sessions.map(s=>s.accuracy||0)):0;
    const mins=Math.round(sessions.reduce((n,s)=>n+(s.elapsed||s.duration||0),0)/60);
    $("#bestWpm").textContent=bestWpm;$("#bestAccuracy").textContent=bestAcc;$("#testsCompleted").textContent=sessions.length;$("#practiceMinutes").textContent=mins;
    const count=dailyCount();$("#dailyCount").textContent=count;$("#dailyPercent").textContent=`${Math.min(100,Math.round(count/3*100))}%`;$("#dailyProgress").style.width=`${Math.min(100,count/3*100)}%`;
    $("#goalMessage").textContent=count>=3?"Goal complete! Amazing consistency.":`${3-count} more test${3-count===1?"":"s"} to reach today's goal.`;
    const recent=sessions.slice(-4).reverse();$("#recentSessions").innerHTML=recent.length?recent.map(s=>`<div class="session-row"><div class="session-type"><span class="session-dot">⌨</span><span>${escapeHtml(capitalize(s.level))} test<small>${formatDate(s.date)}</small></span></div><span><strong>${s.wpm} WPM</strong><small>${s.wps.toFixed(2)} WPS</small></span><span>${s.accuracy}%<small>Accuracy</small></span><span>${s.elapsed}s<small>Duration</small></span></div>`).join(""):'<div class="empty-state">No sessions yet. Start your first test to see your progress here.</div>';
    renderName();$("#heroSpeed").textContent=bestWpm;$("#todayLabel").textContent=todayDate();
  }
  function renderStats() {
    const sessions=state.sessions,bestWpm=sessions.reduce((m,s)=>Math.max(m,s.wpm||0),0),bestAcc=sessions.length?Math.max(...sessions.map(s=>s.accuracy||0)):0;
    $("#statsBestWpm").textContent=bestWpm;$("#statsBestAccuracy").textContent=bestAcc;$("#statsTotalTests").textContent=sessions.length;$("#statsMinutes").textContent=Math.round(sessions.reduce((n,s)=>n+(s.elapsed||s.duration||0),0)/60);
    const recent=sessions.slice(-12);const chart=$("#speedChart");
    if(!recent.length){chart.innerHTML='<div class="empty-state">Complete a typing test to start your progress chart.</div>';chart.style.alignItems="center";return;}
    chart.style.alignItems="flex-end";const max=Math.max(10,...recent.map(s=>s.wpm));
    chart.innerHTML=recent.map((s,i)=>`<div class="chart-column"><div class="chart-bar" style="height:${Math.max(3,(s.wpm/max)*100)}%"><span>${s.wpm}</span></div><small>${i+1}</small></div>`).join("");
    const rows=sessions.slice(-20).reverse();$("#historyList").innerHTML=rows.length?rows.map(s=>`<div class="history-row"><span>${formatDate(s.date)}<small>${capitalize(s.level)} · ${s.duration}s test</small></span><span class="history-speed">${s.wpm} WPM<small>${s.wps.toFixed(2)} WPS</small></span><span>${s.accuracy}%<small>Accuracy</small></span><span>${s.errors} errors</span></div>`).join(""):'<div class="empty-state">Your test history will appear here.</div>';
  }
  function renderAchievements() {
    const unlocked=achievementDefs.filter(a=>a.test(state));$("#unlockedCount").textContent=unlocked.length;$("#achievementProgress").style.width=`${unlocked.length/achievementDefs.length*100}%`;
    $("#achievementGrid").innerHTML=achievementDefs.map(a=>{const yes=a.test(state);return `<article class="achievement-card ${yes?"unlocked":""}"><div class="achievement-medal">${a.icon}</div><h3>${a.name}</h3><p>${a.desc}</p><small>${yes?"✓ UNLOCKED":a.goal.toUpperCase()}</small></article>`;}).join("");
  }
  function formatDate(iso){try{return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(new Date(iso));}catch{return "Recent";}}
  function capitalize(s=""){return s.charAt(0).toUpperCase()+s.slice(1);}
  function escapeHtml(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function exportResults() {
    if(!state.sessions.length){showToast("Complete a test before exporting results.");return;}
    const header=["Date","Level","Duration (seconds)","WPM","WPS","Accuracy (%)","Errors","Characters"];
    const lines=[header,...state.sessions.map(s=>[s.date,s.level,s.duration,s.wpm,s.wps,s.accuracy,s.errors,s.chars])].map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([lines],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="typeboost-results.csv";a.click();URL.revokeObjectURL(url);showToast("Results exported as CSV.");
  }

  $$(".nav-link").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.view)));
  $$("[data-go]").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.go)));
  $("#menuToggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#nameButton").addEventListener("click",()=>{ $("#learnerName").value=state.name||"";$("#nameDialog").showModal(); });
  $("#nameForm").addEventListener("submit",e=>{e.preventDefault();setName($("#learnerName").value);$("#nameDialog").close();showToast(`Welcome, ${state.name}!`);});
  $("#saveName").addEventListener("click",e=>{e.preventDefault();setName($("#learnerName").value);$("#nameDialog").close();showToast(`Welcome, ${state.name}!`);});
  function syncDifficultyUI() {
    $$(".difficulty").forEach(b=>{
      const active=b.dataset.level===currentLevel;
      b.classList.toggle("active",active);
      b.setAttribute("aria-pressed",String(active));
    });
    const label=$("#selectedLevel");
    if(label) label.textContent=`✓ ${capitalize(currentLevel)} selected`;
  }
  $$(".difficulty").forEach(btn=>btn.addEventListener("click",()=>{currentLevel=btn.dataset.level;state.level=currentLevel;saveState();syncDifficultyUI();resetTest(true);showToast(`${capitalize(currentLevel)} difficulty selected`);}));
  $("#durationSelect").addEventListener("change",()=>{currentDuration=Number($("#durationSelect").value);state.duration=currentDuration;saveState();resetTest(true);});
  $("#soundToggle").addEventListener("click",()=>{state.sound=!state.sound;saveState();$("#soundToggle").setAttribute("aria-pressed",String(state.sound));$("#soundToggle").textContent=state.sound?"♫ Sound on":"♫ Sound off";if(state.sound)playTone("success");});
  $("#typingInput").addEventListener("input",()=>{
    if(finished)return;
    if(!running&&$("#typingInput").value.length)startTimer();
    updateLive();
    if($("#typingInput").value.length>=currentPassage.length)finishTest();
  });
  $("#typingInput").addEventListener("keydown",e=>{if(e.key==="Tab"){e.preventDefault();}});
  $("#resetTest").addEventListener("click",()=>resetTest(true));
  $("#startTest").addEventListener("click",()=>{if(finished){resetTest(true);$("#typingInput").focus();}else if(!running){$("#typingInput").focus();if($("#typingInput").value)startTimer();else showToast("Start typing in the passage box to begin.");}});
  $("#startLesson").addEventListener("click",()=>{navigate("lessons");$("#drillInput").focus();});
  $("#drillInput").addEventListener("input",()=>{
    const target=$("#drillPattern").textContent,input=$("#drillInput").value;
    let errors=0;for(let i=0;i<input.length;i++)if(input[i]!==target[i])errors++;
    $("#drillFeedback").textContent=input===target?"Excellent! You completed the drill accurately.":`${input.length} / ${target.length} characters · ${errors} mistake${errors===1?"":"s"}. Keep your fingers on the home row.`;
    if(input===target)playTone("success");
  });
  $("#resetDrill").addEventListener("click",()=>{$("#drillInput").value="";$("#drillFeedback").textContent="Take your time and focus on finger placement.";$("#drillInput").focus();});
  $("#exportResults").addEventListener("click",exportResults);
  $("#clearHistory").addEventListener("click",()=>{
    if(!state.sessions.length){showToast("There is no history to clear.");return;}
    if(confirm("Clear all saved typing test history? This cannot be undone.")){state.sessions=[];state.dailyTests=0;state.lastDay=todayKey();saveState();renderDashboard();renderStats();renderAchievements();showToast("Typing history cleared.");}
  });
  document.addEventListener("click",e=>{if(window.innerWidth<=760&&$("#sidebar").classList.contains("open")&&!$("#sidebar").contains(e.target)&&!$("#menuToggle").contains(e.target))$("#sidebar").classList.remove("open");});
  currentLevel=passages[state.level]?state.level:"beginner";currentDuration=[30,60,120].includes(Number(state.duration))?Number(state.duration):60;
  $("#durationSelect").value=String(currentDuration);syncDifficultyUI();
  $("#soundToggle").setAttribute("aria-pressed",String(state.sound));$("#soundToggle").textContent=state.sound?"♫ Sound on":"♫ Sound off";
  $("#todayLabel").textContent=todayDate();renderName();renderDashboard();renderStats();renderAchievements();resetTest(true);
  if(!state.name){$("#learnerName").value="";$("#nameDialog").showModal();}
})();