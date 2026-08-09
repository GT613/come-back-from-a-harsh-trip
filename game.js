const CHARACTERS = [
  {id:'meng',name:'孟晓敏',role:'野外考古',img:'assets/meng.webp',desc:'经验扎实，发掘容错更高',bonus:'刷尘判定 +25%',type:'excavate'},
  {id:'anjie',name:'安捷',role:'旅行者',img:'assets/anjie.webp',desc:'行动轻快，额外获得两点日照',bonus:'日照 +2',type:'time'},
  {id:'li',name:'李三儿',role:'器物专家',img:'assets/li.webp',desc:'家传眼力，遗物价值更高',bonus:'遗物价值 +20%',type:'value'},
  {id:'shen',name:'沈建成',role:'资深考古家',img:'assets/shen.webp',desc:'学识广博，更易破解纹样',bonus:'纹样提示 +1',type:'decode'},
  {id:'ma',name:'老马',role:'沙漠向导',img:'assets/ma.webp',desc:'熟悉沙况，移动节省水源',bonus:'移动耗水 -1',type:'water'},
  {id:'mo',name:'莫燕南',role:'历史学家',img:'assets/mo.webp',desc:'文献功底深，首次失败免罚',bonus:'失误保护 1 次',type:'shield'}
];

const RELICS = [
  {name:'绿珠残饰',stamp:'器',glyph:'◉',value:140,note:'深浅不一的绿珠围住半片太极玉，材质与城中工艺并不相合。'},
  {name:'错代龙纹瓦',stamp:'文',glyph:'龍',value:120,note:'纹样横跨数个时代，像是不同岁月被压进同一片陶土。'},
  {name:'天镜星盘',stamp:'星',glyph:'✦',value:180,note:'转动时总有一枚刻度指向北方，盘面却记录着陌生星位。'},
  {name:'蛇女祭片',stamp:'文',glyph:'巳',value:150,note:'薄片上的人首蛇身图腾，与沙漠行商口耳相传的信仰相似。'},
  {name:'白玉阶样本',stamp:'器',glyph:'◇',value:100,note:'看似汉白玉，密度与成分却无法归入任何常见石材。'},
  {name:'行商铜铃',stamp:'星',glyph:'铃',value:110,note:'风不吹时也会轻响，铃舌指向与古城中轴完全重合。'},
  {name:'无字纪年牌',stamp:'文',glyph:'冊',value:130,note:'表面没有字，斜照后却能看到反复磨除的纪年痕迹。'},
  {name:'黑珍珠玉片',stamp:'器',glyph:'☯',value:170,note:'半块白玉嵌着黑珠，边缘恰能与绿珠残饰严丝合缝。'},
  {name:'天镜光谱片',stamp:'星',glyph:'☼',value:160,note:'透过它看沙丘，会浮现一座倒悬在天际的城市。'}
];
const RELIC_SETS=[
  {id:'jade',name:'阴阳合璧',items:['绿珠残饰','黑珍珠玉片'],bonus:260},
  {id:'time',name:'错代纪年',items:['错代龙纹瓦','无字纪年牌'],bonus:220},
  {id:'mirror',name:'天镜星图',items:['天镜星盘','天镜光谱片'],bonus:280}
];

// 全程复用一首低体积配乐，避免静态站点包体膨胀。
const GAME_MUSIC = ['assets/desert-theme.mp3','assets/ruins-theme.mp3'];
const DIFFICULTIES={field:{water:10,time:12,mult:1,hazard:.16},expert:{water:8,time:10,mult:1.5,hazard:.26},mirage:{water:7,time:9,mult:2.2,hazard:.34}};
const UPGRADES=[
  {id:'canteen',name:'双层水囊',cost:180,note:'初始水源 +2'},
  {id:'awning',name:'遮阳营帐',cost:240,note:'初始日照 +1'},
  {id:'lens',name:'偏光目镜',cost:320,note:'勘测扇区更宽'}
];
const defaultMeta={xp:0,funds:0,runs:0,best:0,found:[],upgrades:[],wins:0};
let meta={...defaultMeta,...JSON.parse(localStorage.getItem('tianjing-meta')||'{}')};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const state = {leader:null,team:[],condition:{},water:10,time:12,score:0,pos:22,tool:'survey',tiles:[],relics:[],sets:[],stamps:new Set(),sound:true,shield:true,weather:'风平',forecast:'风平',finished:false,difficulty:'field',seed:0,combo:0};
let audioCtx,musicAudio=$('#bgm');

