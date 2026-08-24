(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.GameRules=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const DEMO_DATA={
    map:{width:8,height:8,cell_size:1},
    buildings:[
      {id:"school_01",type:"school",name:"xx中学",icon:"🏫",position:{x:0,y:0},size:{width:3,height:3},attributes:{economy:-1,security:-1,livelihood:2,population:2},crime_value:0,influence_area:{width:5,height:5}},
      {id:"residential_01",type:"residential",name:"居民楼1",icon:"🏢",position:{x:6,y:6},size:{width:2,height:2},attributes:{economy:0,security:-1,livelihood:2,population:2},crime_value:0,influence_area:{width:4,height:4}}
    ],
    event:{id:"event_school_far",name:"求学路漫漫",condition:{building_a:"school",building_b:"residential",distance_gte:6},effect:{crime_value:2,livelihood:-2},heatmap_value:2,popup:true},
    event_threshold:2
  };

  function buildingDistance(a,b){
    const ax2=a.position.x+a.size.width-1,ay2=a.position.y+a.size.height-1;
    const bx2=b.position.x+b.size.width-1,by2=b.position.y+b.size.height-1;
    const dx=ax2<b.position.x?b.position.x-ax2:bx2<a.position.x?a.position.x-bx2:0;
    const dy=ay2<b.position.y?b.position.y-ay2:by2<a.position.y?a.position.y-by2:0;
    const diagonal=Math.min(dx,dy),straight=Math.max(dx,dy)-diagonal;
    return diagonal*1.5+straight;
  }

  function evaluate(buildings){
    const school=buildings.find(item=>item.type==="school");
    const residential=buildings.find(item=>item.type==="residential");
    const distance=buildingDistance(school,residential);
    const active=distance>=DEMO_DATA.event.condition.distance_gte;
    const heatmap=Array.from({length:8},()=>Array(8).fill(0));
    if(active){
      for(let y=school.position.y;y<Math.min(8,school.position.y+school.influence_area.height);y++)
        for(let x=school.position.x;x<Math.min(8,school.position.x+school.influence_area.width);x++)
          heatmap[y][x]+=DEMO_DATA.event.heatmap_value;
    }
    return{distance,active,heatmap,peak:Math.max(...heatmap.flat())};
  }

  return{DEMO_DATA,buildingDistance,evaluate};
});
