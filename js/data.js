(() => {
const encounters=[
 {id:"cub",name:"Cumulus Cub",hp:42,max:42,mercy:0,atk:6,kind:"normal",acts:["Pet","Call Good Boy","Sneeze On It"],desc:"A cloud puppy bounces in place, trying very hard to look fearsome.",tired:false,sleep:0,attack:0},
 {id:"moth",name:"Choir Moth",hp:58,max:58,mercy:0,atk:8,kind:"normal",acts:["Hum Along","Compliment Voice","Request Encore"],desc:"A hymnal moth opens its wings. Several notes escape.",tired:false,sleep:0,attack:0},
 {id:"clerk",name:"Stratus Clerk",hp:70,max:70,mercy:0,atk:9,kind:"normal",acts:["File Complaint","Ask For Manager","Sign Here"],desc:"A cloud-person with a clipboard has already numbered your party.",tired:false,sleep:0,attack:0},
 {id:"hound",name:"Halo Hound",hp:84,max:84,mercy:0,atk:11,kind:"normal",acts:["Throw Stick","Rub The Ring","Whistle"],desc:"A bright hound circles its halo. It may be chasing its own head.",tired:false,sleep:0,attack:0},
 {id:"protector",name:"Protector of the Air",hp:192,max:192,mercy:0,atk:13,kind:"secret",acts:["Ask About The Briefcase","Offer A Better Deal","Remember The Perch"],desc:"The suit has grown around the eagle. Loose papers orbit its open briefcase.",tired:false,sleep:0,attack:0},
 {id:"eagle",name:"The Golden Eagle",hp:360,max:360,mercy:0,atk:16,kind:"boss",acts:["Ask Why It Guards The Sky","Praise Its Wings","Offer A Perch"],desc:"A golden eagle fills the heavens. The sun seems to be wearing its face.",tired:false,sleep:0,attack:0}
];
const actLines={
 cub:["It is softer than the threat it is making.","The cub's tail thumps hard enough to make a tiny cloud.","You sneeze. The cub sneezes back. Mercy rises."],
 moth:["You hum one note. The moth harmonizes, surprised.","It glows at the compliment. Mercy rises.","The moth adds a verse about your excellent listening."],
 clerk:["You file a complaint about the clipboard. It is logged.","You ask for a manager. The clerk looks up; attack falls.","You sign the form. It was, somehow, a permission slip."],
 hound:["You throw a stick. The hound chases the halo instead.","You rub the ring. It wags a beam of light.","A whistle makes the hound sit. Mercy rises."],
 protector:["You ask about the papers. Every one is a bill for air.","You offer a better deal: nobody has to sell the sky.","You remember who the briefcase belonged to. The eagle lowers it."],
 eagle:["You ask why. 'Because someone must keep watch.'","You praise the wings. The sky's gold softens.","You offer it a quiet place to rest. The Eagle considers."]
};
const shopReplies=[
 ["[a pleasant bit of weather]","[the stairs go where stairs go]","[it is a disciplined haircut]",""],
 ["[very good weather]","[many steps, few complaints]","[thank you for noticing]",""],
 ["[the sky is quite agreeable]","[one must keep climbing]","[a comb is a powerful tool]",""]
];

const sprites={
 Arcer:["..TTTT..","..TTTT..",".TTTTTT.",".TTTTTT.","..TTTT..","..TTTT..",".TTTTTT.","..T..T..","..T..T..","..T..T..",".TT..TT.",".TT..TT."],
 Kal:["..PPPP..",".PPPPPP.",".PPPPPP.","..PPPP..","...PP...","..PPPP..","..PPPP..",".P....P.",".P....P.",".P....P.","PP....PP","PP....PP"],
 Jon:["..LLLL..",".LLLLLL.",".LLLLLL.","..LLLL..","..LLLL..","..LLLL..","..LLLL..","..L..L..","..L..L..",".LL..LL.",".LL..LL.",".LL..LL."],
 Cub:["...WW....","..WWWW...",".WWWWWW..","WWWWWWWW.","WWWWWWWW.","..W..W....",".W....W...","W......W.."],
 Moth:["..YY..YY..",".YYYYYYYY.","YYYYYYYYYY","YY..YY..YY","...YYYY....","...YYYY....","..Y....Y..."],
 Clerk:["..GGGG..",".GGGGGG.",".GGGGGG.","..GGGG..","..GGGG..","..GGGG..","..G..G..",".GG..GG."],
 Hound:["..WWWW..",".WWWWWW.",".WWWWWW.","..WWWW..","..W..W..","WW....WW"],
 Germis:["..BBBBBB..",".BBBBBBBB.","..B....B..","..BBBBBB..",".BB.BB.BB.",".BB.BB.BB.","..BBBBBB..",".B.BB.B.B.","BB......BB"],
 Protector:["....GG....","...GGGG...","..GGGGGG..",".GGGGGGGG.","....GG....","...GGGG...","...GGGG...","..G....G..",".GG....GG.","GG......GG"],
 Eagle:[".....GGGGGG.....","...GGGGGGGGGG...","..GGGGGGGGGGGG..",".GGGGGGGGGGGGGG.","GGGGGGGGGGGGGGGG","..GGGGGGGGGGGG..","....GGGGGGGG....","......GGGG......","......GGGG......",".....GG..GG....."]
};

const saveSpots=[
 {x:100,y:364,label:"Arrival"},
 {x:520,y:325,label:"Cloud corridor"},
 {x:80,y:364,label:"Before the clerk"},
 {x:510,y:340,label:"Floating garden"},
 {x:145,y:365,label:"Before the shop"},
 {x:130,y:365,label:"After the shop"},
 {x:500,y:350,label:"Before the arena"}
];

window.GameData={encounters,actLines,shopReplies,sprites,saveSpots};
})();
