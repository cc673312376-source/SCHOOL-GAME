const assert=require("node:assert/strict");
const {DEMO_DATA,buildingDistance,coverageRect,evaluate,findTutorialSolutions,layoutIsValid}=require("../rules.js");

const initial=structuredClone(DEMO_DATA.buildings);
const initialResult=evaluate(initial);

assert.equal(initial.length,6,"第一关应包含六栋建筑");
assert.equal(layoutIsValid(initial),true,"用户给出的初始布局应合法且不压住道路");
assert.deepEqual(DEMO_DATA.map.road_rows,[3,4],"第4、5行应为固定道路");
assert.deepEqual(initialResult.distances,{
  school_to_home:5,
  shop_to_home:5,
  diner_to_home:1,
  diner_to_police:6
},"初始布局的四条教学距离应匹配推算");
assert.deepEqual(initialResult.events.map(event=>event.name),["求学路漫漫","无银光临","杀熟","醉酒斗殴"],"初始一周应依次触发四起特殊事件");
assert.equal(initialResult.peak,14,"初始犯罪预值峰值应为14");
assert.equal(initialResult.threshold,7,"最终案件阈值应为7，即整数预值高于6");
assert.equal(initialResult.dangerous,true,"初始布局应触发最终案件");
assert.deepEqual(initialResult.base_totals,{economy:1,security:-1,livelihood:12,population:10},"六建筑基础属性应正确求和");
assert.equal(initialResult.totals.livelihood,8,"求学路漫漫与杀熟应令民生从12降至8");

const recommended=structuredClone(DEMO_DATA.buildings);
recommended.forEach(item=>{item.position={...DEMO_DATA.recommended_positions[item.id]}});
const recommendedResult=evaluate(recommended);

assert.equal(layoutIsValid(recommended),true,"推荐教学解应为合法布局");
assert.equal(recommendedResult.events.length,0,"推荐布局不应触发特殊事件");
assert.equal(recommendedResult.peak,2,"推荐布局只保留受控的大排档基础风险2");
assert.equal(recommendedResult.dangerous,false,"推荐布局不应触发最终案件");
assert.deepEqual(recommendedResult.distances,{
  school_to_home:3.5,
  shop_to_home:1.5,
  diner_to_home:5,
  diner_to_police:4
},"推荐布局的四条空间关系应全部安全");

const guided=structuredClone(DEMO_DATA.buildings);
guided.find(item=>item.id==="shop_01").position={x:3,y:5};
assert.equal(layoutIsValid(guided),true,"第一步移动小卖部后布局应合法");
assert.deepEqual(evaluate(guided).events.map(event=>event.name),["求学路漫漫","杀熟","醉酒斗殴"],"第一步应让无银光临消失");
guided.find(item=>item.id==="school_01").position={x:3,y:0};
assert.equal(layoutIsValid(guided),true,"第二步移动学校后布局应合法");
assert.deepEqual(evaluate(guided).events.map(event=>event.name),["杀熟","醉酒斗殴"],"第二步应让求学路漫漫消失");
guided.find(item=>item.id==="diner_01").position={x:0,y:1};
assert.equal(layoutIsValid(guided),true,"第三步移动大排档后布局应合法");
assert.deepEqual(evaluate(guided).events,[],"第三步应同时消除杀熟和醉酒斗殴");

const solutions=findTutorialSolutions();
assert.equal(solutions.some(solution=>solution.move_count<3),false,"锁定住宅、派出所和道路后，两次移动内不应存在安全解");
assert.equal(solutions.length,30,"恰好三次移动应保留30种安全解，避免只有唯一答案");
assert.equal(solutions[0].move_count,3,"最短安全解应消耗全部3点SAN");
assert.equal(solutions[0].displacement,12,"推荐解应是总位移最短的三步解");
assert.deepEqual(Object.fromEntries(solutions[0].buildings.map(item=>[item.id,item.position])),DEMO_DATA.recommended_positions,"枚举得到的首选解应与推荐布局一致");

const roadCollision=structuredClone(DEMO_DATA.buildings);
roadCollision.find(item=>item.id==="shop_01").position={x:3,y:3};
assert.equal(layoutIsValid(roadCollision),false,"建筑不能占用固定道路");

const school=structuredClone(DEMO_DATA.buildings[0]);
const home=structuredClone(DEMO_DATA.buildings[4]);
home.position={x:3,y:0};
assert.equal(buildingDistance(school,home),1,"边相接距离应为1");
home.position={x:3,y:3};
assert.equal(buildingDistance(school,home),1.5,"角相接距离应为1.5");
assert.deepEqual(coverageRect(initial.find(item=>item.id==="police_01")),{x:2,y:0,width:6,height:6},"派出所6×6覆盖区应贴合地图边界");

console.log("All six-building tutorial rule tests passed.");
