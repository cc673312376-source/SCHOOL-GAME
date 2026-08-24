(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.GameRules=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const DEMO_DATA={
    map:{width:8,height:8,cell_size:1,road_rows:[3,4]},
    max_san:3,
    event_threshold:7,
    buildings:[
      {id:"school_01",type:"school",name:"xx中学",icon:"🏫",position:{x:0,y:0},size:{width:3,height:3},attributes:{economy:-1,security:-1,livelihood:2,population:2},crime_value:0,influence_area:{width:5,height:5},movable:true},
      {id:"shop_01",type:"shop",name:"小卖部",icon:"🏪",position:{x:3,y:0},size:{width:2,height:2},attributes:{economy:1,security:0,livelihood:1,population:1},crime_value:0,influence_area:{width:4,height:4},movable:true},
      {id:"police_01",type:"police",name:"派出所",icon:"👮",position:{x:6,y:0},size:{width:2,height:2},attributes:{economy:0,security:5,livelihood:2,population:0},crime_value:-5,influence_area:{width:6,height:6},movable:false},
      {id:"diner_01",type:"diner",name:"大排档",icon:"🍜",position:{x:0,y:5},size:{width:3,height:2},attributes:{economy:1,security:-3,livelihood:3,population:3},crime_value:2,influence_area:{width:4,height:5},movable:true},
      {id:"residential_01",type:"residential",name:"居民楼1",icon:"🏠",position:{x:6,y:5},size:{width:2,height:2},attributes:{economy:0,security:-1,livelihood:2,population:2},crime_value:0,influence_area:{width:4,height:4},movable:false},
      {id:"residential_02",type:"residential",name:"居民楼2",icon:"🏘️",position:{x:0,y:7},size:{width:3,height:1},attributes:{economy:0,security:-1,livelihood:2,population:2},crime_value:0,influence_area:{width:3,height:5},movable:false}
    ],
    recommended_positions:{
      school_01:{x:3,y:0},
      shop_01:{x:3,y:5},
      police_01:{x:6,y:0},
      diner_01:{x:0,y:1},
      residential_01:{x:6,y:5},
      residential_02:{x:0,y:7}
    }
  };

  function buildingDistance(a,b){
    const ax2=a.position.x+a.size.width-1,ay2=a.position.y+a.size.height-1;
    const bx2=b.position.x+b.size.width-1,by2=b.position.y+b.size.height-1;
    const dx=ax2<b.position.x?b.position.x-ax2:bx2<a.position.x?a.position.x-bx2:0;
    const dy=ay2<b.position.y?b.position.y-ay2:by2<a.position.y?a.position.y-by2:0;
    const diagonal=Math.min(dx,dy),straight=Math.max(dx,dy)-diagonal;
    return diagonal*1.5+straight;
  }

  function rectsOverlap(a,b){
    return a.position.x<b.position.x+b.size.width&&
      a.position.x+a.size.width>b.position.x&&
      a.position.y<b.position.y+b.size.height&&
      a.position.y+a.size.height>b.position.y;
  }

  function touchesRoad(item){
    for(let y=item.position.y;y<item.position.y+item.size.height;y++){
      if(DEMO_DATA.map.road_rows.includes(y))return true;
    }
    return false;
  }

  function layoutIsValid(buildings){
    const {width,height}=DEMO_DATA.map;
    for(let i=0;i<buildings.length;i++){
      const item=buildings[i];
      if(item.position.x<0||item.position.y<0||item.position.x+item.size.width>width||item.position.y+item.size.height>height)return false;
      if(touchesRoad(item))return false;
      for(let j=i+1;j<buildings.length;j++)if(rectsOverlap(item,buildings[j]))return false;
    }
    return true;
  }

  function coverageRect(item){
    const {width:mapWidth,height:mapHeight}=DEMO_DATA.map;
    const width=item.influence_area.width,height=item.influence_area.height;
    const centerX=item.position.x+(item.size.width-1)/2;
    const centerY=item.position.y+(item.size.height-1)/2;
    let x=Math.round(centerX-(width-1)/2),y=Math.round(centerY-(height-1)/2);
    x=Math.max(0,Math.min(mapWidth-width,x));
    y=Math.max(0,Math.min(mapHeight-height,y));
    return{x,y,width,height};
  }

  function addToArea(heatmap,item,value){
    const area=coverageRect(item);
    for(let y=area.y;y<area.y+area.height;y++){
      for(let x=area.x;x<area.x+area.width;x++)heatmap[y][x]+=value;
    }
  }

  function sumAttributes(buildings){
    const totals={economy:0,security:0,livelihood:0,population:0};
    buildings.forEach(item=>Object.entries(item.attributes).forEach(([key,value])=>totals[key]+=value));
    return totals;
  }

  function evaluate(buildings){
    const get=id=>buildings.find(item=>item.id===id);
    const school=get("school_01"),shop=get("shop_01"),police=get("police_01"),diner=get("diner_01");
    const homes=buildings.filter(item=>item.type==="residential");
    const distances={
      school_to_home:Math.min(...homes.map(home=>buildingDistance(school,home))),
      shop_to_home:Math.min(...homes.map(home=>buildingDistance(shop,home))),
      diner_to_home:Math.min(...homes.map(home=>buildingDistance(diner,home))),
      diner_to_police:buildingDistance(diner,police)
    };
    const events=[];
    if(distances.school_to_home>=5)events.push({id:"school_far",day:"周二",name:"求学路漫漫",source_id:school.id,crime_value:2,livelihood:-2,clue:"晚自习后的回家路太长，学生只能结伴穿过冷清街道。"});
    if(distances.shop_to_home>3)events.push({id:"shop_far",day:"周三",name:"无银光临",source_id:shop.id,crime_value:3,livelihood:0,clue:"小卖部离居民区太远，入夜后几乎无人照看。"});
    if(distances.diner_to_home<=1)events.push({id:"kill_familiar",day:"周四",name:"杀熟",source_id:diner.id,crime_value:2,livelihood:-2,clue:"大排档紧贴居民楼，熟客与住户的矛盾越来越多。"});
    if(distances.diner_to_police>4)events.push({id:"drunken_brawl",day:"周五",name:"醉酒斗殴",source_id:diner.id,crime_value:8,livelihood:0,clue:"派出所赶到时，地上只剩碎玻璃和一片血迹。"});

    const base_totals=sumAttributes(buildings),totals={...base_totals};
    events.forEach(event=>{totals.livelihood+=event.livelihood});
    if(totals.livelihood<0){
      homes.forEach(home=>events.push({id:`unrest_${home.id}`,day:"周五",name:"邻里失序",source_id:home.id,crime_value:2,livelihood:0,clue:"持续低迷的民生让住宅区的不安情绪蔓延。"}));
    }

    const heatmap=Array.from({length:DEMO_DATA.map.height},()=>Array(DEMO_DATA.map.width).fill(0));
    addToArea(heatmap,diner,diner.crime_value);
    events.forEach(event=>addToArea(heatmap,get(event.source_id),event.crime_value));
    addToArea(heatmap,police,police.crime_value);
    heatmap.forEach(row=>row.forEach((value,index)=>{row[index]=Math.max(0,value)}));
    const peak=Math.max(...heatmap.flat());
    return{
      distances,events,heatmap,peak,
      dangerous:peak>=DEMO_DATA.event_threshold,
      threshold:DEMO_DATA.event_threshold,
      totals,base_totals
    };
  }

  function validPositions(item){
    const positions=[];
    for(let y=0;y<=DEMO_DATA.map.height-item.size.height;y++){
      for(let x=0;x<=DEMO_DATA.map.width-item.size.width;x++){
        const candidate={...item,position:{x,y}};
        if(!touchesRoad(candidate))positions.push({x,y});
      }
    }
    return positions;
  }

  function combinations(items,count,start=0,prefix=[],result=[]){
    if(prefix.length===count){result.push([...prefix]);return result}
    for(let i=start;i<items.length;i++){
      prefix.push(items[i]);combinations(items,count,i+1,prefix,result);prefix.pop();
    }
    return result;
  }

  function findTutorialSolutions(maxMoves=DEMO_DATA.max_san){
    const initial=structuredClone(DEMO_DATA.buildings);
    const movable=initial.filter(item=>item.movable).map(item=>item.id);
    const solutions=[];
    for(let moveCount=0;moveCount<=maxMoves;moveCount++){
      for(const movedIds of combinations(movable,moveCount)){
        const moved=new Set(movedIds);
        const choices=initial.map(item=>moved.has(item.id)?validPositions(item).filter(pos=>pos.x!==item.position.x||pos.y!==item.position.y):[item.position]);
        const place=(index,placed)=>{
          if(index===initial.length){
            const result=evaluate(placed);
            if(result.events.length===0&&!result.dangerous){
              const displacement=placed.reduce((total,item)=>{
                const origin=initial.find(candidate=>candidate.id===item.id).position;
                return total+Math.abs(item.position.x-origin.x)+Math.abs(item.position.y-origin.y);
              },0);
              solutions.push({move_count:moveCount,moved_ids:[...movedIds],displacement,buildings:structuredClone(placed),result});
            }
            return;
          }
          for(const position of choices[index]){
            const candidate={...initial[index],position:{...position}};
            if(placed.some(other=>rectsOverlap(candidate,other)))continue;
            place(index+1,[...placed,candidate]);
          }
        };
        place(0,[]);
      }
    }
    return solutions.sort((a,b)=>a.move_count-b.move_count||a.displacement-b.displacement);
  }

  return{DEMO_DATA,buildingDistance,coverageRect,evaluate,findTutorialSolutions,layoutIsValid,rectsOverlap,touchesRoad};
});
