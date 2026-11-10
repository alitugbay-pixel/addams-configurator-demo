'use strict';
// Transcribed from ADDAMS catalogue page 5; visually checked on 10 November 2026.
// Capacity ranges are operating guides, NOT minimum turndown limits.
const verifiedCatalogue={
optimumSource:'https://addamsgroup.com/wp-content/uploads/2025/12/OPTIMUM-Series-Seed-Pre-Cleaner-Catalouge.pdf',
graderSource:'https://addamsgroup.com/wp-content/uploads/2025/12/CATALOUGE-OPTIMUM-220-Series-SCREEN-GRADER.pdf',
optimumModels:[
{id:'OPTIMUM 242',price:16000,screenArea:5,screenKw:1.5,fanKw:5.5,feedKw:.75},
{id:'OPTIMUM 243.1 / 243.2',price:18500,screenArea:7,screenKw:2.2,fanKw:5.5,feedKw:.75},
{id:'OPTIMUM 244.1 / 244.2',price:20500,screenArea:10,screenKw:2.2,fanKw:7.5,feedKw:.75},
{id:'OPTIMUM 245',price:22500,screenArea:13,screenKw:1.5,fanKw:7.5,feedKw:1.1},
{id:'OPTIMUM 246',price:24500,screenArea:15,screenKw:1.1,fanKw:11,feedKw:2.2}],
pre:{wheat:[30,45,50,60,100],barley:[30,45,50,60,100],rapeseed:[25,35,40,50,90],maize:[25,35,40,50,90],peas:[25,35,40,50,90],paddy:[[12.5,12.5],[17.5,17.5],[20,25],[30,35],[45,50]],sunflower:[[12.5,12.5],[17.5,17.5],[20,26],[30,36],[45,51]]},
fine:{seedgrain:[[1,3],[3,5],[4,6],[6,8],[8,12]],malting:[[3,5],[5,8],[6,10],[10,15],[15,25]],rapeseed:[[1,3],[3,6],[4,6],[6,8],[8,12]],maize:[[1,3],[3,4],[4,6],[6,8],20],peas:[[1,3],[3,4],[4,6],[6,8],20]},
graderModels:[222,224,225,226,227,228].map((n,i)=>({id:'OPTIMUM '+n,price:10000+i*2500})),
grader:{
wheat:{density:760,moisture:[14,14],rates:[1.5,3,5,7,10,15]},barley:{density:680,moisture:[14,14],rates:[1.5,3,5,7,10,15]},maize:{density:710,moisture:[14,14],rates:[[1,2],[1.5,4],[2,5],[3,6],[4,8],[8,12]]},oats:{density:510,moisture:[14,14],rates:[1,2,3,5,7,10]},peas:{density:700,moisture:[14,14],rates:[[1,2],[2,4],[3,5],[4,6],[5,7],[8,12]]},whiteRice:{density:750,moisture:[14,14],rates:[2,3,4,7,7,[8,12]]},rye:{density:690,moisture:[14,14],rates:[1.5,3,5,5,10,15]},ryegrass:{density:300,moisture:[14,14],rates:[.4,1,null,null,3,4]},sorghum:{density:640,moisture:[14,14],rates:[1.5,3,5,7,10,15]},soybean:{density:720,moisture:[14,14],rates:[[1,2],[2,4],[3,5],[4,6],[5,7],[8,12]]},sunflower:{density:400,moisture:[7,9],rates:[[.5,1.5],[1.2,3],[1.5,2],[1.5,3],[2,3],[2.5,4]]}}
};
function catalogueCrop(text){const c=text.toLowerCase().replace(/ seed$/,'').trim();return({'wheat':'wheat','barley':'barley','malting barley':'barley','rapeseed':'rapeseed','maize':'maize','pea':'peas','peas':'peas','paddy rice':'paddy','white rice':'whiteRice','sunflower':'sunflower','oats':'oats','rye':'rye','ryegrass':'ryegrass','sorghum':'sorghum','soybean':'soybean'})[c]||null;}
function catalogueDecision(type,ctx,units,pinned,models){const crop=catalogueCrop(ctx.crop),duty=ctx.optimumDuty||'pre',flow=ctx.design/units,moisture=ctx.moisture??null;let rates,label,moistureLimit,moistureRange,density;
if(type==='grader'){const row=verifiedCatalogue.grader[crop];if(row){rates=row.rates;moistureRange=row.moisture;density=row.density;label=ctx.crop+' · dried, fine-cleaned feed';}}
else if(duty==='pre'){rates=verifiedCatalogue.pre[crop];moistureLimit=crop==='sunflower'?14:20;label=ctx.crop+' · pre-cleaning';}
else if(duty==='fine-malting'){if(crop==='barley'){rates=verifiedCatalogue.fine.malting;label='Malting barley · fine cleaning';}moistureLimit=15;}
else{const row=['wheat','barley','oats','rye','sorghum'].includes(crop)?'seedgrain':crop;rates=verifiedCatalogue.fine[row];label=(row==='seedgrain'?'Seed grain':ctx.crop)+(row==='rapeseed'?' · 98% purity':'')+' · fine cleaning';moistureLimit=15;}
const pending=(reason)=>({model:models.find(m=>m.id===pinned)||null,status:'Engineering selection required',capacity:null,reason,source:type==='grader'?verifiedCatalogue.graderSource:verifiedCatalogue.optimumSource});
if(!ctx.valid)return pending('Enter a valid target capacity and design margin.');
if(!rates)return pending('No exact catalogue crop / duty row is available. Rice must be specified as paddy or white rice. Unlisted crops and duties are not extrapolated.');
const range=v=>Array.isArray(v)?v:[v,v],available=models.map((m,i)=>({model:m,rate:rates[i]===null?null:range(rates[i])})).filter(x=>x.rate&&Number.isFinite(x.rate[0]));
let chosen=pinned?available.find(x=>x.model.id===pinned):available.find(x=>x.rate[0]>=flow)||available[available.length-1];
if(!chosen)return pending('The selected model has no unambiguous rating in this row. Check the original catalogue with engineering.');
const capacity=chosen.rate[0],flowFits=flow<=capacity+1e-9,conditionsFit=moisture===null?true:moistureRange?moisture>=moistureRange[0]&&moisture<=moistureRange[1]:moisture<=moistureLimit,densityDiffers=type==='grader'&&ctx.density>0&&ctx.density!==density,feedReady=type!=='grader'||ctx.graderReady,within=flowFits&&conditionsFit&&!densityDiffers&&feedReady;
const conditions=moistureRange?'Catalogue moisture '+(moistureRange[0]===moistureRange[1]?moistureRange[0]:moistureRange.join('–'))+'%; bulk density '+density+' kg/m³. Feed must be dried and fine-cleaned.':'Catalogue moisture limit '+moistureLimit+'%'+(crop==='sunflower'?' (sunflower row at 14%)':'')+'.';
return{model:chosen.model,capacity,catalogueRange:chosen.rate,basisLabel:label,within,manual:!!pinned,source:type==='grader'?verifiedCatalogue.graderSource:verifiedCatalogue.optimumSource,status:!flowFits?'Outside conservative catalogue capacity':!conditionsFit||densityDiffers?'Feed conditions differ from catalogue':!feedReady?'Confirm grader feed preparation':moisture===null?'Suggested model · confirm moisture':'Suggested model · catalogue comparison',reason:label+'. '+(pinned?'Manual model. ':'Smallest listed model meeting the conservative comparison duty. ')+flow.toFixed(2)+' t/h per unit compared with '+(chosen.rate[0]===chosen.rate[1]?chosen.rate[0]:chosen.rate.join('–'))+' t/h. '+(chosen.rate[0]!==chosen.rate[1]?'The lower end of the published range is used for selection; it is not a minimum feed rate. ':'')+conditions+(moisture===null?' Feed moisture was not entered; verify this condition. ':!conditionsFit?' Entered feed moisture does not match this basis; engineering confirmation required. ':' ')+(type==='grader'?'No density-based scaling is applied. '+(densityDiffers?'Entered density differs from the catalogue basis. ':'')+(!feedReady?'Confirm dried, fine-cleaned grader feed before relying on this comparison. ':''):'')+(/243|244/.test(chosen.model.id)?'Variant routing (.1 / .2) still needs confirmation. ':'')+(!flowFits?'Duty exceeds this conservative rating. ':'')+'Actual performance depends on the crop sample and impurity / quality targets.'};
}
// Keep unspecified Rice available, but do not silently treat it as paddy or white rice.
const grainChoices=families.find(f=>f.id==='grain').crops;for(const crop of ['Paddy rice','White rice','Rye','Sorghum'])if(!grainChoices.includes(crop))grainChoices.splice(grainChoices.length-1,0,crop);

