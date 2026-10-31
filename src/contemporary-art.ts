import type { CharacterDefinition, Graphic, SceneNode, XY } from "./characters";
import { IVORY, LEATHER, joint, leatherCostume, punchedDot as dot, type PuppetArt } from "./leather-style";

const INK="#17120e", SKIN="#e5b17b", SHADE="#a96e45", RED="#bd3028";
const g=(path:string,fill=INK,stroke?:string,strokeWidth=1.3):Graphic=>({path,fill,...(stroke?{stroke,strokeWidth}:{})});
const shape=(name:string,path:string,fill=INK,stroke?:string):SceneNode=>({name,graphic:g(path,fill,stroke)});
const line=(name:string,path:string,color=INK,width=1.4):SceneNode=>({name,graphic:g(path,"none",color,width)});
const sleeve=(length:number,w:number)=>g(`M-4 ${-w}Q${length*.4} ${-w-3} ${length+4} ${-w*.8}L${length+4} ${w*.8}Q${length*.4} ${w+2} -4 ${w}Z`,LEATHER);

function arm(shoulder:XY,side:1|-1,stocky:boolean):CharacterDefinition["arms"]["right"] {
  const upper=stocky?49:60,lower=stocky?46:55;
  return {shoulder,side,upper,lower,width:stocky?12:10,hand:"palm",
    shoulderAngles:side===1?[1.15,-.9]:[1.1,-1.15],elbowAngles:side===1?[-.1,-.65]:[-.18,-.6],
    art:{upper:sleeve(upper,stocky?13:11),lower:sleeve(lower,10),
      hand:g("M-4 -8L6 -11L15 -23Q20 -26 20 -20L15 -10L28 -18Q33 -19 31 -14L20 -4L32 -9Q37 -8 33 -4L21 3L30 1Q35 2 31 6L18 11L5 9L-4 5Z",SKIN,INK),
      handDetails:[shape("ivory-cuff","M-8 -8L1 -8L1 7L-8 7Z",IVORY,INK),line("palm-carving","M7 -5Q15 -4 12 5 M18 2L25 -1",SHADE),joint("wrist-pin",-4,0)],
      upperDetails:[joint("shoulder-pin")],lowerDetails:[joint("elbow-pin")],
    }};
}