function showScreen(id){ $$('.screen').forEach(x=>x.classList.toggle('active',x.id===id)); window.scrollTo(0,0); }
function random(){let x=state.rng||(state.seed||Date.now());x^=x<<13;x^=x>>>17;x^=x<<5;state.rng=x>>>0;return state.rng/4294967296}
function rand(n){return Math.floor(random()*n)}
function shuffle(a){const out=[...a];for(let i=out.length-1;i>0;i--){const j=rand(i+1);[out[i],out[j]]=[out[j],out[i]]}return out}
function save(){localStorage.setItem('tianjing-save',JSON.stringify({...state,stamps:[...state.stamps]})); $('#continueBtn').hidden=false}
function load(){const s=JSON.parse(localStorage.getItem('tianjing-save')||'null');if(!s)return false;if(!s.team)s.team=[s.leader,...CHARACTERS.filter(c=>c.id!==s.leader).slice(0,2).map(c=>c.id)];if(!s.condition)s.condition=Object.fromEntries(s.team.map(id=>[id,100]));Object.assign(state,s,{stamps:new Set(s.stamps),sets:s.sets||[]});return true}
function tone(freq=440,d=.12,type='sine',gain=.045){
  if(!state.sound)return; audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+d);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d);
}
function playSuccess(){[392,523,659].forEach((f,i)=>setTimeout(()=>tone(f,.3,'sine',.035),i*90))}
function setSoundLabel(status){$$('[data-sound]').forEach(b=>b.textContent=b.classList.contains('sound-toggle')?`音乐：${status}`:(state.sound?'声':'静'))}
function toggleSound(){if(state.sound&&musicAudio.paused){startMusic();return}state.sound=!state.sound;musicAudio.muted=!state.sound;if(state.sound)startMusic();else setSoundLabel('关闭');save()}

function level(){return Math.floor(meta.xp/500)+1}
function members(){return state.team.map(id=>CHARACTERS.find(c=>c.id===id)).filter(Boolean)}
function hasSkill(type){return members().some(c=>c.type===type&&(state.condition[c.id]??100)>0)}
function averageCondition(){const values=state.team.map(id=>state.condition[id]??100);return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):100}
function saveMeta(){localStorage.setItem('tianjing-meta',JSON.stringify(meta))}
function newSeed(){state.seed=Math.floor(100000+Math.random()*899999);state.rng=state.seed;$('#seedValue').textContent=`TJ-${state.seed}`}
function openCamp(){
  showScreen('campScreen');const lv=level();$('#profileLevel').textContent=String(lv).padStart(2,'0');$('#profileXp').textContent=`${meta.xp%500} / 500 经验`;
  $('#archiveRuns').textContent=meta.runs;$('#archiveBest').textContent=meta.best;$('#archiveFound').textContent=`${meta.found.length}/${RELICS.length}`;$('#fundsValue').textContent=meta.funds;
  $('#milestones').innerHTML=[['第一次归档',meta.runs>=1],['完整开启天镜城',meta.wins>=1],['发现全部九件遗物',meta.found.length>=9]].map(([n,d])=>`<div class="milestone ${d?'done':''}"><span>${d?'◆':'◇'} ${n}</span><small>${d?'已完成':'未完成'}</small></div>`).join('');
  const mirage=$('[data-difficulty="mirage"]');mirage.classList.toggle('locked',lv<3);mirage.disabled=lv<3;
  $('#upgradeList').innerHTML=UPGRADES.map(u=>{const owned=meta.upgrades.includes(u.id);return `<button class="upgrade ${owned?'owned':''}" data-upgrade="${u.id}" ${owned?'disabled':''}><b>${owned?'已启用':u.name}</b><small>${u.note} · ${owned?'永久生效':u.cost+' 经费'}</small></button>`}).join('');
  $$('.upgrade:not(:disabled)').forEach(b=>b.onclick=()=>buyUpgrade(b.dataset.upgrade));if(!state.seed)newSeed();
}
function buyUpgrade(id){const u=UPGRADES.find(x=>x.id===id);if(meta.funds<u.cost){tone(100,.2,'square');return}meta.funds-=u.cost;meta.upgrades.push(id);saveMeta();openCamp();playSuccess()}
function openCodex(){openModal(`<p class="eyebrow dark">永久档案</p><h2 id="modalTitle">天镜博物志</h2><div class="journal-list">${RELICS.map(r=>{const found=meta.found.includes(r.name);return `<div class="journal-item"><span><b>${found?r.glyph:'？'} ${found?r.name:'尚未发现'}</b><small>${found?r.note:'完成发掘与纹样辨识后，永久收录到图鉴。'}</small></span><strong>${found?r.stamp:'—'}</strong></div>`}).join('')}</div>`)}

function renderCharacters(){
  $('#characterGrid').innerHTML=CHARACTERS.map(c=>`<button class="character" data-id="${c.id}"><img src="${c.img}" alt="${c.name}"><span class="character-info"><small>${c.role}</small><h3>${c.name}</h3><p>${c.desc}</p><small>${c.bonus}</small></span></button>`).join('');
  $$('.character').forEach(el=>el.onclick=()=>{const id=el.dataset.id,index=state.team.indexOf(id);if(index>=0)state.team.splice(index,1);else if(state.team.length<3)state.team.push(id);else{tone(100,.15,'square');return}state.leader=state.team[0]||null;$$('.character').forEach(x=>{x.classList.toggle('selected',state.team.includes(x.dataset.id));x.classList.toggle('leader',x.dataset.id===state.leader)});const names=members().map(c=>c.name).join('、');$('#teamTip').textContent=state.team.length?`${names} · ${state.team.length}/3`:'请选择领队与两名队员 · 0/3';$('#departBtn').disabled=state.team.length!==3;tone(310,.12,'triangle')});
}

