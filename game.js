const DEMO_DATA=GameRules.DEMO_DATA;

const BACKGROUND_BODY=`
  <div class="story-lead">
    <p>千禧年代，老居民楼、小卖部、中学、派出所和大排档挤在同一片城区里。你只是一个普通高中生——直到挚友在星期六死去。</p>
    <p>强烈的情绪让你回到星期日。挚友还活着，城市也像什么都没有发生过；只有你记得那场惨剧。</p>
  </div>
  <blockquote>如果每一次案件里死的都是挚友……这不是爱是什么？但在第1000种死法出现以前，还是先把人救下来吧。</blockquote>
  <h3>一周，就是一次推理</h3>
  <div class="story-cycle">
    <div><b>第一次轮回</b><span>让城市自然运行，观察周一至周五的特殊事件与周六案件。</span></div>
    <div><b>第二次星期日</b><span>保留线索，使用 3 点 SAN 改变三栋建筑的位置。</span></div>
    <div><b>再次结算</b><span>犯罪预值峰值低于 7，最终案件就不会发生。</span></div>
  </div>
  <h3>你改变的不是凶手，是城市</h3>
  <p>学校是否离住宅太远？大排档是否离居民楼太近？派出所能否及时赶到？从日历、小报和居民口述中读出规律，让惨剧失去发生的条件。</p>
  <div class="power-list">
    <div><b>星期日的轮回</b><span>惨剧发生后返回星期日，保留记忆、案件信息与线索。</span></div>
    <div><b>乾坤挪移</b><span>每移动一栋建筑消耗 1 点 SAN。本关只有学校、小卖部和大排档可以移动。</span></div>
    <div><b>觉醒值</b><span>完成案件后获得，用来解锁城区拓展、道路建设等后续能力。</span></div>
  </div>`;

const $=id=>document.getElementById(id);
const emptyHeatmap=()=>Array.from({length:DEMO_DATA.map.height},()=>Array(DEMO_DATA.map.width).fill(0));
const DAYS=["周日","周一","周二","周三","周四","周五","周六"];
const state={
  buildings:structuredClone(DEMO_DATA.buildings),
  selected:"shop_01",
  heatmap:emptyHeatmap(),
  phase:"observe",
  san:0,
  lastResult:null,
  knownResult:null,
  simulationCount:0,
  moves:[],
  modalAction:null,
  day:0,
  weekResult:null,
  dayEvents:[],
  readEventIds:new Set(),
  finalMarker:null
};

function building(id){return state.buildings.find(item=>item.id===id)}
function fmt(value){return value>0?`+${value}`:String(value)}
function number(value){return Number.isInteger(value)?value:value.toFixed(1)}

function renderCells(){
  const root=$("cells");root.innerHTML="";
  for(let y=0;y<DEMO_DATA.map.height;y++)for(let x=0;x<DEMO_DATA.map.width;x++){
    const road=DEMO_DATA.map.road_rows.includes(y);
    const cell=document.createElement("button");
    cell.className=`cell ${road?"road-cell":""}`;cell.type="button";cell.title=road?`道路 (${x+1},${y+1})`:`(${x+1},${y+1})`;
    cell.disabled=road;
    if(!road)cell.addEventListener("click",()=>placeSelected(x,y));
    root.appendChild(cell);
  }
}

function renderBuildings(){
  const root=$("building-layer");root.innerHTML="";
  state.buildings.forEach(item=>{
    const el=document.createElement("button");
    const locked=state.phase!=="intervene"||state.day!==0||!item.movable;
    el.type="button";
    el.className=`building ${item.type} ${item.id} ${state.selected===item.id?"selected":""} ${locked?"locked":""}`;
    el.style.gridColumn=`${item.position.x+1} / span ${item.size.width}`;
    el.style.gridRow=`${item.position.y+1} / span ${item.size.height}`;
    el.innerHTML=`<div><span>${item.icon}</span><strong>${item.name}</strong>${locked?"<small>🔒</small>":""}</div>`;
    el.addEventListener("click",event=>{event.stopPropagation();selectBuilding(item.id)});
    root.appendChild(el);
  });
}