// Short, broad silhouette; rounded cheeks, hooded eyes and a receding side part.
const prawit: PuppetArt = {
  footY:134,viewBox:"-215 -290 430 465",
  body:g("M-21 -132L18 -132L47 -119Q61 -112 57 -82L62 -34Q68 -2 48 23L20 35L-25 33L-53 21Q-66 6 -59 -28L-54 -83Q-59 -107 -42 -118Z",LEATHER),
  cloth:g("M-48 20L48 20L42 69L6 72L-4 66L-40 69Z",LEATHER),
  legs:g("M-39 60L-5 63L-10 117L-36 119Z M5 63L39 60L38 118L11 119Z",LEATHER),
  decorations:[
    shape("shirt-front","M-21 -130L17 -130L23 -108L4 -57L-5 -57L-28 -109Z",IVORY,INK),
    shape("shirt-collar","M-21 -130L0 -118L17 -130L24 -112L9 -102L0 -114L-13 -101L-29 -113Z",IVORY,INK),
    shape("gold-tie","M-5 -113L5 -113L10 -104L4 -97L10 -67L1 -55L-9 -67L-4 -97L-10 -104Z","#c49a51",INK),
    line("tie-punches","M-2 -94L4 -91 M-1 -84L5 -81 M0 -73L5 -70",IVORY,1),
    line("lapel-piping","M-37 -119L-29 -99L-14 -91L-21 -82L0 -51L25 -83L18 -93L35 -102L35 -119",IVORY,1.7),
    line("coat-front","M1 -48L0 27",IVORY,1),
    shape("buttons",dot(2,-36,2.4)+dot(2,-7,2.4),"#c49a51"),
    line("pockets","M-43 -32L-22 -28 M24 -28L46 -32",IVORY),
    joint("knee-right",24,72),joint("knee-left",-24,72),
    shape("shoes","M-36 112L-10 112L-7 125L-10 133L-52 132Q-59 127 -49 122Z M12 112L37 112L41 120L57 124L61 131L15 133L10 125Z",LEATHER,IVORY),
    line("shoe-cuts","M-46 126Q-30 122 -18 127 M24 127Q40 123 52 128",IVORY),
  ],
  head:{anchor:[0,-130],
    graphic:g("M-43 -81Q-37 -107 -8 -111Q25 -113 41 -96Q50 -79 44 -61L47 -50L59 -40Q64 -31 53 -27L45 -26L49 -13Q38 2 12 5L5 15L-18 13L-26 0Q-47 -5 -51 -31L-51 -57Z",SKIN,INK,2.3),
    eye:{path:"M3 -59Q15 -66 29 -58Q16 -56 3 -59Z M-29 -61Q-19 -67 -10 -61Q-20 -59 -29 -61Z",holes:dot(18,-60,2.4)+dot(-18,-62,2)},
    ornament:g("M-50 -50Q-57 -76 -40 -96Q-17 -119 13 -112Q36 -110 44 -96L43 -78L36 -78Q31 -99 5 -99Q-22 -104 -38 -83L-42 -52Z"),
    jawAnchor:[8,-12],jaw:g("M-5 0Q17 6 40 -3L41 8Q32 23 10 24Q-7 21 -14 12Z",SKIN,INK),jawLimit:.27,headLimit:.17,
    details:[
      shape("ear","M-42 -52Q-58 -63 -59 -46Q-58 -24 -43 -24L-36 -36Z",SKIN,INK),
      line("ear-cuts","M-46 -48Q-55 -53 -54 -42Q-53 -30 -46 -31 M-47 -43Q-40 -44 -45 -36",INK),
      shape("soft-eyebrows","M1 -74Q17 -80 31 -71L30 -68Q15 -74 3 -70Z M-31 -74Q-19 -80 -8 -74L-9 -70Q-20 -74 -30 -70Z","#63594e"),
      line("hooded-lids","M2 -63Q15 -72 30 -63 M-29 -66Q-19 -73 -9 -66",SHADE),
      line("eye-bags","M2 -52Q16 -43 31 -52 M-29 -54Q-19 -46 -9 -53",SHADE,1.8),
      line("nose","M31 -58Q25 -45 34 -39Q43 -33 55 -36 M32 -34Q38 -38 43 -33",INK,1.6),
      line("round-cheeks","M31 -30Q24 -26 24 -18 M-27 -36Q-21 -17 -9 -15 M34 -6Q14 4 -6 -6",SHADE,1.8),
      line("mouth","M6 -13Q24 -10 47 -15",RED,2),
      line("hair-carving","M-44 -79Q-30 -100 -6 -104 M-34 -94Q-14 -110 9 -106 M18 -104Q34 -100 39 -89 M-48 -68L-46 -58",IVORY,.8),
    ],jawDetails:[line("lower-lip","M0 2Q20 7 38 0",RED,1.7),line("chin-fold","M0 14Q17 21 32 13",SHADE)],
  },arms:{right:arm([47,-112],1,true),left:arm([-47,-112],-1,true)},
};

