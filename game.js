const DEMO_DATA=GameRules.DEMO_DATA;

const $=id=>document.getElementById(id);
const state={
  buildings:structuredClone(DEMO_DATA.buildings),
  selected:"residential_01",
  heatmap:Array.from({length:8},()=>Array(8).fill(0)),
  eventActive:false,
  simulationCount:0
};

function building(id){return state.buildings.find(item=>item.id===id)}
function byType(type){return state.buildings.find(item=>item.type===type)}
function fmt(value){return value>0?`+${value}`:String(value)}

function renderCells(){
  $("cells").innerHTML="";
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const cell=document.createElement("button");
    cell.className="cell";cell.type="button";cell.title=`(${x},${y})`;
    cell.addEventListener("click",()=>placeSelected(x,y));
    $("cells").appendChild(cell);
  }
}

function renderBuildings(){
  const root=$("building-layer");root.innerHTML="";
  state.buildings.forEach(item=>{
    const el=document.createElement("button");
    el.type="button";
    el.className=`building ${item.type} ${state.selected===item.id?"selected":""}`;
    el.style.gridColumn=`${item.position.x+1} / span ${item.size.width}`;
    el.style.gridRow=`${item.position.y+1} / span ${item.size.height}`;
    el.innerHTML=`<div><span>${item.icon}</span><strong>${item.name}</strong></div>`;
    el.addEventListener("click",e=>{e.stopPropagation();selectBuilding(item.id)});
    root.appendChild(el);
  });
}

function renderInfluence(){
  const school=byType("school"),box=document.createElement("div");
  $("influence").innerHTML="";
  box.className="influence-box";
  box.style.gridColumn=`${school.position.x+1} / span ${Math.min(school.influence_area.width,8-school.position.x)}`;
  box.style.gridRow=`${school.position.y+1} / span ${Math.min(school.influence_area.height,8-school.position.y)}`;
  $("influence").appendChild(box);
}

function renderHeatmap(){
  const root=$("heatmap");root.innerHTML="";
  state.heatmap.flat().forEach(value=>{
    const cell=document.createElement("div");
    cell.className=`heat-cell ${value>=DEMO_DATA.event_threshold?"hot":""}`;
    if(value)cell.textContent=value;
    root.appendChild(cell);
  });
  root.classList.toggle("hidden",!$("heat-toggle").checked);
  $("peak").textContent=Math.max(...state.heatmap.flat());
}

function renderRelation(){
  const a=byType("school"),b=byType("residential");
  const center=item=>({x:item.position.x+item.size.width/2,y:item.position.y+item.size.height/2});
  const ca=center(a),cb=center(b),line=$("relation-line");
  line.setAttribute("x1",ca.x);line.setAttribute("y1",ca.y);line.setAttribute("x2",cb.x);line.setAttribute("y2",cb.y);
  const d=buildingDistance(a,b),unsafe=d>=DEMO_DATA.event.condition.distance_gte;
  $("distance").textContent=Number.isInteger(d)?d:d.toFixed(1);
  $("condition-text").textContent=unsafe?"当前布局将触发“求学路漫漫”。":"当前布局安全：学生通学距离未达到事件阈值。";
  $("condition-text").classList.toggle("safe",!unsafe);
}

function renderStats(){
  const totals={economy:0,security:0,livelihood:0,population:0};
  state.buildings.forEach(item=>Object.entries(item.attributes).forEach(([key,value])=>totals[key]+=value));
  if(state.eventActive)totals.livelihood+=DEMO_DATA.event.effect.livelihood;
  Object.entries(totals).forEach(([key,value])=>$(key).textContent=fmt(value));
}

function renderPicker(){
  document.querySelectorAll("[data-building]").forEach(button=>{
    const item=byType(button.dataset.building);
    button.classList.toggle("selected",item.id===state.selected);
  });
  $("mode-hint").textContent=`已选择：${building(state.selected).name}，点击网格移动`;
}

function render(){renderBuildings();renderInfluence();renderHeatmap();renderRelation();renderStats();renderPicker()}

function selectBuilding(id){state.selected=id;renderPicker();renderBuildings()}