function renderInfluence(){
  const root=$("influence");root.innerHTML="";
  const item=building(state.selected);if(!item)return;
  const area=GameRules.coverageRect(item),circle=document.createElement("div");circle.className="influence-circle";
  circle.style.left=`${area.x/DEMO_DATA.map.width*100}%`;circle.style.top=`${area.y/DEMO_DATA.map.height*100}%`;
  circle.style.width=`${area.width/DEMO_DATA.map.width*100}%`;circle.style.height=`${area.height/DEMO_DATA.map.height*100}%`;
  root.appendChild(circle);
}

function renderEventMarkers(){
  const root=$("event-layer");root.innerHTML="";
  state.dayEvents.filter(event=>!state.readEventIds.has(event.id)).forEach(event=>{
    const source=building(event.source_id),marker=document.createElement("button");
    marker.type="button";marker.className="event-marker";marker.textContent="!";marker.title=`${DAYS[state.day]}事件：${event.name}`;
    marker.setAttribute("aria-label",`${DAYS[state.day]}事件：${event.name}`);
    marker.style.gridColumn=source.position.x+source.size.width;marker.style.gridRow=source.position.y+1;
    marker.addEventListener("click",()=>openDailyEvent(event));root.appendChild(marker);
  });
  if(state.finalMarker){
    const marker=document.createElement("button");marker.type="button";marker.className="event-marker final-event-marker";marker.textContent="!";
    marker.title="关底事件：最初的误杀";marker.setAttribute("aria-label","关底事件：最初的误杀");
    marker.style.gridColumn=state.finalMarker.x+1;marker.style.gridRow=state.finalMarker.y+1;
    marker.addEventListener("click",openFinalEvent);root.appendChild(marker);
  }
}

function renderHeatmap(){
  const root=$("heatmap");root.innerHTML="";
  state.heatmap.flat().forEach(value=>{
    const cell=document.createElement("div");
    cell.className=`heat-cell ${value>=DEMO_DATA.event_threshold?"hot":value>=4?"warm":""}`;
    if(value)cell.textContent=value;
    root.appendChild(cell);
  });
  root.classList.toggle("hidden",!$("heat-toggle").checked);
}

function renderStats(){
  const current=GameRules.evaluate(state.buildings);
  const totals=state.lastResult?state.lastResult.totals:current.base_totals;
  Object.entries(totals).forEach(([key,value])=>$(key).textContent=fmt(value));
}

function renderPicker(){
  document.querySelectorAll("[data-building-id]").forEach(button=>button.classList.toggle("selected",button.dataset.buildingId===state.selected));
}

