(() => {
const keys=Object.create(null);
const pressed=Object.create(null);

const aliases={arrowup:"ArrowUp",arrowdown:"ArrowDown",arrowleft:"ArrowLeft",arrowright:"ArrowRight"};

function setKey(key,down){
 const normalized=key.toLowerCase(),edge=aliases[normalized]||normalized;
 if(down&&!keys[normalized])pressed[edge]=true;
 keys[normalized]=down;
}

addEventListener("keydown",event=>{
 const key=event.key.toLowerCase();
 if(["arrowup","arrowdown","arrowleft","arrowright"," ","z","x","c","m"].includes(key))event.preventDefault();
 setKey(key,true);
});
addEventListener("keyup",event=>setKey(event.key,false));
addEventListener("blur",()=>Object.keys(keys).forEach(key=>setKey(key,false)));

document.querySelectorAll("#mobile-controls [data-key]").forEach(button=>{
 const key=button.dataset.key;
 button.addEventListener("pointerdown",event=>{
  event.preventDefault();
  button.setPointerCapture(event.pointerId);
  setKey(key,true);
 });
 const release=event=>{event.preventDefault();setKey(key,false)};
 button.addEventListener("pointerup",release);
 button.addEventListener("pointercancel",release);
 button.addEventListener("lostpointercapture",()=>setKey(key,false));
});

window.GameInput={keys,pressed};
})();