function placeSelected(x,y){
  const item=building(state.selected);
  if(x+item.size.width>8||y+item.size.height>8){toastLog(`${item.name} 在 (${x},${y}) 会超出地图。`);return}
  const collision=state.buildings.some(other=>other.id!==item.id&&rectsOverlap({x,y,w:item.size.width,h:item.size.height},{x:other.position.x,y:other.position.y,w:other.size.width,h:other.size.height}));
  if(collision){toastLog(`${item.name} 不能与另一建筑重叠。`);return}
  item.position={x,y};clearSimulation();
  toastLog(`已将 ${item.name} 移至 (${x},${y})。`);render();
}

function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}

const buildingDistance=GameRules.buildingDistance;

function simulate(){
  state.simulationCount++;
  const result=GameRules.evaluate(state.buildings);
  state.heatmap=result.heatmap;
  const school=byType("school"),residential=byType("residential"),distance=result.distance;
  const active=result.active;
  state.eventActive=active;
  addLog(`第 ${state.simulationCount} 次演算：创建 8×8 grid。`);
  addLog(`读取 ${school.id} (${school.position.x},${school.position.y}) 与 ${residential.id} (${residential.position.x},${residential.position.y})。`);
  addLog(`建筑占地边界最近距离 = ${Number.isInteger(distance)?distance:distance.toFixed(1)}。`);
  if(active){
    addLog(`距离 ≥ 6，触发 ${DEMO_DATA.event.id}。`);
    addLog(`中学 5×5 影响区写入 crime_value +2。`);
    addLog(`heatmap_max = ${Math.max(...state.heatmap.flat())}，达到阈值 ${DEMO_DATA.event_threshold}。`);
    render();
    showModal("犯罪事件触发",DEMO_DATA.event.name,`<p>住宅区离学校过远。漫长且缺少照看的通学路线，正在成为犯罪滋生区。</p><div class="event-value"><div>🔥 犯罪值 <b class="bad">+${DEMO_DATA.event.effect.crime_value}</b></div><div>🌿 民生 <b class="bad">${DEMO_DATA.event.effect.livelihood}</b></div></div><ul><li>建筑距离：${distance}</li><li>事件阈值：≥ 6</li><li>热力峰值：2 / 2</li></ul><p>移动居民楼或学校，缩短最近距离，再次运行演算。</p>`,`继续调整布局`);
  }else{
    addLog(`距离 < 6，event_school_far 未触发。`);
    addLog(`heatmap_max = 0，未达到阈值 ${DEMO_DATA.event_threshold}。`);
    render();
    showModal("规划成功","挚友今天平安到校",`<p>学校与住宅区的空间关系已经改善，“求学路漫漫”没有发生。</p><div class="event-value"><div>🔥 犯罪峰值 <b class="good">0</b></div><div>🌿 民生惩罚 <b class="good">0</b></div></div><p>本关验证完成：建筑放置 → 距离判断 → 事件开关 → 热力图 → 峰值提示。</p>`,`再试一种布局`);
  }
}

function clearSimulation(){state.eventActive=false;state.heatmap=Array.from({length:8},()=>Array(8).fill(0))}

function reset(){
  state.buildings=structuredClone(DEMO_DATA.buildings);state.selected="residential_01";state.simulationCount=0;clearSimulation();
  $("log").innerHTML="<li>地图已重置为文档指定初始状态。</li>";render();
}

function addLog(text){const li=document.createElement("li");li.textContent=text;$("log").prepend(li)}
function toastLog(text){addLog(text)}
function showModal(tag,title,body,button){$("modal-tag").textContent=tag;$("modal-title").textContent=title;$("modal-body").innerHTML=body;$("modal-close").textContent=button;$("modal").showModal()}

document.querySelectorAll("[data-building]").forEach(button=>button.addEventListener("click",()=>selectBuilding(byType(button.dataset.building).id)));
$("simulate").addEventListener("click",simulate);
$("reset").addEventListener("click",reset);
$("heat-toggle").addEventListener("change",renderHeatmap);
$("modal-close").addEventListener("click",()=>$("modal").close());

renderCells();render();
showModal("Demo 目标","改变空间，阻止死亡",`<p>学校在左上角，居民楼在右下角。两者占地边界的最近距离为 <b>6</b>，恰好会触发事件“求学路漫漫”。</p><p>先运行一次初始布局观察犯罪热力图；然后选中建筑并点击网格重新放置，让距离缩短到 6 以下。</p><ul><li>边方向每格距离 = 1</li><li>斜方向每格距离 = 1.5</li><li>热力峰值达到 2 时弹出事件</li></ul>`,`开始规划`);