function renderStatus(){
  const item=building(state.selected),peak=Math.max(...state.heatmap.flat());
  const unread=state.dayEvents.filter(event=>!state.readEventIds.has(event.id)).length;
  $("peak").textContent=peak;
  $("phase-title").textContent=state.phase==="observe"?"第一次轮回：只能观察":"第二次轮回：改变城市";
  $("phase-badge").textContent=DAYS[state.day];
  $("san").textContent=state.phase==="observe"?"未觉醒":`${state.san} / ${DEMO_DATA.max_san}`;
  if(state.day===0)$("event-count").textContent=state.phase==="observe"?"待观察":`已知 ${state.knownResult?.events.length||0} 起`;
  else if(state.day<=5)$("event-count").textContent=state.dayEvents.length?`${state.dayEvents.length-unread}/${state.dayEvents.length} 已查看`:"今日无事件";
  else $("event-count").textContent=state.lastResult?`${state.lastResult.events.length} 起`:"结算中";

  if(state.phase==="intervene"&&state.day===0)$("mode-hint").textContent=item.movable?`已选择：${item.name}，点击空地移动`:`${item.name}：本关固定`;
  else $("mode-hint").textContent=state.day===0?"第一次轮回无法移动建筑":`${DAYS[state.day]}：城市正在运行`;

  if(state.day===0){
    $("condition-text").textContent=state.phase==="observe"?"建筑和道路已经固定。点击进入周一，逐日观察城市。":"上轮留下4条线索。先在星期日用 SAN 调整布局，再进入周一验证。";
  }else if(state.day<=5&&state.dayEvents.length===0){
    $("condition-text").textContent=`${DAYS[state.day]}没有特殊事件，这是正常的。可以继续前往下一天。`;
  }else if(state.day<=5&&unread>0){
    $("condition-text").textContent=`${DAYS[state.day]}出现 ${unread} 起事件。点击对应建筑上的黄色“!”查看内容。`;
  }else if(state.day<=5){
    $("condition-text").textContent=`${DAYS[state.day]}的事件已经查看完毕，可以继续。`;
  }else if(state.lastResult?.dangerous){
    $("condition-text").textContent=`周六峰值 ${state.lastResult.peak} 达到阈值。点击地图上的红色“!”查看关底事件。`;
  }else{
    $("condition-text").textContent=`周六峰值 ${state.lastResult?.peak||0} 低于阈值，没有生成关底事件。`;
  }
  $("simulate").disabled=state.day===6||unread>0;
  $("simulate-label").textContent=state.day<5?`进入${DAYS[state.day+1]}`:state.day===5?"进入周六结算":state.finalMarker?"等待查看关底事件":"本周已结算";
  $("simulate-hint").textContent=unread>0?"请先查看今天的建筑事件":state.day<5?"允许没有事件的日期正常经过":state.day===5?"汇总五日事件 → 计算犯罪预值":"周日—周六流程已完成";
}

function render(){renderBuildings();renderInfluence();renderHeatmap();renderEventMarkers();renderStats();renderPicker();renderStatus()}

function selectBuilding(id){
  state.selected=id;const item=building(id);
  if(state.day>0)addLog(`${DAYS[state.day]}城市正在运行，只能查看事件。`);
  else if(state.phase==="intervene"&&!item.movable)addLog(`${item.name} 在本关属于固定建筑。`);
  renderPicker();renderBuildings();renderInfluence();renderStatus();
}

function placeSelected(x,y){
  const item=building(state.selected);
  if(state.phase!=="intervene"){addLog("第一次轮回只能观察，暂时无法改变城市。");return}
  if(state.day!==0){addLog("进入周一后不能再移动建筑，请等待本周结算。");return}
  if(!item.movable){addLog(`${item.name} 在新手关中无法移动。`);return}
  if(state.san<=0){addLog("SAN 已耗尽，请先进行周六结算。");return}
  if(item.position.x===x&&item.position.y===y){addLog(`${item.name} 已经在这里，不消耗 SAN。`);return}
  const candidate={...item,position:{x,y}};
  if(x+item.size.width>DEMO_DATA.map.width||y+item.size.height>DEMO_DATA.map.height){addLog(`${item.name} 在 (${x+1},${y+1}) 会超出地图。`);return}
  if(GameRules.touchesRoad(candidate)){addLog(`${item.name} 不能压住固定道路。`);return}
  if(state.buildings.some(other=>other.id!==item.id&&GameRules.rectsOverlap(candidate,other))){addLog(`${item.name} 不能与另一栋建筑重叠。`);return}
  const from={...item.position};item.position={x,y};state.san--;state.moves.push({id:item.id,from,to:{x,y}});
  state.lastResult=null;state.weekResult=null;state.heatmap=emptyHeatmap();
  addLog(`乾坤挪移：${item.name} 从 (${from.x+1},${from.y+1}) 移至 (${x+1},${y+1})，SAN -1。`);render();
}

