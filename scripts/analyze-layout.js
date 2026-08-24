const {DEMO_DATA,evaluate,findTutorialSolutions}=require("../rules.js");

const initial=structuredClone(DEMO_DATA.buildings);
const initialResult=evaluate(initial);
const solutions=findTutorialSolutions();
const byMove=solutions.reduce((counts,solution)=>{
  counts[solution.move_count]=(counts[solution.move_count]||0)+1;
  return counts;
},{});
const recommended=solutions[0];

console.log("First-level 8×8 layout analysis");
console.log(JSON.stringify({
  initial:{
    event_names:initialResult.events.map(event=>event.name),
    distances:initialResult.distances,
    crime_peak:initialResult.peak,
    threshold:initialResult.threshold,
    dangerous:initialResult.dangerous
  },
  solution_counts_by_moves:{0:byMove[0]||0,1:byMove[1]||0,2:byMove[2]||0,3:byMove[3]||0},
  recommended:{
    move_count:recommended.move_count,
    displacement:recommended.displacement,
    positions:Object.fromEntries(recommended.buildings.map(item=>[item.id,item.position])),
    distances:recommended.result.distances,
    crime_peak:recommended.result.peak,
    threshold:recommended.result.threshold
  }
},null,2));