// Taller, squared shoulders; short swept hair, broad brow and a firm wide jaw.
const anutin: PuppetArt = {
  footY:149,viewBox:"-220 -310 440 500",
  body:g("M-20 -153L19 -153L47 -140Q58 -134 53 -112L47 -66L50 -4L39 26L3 30L-36 25L-49 5L-46 -65L-54 -113Q-57 -135 -43 -140Z",LEATHER),
  cloth:g("M-37 20L39 20L35 76L5 79L-4 71L-34 76Z",LEATHER),
  legs:g("M-34 65L-5 69L-13 132L-37 131Z M6 69L35 65L39 132L15 133Z",LEATHER),
  decorations:[
    shape("shirt-front","M-20 -150L18 -150L26 -122L4 -65L-6 -65L-29 -123Z",IVORY,INK),
    shape("shirt-collars","M-20 -150L0 -137L18 -150L25 -130L10 -117L0 -132L-12 -117L-28 -132Z",IVORY,INK),
    shape("indigo-tie","M-5 -131L5 -131L9 -121L4 -114L13 -77L2 -61L-9 -77L-4 -114L-10 -121Z","#376e93",INK),
    line("tie-weave","M-2 -108L5 -104 M-1 -97L7 -93 M1 -86L8 -82",IVORY,1.1),
    line("lapel-piping","M-38 -137L-32 -115L-16 -106L-23 -94L1 -59L28 -96L20 -108L37 -118L38 -137",IVORY,1.7),
    line("coat-front","M1 -57L0 24",IVORY,1.1),
    shape("buttons",dot(2,-43,2.3)+dot(2,-11,2.3),"#cfa56b"),
    line("pockets","M-36 -43L-18 -40 M22 -40L40 -43",IVORY),
    joint("knee-left",-21,79),joint("knee-right",23,79),
    shape("shoes","M-35 125L-12 126L-7 139L-9 147L-52 146Q-58 140 -47 137Z M16 126L37 125L43 135L60 139L64 146L18 149L12 139Z",LEATHER,IVORY),
    line("shoe-cuts","M-45 140Q-31 135 -18 142 M25 142Q40 137 54 143",IVORY),
  ],
  head:{anchor:[0,-151],
    graphic:g("M-39 -91Q-28 -115 -1 -113Q26 -112 40 -94Q48 -77 42 -60L46 -48L58 -37Q62 -29 51 -26L44 -25L49 -12Q40 5 13 8L9 21L-14 20L-23 5Q-46 0 -48 -27L-48 -60Z",SKIN,INK,2.3),
    eye:{path:"M3 -59Q16 -67 30 -58Q16 -54 3 -59Z M-28 -62Q-18 -69 -8 -62Q-18 -58 -28 -62Z",holes:dot(18,-60,2.7)+dot(-16,-63,2.3)},
    ornament:g("M-46 -52Q-56 -84 -37 -104Q-20 -118 6 -115Q31 -114 43 -97L44 -71L36 -72L31 -92Q13 -103 -5 -99Q-28 -101 -36 -79L-38 -52Z"),
    jawAnchor:[8,-12],jaw:g("M-5 0Q18 6 40 -3L42 8Q33 27 10 27Q-8 25 -15 12Z",SKIN,INK),jawLimit:.32,headLimit:.15,
    details:[
      shape("ear","M-41 -55Q-59 -62 -59 -43Q-57 -25 -42 -23L-35 -35Z",SKIN,INK),
      line("ear-cuts","M-46 -49Q-55 -53 -54 -42Q-53 -31 -46 -30 M-46 -42Q-39 -45 -44 -35",INK),
      shape("broad-eyebrows","M0 -74Q16 -82 33 -73L32 -67Q16 -74 2 -68Z M-30 -77Q-18 -83 -6 -76L-7 -71Q-19 -75 -29 -71Z"),
      line("lids","M3 -64Q17 -73 30 -63 M-28 -67Q-18 -74 -8 -67",SHADE),
      line("nose","M31 -59Q25 -45 34 -38Q42 -33 54 -36 M33 -33Q39 -37 44 -32",INK,1.7),
      line("cheeks","M31 -29Q23 -24 23 -18 M-26 -36Q-21 -18 -8 -15 M2 -52Q14 -45 29 -51",SHADE,1.5),
      shape("smile-teeth","M7 -16Q27 -10 47 -18L45 -12Q25 -5 8 -11Z",IVORY,INK),
      line("upper-lip","M6 -17Q27 -11 47 -18",RED,2),
      line("hair-carving","M-42 -82Q-29 -105 -3 -107 M-33 -97Q-14 -113 10 -107 M-19 -104Q0 -113 21 -103 M-3 -107Q19 -110 34 -96 M-44 -71L-42 -60",IVORY,.85),
    ],jawDetails:[line("lower-red-lip","M0 2Q21 8 38 0",RED,2),line("wide-chin","M-1 15Q17 25 34 14",SHADE,1.6)],
  },arms:{right:arm([43,-134],1,false),left:arm([-43,-134],-1,false)},
};

export const PRAWIT_ART = leatherCostume(prawit);
export const ANUTIN_ART = leatherCostume(anutin);
