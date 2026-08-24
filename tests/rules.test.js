const assert = require("node:assert/strict");
const { DEMO_DATA, buildingDistance, evaluate } = require("../rules.js");

const initial = structuredClone(DEMO_DATA.buildings);
const initialResult = evaluate(initial);

assert.equal(initialResult.distance, 6, "初始建筑距离应为 6");
assert.equal(initialResult.active, true, "初始布局应触发事件");
assert.equal(initialResult.peak, 2, "初始热力峰值应为 2");
assert.equal(
  initialResult.heatmap.flat().filter(value => value === 2).length,
  25,
  "学校 5×5 范围应写入 25 个热力格"
);

const safe = structuredClone(DEMO_DATA.buildings);
safe.find(item => item.type === "residential").position = { x: 4, y: 4 };
const safeResult = evaluate(safe);

assert.equal(safeResult.distance, 3, "安全布局距离应为 3");
assert.equal(safeResult.active, false, "安全布局不应触发事件");
assert.equal(safeResult.peak, 0, "安全布局热力峰值应为 0");

const school = structuredClone(DEMO_DATA.buildings[0]);
const residential = structuredClone(DEMO_DATA.buildings[1]);
residential.position = { x: 3, y: 0 };
assert.equal(buildingDistance(school, residential), 1, "边相接距离应为 1");
residential.position = { x: 3, y: 3 };
assert.equal(buildingDistance(school, residential), 1.5, "角相接距离应为 1.5");

console.log("All game rule tests passed.");