function freshGame(){Object.assign(state,{leader:null,team:[],condition:{},water:10,time:12,score:0,pos:22,tool:'survey',tiles:[],relics:[],sets:[],stamps:new Set(),shield:true,weather:'风平',forecast:'风平',finished:false,combo:0});renderCharacters();showScreen('teamScreen')}
function depart(){
  state.rng=state.seed;const leader=CHARACTERS.find(c=>c.id===state.leader),rules=DIFFICULTIES[state.difficulty];state.team.forEach(id=>state.condition[id]=100);state.water=rules.water+(meta.upgrades.includes('canteen')?2:0);state.time=rules.time+(meta.upgrades.includes('awning')?1:0);if(hasSkill('time'))state.time+=2;
  state.tiles=Array.from({length:25},(_,i)=>({id:i,kind:'empty',surveyed:false,visited:false,dug:false,decoded:false,value:rand(3)+1}));
  const candidates=shuffle([...Array(21).keys()]);candidates.slice(0,9).forEach((id,i)=>{state.tiles[id].kind=i<6?'relic':'hazard';if(i<6)state.tiles[id].relic=(i+rand(4))%RELICS.length});
  state.tiles[2].kind='citadel';state.tiles[22]={id:22,kind:'camp',surveyed:true,visited:true,dug:true,value:0};state.pos=22;
  $('#leaderMini').innerHTML=`<img src="${leader.img}" alt=""><div><b>${leader.name}领队</b><small>全队专长已启用</small></div>`;
  showScreen('gameScreen');updateGame();save();startMusic();
}

function neighbors(id){const r=Math.floor(id/5),c=id%5;return [id-5,id+5,id-1,id+1].filter(n=>n>=0&&n<25&&(Math.abs(Math.floor(n/5)-r)+Math.abs(n%5-c)===1))}
function isReachable(id){return id===state.pos||neighbors(id).some(n=>state.tiles[n].visited)}
function tileIcon(t){if(t.kind==='camp')return '帐';if(!t.visited)return '·';if(t.kind==='hazard')return '⚠';if(t.kind==='citadel')return '城';if(t.kind==='relic'&&t.dug)return '印';if(t.surveyed)return ['○','△','◎','✧'][t.value];return '？'}
function tileStatus(t){if(t.kind==='camp')return '营地';if(!t.visited)return '未测';if(t.kind==='citadel')return '城心';if(t.kind==='relic'&&t.dug)return t.decoded?'归档':'待辨';if(t.surveyed)return ['无反应','微弱','清晰','强烈'][t.value];return '已进入'}
function renderMap(){
  $('#mapGrid').innerHTML=state.tiles.map(t=>{const locked=!isReachable(t.id);const bg=t.visited?`url('assets/bg${(t.id%5)+1}.webp')`:'none';return `<button class="tile ${locked?'locked':''} ${t.visited?'visited':''} ${t.id===state.pos?'current':''} ${t.kind}" data-id="${t.id}" style="--tile-bg:${bg}" ${locked?'disabled':''}><span class="coords">${String(Math.floor(t.id/5)+1).padStart(2,'0')}·${String(t.id%5+1).padStart(2,'0')}</span><span class="mark">${tileIcon(t)}</span><span class="status">${tileStatus(t)}</span></button>`}).join('');
  $$('.tile:not(.locked)').forEach(el=>el.onclick=()=>actOnTile(+el.dataset.id));
}
function updateGame(){
  $('#waterValue').textContent=state.water;$('#timeValue').textContent=state.time;$('#scoreValue').textContent=state.score;
  $('#waterBar').style.transform=`scaleX(${Math.max(0,state.water/12)})`;$('#timeBar').style.transform=`scaleX(${Math.max(0,state.time/14)})`;
  $('#weatherText').textContent=state.weather;$('#forecastText').textContent=state.forecast;$('#weatherIcon').textContent=state.weather==='风平'?'☀':state.weather==='扬沙'?'≋':'◌';$('#comboIndicator b').textContent=`×${(1+Math.min(state.combo,4)*.15).toFixed(2)}`;
  $('#squadCondition').innerHTML=members().map(c=>{const hp=state.condition[c.id]??100;return `<div class="member-condition"><img src="${c.img}" alt=""><span>${c.name}<span class="condition-bar"><i class="${hp<40?'low':''}" style="width:${hp}%"></i></span></span><b>${hp}</b></div>`}).join('');
  $$('[data-stamp]').forEach(x=>x.classList.toggle('got',state.stamps.has(x.dataset.stamp)));renderMap();save();
  if((state.water<=0||state.time<=0)&&!state.finished)finish(false,'补给耗尽，勘探队在风沙封路前被迫撤离。');else if(state.team.length&&averageCondition()<=0&&!state.finished)finish(false,'全队体力耗尽，救援信标被迫启动。样本得以保全，但本轮勘探提前结束。');
}
function log(s){$('#fieldLog').textContent=s}
function spend(move=true){state.time--;if(move)state.water-=hasSkill('water')?0:1;state.weather=state.forecast;if(state.weather==='扬沙')state.water--;state.team.forEach(id=>state.condition[id]=Math.max(0,(state.condition[id]??100)-(move?(state.weather==='扬沙'?9:4):2)));const risk=DIFFICULTIES[state.difficulty].hazard,stateRoll=random();state.forecast=stateRoll<risk?'扬沙':stateRoll<risk+.12?'海市':'风平'}
function actOnTile(id){
  const t=state.tiles[id],moved=id!==state.pos;if(moved){state.pos=id;t.visited=true;spend(true);tone(160,.1,'triangle');if(random()<.14){updateGame();openFieldEvent();return}}
  if(t.kind==='hazard'&&!t.surveyed){t.surveyed=true;const hurt=state.team[rand(state.team.length)];state.condition[hurt]=Math.max(0,(state.condition[hurt]??100)-22);if(hasSkill('shield')&&state.shield){state.shield=false;log('莫燕南从旧札中认出流沙征兆，队伍及时绕开；仅有一名队员轻微疲劳。')}else{state.water=Math.max(0,state.water-2);state.time--;log('探杆刺穿薄沙层，队伍陷入流沙区，一名队员受伤并损失补给。');tone(90,.35,'sawtooth')}}
  else if(t.kind==='citadel')tryCitadel();
  else if(state.tool==='survey'&&!t.surveyed)openSurvey(t);
  else if(state.tool==='excavate')t.surveyed?openExcavate(t):log('还不能盲目下铲。请先用罗盘勘测这个区域。');
  else if(state.tool==='decode')t.dug&&!t.decoded?openDecode(t):log('这里没有等待辨识的纹样。');
  else if(t.surveyed&&t.kind==='relic'&&!t.dug)log('地下信号清晰。切换到「探方发掘」继续。');
  else log('这片区域已经完成当前阶段，可选择相邻网格继续。');updateGame();
}