function eventCards(result){
  return `<div class="event-list">${result.events.map(event=>`<div><small>${event.day}</small><b>【${event.name}】</b><p>${event.clue}</p><span>犯罪预值 +${event.crime_value}${event.livelihood?` · 民生 ${event.livelihood}`:""}</span></div>`).join("")}</div>`;
}

function resultSummary(result){
  const d=result.distances;
  return `<div class="calculation-grid"><div><span>学校 ↔ 住宅</span><b>${number(d.school_to_home)}</b></div><div><span>小卖部 ↔ 住宅</span><b>${number(d.shop_to_home)}</b></div><div><span>大排档 ↔ 住宅</span><b>${number(d.diner_to_home)}</b></div><div><span>大排档 ↔ 派出所</span><b>${number(d.diner_to_police)}</b></div></div>`;
}

function advanceDay(){
  if(state.day>=6)return;
  if(state.day===5){settleWeek();return}
  if(state.day===0){state.weekResult=GameRules.evaluate(state.buildings);state.heatmap=emptyHeatmap();state.lastResult=null}
  state.day++;state.dayEvents=state.weekResult.events.filter(event=>event.day===DAYS[state.day]);state.readEventIds=new Set();state.finalMarker=null;
  if(state.dayEvents.length)addLog(`${DAYS[state.day]}：${state.dayEvents.length} 栋建筑出现事件按钮。`);
  else addLog(`${DAYS[state.day]}：城市照常运行，没有特殊事件。`);
  render();
}

function openDailyEvent(event){
  showModal(`${event.day} · 建筑事件`,event.name,`<p>${event.clue}</p><div class="event-value"><div>🔥 犯罪预值 <b class="bad">+${event.crime_value}</b></div><div>🌿 民生 <b class="${event.livelihood<0?"bad":"good"}">${event.livelihood||0}</b></div></div><p>这不是答案，而是建筑空间关系留下的一条线索。</p>`,`收下线索`,()=>{
    state.readEventIds.add(event.id);addLog(`${event.day}【${event.name}】已查看。`);render();
  });
}

function peakPosition(heatmap){
  const peak=Math.max(...heatmap.flat());
  for(let y=0;y<heatmap.length;y++)for(let x=0;x<heatmap[y].length;x++)if(heatmap[y][x]===peak)return{x,y};
  return{x:0,y:0};
}

function settleWeek(){
  const result=state.weekResult||GameRules.evaluate(state.buildings);state.day=6;state.lastResult=result;state.heatmap=result.heatmap;
  state.dayEvents=[];state.readEventIds=new Set();state.simulationCount++;state.finalMarker=result.dangerous?peakPosition(result.heatmap):null;
  addLog(`周六结算：整周 ${result.events.length} 起特殊事件，犯罪预值峰值 ${result.peak} / ${result.threshold}。`);render();
  if(!result.dangerous){
    showModal("周六 · 安全结算","这一周，挚友平安",`<p>周一至周五没有任何特殊事件把风险推向惨剧，因此地图上没有生成红色关底事件。</p><div class="threshold-result safe-result"><span>区域最高犯罪预值</span><strong>${result.peak}</strong><i>低于案件阈值 ${result.threshold}</i></div>${resultSummary(result)}<ul><li>初始峰值：14</li><li>当前峰值：${result.peak}</li><li>三次移动全部有效</li><li>获得觉醒值：+1</li></ul>`,`完成第一关`);
  }
}

function openFinalEvent(){
  const result=state.lastResult;if(!result)return;
  const firstLoop=state.phase==="observe";
  showModal("周六 · 关底事件",firstLoop?"最初的误杀":"惨剧再次发生",`<p>晚自习结束后，挚友独自走完最后一段回家路。等警方赶到时，这一周积累的危险已经无法挽回。</p>${eventCards(result)}<div class="threshold-result"><span>区域最高犯罪预值</span><strong>${result.peak}</strong><i>案件阈值 ${result.threshold}</i></div>${resultSummary(result)}<p>${firstLoop?"四起事件不是彼此独立的偶然。它们都在提示建筑之间错误的空间关系。":"带着本轮验证结果回到星期日，重新规划三次移动。"}</p>`,firstLoop?"回到星期日":"再次轮回",firstLoop?()=>beginSecondLoop(result):resetSecondLoop);
}

