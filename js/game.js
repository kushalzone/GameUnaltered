(() => {
"use strict";
const {encounters,actLines,shopReplies,sprites,saveSpots}=window.GameData;
const {keys,pressed}=window.GameInput;
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d",{alpha:false});
ctx.imageSmoothingEnabled=false;
const W=640,H=480;
let state="title",tick=0,scene=0,dialogue=null,dialogueDone=null,shake=0,flash=0,hitStop=0,muted=false,desaturate=0;
let shopTalkCount=0,shopPrompt=0,saveMessage="",battle=null,partyTurn=0,subMenu=null,menuIndex=0,quick=false,endingText="";
let player={x:170,y:346,dir:"right",walk:0,trail:[]};
const party=[
 {name:"Arcer",hp:40,max:40,mp:0,atk:8,def:0,color:"#59ded0",weapon:"sword",charge:0,guard:false},
 {name:"Kal",hp:55,max:55,mp:0,atk:11,def:0,color:"#d66be9",weapon:"axe",charge:0,guard:false},
 {name:"Jon",hp:35,max:35,mp:50,maxMp:50,atk:7,def:0,color:"#b9e957",weapon:"knuckles",charge:0,guard:false}
];
let inventory={gold:48,"Cloud Loaf":2,"Gilded Vest":0,"Letter Opener":0,"Nimbus Tonic":0,"Spare Halo":0};
let saveFlags=[false,false,false,false,false,false,false],progress=0,saveData=null;
try{saveData=JSON.parse(localStorage.getItem("perch-save")||"null");if(saveData){progress=saveData.progress||0;scene=saveData.scene||0;saveFlags=saveData.saveFlags||saveFlags;inventory=saveData.inventory||inventory;party.forEach((p,i)=>{if(saveData.party&&saveData.party[i])Object.assign(p,saveData.party[i]);p.hp=p.max;p.charge=0});}}catch(_){}
const clearedEncounters=new Set(saveData&&Array.isArray(saveData.clearedEncounters)?saveData.clearedEncounters:[]);
const overworldEnemies=[
 {x:480,y:346},{x:505,y:336},{x:475,y:346},{x:500,y:330},
 null,null,{x:520,y:320}
];
function persistSave(){
 try{localStorage.setItem("perch-save",JSON.stringify({progress,scene,saveFlags,inventory,clearedEncounters:[...clearedEncounters],party:party.map(({hp,max,mp,maxMp,atk,def})=>({hp,max,mp,maxMp,atk,def}))}))}catch(_){}
}
let audio=null,master=null,audioTimer=null,musicMode="";
function audioInit(){if(!audio){audio=new(window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=muted?0:.16;master.connect(audio.destination);}if(audio.state==="suspended")audio.resume();}
function tone(freq,dur=.08,wave="square",vol=.25,when=0){if(muted)return;audioInit();let o=audio.createOscillator(),g=audio.createGain();o.type=wave;o.frequency.setValueAtTime(freq,audio.currentTime+when);g.gain.setValueAtTime(vol,audio.currentTime+when);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+when+dur);o.connect(g);g.connect(master);o.start(audio.currentTime+when);o.stop(audio.currentTime+when+dur+.01);}
function sfx(name){if(muted)return;if(name==="blip")tone(520+Math.random()*180,.025,"square",.08);if(name==="hit"){tone(90,.12,"triangle",.4);tone(48,.17,"square",.22,.02)}if(name==="confirm")tone(720,.07,"square",.15);if(name==="hurt")tone(180,.18,"sawtooth",.22);if(name==="charge"){tone(190,.3,"sawtooth",.18);tone(480,.35,"triangle",.15,.22)}if(name==="laugh"){for(let i=0;i<6;i++)tone(180+i*42,.11,"sawtooth",.2,i*.13)}if(name==="save"){tone(440,.3,"triangle",.18);tone(660,.38,"sine",.14,.12);tone(880,.5,"sine",.1,.25)}}
function setMusic(mode){if(mode===musicMode)return;musicMode=mode;if(audioTimer){clearInterval(audioTimer);audioTimer=null}if(muted||!mode)return;audioInit();let patterns={over:[262,330,392,330,294,349,440,349],battle:[110,110,165,110,147,147,196,147],shop:[523,659,784,659,587,698,880,698],boss:[146,146,220,196,146,146,247,220],quiet:[]};let pat=patterns[mode]||patterns.over,n=0;audioTimer=setInterval(()=>{if(!muted&&pat.length){let f=pat[n++%pat.length];tone(f,.18,"square",mode==="battle"?.12:.07);if(mode!=="quiet"&&n%2===0)tone(f/2,.22,"triangle",.09,.02);if(mode==="boss"&&battle&&battle.phase>=3&&n%2===0)tone(65,.07,"square",.1,.04)}},220);}
function setMuted(){muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.16,audio.currentTime,.03);if(!muted)setMusic(musicMode);}
function rand(a,b){return a+Math.random()*(b-a)}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h))}
function outline(x,y,w,h,c="#fff",line=3){ctx.strokeStyle=c;ctx.lineWidth=line;ctx.strokeRect(Math.floor(x)+line/2,Math.floor(y)+line/2,w-line,h-line)}
function text(str,x,y,size=14,color="#fff",align="left"){ctx.font=`${size}px monospace`;ctx.textAlign=align;ctx.textBaseline="top";ctx.fillStyle="#080a12";ctx.fillText(String(str),Math.floor(x)+1,Math.floor(y)+1);ctx.fillStyle=color;ctx.fillText(String(str),Math.floor(x),Math.floor(y))}
function wrapText(str,maxChars){let words=String(str).split(" "),lines=[],line="";for(let w of words){if((line+w).length>maxChars){lines.push(line);line=w}else line+= (line?" ":"")+w}if(line)lines.push(line);return lines}
function background(mode="sky"){
 const battleMode=mode==="battle";
 rect(0,0,W,H,battleMode?"#171a2a":"#253748");
 for(let i=0;i<10;i++){
  let x=((i*103-Math.floor(tick*(battleMode?.22:.1)))%850+850)%850-110,y=38+(i*61)%240;
  const c=battleMode?"#353950":"#43576b";
  rect(x,y,86,8,c);rect(x+13,y-8,43,8,c);rect(x+55,y-4,24,4,c);
  rect(x+8,y+8,68,4,"#151a29");
 }
 if(battleMode){
  rect(0,280,640,200,"#282b40");
  for(let i=0;i<9;i++){let x=i*82-(tick%82);rect(x,305,28,175,"#31344b");rect(x+35,336,19,144,"#202437");}
  rect(0,406,640,74,"#171a28");
 }else{
  rect(0,278,640,202,"#3e4c60");
  for(let i=0;i<10;i++){let x=(i*93+Math.floor(tick*.12))%750-70,y=320+(i%3)*38;rect(x,y,102,17,"#586477");rect(x+11,y-8,62,8,"#647086");rect(x+5,y+17,88,7,"#232b3c");}
  rect(0,426,640,54,"#262b3a");
 }
}
function sprite(name,x,y,scale=3,opts={}) {
 const rows=sprites[name]||sprites["Arcer"];
 const palette={T:"#59ded0",P:"#d66be9",L:"#b9e957",W:"#f8fbff",Y:"#f8d96b",G:name==="Eagle"?"#eac44c":name==="Protector"?"#777b80":"#829caf",B:"#25262b"};
 const cols=opts.monochrome?{T:"#aaa",P:"#aaa",L:"#aaa",W:"#eee",Y:"#aaa",G:"#aaa",B:"#222"}:palette;
 let sy=Math.floor(y+(opts.battleReady?0:Math.sin(tick/9+(x/15))*1.5));
 if(opts.walk)sy+=Math.floor(Math.sin(tick/3)*1.5);
 const px=Math.floor(x),flip=opts.dir==="left";
 if(flip){ctx.save();ctx.translate(px*2+rows[0].length*scale,0);ctx.scale(-1,1)}
 rows.forEach((row,ry)=>[...row].forEach((ch,rx)=>{
  if(ch==="." )return;
  const c=cols[ch]||"#ddd";
  ctx.globalAlpha=.6;rect(px+rx*scale+2,sy+ry*scale+2,scale,scale,"#000");ctx.globalAlpha=1;
  rect(px+rx*scale,sy+ry*scale,scale,scale,opts.hurt&&Math.floor(tick/3)%2?"#fff":c);
 }));
 if(flip)ctx.restore();
 if(name==="Arcer"&&opts.dir==="up")rect(px+scale*3,sy+scale*2,scale*2,scale,"#fff");
 if(name==="Arcer"&&opts.dir==="down")rect(px+scale*3,sy+scale*3,scale*2,scale,"#14202b");
 if(name==="Eagle"){ctx.globalAlpha=.24;rect(x-25,y+scale*3,rows[0].length*scale+50,scale*2,"#f8d96b");rect(x-15,y,rows[0].length*scale+30,scale*2,"#f8d96b");ctx.globalAlpha=1}
 if(name==="Cub"&&opts.tired){rect(x+17,y+2,3,3,"#52b9da");}
 if(opts.hurt){ctx.globalAlpha=.55;rect(x-2,y-2,rows[0].length*scale+4,rows.length*scale+4,"#fff");ctx.globalAlpha=1}
}
function drawSavePoint(x,y,active=false){
 const pulse=Math.floor(Math.sin(tick/12)*2),ringY=y-30+pulse,glow=active?"#fff1a1":"#ffdc70";
 rect(x-17,y+4,40,5,"#10131c");
 rect(x-20,y,46,6,"#8395a0");rect(x-16,y-4,38,5,"#647984");rect(x-11,y-8,28,5,"#bec8c8");
 rect(x-7,ringY-2,20,4,glow);rect(x-1,ringY-8,4,16,glow);rect(x-12,ringY-1,4,3,glow);rect(x+15,ringY-1,4,3,glow);
 for(let i=0;i<3;i++){let ox=Math.sin(tick/15+i*2)*16;rect(x+ox,y-20-(tick+i*8)%18,2,2,"#fff1ad")}
}
function drawPartySprite(name,x,y,scale=3,opts={}){sprite(name,x,y,scale,opts)}
function shadowText(str,x,y,size=14,color="#fff",align="left"){ctx.font=`${size}px monospace`;ctx.textAlign=align;ctx.textBaseline="top";ctx.fillStyle="#000";ctx.fillText(String(str),x+2,y+2);ctx.fillStyle=color;ctx.fillText(String(str),x,y)}
function encounterForScene(room=scene){return room<4?room:room===6?5:-1}
function activeEnemy(room=scene){let index=encounterForScene(room);return index>=0&&!clearedEncounters.has(encounters[index].id)?overworldEnemies[room]:null}
function followsAt(delay){return player.trail[Math.min(delay,player.trail.length-1)]||player}
function drawWorldEnemy(){
 const enemy=activeEnemy();if(!enemy)return;
 const index=encounterForScene(),name=["Cub","Moth","Clerk","Hound",null,null,"Eagle"][scene];
 rect(enemy.x-14,enemy.y+2,38,5,"#141723");
 drawPartySprite(name,enemy.x,enemy.y-34,scene===6?4:3,{walk:tick%30<15,battleReady:false});
 text(encounters[index].name,enemy.x+8,enemy.y-53,9,"#f2e7c7","center");
}
function drawExplore(){
 background();
 const places=[
  "THE LANDING","THE CLOUD CORRIDOR","THE GILDED HALL","THE FLOATING GARDEN","GERMIS' SHOP","THE LONG STAIRCASE","THE EAGLE'S PERCH"
 ];
 if(scene===0){rect(0,393,640,87,"#55515a");rect(0,399,640,5,"#85817a");for(let i=0;i<6;i++)rect(40+i*110,401,36,3,"#35313a");}
 else if(scene===3){for(let i=0;i<4;i++){let x=74+i*145;rect(x,312,80,5,"#273438");rect(x+7,293,64,20,"#3d7955");for(let j=0;j<4;j++)rect(x+12+j*13,279-(j%2)*7,8,15,["#f2c65a","#fff","#b8e957"][j%3]);}}
 else if(scene===4){rect(0,375,640,105,"#534b46");rect(0,382,640,8,"#8b7659");rect(80,220,470,155,"#75664f");rect(80,214,470,9,"#b19b70");for(let i=0;i<5;i++){rect(105+i*85,246,62,4,"#393342");rect(112+i*85,229,34,15, i%2?"#72827c":"#a8a28c");rect(440,318,90,54,"#483b34");rect(447,311,86,8,"#29262a");}
  rect(330,350,18,24,"#9b772f");rect(330,345,16,3,"#403835");rect(332,342,12,3,"#403835");
 } else {rect(0,376,640,104,"#504d54");rect(0,376,640,8,"#898477");for(let i=0;i<7;i++){let x=i*102;rect(x,358-i%2*4,100,19,"#716354");rect(x,355-i%2*4,100,4,"#a18c69");rect(x,377,100,7,"#34313b");}}
 if(scene===5||scene===6){for(let i=0;i<8;i++){let x=60+i*74,y=362-i*23;rect(x,y,78,7,"#94764b");rect(x,y-3,78,4,"#f5d894");}rect(566,104,4,270,"#282227");rect(545,100,46,5,"#353039");}
 const saveIndex=Math.min(scene,6);
 if(scene!==4)drawSavePoint(saveSpots[saveIndex].x,saveSpots[saveIndex].y,Math.abs(player.x-saveSpots[saveIndex].x)<38);
 else drawSavePoint(70,364,Math.abs(player.x-70)<38);
 if(scene===6)drawSavePoint(82,350,Math.abs(player.x-82)<38);
 if(scene===0){rect(284,312,28,72,"#796a4d");rect(274,306,48,8,"#b6a075");rect(278,279,40,25,"#655842");rect(290,270,16,34,"#e7d99b");}
 if(scene===4){drawPartySprite("Germis",462,295,4,{monochrome:true});}
 drawWorldEnemy();
 const kal=followsAt(16),jon=followsAt(30),walking=player.walk>0;
 drawPartySprite("Kal",kal.x-10,kal.y-38,2,{walk:walking});drawPartySprite("Jon",jon.x-10,jon.y-38,2,{walk:walking});
 drawPartySprite("Arcer",player.x-10,player.y-42,3,{walk:walking,dir:player.dir});
 if(scene>0&&scene<6){rect(0,315,8,66,"#1b1b2b");rect(632,315,8,66,"#1b1b2b");rect(8,315,10,5,"#a19071");rect(622,315,10,5,"#a19071");}
 else if(scene===0){rect(0,315,18,66,"#1b1b2b");}
 else{rect(622,315,18,66,"#1b1b2b");}
 shadowText(places[scene],18,16,15,"#fff");
 text("ARROWS MOVE  Z INTERACT  X BACK",W/2,36,10,"#f1f0e6","center");
 if(scene===0)text("The clouds end here. That seems like poor planning.",18,443,11,"#e0d5bd");
 if(scene===4)text("A bell hangs above the counter.",22,427,12,"#eee0bd");
 if(saveMessage){uiBox(102,190,436,72);text(saveMessage,122,216,15,"#fff");}
 if(quick)drawQuickPanel();
}
function drawQuickPanel(){
 uiBox(78,98,484,284);text("PARTY STATUS / ITEMS",96,114,15);
 party.forEach((p,i)=>{let y=153+i*53;text(`${p.name}  ${p.hp}/${p.max} HP`,98,y,14,p.color);text(`ATK ${p.atk}   DEF ${p.def}${i===2?`   MP ${p.mp}/${p.maxMp}`:""}`,350,y,12);});
 text(`TP ${battle?battle.tp:0}%     GOLD ${inventory.gold} G`,98,320,14,"#ffe797");text("C / X  CLOSE",425,348,11,"#bbb");
}
function uiBox(x,y,w,h){rect(x,y,w,h,"#050509");outline(x,y,w,h,"#fff",3)}
function openDialogue(lines,after=null){
 dialogue={lines:Array.isArray(lines)?lines:[lines],index:0,shown:0,wait:0};dialogueDone=after;state="dialogue";
}
function drawDialogue(){
 if(scene===4){drawExplore();state="dialogue";}
 uiBox(68,382,504,76);
 const line=dialogue.lines[dialogue.index]||"",chars=Math.floor(dialogue.shown);
 const speaker=line.match(/^(Arcer|Kal|Jon):\s*/),person=dialogue.person||(speaker?speaker[1]:"");
 if(person){text(person,120,389,11,"#bdebe5");sprite(person,78,402,2,{battleReady:true});}
 const visible=line.slice(0,chars).replace(/^(Arcer|Kal|Jon):\s*/,"");
 wrapText(visible,person?56:60).slice(0,4).forEach((s,i)=>text(s,person?120:86,403+i*13,13,"#fff"));
 if(chars<line.length){if(tick%2===0){dialogue.shown=Math.min(line.length,dialogue.shown+.65);if(Math.random()<.3)sfx("blip")}}
 else text("V",552,443,10,"#fff");
}
function beginSave(index){
 party.forEach(p=>{p.hp=p.max;p.charge=0});party[2].mp=party[2].maxMp;
 encounters.forEach(e=>{e.tired=false;e.sleep=0});
 saveFlags[index]=true;progress=Math.max(progress,index);
 persistSave();
 sfx("save");saveMessage="The air is thin here. Your party feels lighter.";
 setTimeout(()=>{saveMessage=""},1900);
 openDialogue(["The air is thin here. Your party feels lighter.","The halo saves your progress. It also seems pleased with itself.","ARROWS move. Z interacts. X backs out. C opens party status."],()=>{state="explore"});
}
function isFacingTarget(x,y,range=92){
 const dx=x-player.x,dy=y-player.y;
 const forward=player.dir==="left"?-dx:player.dir==="right"?dx:player.dir==="up"?-dy:dy;
 const side=player.dir==="left"||player.dir==="right"?Math.abs(dy):Math.abs(dx);
 return forward>0&&forward<=range&&side<=42;
}
function resetTrail(){
 const horizontal=player.dir==="left"||player.dir==="right";
 const back=player.dir==="left"?1:-1;
 player.trail=Array.from({length:36},(_,i)=>({x:player.x+(horizontal?back*(i+1)*1.5:0),y:player.y+(horizontal?0:(player.dir==="up"?1:-1)*(i+1)*1.5)}));
}
function inspectWorld(){
 if(quick){quick=false;return}
 const spot=scene===4?{x:70,y:364}:saveSpots[Math.min(scene,6)];
 if(isFacingTarget(spot.x,spot.y,78)){beginSave(Math.min(scene,6));return}
 if(scene===4&&isFacingTarget(483,320,112)){state="shop";shopPrompt=0;menuIndex=0;subMenu=null;setMusic("shop");return}
 if(scene===0&&isFacingTarget(300,326,100)){openDialogue(["A golden halo floats above the pedestal.","The clouds below it are arranged like a staircase."],()=>{state="explore"});}
}
function startBattle(index){
 battle={enemy:JSON.parse(JSON.stringify(encounters[index])),idx:index,tp:0,turn:0,phase:1,round:0,actions:[],actor:0,mode:"command",cursor:0,sub:0,msg:encounters[index].desc,narrator:"",typing:0,timer:0,bullets:[],box:{x:205,y:205,w:285,h:118},soul:{x:350,y:264,inv:0},attack:null,shake:0,enemyAttack:0,patternTime:0,pattern:0,perchRot:0};
 party.forEach(p=>{p.guard=false;p.charge=p.charge||0});
 state="battle";setMusic(index>=4?"boss":"battle");menuIndex=0;subMenu=null;
}
function enemyTired(e){return e.kind==="normal"&&e.hp>0&&e.hp/e.max<=.25}
function actionItems(){return Object.keys(inventory).filter(k=>k!=="gold"&&inventory[k]>0)}
function battleOptions(p){
 if(p.name==="Arcer")return["ATTACK","ACT","ITEM","DEFEND","MERCY"];
 if(p.name==="Kal")return["ATTACK",p.charge>=2?"CHARGE!":"CHARGE","DEFEND","ITEM","MERCY"];
 return["ATTACK","MAGIC","DEFEND","ITEM","MERCY"];
}
function battleChoose(){
 let p=party[battle.actor],opts=battleOptions(p);
 if(battle.mode==="command"){
  if(pressed.ArrowLeft||pressed.ArrowRight){menuIndex=(menuIndex+(pressed.ArrowLeft?opts.length-1:1))%opts.length;sfx("confirm")}
  if(pressed.ArrowUp||pressed.ArrowDown){menuIndex=(menuIndex+(pressed.ArrowUp?opts.length-1:1))%opts.length;sfx("confirm")}
  if(pressed.x){if(battle.actor>0){battle.actor--;menuIndex=0;sfx("confirm")}return}
  if(pressed.z){sfx("confirm");let choice=opts[menuIndex];menuIndex=0;
   if(choice==="ATTACK"){battle.mode="attackTarget";battle.cursor=0;return}
   if(choice==="ACT"){battle.mode="act";battle.cursor=0;return}
   if(choice==="MAGIC"){battle.mode="magic";battle.cursor=0;return}
   if(choice==="ITEM"){battle.mode="item";battle.cursor=0;return}
   if(choice==="CHARGE"){if(p.charge>=2){battle.actions.push({type:"chargehit",who:p.name});p.charge=0;battle.msg=`${p.name} unleashes the stored charge!`;advanceActor()}else{p.charge++;tone(200+p.charge*180,.4,"sawtooth",.17);battle.msg=`${p.name} winds up. (${p.charge}/3)`;battle.actions.push({type:"charge",who:p.name});advanceActor()}return}
   if(choice==="DEFEND"){p.guard=true;battle.tp=Math.min(100,battle.tp+12);if(p.name==="Jon")party[2].mp=Math.min(party[2].maxMp,party[2].mp+8);battle.actions.push({type:"defend",who:p.name});battle.msg=`${p.name} takes a steadying breath. TP +12.`;advanceActor();return}
   if(choice==="MERCY"){if(battle.enemy.mercy>=100){battle.actions.push({type:"spare",who:p.name});battle.msg=`${p.name} offers ${battle.enemy.name} a way out.`;advanceActor()}else battle.msg="The enemy isn't ready to be spared.";return}
  }
 }
 if(battle.mode==="attackTarget"){
  if(pressed.x){battle.mode="command";battle.cursor=0;return}
  if(pressed.ArrowUp||pressed.ArrowDown||pressed.ArrowLeft||pressed.ArrowRight){battle.cursor=0;sfx("confirm")}
  if(pressed.z){sfx("confirm");beginAttack(p)}
  return;
 }
 if(["act","magic","item"].includes(battle.mode)){
  let list=battle.mode==="act"?battle.enemy.acts:battle.mode==="magic"?["Healing Remedy","Demand Dorm","Back"]:battle.mode==="item"?actionItems().concat("Back"):[];
  if(!list.length){battle.msg="Nothing in the pockets but lint.";battle.mode="command";return}
  if(pressed.ArrowUp||pressed.ArrowDown){battle.cursor=(battle.cursor+(pressed.ArrowUp?list.length-1:1))%list.length;sfx("confirm")}
  if(pressed.x){battle.mode="command";battle.cursor=0;return}
  if(pressed.z){let item=list[battle.cursor];sfx("confirm");battle.cursor=0;
   if(item==="Back"){battle.mode="command";return}
   if(battle.mode==="act"){let index=battle.enemy.acts.indexOf(item);doAct(item,index);return}
   if(battle.mode==="magic"){if(item==="Healing Remedy"){if(battle.tp<32){battle.msg="The party needs 32% TP.";return}battle.targetMode="heal";battle.targetReturn="magic";battle.mode="target";battle.cursor=0;return}if(item==="Demand Dorm"){if(battle.tp<32){battle.msg="Not enough TP. The party needs 32%.";return}if(!enemyTired(battle.enemy)){battle.msg="Demand Dorm only works on a TIRED enemy.";return}battle.tp-=32;battle.enemy.sleep=2;battle.msg="Jon whispers the world's gentlest bedtime demand.";battle.actions.push({type:"magic",who:p.name});advanceActor();return}}
   if(battle.mode==="item"){battle.targetItem=item;battle.targetReturn="item";battle.mode="target";battle.cursor=0;return}
  }
 }
 if(battle.mode==="target"){
  if(pressed.ArrowUp||pressed.ArrowDown)battle.cursor=(battle.cursor+(pressed.ArrowUp?2:1))%3;
  if(pressed.x){battle.mode=battle.targetReturn||"command";battle.targetMode=null;battle.targetReturn=null;return}
  if(pressed.z){let target=party[battle.cursor],item=battle.targetItem;if(battle.targetMode==="heal"){if(battle.tp<32){battle.msg="The party needs 32% TP.";battle.mode="magic";return}battle.tp-=32;target.hp=Math.min(target.max,target.hp+Math.ceil(target.max*.2));battle.msg=`Healing Remedy restores ${target.name}'s strength.`;battle.actions.push({type:"magic",who:p.name});}
    else if(item==="Cloud Loaf"){target.hp=Math.min(target.max,target.hp+30);inventory[item]--;battle.msg=`${target.name} eats a cloud loaf. Somehow, it is bread.`}
    else if(item==="Nimbus Tonic"){target.hp=target.max;inventory[item]--;battle.msg=`A nimbus tonic restores ${target.name} completely.`}
    else if(item==="Spare Halo"){if(target.hp>0){battle.msg="A halo only revives someone who needs it.";return}target.hp=Math.ceil(target.max/2);inventory[item]--;battle.msg=`${target.name} returns in a shimmer of borrowed light.`}
    else if(item==="Gilded Vest"){target.def+=2;inventory[item]--;battle.msg=`${target.name}'s defense permanently rises by 2.`}
    else if(item==="Letter Opener"){target.atk+=3;inventory[item]--;battle.msg=`${target.name}'s attack permanently rises by 3.`}
    else {battle.msg="That item can't be used in battle.";battle.mode="item";return}
    battle.actions.push({type:"item",who:p.name});battle.mode="command";battle.targetMode=null;battle.targetReturn=null;battle.targetItem=null;advanceActor();return}
 }
}
function advanceActor(){battle.actor++;if(battle.actor>=party.length){battle.mode="resolve";battle.timer=0;resolveActions()}}
function beginAttack(p){
 battle.mode="timing";battle.attack={who:p.name,t:0,pressed:0,kind:p.name==="Arcer"?"bar":p.name==="Kal"?"pendulum":"rhythm",hits:0,quality:0};battle.timer=0;
}
function doAct(action,index){
 let e=battle.enemy;let line=actLines[e.id][index]||`${e.name} considers your gesture.`;
 e.mercy=Math.min(100,e.mercy+[20,35,25][index]||22);
 if(e.id==="clerk"&&index===1)e.atk=Math.max(2,e.atk-2);
 if(e.id==="hound"&&index===0)e.atk=Math.max(3,e.atk-1);
 if(e.id==="protector"){if(index===2)e.mercy=Math.min(100,e.mercy+18);if(index===1)e.atk=Math.max(5,e.atk-2)}
 if(e.id==="eagle"){if(index===2)e.mercy=Math.min(100,e.mercy+20)}
 battle.msg=line;if(e.mercy>=100)battle.narrator=`${e.name} can be spared now.`;battle.actions.push({type:"act",who:"Arcer"});advanceActor();
}
function dealPlayerDamage(p,quality=1){
 let e=battle.enemy;
 if(e.hp<=0)return;
 let mul=p.name==="Kal"?1.38:p.name==="Arcer"?1.1:1;
 if(p.name==="Kal"&&battle.actions.some(a=>a.type==="charge"&&a.who==="Kal"))mul*=1.08;
 let dmg=Math.max(1,Math.floor((p.atk+Math.random()*3)*mul*quality));
 let crit=quality>=1.9; if(crit)dmg=Math.floor(dmg*2);
 if(battle.actions.some(a=>a.type==="chargehit"&&a.who===p.name)){dmg=Math.floor((p.atk*4.1+Math.random()*7));}
 e.hp=Math.max(0,e.hp-dmg);e.hurt=12;shake=crit?8:4;flash=crit?5:3;hitStop=3;sfx("hit");
 battle.damage={n:dmg,x:400,y:187,t:0,crit};battle.msg=crit?"A perfect strike!":"A clean hit.";
 if(enemyTired(e)){e.tired=true;battle.msg=`${e.name} is TIRED.`}
 if(e.hp<=0){battle.msg=`${e.name} goes quiet.`}
 if(quality>1.82)battle.tp=Math.min(100,battle.tp+5);
}
function resolveActions(){
 for(const a of battle.actions){
  if(a.type==="attack")dealPlayerDamage(party.find(p=>p.name===a.who),a.quality);
  if(a.type==="chargehit")dealPlayerDamage(party.find(p=>p.name===a.who),1);
 }
 if(battle.enemy.hp<=0){battle.mode="victory";battle.timer=0;return}
 if(battle.actions.some(a=>a.type==="spare")){battle.mode="spared";battle.timer=0;return}
}
function completeRound(){
 battle.round++;battle.enemy.attack++;
 if(battle.enemy.sleep>0){battle.enemy.sleep--;battle.msg=`${battle.enemy.name} sleeps through the turn.`;finishEnemyTurn();return}
 battle.mode="soul";battle.timer=0;battle.patternTime=0;battle.bullets=[];battle.pattern=(battle.enemy.attack-1)%3;battle.box={x:205,y:205,w:285,h:118};battle.soul.x=350;battle.soul.y=264;
 const labels={
  cub:["Slow puffballs drift in.","A bark ripples through the air."],
  moth:["The Choir Moth sings a rising arpeggio.","A second verse falls from above."],
  clerk:["The clerk stamps a column of forms.","A paper wall slides across the box."],
  hound:["The hound's halo expands around you.","A bright line marks the hound's lunge."],
  protector:["Firm Handshake!","Business Card Barrage!","Air Quote!"],
  eagle:battle.phase===1?["PERCHING - feather spiral.","Talon Dive!","Wingbeat!"]:battle.phase===2?["Double Perch!","Talon Dive!","Wingbeat!"]:["Perching spiral and sweeping talon!","Talon Dive!","Wingbeat!"]
 };
 battle.msg=labels[battle.enemy.id][battle.pattern]||battle.msg;
}
function spawnBullet(x,y,vx,vy,type="orb",r=5,life=160){battle.bullets.push({x,y,vx,vy,type,r,life,grazed:false})}
function updateSoul(){
 const e=battle.enemy;let s=battle.soul;
 if(s.inv>0)s.inv--;
 if(keys.arrowleft)s.x-=3;if(keys.arrowright)s.x+=3;if(keys.arrowup)s.y-=3;if(keys.arrowdown)s.y+=3;
 let box=battle.box||{x:205,y:205,w:285,h:118};battle.box=box;
 s.x=Math.max(box.x+10,Math.min(box.x+box.w-10,s.x));s.y=Math.max(box.y+10,Math.min(box.y+box.h-10,s.y));
 let t=battle.timer;
 if(t%36===1)patternSpawn(e,t);
 for(let i=battle.bullets.length-1;i>=0;i--){
  let b=battle.bullets[i];b.x+=b.vx;b.y+=b.vy;b.life--;
  if(b.type==="ring"){b.r+=.7}
  let dx=b.x-s.x,dy=b.y-s.y,d=Math.hypot(dx,dy),hitR=b.type==="paper"?10:7;
  if(b.type!=="tell"&&d<hitR&&s.inv<=0){let target=party.filter(p=>p.hp>0).sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];if(target){let dmg=Math.max(1,Math.floor(Math.max(1,e.atk-target.def)*rand(.65,1.15)*(target.guard?.5:1)));target.hp=Math.max(0,target.hp-dmg);target.hurt=12;s.inv=48;shake=7;flash=5;sfx("hurt");battle.msg=`${target.name} takes ${dmg} damage.`}}
  else if(b.type!=="tell"&&d>hitR&&d<hitR+6&&!b.grazed){b.grazed=true;battle.tp=Math.min(100,battle.tp+2)}
  if(b.life<=0||b.x<box.x-30||b.x>box.x+box.w+30||b.y<box.y-50||b.y>box.y+box.h+50)battle.bullets.splice(i,1);
 }
 battle.timer++;
 if(battle.timer>190){finishEnemyTurn()}
}
function patternSpawn(e,t){
 let box=battle.box;
 if(e.id==="cub"){if(battle.pattern===0){spawnBullet(box.x+box.w+5,rand(box.y+20,box.y+box.h-15),-1.6,rand(-.35,.35),"orb",6)}else if(t%72===1){for(let i=0;i<8;i++){let a=i*Math.PI/4;spawnBullet(box.x+box.w/2,box.y+box.h/2,Math.cos(a)*1.6,Math.sin(a)*1.6,"ring",2,120)}}}
 else if(e.id==="moth"){for(let i=0;i<4;i++){let x=box.x+30+i*65;spawnBullet(x,box.y-6,0.2,1.45+i*.14,"note",6)}}
 else if(e.id==="clerk"){if(battle.pattern===0){let x=box.x+30+Math.floor(Math.random()*6)*42;spawnBullet(x,box.y-10,0,2.2,"stamp",8)}else {for(let i=0;i<5;i++)if(i!==2)spawnBullet(box.x+5,box.y+28+i*24,2.7,0,"paper",8)}}
 else if(e.id==="hound"){if(battle.pattern===0){let cx=box.x+box.w/2,cy=box.y+box.h/2;for(let i=0;i<8;i++){let a=t/40+i*Math.PI/4;spawnBullet(cx+Math.cos(a)*15,cy+Math.sin(a)*15,Math.cos(a)*1.55,Math.sin(a)*1.55,"ring",4,130)}}else if(t%70===1){spawnBullet(box.x+box.w+10,rand(box.y+15,box.y+box.h-15),-4,0,"line",5)}}
 else if(e.id==="protector"){if(battle.pattern===0){for(let i=0;i<3;i++){spawnBullet(box.x-8,box.y+30+i*42,1.9,0,"paper",7);spawnBullet(box.x+box.w+8,box.y+50+i*42,-1.9,0,"paper",7)}}else if(battle.pattern===1){for(let i=-2;i<=2;i++)spawnBullet(box.x+box.w/2,box.y-8,i*.7,2.2,"card",6)}else {for(let i=0;i<4;i++)spawnBullet(box.x+box.w/2,box.y+box.h/2,Math.cos(i*Math.PI/2)*1.8,Math.sin(i*Math.PI/2)*1.8,"ring",3,120)}}
 else if(e.id==="eagle"){
  let phase=battle.phase;
  if(phase<3&&battle.pattern===0){for(let i=0;i<5+(phase===2?2:0);i++)spawnBullet(box.x+25+i*(box.w-50)/5,box.y-8,Math.sin(t/18+i)*.65,2.1,"feather",5)}
  else if(battle.pattern===1){
   if(t===1){spawnBullet(box.x+box.w*.22,box.y+18,0,0,"tell",8,36);battle.bullets[battle.bullets.length-1].width=box.w*.58}
   if(t===37)spawnBullet(box.x+box.w*.22,box.y+18,3.8,2.4,"line",8,80);
  }else if(phase<3){
   if(t===1){for(let i=0;i<6;i++)if(i!==3)spawnBullet(box.x-10,box.y+18+i*24,2.8,0,"line",5,130)}
  }else{
   for(let i=0;i<7;i++)spawnBullet(box.x+Math.random()*box.w,box.y-10,rand(-1,1),2.8,"feather",5);
   if(t%80===1)spawnBullet(box.x-10,box.y+box.h/2,4,0,"line",8);
  }
 }
}
function finishEnemyTurn(){
 battle.bullets=[];party.forEach(p=>{p.guard=false;p.hurt=Math.max(0,(p.hurt||0)-1)});
 battle.actor=0;battle.actions=[];battle.mode="command";battle.timer=0;battle.box={x:205,y:205,w:285,h:118};
 if(battle.enemy.id==="eagle"){
  let hp=battle.enemy.hp/battle.enemy.max; battle.phase=hp<.34?3:hp<.67?2:1;
  setMusic("boss");
 }
}
function battleUpdate(){
 if(!battle)return;
 if(battle.damage){battle.damage.t++;if(battle.damage.t>35)battle.damage=null}
 if(battle.mode==="command"||battle.mode==="act"||battle.mode==="magic"||battle.mode==="item"||battle.mode==="target"||battle.mode==="attackTarget"){battleChoose();return}
 if(battle.mode==="timing"){
  let a=battle.attack;a.t++;
  if(a.kind==="bar"){if(pressed.z){let pos=(Math.sin(a.t/18)+1)/2;let d=Math.abs(pos-.5);let q=d<.035?2:d<.1?1.55:d<.22?1.2:.7;battle.actions.push({type:"attack",who:a.who,quality:q});battle.mode="command";battle.msg=q===2?"Dead center!":"The blade finds its mark.";advanceActor()}}
  else if(a.kind==="pendulum"){if(pressed.z){let phase=Math.sin(a.t/19);let q=Math.abs(phase)>.93?2:Math.abs(phase)>.72?1.35:.65;battle.actions.push({type:"attack",who:a.who,quality:q});battle.mode="command";battle.msg=q===2?"A perfect apex!":"The axe swings through.";advanceActor()}}
  else {if(pressed.z&&a.hits<3){let rhythm= a.hits===0?0:Math.abs(a.t-a.last-25);let q=a.hits===0?1.05:rhythm<8?1.22:.75;a.quality+=q/3;a.hits++;a.last=a.t;tone(600+a.hits*100,.06,"square",.16);if(a.hits>=3){battle.actions.push({type:"attack",who:a.who,quality:a.quality});battle.mode="command";battle.msg="Three quick hits!";advanceActor()}}}
  return;
 }
 if(battle.mode==="resolve"){battle.timer++;if(battle.timer>65){completeRound()}return}
 if(battle.mode==="soul"){updateSoul();return}
 if(battle.mode==="victory"||battle.mode==="spared"){
  battle.timer++;
  if(pressed.z||battle.timer>130){
   if(battle.mode==="spared"){battle.timer=0;finishEncounter(true)}
   else if(battle.enemy.id==="protector"){battle.timer=0;finishEncounter(false)}
   else if(battle.enemy.id==="eagle"){state="ending";endingText=battle.enemy.mercy>=100?"The Eagle folds its wings. The sky can keep itself for a while.":"The Eagle yields. The clouds, for once, have nowhere to be.";setMusic("over");battle=null}
   else finishEncounter(false);
  }return;
 }
}
function finishEncounter(spared){
 let id=battle.enemy.id,idx=battle.idx;
 if(id!=="protector")clearedEncounters.add(id);
 battle=null;state="explore";setMusic("over");
 if(id==="protector"){desaturate=0;scene=5;player.x=95;resetTrail();persistSave();openDialogue(spared?["Germis puts the briefcase down.","[very good]","A receipt drifts away, unclaimed."]:["The gray silhouette folds back into a salesman.","Germis straightens his lapels. [a fine day]"],()=>state="explore");return}
 if(id==="eagle"){persistSave();state="ending";endingText=spared?"The Golden Eagle lowers its head. One quiet perch is enough.":"The Golden Eagle yields the high sky. For now, the clouds belong to everyone.";return}
 openDialogue(spared?[`${encounters[idx].name} leaves peacefully. The clouds make room.`]:[`${encounters[idx].name} is defeated. The path opens.`,"Kal: I think the cloud had a very small sword.","Jon: It was a stick."],()=>state="explore");
 progress=Math.max(progress,idx+1);
 persistSave();
}
function startSecretBoss(){
 shopTalkCount=0;state="battle";battle={enemy:JSON.parse(JSON.stringify(encounters[4])),idx:4,tp:0,turn:0,phase:1,round:0,actions:[],actor:0,mode:"intro",cursor:0,sub:0,msg:"",narrator:"",typing:0,timer:0,bullets:[],box:{x:205,y:205,w:285,h:118},soul:{x:350,y:264,inv:0},attack:null,shake:0,enemyAttack:0,patternTime:0,pattern:0,perchRot:0};
 setMusic("boss");openDialogue(["The salesman folds inward. The briefcase opens like a second mouth.","Papers pour into the light.","A gray eagle stands where Germis was."],()=>{state="battle";battle.mode="command"});dialogue.person="";
}
function shopUpdate(){
 if(shopPrompt===-1){if(pressed.z||pressed.x){shopPrompt=0;return}}
 const menu=["BUY","TALK","LEAVE"];
 if(subMenu==="talk"){
  let prompts=["Weather","The Stairs","Your Hair","The One Who Shall Perch"];
  if(pressed.ArrowUp||pressed.ArrowDown)menuIndex=(menuIndex+(pressed.ArrowUp?prompts.length-1:1))%prompts.length;
  if(pressed.x){subMenu=null;menuIndex=0;return}
  if(pressed.z){let chosen=prompts[menuIndex];menuIndex=0;subMenu=null;
   if(chosen==="The One Who Shall Perch"){shopTalkCount++;if(shopTalkCount===1){setMusic("");shopPrompt=-1;shopMessage="[the one who shall perch]"}else if(shopTalkCount===2){shopPrompt=-1;shopMessage="[...]" }else{shopMessage="";desaturate=1;sfx("laugh");flash=14;setTimeout(()=>{if(state==="shop")startSecretBoss()},1200)}}
   else{let ri=Math.min(shopTalkCount,2),i=prompts.indexOf(chosen);shopPrompt=-1;shopMessage=shopReplies[ri][i]}
  }return;
 }
 if(subMenu==="buy"){
  let stock=["Cloud Loaf - 12G","Gilded Vest - 42G","Letter Opener - 42G","Nimbus Tonic - 90G","Spare Halo - 55G","Back"];
  if(pressed.ArrowUp||pressed.ArrowDown)menuIndex=(menuIndex+(pressed.ArrowUp?stock.length-1:1))%stock.length;
  if(pressed.x){subMenu=null;menuIndex=0;return}
  if(pressed.z){if(menuIndex===5){subMenu=null;menuIndex=0;return}let [name,cost]=stock[menuIndex].split(" - ");cost=parseInt(cost);if(inventory.gold<cost){shopMessage="[too dear for now]";shopPrompt=-1}else {inventory.gold-=cost;inventory[name]=(inventory[name]||0)+1;shopMessage="[very good]";shopPrompt=-1;}return}return;
 }
 if(pressed.ArrowLeft||pressed.ArrowRight)menuIndex=(menuIndex+(pressed.ArrowLeft?2:1))%3;
 if(pressed.x){state="explore";player.x=400;player.dir="left";resetTrail();setMusic("over");return}
 if(pressed.z){let c=menu[menuIndex];if(c==="BUY"){subMenu="buy";menuIndex=0}else if(c==="TALK"){subMenu="talk";menuIndex=0}else{state="explore";player.x=400;player.dir="left";resetTrail();setMusic("over");openDialogue(["Germis rings the bell after you have already left.","It sounds satisfied."],()=>state="explore")}}
}
let shopMessage="[hello]";
function drawShop(){
 background();rect(0,0,640,480,"#242637");for(let y=0;y<480;y+=24)rect(0,y,640,2,"#34364a");rect(24,56,592,390,"#555064");rect(29,60,582,382,"#353446");
 for(let i=0;i<6;i++){rect(52+i*88,92,76,5,"#171a29");rect(58+i*88,70,20,20,["#9aaba0","#aaa28b","#87988e"][i%3]);rect(82+i*88,76,28,14,"#655743");}
 rect(250,280,390,84,"#514239");rect(244,272,396,14,"#28252b");rect(262,364,376,25,"#80643e");rect(455,252,4,18,"#393333");rect(450,248,14,3,"#393333");rect(452,245,10,3,"#393333");
 drawPartySprite("Germis",483,190,5,{monochrome:true});text("Germis",508,239,11,"#f5e6bf","center");
 text("GERMIS' EMPORIUM",320,28,16,"#f5e6bf","center");text("GOLD "+inventory.gold+" G",570,30,12,"#f5e6bf","right");
 uiBox(20,391,600,72);
 if(shopPrompt===-1){text(shopMessage,39,408,16,"#fff");text("Z / X",561,432,11,"#bbb")}
 else{
  text("Germis: "+(subMenu==="talk"? "[choose a subject]":"[a fine day]"),38,399,13);
  if(subMenu==="buy"){["Cloud Loaf 12G","Gilded Vest 42G","Letter Opener 42G","Nimbus Tonic 90G","Spare Halo 55G","Back"].forEach((v,i)=>text((i===menuIndex?"> ":"  ")+v,38+(i>=3?185:0),421+(i%3)*13,11,i===menuIndex?"#ffe68a":"#fff"))}
  else if(subMenu==="talk"){["Weather","The Stairs","Your Hair","The One Who Shall Perch"].forEach((v,i)=>text((i===menuIndex?"> ":"  ")+v,40,420+i*10,10,i===menuIndex?"#ffe68a":"#fff"))}
  else ["BUY","TALK","LEAVE"].forEach((v,i)=>text((i===menuIndex?"> ":"  ")+v,92+i*170,427,14,i===menuIndex?"#ffe68a":"#fff"));
 }
 if(quick)drawQuickPanel();
}
function drawBattle(){
 background("battle");const e=battle.enemy;
 const ename=e.id==="cub"?"Cub":e.id==="moth"?"Moth":e.id==="clerk"?"Clerk":e.id==="hound"?"Hound":e.id==="protector"?"Protector":"Eagle";
 const scale=e.id==="eagle"?9:e.id==="protector"?6:4;
 const sx=e.id==="eagle"?405:e.id==="protector"?458:468,sy=e.id==="eagle"?39:e.id==="protector"?104:122;
 if(e.id==="eagle")sprite("Eagle",sx,sy,scale,{battleReady:true,hurt:e.hurt>0});
 else sprite(ename,sx,sy,scale,{battleReady:true,tired:e.tired,hurt:e.hurt>0});
 text(e.name,555,164,12,e.mercy>=100?"#8af0a9":"#fff","center");
 if(e.tired)text("TIRED",555,181,9,"#9fe7fb","center");
 rect(500,195,112,7,"#151721");rect(500,195,112*Math.max(0,e.hp/e.max),7,"#ef6f67");outline(500,195,112,7,"#d9d9e0",1);
 rect(500,207,112,4,"#151721");rect(500,207,112*e.mercy/100,4,"#e2ca65");
 if(e.sleep>0)text("z z z",550,232,11,"#ddd");
 party.forEach((p,i)=>sprite(p.name,45,97+i*68,2,{battleReady:true,hurt:p.hurt>0}));
 if(battle.mode==="soul"){
  const b=battle.box;
  rect(b.x+3,b.y+3,b.w-6,b.h-6,"#171a29");
  outline(b.x,b.y,b.w,b.h,e.id==="eagle"&&battle.phase>=2?"#ffe684":"#e7e8ee",3);
  if(e.id==="eagle"&&battle.phase>=2)text("PERCHING",b.x+b.w/2,b.y+5,9,"#ffe684","center");
  battle.bullets.forEach(o=>{
   ctx.fillStyle=o.type==="feather"?"#ffe69a":o.type==="note"?"#d5d8ff":o.type==="paper"?"#eef0e9":o.type==="stamp"?"#eb7777":o.type==="card"?"#f5e8bd":o.type==="line"?"#fff1bc":"#fff";
   if(o.type==="ring"){rect(o.x-o.r,o.y-o.r,o.r*2,3,"#ffe596");rect(o.x-o.r,o.y+o.r-3,o.r*2,3,"#ffe596");rect(o.x-o.r,o.y-o.r,3,o.r*2,"#ffe596");rect(o.x+o.r-3,o.y-o.r,3,o.r*2,"#ffe596")}
   else if(o.type==="tell"){rect(o.x,o.y,o.width,3,"#fff")}
   else if(o.type==="line"||o.type==="feather")rect(o.x-3,o.y-9,6,18,ctx.fillStyle);
   else if(o.type==="note"){rect(o.x-4,o.y-3,6,7,"#dfe5ff");rect(o.x+2,o.y-7,3,7,"#dfe5ff")}
   else if(o.type==="stamp"){rect(o.x-7,o.y-7,14,14,"#eb7777");rect(o.x-4,o.y-1,8,2,"#a9444b")}
   else rect(o.x-o.r,o.y-o.r,o.r*2,o.r*2);
  });
  if(Math.floor(tick/4)%2||battle.soul.inv<=0){const s=battle.soul;rect(s.x-3,s.y-8,6,6,"#ff344c");rect(s.x-7,s.y-4,14,8,"#ff344c");rect(s.x-3,s.y+4,6,5,"#ff344c");rect(s.x-1,s.y+1,2,2,"#fff")}
 }else if(battle.mode==="timing")drawTiming();
 if(battle.narrator){uiBox(150,319,470,48);text(battle.narrator,170,335,13,"#fff")}
 else if(battle.mode==="soul"||battle.mode==="resolve"||battle.mode==="victory"||battle.mode==="spared")text(battle.msg||"",24,332,12,"#f3f1e9");
 if(battle.damage){const d=battle.damage;text(d.n,d.x+(Math.random()-.5)*5,d.y-Math.max(0,d.t-10)*.7,20,d.crit?"#ffe44f":"#fff","center")}
 party.forEach((p,i)=>{
  const x=18+i*204;rect(x,386,194,75,"#080a12");outline(x,386,194,75,"#d5d7e2",2);
  text(p.name,x+8,394,12,p.color);text(`${p.hp}/${p.max}`,x+183,394,11,"#fff","right");
  rect(x+8,414,178,7,"#30303d");rect(x+8,414,178*p.hp/p.max,7,p.color);
  if(i===2){text(`MP ${p.mp}/${p.maxMp}`,x+8,425,9,"#c9ee67");rect(x+8,439,178,4,"#30303d");rect(x+8,439,178*p.mp/p.maxMp,4,"#b9e957")}
 });
 text(`TP ${battle.tp}%`,18,367,10,"#ffe990");
 if(battle.mode==="command"){
  const opts=battleOptions(party[battle.actor]);opts.forEach((v,i)=>{const x=17+i*121;text((i===menuIndex?"> ":"  ")+v,x,464,11,i===menuIndex?"#ff5362":"#fff")});
  text(`${party[battle.actor].name}'s turn`,320,368,10,"#eee","center");
 }else if(battle.mode==="act"||battle.mode==="item"||battle.mode==="magic"){
  const list=battle.mode==="act"?battle.enemy.acts:battle.mode==="magic"?["Healing Remedy","Demand Dorm","Back"]:actionItems().concat("Back");
  list.slice(0,4).forEach((v,i)=>text((i===battle.cursor?"> ":"  ")+v,26,342+i*15,10,i===battle.cursor?"#ff5362":"#fff"));
 }else if(battle.mode==="target"){
  party.forEach((p,i)=>text((i===battle.cursor?"> ":"  ")+p.name,350,342+i*15,10,i===battle.cursor?"#ff5362":"#fff"));
 }else if(battle.mode==="attackTarget"){
  text("CHOOSE A TARGET",25,340,10,"#fff");text((battle.cursor===0?"> ":"  ")+e.name,25,357,12,"#ffe684");text("Z SELECT   X BACK",25,374,9,"#ddd");
 }
 if(quick)drawQuickPanel();
}
function drawTiming(){
 let a=battle.attack;
 if(a.kind==="bar"){rect(172,275,296,15,"#393b4b");rect(315,271,10,23,"#ffe480");let pos=(Math.sin(a.t/18)+1)/2;rect(179+pos*280,269,5,27,"#fff");text("Z  STOP THE SWEEP",320,286,11,"#fff","center")}
 if(a.kind==="pendulum"){ctx.strokeStyle="#aaa";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(320,262);ctx.lineTo(320+Math.sin(a.t/19)*94,300+Math.abs(Math.cos(a.t/19))*53);ctx.stroke();rect(310+Math.sin(a.t/19)*94,292+Math.abs(Math.cos(a.t/19))*53,20,15,"#d5d5dc");text("Z  RELEASE AT THE APEX",320,270,11,"#fff","center")}
 if(a.kind==="rhythm"){let r=36-Math.min(24,a.t%30),size=Math.max(6,Math.floor(r));rect(320-size,274-size,size*2,3,"#fff");rect(320-size,274+size-3,size*2,3,"#fff");rect(320-size,274-size,3,size*2,"#fff");rect(320+size-3,274-size,3,size*2,"#fff");text(`Z  TAP IN RHYTHM   ${a.hits}/3`,320,313,11,"#fff","center")}
}
function drawTitle(){
 background();rect(105,300,430,10,"#9b8a60");rect(85,310,470,10,"#f1da91");rect(116,320,398,12,"#75664f");for(let i=0;i<7;i++){let x=85+i*78;rect(x,292,54,4,"#5e5440");rect(x+5,280,44,12,"#9b8a60");}
 drawPartySprite("Arcer",284,238,4);drawPartySprite("Kal",224,249,3);drawPartySprite("Jon",353,248,3);
 shadowText("PERCH",320,72,48,"#fff3c0","center");shadowText("A TALE ABOVE THE CLOUDS",320,132,14,"#fff","center");
 text("A SHORT ADVENTURE IN THE THIN AIR",320,179,11,"#e9f4f3","center");
 if(Math.floor(tick/26)%2===0)text(saveData?"Z  CONTINUE":"Z  BEGIN",320,365,16,"#fff","center");
 text("ARROWS / TOUCH  MOVE     Z  CONFIRM     X  BACK     C  STATUS",320,423,10,"#fff","center");
 text(`M  SOUND: ${muted?"OFF":"ON"}`,320,445,10,"#d9d9e0","center");
}
function drawEnding(){
 background();for(let i=0;i<7;i++){let x=60+i*90,y=170+Math.floor(Math.sin(tick/20+i)*8);rect(x-2,y-31,5,12,"#f4d57c");rect(x-8,y-19,17,5,"#f4d57c");rect(x-12,y-14,4,22,"#f4d57c");rect(x+8,y-14,4,22,"#f4d57c");rect(x-8,y+8,17,5,"#f4d57c");rect(x-2,y+13,5,12,"#f4d57c")}
 drawPartySprite("Arcer",248,285,4);drawPartySprite("Kal",170,291,3);drawPartySprite("Jon",342,291,3);
 uiBox(38,353,564,104);wrapText(endingText,59).forEach((l,i)=>text(l,57,370+i*20,13));text("THE END     Z  RETURN TO TITLE",320,432,11,"#ffe58c","center");
}
function updateExplore(){
 if(quick){if(!keys.c)quick=false;return}
 if(keys.c){quick=true;return}
 let dx=(keys.arrowright?1:0)-(keys.arrowleft?1:0),dy=(keys.arrowdown?1:0)-(keys.arrowup?1:0);
 const moving=dx!==0||dy!==0;
 if(dx){player.x+=dx*2.2;player.dir=dx<0?"left":"right"}
 if(dy){player.y+=dy*2.2;player.dir=dy<0?"up":"down"}
 player.y=Math.max(302,Math.min(374,player.y));
 player.x=Math.max(18,Math.min(622,player.x));
 player.walk=moving?player.walk+1:0;
 if(moving){player.trail.unshift({x:player.x,y:player.y});player.trail.length=Math.min(player.trail.length,36)}
 const enemy=activeEnemy();
 if(enemy){
  const index=encounterForScene(),dx=player.x-enemy.x,dy=player.y-enemy.y,distance=Math.hypot(dx,dy);
  if(distance>1){enemy.x+=dx/distance*.65;enemy.y+=dy/distance*.65}
  if(distance<34){startBattle(index);return}
 }
 if(player.x>600&&scene<6){
  if(activeEnemy()){player.x=600}
  else{scene++;player.x=24;resetTrail();if(scene===6)openDialogue(["The stairs narrow until they are almost an idea.","Somewhere above, enormous wings beat once."],()=>{state="explore"})}
 }else if(player.x<=18&&scene>0){scene--;player.x=616;resetTrail()}
 if(pressed.z)inspectWorld();
}
function update(){
 tick++;if(shake>0)shake--;if(flash>0)flash--;party.forEach(p=>{if(p.hurt>0)p.hurt--});if(battle&&battle.enemy.hurt>0)battle.enemy.hurt--;
 if(state==="title"){if(pressed.m)setMuted();if(pressed.z){audioInit();setMusic("over");state="explore";scene=saveData?Math.min(saveData.scene||0,6):0;player.x=95;player.y=346;player.dir="right";resetTrail();openDialogue(["Arcer: The sky is much higher than it looked from below.","Kal: Good. More room to swing.","Jon: I brought a map. It is just a picture of a cloud."],()=>state="explore")}return}
 if(state==="explore")updateExplore();
 else if(state==="dialogue"){
  if(pressed.z||pressed.x){let line=dialogue.lines[dialogue.index]||"";if(dialogue.shown<line.length){dialogue.shown=line.length;return}dialogue.index++;dialogue.shown=0;if(dialogue.index>=dialogue.lines.length){let cb=dialogueDone;dialogue=null;dialogueDone=null;state="explore";if(cb)cb()}}
 }
 else if(state==="battle"){if(keys.c){quick=true;return}if(quick){quick=false;return}battleUpdate()}
 else if(state==="shop"){if(keys.c){quick=true;return}if(quick){quick=false;return}shopUpdate()}
 else if(state==="ending"&&pressed.z){state="title";battle=null;setMusic("");}
}
function frame(){
 requestAnimationFrame(frame);
 if(hitStop>0)hitStop--;
 else{update();for(let key in pressed)pressed[key]=false}
 ctx.save();if(shake){ctx.translate(rand(-shake,shake),rand(-shake,shake))}
 if(state==="title")drawTitle();
 else if(state==="explore")drawExplore();
 else if(state==="dialogue"){if(dialogue){if(scene===4)drawShop();else drawExplore();drawDialogue()}}
 else if(state==="battle"){if(battle)drawBattle()}
 else if(state==="shop")drawShop();
 else if(state==="ending")drawEnding();
 if(desaturate){ctx.globalCompositeOperation="saturation";rect(0,0,W,H,"#888");ctx.globalCompositeOperation="source-over"}
 if(flash>0){ctx.globalAlpha=flash/20;rect(0,0,W,H,"#fff");ctx.globalAlpha=1}
 ctx.restore();
}
frame();
})();