function openModal(html){$('#modalContent').innerHTML=html;$('#modal').classList.add('open');$('#modal').setAttribute('aria-hidden','false')}
function closeModal(){$('#modal').classList.remove('open');$('#modal').setAttribute('aria-hidden','true')}
function openSurvey(t){
  const angle=80+rand(210);openModal(`<p class="eyebrow dark">罗盘勘测 · 网格 ${t.id+1}</p><h2 id="modalTitle">锁定异常方位</h2><p>指针转入金色扇区时按下罗盘。越接近扇区中央，勘测结果越准确。</p><div class="survey-dial"><div class="target-zone" style="--zone:${angle}deg"></div><div class="needle"></div><button class="dial-btn" id="lockNeedle">锁定</button></div><p class="tip-box">孟晓敏：先看沙层走向，再信仪器。</p>`);
  const started=performance.now();$('#lockNeedle').onclick=()=>{const elapsed=(performance.now()-started)%1800,needle=elapsed/1800*360,diff=Math.abs(((needle-angle+540)%360)-180);const good=diff<(meta.upgrades.includes('lens')?72:55);t.surveyed=true;if(!good)t.value=Math.max(1,t.value-1);spend(false);closeModal();tone(good?620:190,.25,good?'sine':'square');log(good?`罗盘稳定：${t.value>=3?'强异常信号，建议发掘。':'信号已标记，可谨慎判断。'}`:'指针受到磁扰，结果精度下降，但区域已经标定。');updateGame()};
}
function openExcavate(t){
  if(t.dug){log('此探方已经清理完毕。');return}const has=t.kind==='relic',rel=has?RELICS[t.relic]:{name:'风化岩样',glyph:'石',value:20,stamp:null,note:'普通地层样本，仍可用于判断古城埋藏年代。'};
  openModal(`<p class="eyebrow dark">探方发掘</p><h2 id="modalTitle">刷除表层浮沙</h2><p>按住鼠标或手指来回刷动。清理达到要求后，样本会自动装袋。</p><div class="excavate-wrap"><div class="artifact">${rel.glyph}<small>${rel.name}</small></div><canvas id="sandCanvas"></canvas></div><p id="brushProgress" class="tip-box">已清理 0%</p>`);
  const canvas=$('#sandCanvas'),box=canvas.parentElement,ctx=canvas.getContext('2d');canvas.width=box.clientWidth;canvas.height=box.clientHeight;ctx.fillStyle='#b18a55';ctx.fillRect(0,0,canvas.width,canvas.height);for(let i=0;i<900;i++){ctx.fillStyle=`rgba(${100+rand(80)},${70+rand(50)},${35+rand(30)},.${Math.random()*.5})`;ctx.fillRect(rand(canvas.width),rand(canvas.height),rand(4)+1,rand(3)+1)}ctx.globalCompositeOperation='destination-out';ctx.lineCap='round';ctx.lineWidth=hasSkill('excavate')?58:44;
  let down=false,last=null,strokes=0,done=false;const point=e=>{const r=canvas.getBoundingClientRect(),p=e.touches?.[0]||e;return{x:(p.clientX-r.left)*canvas.width/r.width,y:(p.clientY-r.top)*canvas.height/r.height}};
  const brush=e=>{if(!down||done)return;e.preventDefault();const p=point(e);ctx.beginPath();ctx.moveTo(last?.x??p.x,last?.y??p.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;strokes++;const pct=Math.min(100,Math.round(strokes/(hasSkill('excavate')?1.45:1.8)));$('#brushProgress').textContent=`已清理 ${pct}%`;if(pct>=100){done=true;setTimeout(()=>collect(t,rel),400)}};
  canvas.onpointerdown=e=>{down=true;last=point(e);canvas.setPointerCapture(e.pointerId)};canvas.onpointermove=brush;canvas.onpointerup=()=>down=false;canvas.ontouchstart=e=>{down=true;last=point(e)};canvas.ontouchmove=brush;canvas.ontouchend=()=>down=false;
}
function checkRelicSets(){const names=state.relics.map(r=>r.name);const found=RELIC_SETS.find(s=>!state.sets.includes(s.id)&&s.items.every(n=>names.includes(n)));if(found){state.sets.push(found.id);state.score+=found.bonus;return found}return null}
function collect(t,rel){t.dug=true;spend(false);state.combo++;let value=rel.value*DIFFICULTIES[state.difficulty].mult*(1+Math.min(state.combo,4)*.15)*(averageCondition()<45?.8:1);if(hasSkill('value'))value*=1.2;value=Math.round(value);state.score+=value;state.relics.push({...rel,value,decoded:!rel.stamp});const newSet=checkRelicSets();closeModal();playSuccess();log(newSet?`遗物套装「${newSet.name}」完成，额外价值 +${newSet.bonus}！`:`连续发现 ×${(1+Math.min(state.combo,4)*.15).toFixed(2)}！「${rel.name}」装袋，价值 +${value}。${rel.stamp?'请完成纹样辨识。':''}`);updateGame()}
function openDecode(t){
  const rel=RELICS[t.relic],symbols=['☰','☷','☵','☲','○','◇'],length=hasSkill('decode')?3:4,seq=Array.from({length},()=>rand(6));
  openModal(`<p class="eyebrow dark">纹样辨识 · ${rel.name}</p><h2 id="modalTitle">复原闪现纹样</h2><p>记住高亮次序，随后按同样顺序点击石片。</p><div class="sequence" id="sequenceText">凝神观察……</div><div class="runes">${symbols.map((s,i)=>`<button class="rune" data-rune="${i}">${s}</button>`).join('')}</div><p class="tip-box">沈建成：任何脱离地层关系的器物，都只剩一半意义。</p>`);
  const btns=$$('.rune');btns.forEach(b=>b.disabled=true);seq.forEach((n,i)=>setTimeout(()=>{btns[n].classList.add('on');tone(360+n*45,.12,'sine',.025);setTimeout(()=>btns[n].classList.remove('on'),320)},600+i*600));
  setTimeout(()=>{btns.forEach(b=>b.disabled=false);$('#sequenceText').textContent='请复原';let input=[];btns.forEach(b=>b.onclick=()=>{const n=+b.dataset.rune;input.push(n);b.classList.add('on');setTimeout(()=>b.classList.remove('on'),150);if(input[input.length-1]!==seq[input.length-1]){decodeFail(t,rel);return}if(input.length===seq.length)decodeSuccess(t,rel)})},700+seq.length*600);
}
function decodeSuccess(t,rel){t.decoded=true;state.stamps.add(rel.stamp);state.score+=80;if(state.stamps.size===2)startMusic();const found=state.relics.findLast?.(r=>r.name===rel.name)||[...state.relics].reverse().find(r=>r.name===rel.name);if(found)found.decoded=true;closeModal();playSuccess();log(`纹样复原成功，获得「${rel.stamp}」文明印记。城心坐标正在变得清晰。`);updateGame()}
function decodeFail(t,rel){if(hasSkill('shield')&&state.shield){state.shield=false;closeModal();log('莫燕南及时纠正了错读。本次没有损伤器物，可以重新辨识。')}else{state.time--;closeModal();log(`纹样次序有误，记录作废。${rel.name}仍可重新辨识。`);tone(110,.3,'square')}updateGame()}
function tryCitadel(){if(state.stamps.size<3){log(`城心石门紧闭，还缺少 ${3-state.stamps.size} 种文明印记。`);openModal(`<p class="eyebrow dark">天镜城心</p><h2 id="modalTitle">来时众众，去时独独</h2><p>三处凹槽分别对应文字、器物与星象。只有将不同年代的证据放回它们应在的位置，石门才会开启。</p><div class="stamp-row">${['文','器','星'].map(s=>`<span class="${state.stamps.has(s)?'got':''}">${s}</span>`).join('')}</div><div class="modal-action"><button class="primary" onclick="document.querySelector('#modalClose').click()">继续搜寻</button></div>`)}else enterDeepCity()}
function enterDeepCity(){state.deepIndex=0;state.integrity=100;state.score+=200;showScreen('deepScreen');startMusic();renderChamber()}
function updateDepth(){
  $$('.depth-track span').forEach((s,i)=>{s.classList.toggle('active',i===state.deepIndex);s.classList.toggle('done',i<state.deepIndex)});$('#deepScore').textContent=`完整度 ${state.integrity}%`;
}
function damageDeep(amount,message){state.integrity=Math.max(40,state.integrity-amount);$('#deepStatus').textContent=message;updateDepth();tone(95,.35,'sawtooth')}
function nextChamber(){state.deepIndex++;if(state.deepIndex>2){state.score+=Math.round(300*state.integrity/100);finish(true,`三层错代机关全部复位，归档完整度 ${state.integrity}%。倒悬的天镜城在日光中显形，勘探队带着可验证的记录安全离开。`);return}$('#deepStatus').textContent='前方石门开启，新的年代层正在显现。';playSuccess();renderChamber()}
function renderChamber(){
  updateDepth();const box=$('#chamberContent');
  if(state.deepIndex===0){
    const pieces=shuffle([{n:0,g:'半'},{n:1,g:'璧'},{n:2,g:'合'},{n:3,g:'一'},{n:8,g:'蛇'},{n:9,g:'龙'}]);let expected=0;
    box.innerHTML=`<div class="chamber-card"><p class="eyebrow">第一层 · 器物复位</p><h3>半璧合一</h3><p>观察断口和文字走向，依次选择“半、璧、合、一”四块正确残片。干扰残片来自错乱年代。</p><div class="shard-board">${pieces.map(p=>`<button class="shard" data-step="${p.n}">${p.g}</button>`).join('')}</div><p class="tip-box">李三儿：断茬比花纹老实，先看器物怎么碎的。</p></div>`;
    $$('.shard').forEach(b=>b.onclick=()=>{const n=+b.dataset.step;if(n===expected){b.classList.add('correct');b.disabled=true;expected++;tone(330+expected*70,.18,'triangle');if(expected===4)setTimeout(nextChamber,500)}else{expected=0;$$('.shard').forEach(x=>{x.classList.remove('correct');x.disabled=false});damageDeep(8,'残片年代冲突，器物完整度下降。请重新判断断口。')}});
  }else if(state.deepIndex===1){
    box.innerHTML=`<div class="chamber-card"><p class="eyebrow">第二层 · 拓片校准</p><h3>重合双层纪年</h3><p>移动红色拓片，让两层“永”字尽可能完全重合，再进行压印。</p><div class="rubbing-board"><div class="rubbing-layer">永</div><div class="rubbing-layer red" id="redRubbing">永</div></div><div class="calibration-controls"><label>横向</label><input id="rubX" type="range" min="-30" max="30" value="18"><label>纵向</label><input id="rubY" type="range" min="-30" max="30" value="-16"></div><div class="modal-action"><button class="primary" id="pressRubbing">压印归档</button></div></div>`;
    const move=()=>{$('#redRubbing').style.setProperty('--x',$('#rubX').value+'px');$('#redRubbing').style.setProperty('--y',$('#rubY').value+'px')};$('#rubX').oninput=move;$('#rubY').oninput=move;move();$('#pressRubbing').onclick=()=>{const error=Math.abs(+$('#rubX').value)+Math.abs(+$('#rubY').value);if(error<=6)nextChamber();else damageDeep(error>25?12:6,'拓片仍有重影。继续微调，越靠近中央越准确。')};
  }else{
    const seq=Array.from({length:5},()=>rand(5));let input=[];
    box.innerHTML=`<div class="chamber-card"><p class="eyebrow">第三层 · 星轨归一</p><h3>复现天镜星序</h3><p>记住星点亮起的顺序，并完整复现。星轨错误会损伤最后的光谱记录。</p><div class="stars-board">${[0,1,2,3,4].map(i=>`<button class="star-node" data-star="${i}">✦</button>`).join('')}</div><p id="starHint" class="tip-box">观察星序……</p></div>`;
    const stars=$$('.star-node');stars.forEach(s=>s.disabled=true);seq.forEach((n,i)=>setTimeout(()=>{stars[n].classList.add('on');tone(420+n*55,.2,'sine',.03);setTimeout(()=>stars[n].classList.remove('on'),300)},500+i*520));setTimeout(()=>{stars.forEach(s=>s.disabled=false);$('#starHint').textContent='请复现五步星序';stars.forEach(s=>s.onclick=()=>{const n=+s.dataset.star;input.push(n);s.classList.add('on');setTimeout(()=>s.classList.remove('on'),160);if(n!==seq[input.length-1]){input=[];damageDeep(10,'星序中断，光谱记录出现噪点。序列已经重新播放。');renderChamber()}else if(input.length===seq.length)setTimeout(nextChamber,400)})},700+seq.length*520);
  }
}
function openFieldEvent(){
  const events=[
    {title:'海市偏航',copy:'远处浮现倒悬城郭，罗盘与肉眼给出了相反方向。',a:['相信老马的地标判断','water',1],b:['追踪天镜折光','score',90]},
    {title:'废弃行商驿站',copy:'半截木桩下压着封存水囊，周围沙层却有新近扰动。',a:['检验后补充水源','water',2],b:['记录驿站坐标','time',1]},
    {title:'夜空异动',copy:'本不该出现的星群正好与天镜星盘上的缺口重合。',a:['停下拓印星位','score',110],b:['保持行程','time',1]}
  ],e=events[rand(events.length)];
  openModal(`<p class="eyebrow dark">动态事件</p><h2 id="modalTitle">${e.title}</h2><p>${e.copy}</p><div class="modal-action"><button class="primary event-choice" data-result="${e.a[1]}" data-value="${e.a[2]}">${e.a[0]}</button><button class="ghost event-choice" data-result="${e.b[1]}" data-value="${e.b[2]}">${e.b[0]}</button></div>`);
  $$('.event-choice').forEach(b=>b.onclick=()=>{const v=+b.dataset.value;if(b.dataset.result==='water')state.water+=v;if(b.dataset.result==='time')state.time+=v;if(b.dataset.result==='score')state.score+=Math.round(v*DIFFICULTIES[state.difficulty].mult);closeModal();log(`${e.title}已记入行程。选择产生了新的资源变化。`);tone(440,.18,'triangle');updateGame()});
}
function restTeam(){if(state.time<3||state.water<1){log('日照或水源不足，无法安全扎营。');tone(100,.2,'square');return}state.time-=2;state.water--;state.team.forEach(id=>state.condition[id]=Math.min(100,(state.condition[id]??100)+38));state.combo=0;log('队伍完成包扎、补水与器材维护，全员状态恢复，发现连击重置。');playSuccess();updateGame()}
function openEvacuation(){
  openModal(`<p class="eyebrow dark">撤离决策</p><h2 id="modalTitle">选择离城路线</h2><p>已经归档的证据可以带回，但不同路线会影响最终价值与队员安全。</p><div class="journal-list"><button class="journal-item evac-route" data-route="safe"><span><b>沿木桩原路撤离</b><small>最安全，运输损耗 10% 考古价值</small></span><strong>稳妥</strong></button><button class="journal-item evac-route" data-route="mirage" ${state.water<3?'disabled':''}><span><b>追随天镜捷径</b><small>消耗 3 水源，成功奖励 300；失败损失近半记录</small></span><strong>冒险</strong></button><button class="journal-item evac-route" data-route="camp" ${state.time<3||state.water<1?'disabled':''}><span><b>就地扎营再探索</b><small>消耗资源恢复全队状态，不结束本轮</small></span><strong>继续</strong></button></div>`);
  $$('.evac-route').forEach(b=>b.onclick=()=>{const route=b.dataset.route;if(route==='camp'){closeModal();restTeam();return}if(route==='safe'){state.score=Math.round(state.score*.9);finish(false,'勘探队沿木桩原路稳妥撤离。运输中损失了少量脆弱样本，但所有队员安全返回。');return}state.water-=3;const chance=.45+(hasSkill('water')?.22:0)+(averageCondition()>70?.12:0);if(random()<chance){state.score+=300;finish(false,'老马辨认出海市蜃楼下的真实山脊，队伍穿过捷径提前抵达营地，并保住全部样本。')}else{state.score=Math.round(state.score*.55);finish(false,'天镜令队伍偏离方向。虽然最终获救，部分记录与样本却遗失在风沙中。')}});
}
function journal(){const setHtml=state.sets.length?`<p class="eyebrow dark">已完成遗物套装</p>${state.sets.map(id=>{const s=RELIC_SETS.find(x=>x.id===id);return `<span class="set-badge">◆ ${s.name} +${s.bonus}</span>`}).join('')}`:'';openModal(`<p class="eyebrow dark">第 017 号勘探记录</p><h2 id="modalTitle">样本与遗物</h2>${state.relics.length?`<div class="journal-list">${state.relics.map(r=>`<div class="journal-item"><span><b>${r.glyph} ${r.name}</b><small>${r.note}</small></span><strong>${r.value}</strong></div>`).join('')}</div>`:'<p>尚未取得任何样本。先勘测异常网格，再进行发掘。</p>'}${setHtml}<div class="modal-action"><button class="primary" id="closeJournal">合上记录</button></div>`);$('#closeJournal').onclick=closeModal}
function finish(success,copy){
  if(state.finished)return;state.finished=true;const bonus=success?500:0,total=state.score+bonus,rank=success&&total>=1200?'S':total>=800?'A':total>=450?'B':'C';
  meta.runs++;meta.best=Math.max(meta.best,total);meta.xp+=Math.max(80,Math.round(total*.35));meta.funds+=Math.max(40,Math.round(total*.18));if(success)meta.wins++;state.relics.forEach(r=>{if(RELICS.some(x=>x.name===r.name)&&!meta.found.includes(r.name))meta.found.push(r.name)});saveMeta();
  $('#resultTitle').textContent=success?'天镜城完成归档':'勘探队安全撤离';$('#resultRank').textContent=rank;$('#resultCopy').textContent=copy;$('#resultStats').innerHTML=`<div><b>${total}</b><small>总价值</small></div><div><b>${state.relics.length}</b><small>样本数</small></div><div><b>${state.sets.length}/3</b><small>遗物套装</small></div><div><b>${averageCondition()}%</b><small>队伍状态</small></div>`;$('#resultCollection').innerHTML=state.relics.map(r=>`<span>${r.glyph} ${r.name}</span>`).join('')+state.sets.map(id=>`<span>◆ ${RELIC_SETS.find(s=>s.id===id).name}</span>`).join('');localStorage.removeItem('tianjing-save');closeModal();showScreen('resultScreen');success?playSuccess():tone(100,.6,'sine');
}
function startMusic(){
  if(!GAME_MUSIC.length||!state.sound)return;const wanted=GAME_MUSIC[state.stamps.size>=2?1:0];if(!musicAudio.src.endsWith(wanted)){musicAudio.src=wanted;musicAudio.load()}musicAudio.loop=true;musicAudio.volume=.42;musicAudio.muted=false;setSoundLabel('加载中');musicAudio.play().then(()=>setSoundLabel('播放中')).catch(()=>setSoundLabel('点击开启'));
}

$('#newGameBtn').onclick=openCamp;$('#continueBtn').onclick=()=>{if(load()){const leader=CHARACTERS.find(c=>c.id===state.leader);$('#leaderMini').innerHTML=`<img src="${leader.img}" alt=""><div><b>${leader.name}</b><small>${leader.bonus}</small></div>`;showScreen('gameScreen');updateGame();startMusic()}};
$('#departBtn').onclick=depart;$$('[data-sound]').forEach(b=>b.onclick=toggleSound);$$('.tool[data-tool]').forEach(b=>b.onclick=()=>{state.tool=b.dataset.tool;$$('.tool').forEach(x=>x.classList.toggle('active',x===b));log({survey:'罗盘已就位。选择可抵达的网格进行信号勘测。',excavate:'手铲与毛刷已就位。选择已勘测的异常区域。',decode:'拓片纸已铺开。选择带有「待辨」标记的区域。'}[state.tool]);tone(260,.08,'triangle')});$('#restBtn').onclick=restTeam;
$$('.difficulty').forEach(b=>b.onclick=()=>{if(b.disabled)return;state.difficulty=b.dataset.difficulty;$$('.difficulty').forEach(x=>x.classList.toggle('active',x===b));tone(300,.1,'triangle')});
$('#campStartBtn').onclick=freshGame;$('#rerollSeed').onclick=newSeed;$('#codexBtn').onclick=openCodex;$('#campHomeBtn').onclick=()=>showScreen('titleScreen');
$('#journalBtn').onclick=journal;$('#evacuateBtn').onclick=openEvacuation;$('#modalClose').onclick=closeModal;$('#modal .modal-backdrop').onclick=closeModal;$('#againBtn').onclick=openCamp;$('#homeBtn').onclick=()=>showScreen('titleScreen');
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if(!$('#gameScreen').classList.contains('active')||$('#modal').classList.contains('open'))return;if(['1','2','3'].includes(e.key))$$('.tool')[+e.key-1].click();const delta={ArrowUp:-5,ArrowDown:5,ArrowLeft:-1,ArrowRight:1}[e.key];if(delta){const next=state.pos+delta;if(next>=0&&next<25&&neighbors(state.pos).includes(next)&&isReachable(next)){e.preventDefault();actOnTile(next)}}});
if(localStorage.getItem('tianjing-save'))$('#continueBtn').hidden=false;
document.addEventListener('pointerdown',()=>{if(state.sound&&musicAudio.paused)startMusic()},{once:true});