function beginSecondLoop(initialResult){
  state.phase="intervene";state.san=DEMO_DATA.max_san;state.buildings=structuredClone(DEMO_DATA.buildings);state.selected="shop_01";
  state.knownResult=initialResult;state.lastResult=null;state.heatmap=structuredClone(initialResult.heatmap);state.moves=[];state.day=0;state.weekResult=null;state.dayEvents=[];state.readEventIds=new Set();state.finalMarker=null;
  $("log").innerHTML="<li>时间回到星期日。你保留了4条事件线索，并觉醒了“乾坤挪移”。</li><li>本关 SAN 3/3；居民楼、派出所和道路固定。</li>";render();
}

function resetSecondLoop(){
  state.phase="intervene";state.san=DEMO_DATA.max_san;state.buildings=structuredClone(DEMO_DATA.buildings);state.selected="shop_01";
  state.lastResult=null;state.heatmap=state.knownResult?structuredClone(state.knownResult.heatmap):emptyHeatmap();state.moves=[];state.day=0;state.weekResult=null;state.dayEvents=[];state.readEventIds=new Set();state.finalMarker=null;
  $("log").innerHTML="<li>再次回到星期日。SAN 恢复为 3/3。</li>";render();
}

function reset(){
  state.phase="observe";state.san=0;state.buildings=structuredClone(DEMO_DATA.buildings);state.selected="shop_01";state.lastResult=null;state.knownResult=null;
  state.heatmap=emptyHeatmap();state.simulationCount=0;state.moves=[];state.day=0;state.weekResult=null;state.dayEvents=[];state.readEventIds=new Set();state.finalMarker=null;
  $("log").innerHTML="<li>2000年6月11日，星期日。距离好友遇害还有5天。</li>";render();showTutorialIntro();
}

function addLog(text){const li=document.createElement("li");li.textContent=text;$("log").prepend(li)}
function showModal(tag,title,body,button,action=null){
  const modal=$("modal");state.modalAction=action;$("modal-tag").textContent=tag;$("modal-title").textContent=title;$("modal-body").innerHTML=body;$("modal-close").textContent=button;modal.showModal();modal.scrollTop=0;
}
function showTutorialIntro(){
  showModal("第一关 · 第一次轮回","距离好友遇害还有5天",`<p>星期日。好友还活着，但你不知道惨剧为什么会发生。</p><p>从周一开始逐日推进。当天有事件时，建筑上会出现黄色“!”；查看完事件才能进入下一天。没有事件的日子也很正常。</p><div class="demo-mission"><b>初始地图规则</b><p>8×8 网格中有六栋建筑；第4、5行是固定道路。第一次轮回所有建筑均不可移动。</p><small>影响范围以建筑中心向外扩散，超出地图的部分不会平移回来。规则藏在事件文本里，不会直接给出答案。</small></div>`,`开始观察`);
}
function showBackground(){showModal("世界背景 · 千禧年代老城区","又是星期日。挚友还活着。",BACKGROUND_BODY,"返回游戏")}

document.querySelectorAll("[data-building-id]").forEach(button=>button.addEventListener("click",()=>selectBuilding(button.dataset.buildingId)));
$("simulate").addEventListener("click",advanceDay);
$("story").addEventListener("click",showBackground);
$("reset").addEventListener("click",reset);
$("heat-toggle").addEventListener("change",renderHeatmap);
$("modal-close").addEventListener("click",()=>{const action=state.modalAction;state.modalAction=null;$("modal").close();if(action)action()});

renderCells();render();showTutorialIntro();
