import type { CharacterDefinition, Graphic, SceneNode, XY } from "./characters";

// Vector adaptation of the user's puppet reference. Mirror the source drawing
// into the rig's canonical right-facing coordinates; finger flip remains global.
const SCALE = .34, INK = "#17120e", SKIN = "#f0bb7d", PAPER = "#f6e5bd", RED = "#df2419", GOLD = "#d6ac54";
type Projection = { origin?: XY; angle?: number; side?: 1 | -1 };
type Paint = Pick<Graphic, "fill" | "stroke" | "strokeWidth">;
function point(x: number, y: number, p: Projection = {}): XY {
  const [ox, oy] = p.origin ?? [650, 860], a = p.angle ?? 0, s = p.side ?? -1;
  const dx = (x-ox)*s, dy = y-oy;
  return [SCALE*(dx*Math.cos(a)+dy*Math.sin(a)), SCALE*(-dx*Math.sin(a)+dy*Math.cos(a))];
}
function path(data: string, p: Projection = {}) {
  return data.replace(/([MLCQZ])([^MLCQZ]*)/g, (_, command: string, values: string) => {
    if (command === "Z") return "Z ";
    const numbers = values.match(/-?\d*\.?\d+/g)?.map(Number) ?? [], mapped: string[] = [];
    for (let i=0;i<numbers.length;i+=2) mapped.push(...point(numbers[i],numbers[i+1],p).map(v=>String(Math.round(v*1000)/1000)));
    return command+mapped.join(" ")+" ";
  }).trim();
}
function art(data: string, paint: Paint = {}, p: Projection = {}): Graphic {
  return {path:path(data,p),fill:INK,...paint,...(paint.strokeWidth ? {strokeWidth:paint.strokeWidth*SCALE} : {})};
}
function node(name: string, data: string, paint: Paint, p: Projection = {}): SceneNode {
  return {name,graphic:art(data,paint,p)};
}
const line = (name: string, data: string, color: string, width=4, p: Projection = {}) => node(name,data,{fill:"none",stroke:color,strokeWidth:width},p);
function dot(x: number,y: number,r: number) {
  const k=r*.55228475;
  return `M${x-r} ${y}C${x-r} ${y-k} ${x-k} ${y-r} ${x} ${y-r}C${x+k} ${y-r} ${x+r} ${y-k} ${x+r} ${y}C${x+r} ${y+k} ${x+k} ${y+r} ${x} ${y+r}C${x-k} ${y+r} ${x-r} ${y+k} ${x-r} ${y}Z`;
}
function diamond(x: number,y: number,w=12,h=10) {
  return `M${x-w} ${y}L${x} ${y-h}L${x+w} ${y}L${x} ${y+h}Z M${x-w/2} ${y}L${x} ${y-h/2}L${x+w/2} ${y}L${x} ${y+h/2}Z`;
}
const head: Projection = {origin:[609,335]};
const jaw: Projection = {origin:[473,240]};
const belt = "M565 639Q648 658 793 591Q816 586 829 610L833 632Q778 675 673 700Q617 704 571 690Z";
const tailLeft = "M636 674L663 681L688 738L662 896L591 866L613 752Z";
const tailRight = "M663 679L690 686L720 750L797 920L655 952L673 823L668 728Z";
const beltPattern = Array.from({length:12},(_,i)=>{
  const x=581+i*20,y=674-i*3.45;
  return diamond(x,y,6,5)+dot(x+8,y-8,1.7)+dot(x+8,y+7,1.7);
}).join(" ");
const leftPattern = diamond(645,708,7,9)+diamond(641,730,6,8)+Array.from({length:6},(_,row)=>Array.from({length:3},(_,col)=>diamond(622+col*13+row*1.1,738+row*23,5,6)).join(" ")).join(" ");
const rightPattern = diamond(683,727,6,8)+diamond(699,735,6,8)+diamond(704,755,8,8)+Array.from({length:7},(_,row)=>Array.from({length:4},(_,col)=>diamond(685+col*18+row*2.2,772+row*22,6,7)).join(" ")).join(" ");

function referenceArm(shoulder: XY, elbow: XY, wrist: XY, side: 1 | -1, rest: number, upper: string, lower: string, hand: string, creases: string): CharacterDefinition["arms"]["right"] {
  const a=Math.atan2(elbow[1]-shoulder[1],-side*(elbow[0]-shoulder[0]));
  const fore=Math.atan2(wrist[1]-elbow[1],-side*(wrist[0]-elbow[0]));
  const shoulderEnd=side===1 ? -.95 : -1.14, elbowEnd=-.55;
  const project=(origin:XY,angle:number):Projection=>({origin,angle,side:side===1 ? -1 : 1});
  const upperProjection=project(shoulder,a), lowerProjection=project(elbow,fore), handProjection=project(wrist,fore);
  const pin=(name:string,location:XY,p:Projection,r:number):SceneNode=>({name,graphic:art(dot(...location,r),{fill:SKIN,stroke:PAPER,strokeWidth:4},p),children:[{name:name+"-center",graphic:art(dot(...location,r*.37),{fill:INK},p)}]});
  return {
    shoulder:point(...shoulder),
    upper:Math.hypot(elbow[0]-shoulder[0],elbow[1]-shoulder[1])*SCALE,
    lower:Math.hypot(wrist[0]-elbow[0],wrist[1]-elbow[1])*SCALE,
    width:10,side,hand:"palm",
    shoulderAngles:[(a-rest*shoulderEnd)/(1-rest),shoulderEnd],
    elbowAngles:[(fore-a-rest*elbowEnd)/(1-rest),elbowEnd],
    art:{
      upper:art(upper,{fill:INK,stroke:PAPER,strokeWidth:4},upperProjection),
      lower:art(lower,{fill:INK,stroke:PAPER,strokeWidth:4},lowerProjection),
      hand:art(hand,{fill:SKIN,stroke:INK,strokeWidth:5},handProjection),
      handDetails:[
        line("finger-creases",creases,INK,4,handProjection),
        pin("wrist-pin",wrist,handProjection,15),
      ],
      upperDetails:[pin("shoulder-pin",shoulder,upperProjection,10)],
      lowerDetails:[pin("elbow-pin",elbow,lowerProjection,11)],
    },
  };
}

export const THAKSIN_ART: Pick<CharacterDefinition,"body"|"cloth"|"legs"|"decorations"|"head"|"arms"|"footY"|"viewBox"> = {
  footY:145,
  viewBox:"-265 -355 530 555",
  body:art("M534 335L576 361L653 286L752 321Q784 330 782 365L762 501Q756 551 782 578L820 618L878 676L841 723Q790 756 751 750L687 732L603 759L535 786Q565 729 568 674L563 610Q553 549 523 495L486 418Q470 378 499 354Z",{stroke:PAPER,strokeWidth:5}),
  cloth:art("M575 713L668 737Q657 794 608 861L561 948Q546 969 521 953Q500 938 517 901L545 822Z M702 717L835 706Q875 741 861 785L771 961Q760 983 736 990Q710 997 701 975L646 873L668 812Z",{stroke:PAPER,strokeWidth:4}),
  legs:art("M515 914L559 931L665 1104L605 1141L545 1010Q513 983 509 948Z M698 943L752 950L894 1128L834 1162L756 1036Q720 1010 698 982Z",{stroke:PAPER,strokeWidth:4}),
  decorations:[
    node("shirt-front","M534 335L577 360L653 286L646 402L628 580L574 489Z",{fill:PAPER,stroke:INK,strokeWidth:4}),
    node("shirt-collars","M534 335L577 362L553 413L537 373Z M577 362L653 286L646 399L611 382Z",{fill:"#fff3d5",stroke:INK,strokeWidth:4}),
    node("red-tie","M577 364L611 382L600 419L581 419L564 394Z M581 419L600 419L632 499L628 580L594 536L573 449Z",{fill:RED,stroke:INK,strokeWidth:4}),
    line("left-lapel-piping","M532 343L514 372L538 414L501 447Q544 532 626 581",PAPER,5),
    line("right-lapel-piping","M654 291L718 362L659 387L725 399L677 530L628 581",PAPER,5),
    line("coat-tail-piping","M570 693Q560 744 535 785Q598 768 640 724 M704 725Q764 770 840 723",PAPER,5),
    node("jacket-button",dot(644,592,9),{fill:PAPER}),
    node("thai-flag-outline","M659 392L697 397L694 425L657 420Z",{fill:PAPER,stroke:INK,strokeWidth:3}),
    node("thai-flag-red","M659 392L697 397L696 402L658 397Z M658 415L695 420L694 425L657 420Z",{fill:RED}),
    node("thai-flag-blue","M658 402L696 407L695 415L658 410Z",{fill:"#25315b"}),
    node("sash-belt-gold",belt,{fill:GOLD,stroke:PAPER,strokeWidth:6}),
    {name:"sash-belt-red",graphic:{...art(belt,{fill:RED}),holes:path(beltPattern)}},
    line("belt-borders","M569 646Q658 667 813 600 M572 683Q676 707 826 626",PAPER,4),
    line("belt-black-band","M575 663Q682 683 822 613",INK,9),
    line("belt-gold-stitch","M577 661Q686 680 820 611",GOLD,2),
    node("sash-left-gold",tailLeft,{fill:GOLD,stroke:PAPER,strokeWidth:6}),
    {name:"sash-left-red",graphic:{...art(tailLeft,{fill:RED}),holes:path(leftPattern)}},
    node("sash-right-gold",tailRight,{fill:GOLD,stroke:PAPER,strokeWidth:6}),
    {name:"sash-right-red",graphic:{...art(tailRight,{fill:RED}),holes:path(rightPattern)}},
    line("tail-bands","M609 770L677 789 M602 806L672 824 M598 844L667 861 M678 803L748 778 M674 847L766 818 M666 892L785 859",PAPER,5),
    line("tail-black-bands","M610 779L675 798 M676 815L752 789 M670 863L772 833 M663 909L789 876",INK,8),
    line("tail-gold-bands","M611 779L674 797 M677 815L751 789 M671 862L771 832 M664 908L788 875",GOLD,2),
    line("sash-fringe-left",Array.from({length:10},(_,i)=>`M${597+i*6.6} ${864+i*.37}L${595+i*6.6} ${876+i*.37}`).join(" "),PAPER,3),
    line("sash-fringe-right",Array.from({length:17},(_,i)=>`M${660+i*8} ${940-i*1.9}L${656+i*8} ${953-i*1.9}`).join(" "),PAPER,3),
    node("sash-knot","M637 615Q613 609 608 630Q602 655 627 675L654 684Q679 668 704 629L691 627Q664 648 648 669Q621 656 624 634Z",{fill:RED,stroke:PAPER,strokeWidth:5}),
    line("knot-gold-carving","M632 619Q614 640 642 666 M641 623Q630 641 651 658 M656 673L689 638",GOLD,5),
    node("knee-pins",dot(540,938,20)+dot(737,972,19),{fill:INK,stroke:PAPER,strokeWidth:4}),
    node("knee-rivets",dot(540,938,8)+dot(737,972,8),{fill:SKIN,stroke:PAPER,strokeWidth:3}),
    node("ankles","M602 1124L648 1114L666 1164L638 1185L608 1161Z M836 1144L875 1125L893 1170L859 1192L834 1164Z",{fill:SKIN,stroke:INK,strokeWidth:4}),
    node("shoes","M607 1158Q600 1174 567 1176Q501 1211 445 1187Q446 1224 479 1235Q526 1240 574 1234L687 1231L690 1191Q685 1170 665 1161L642 1183Q624 1181 607 1158Z M836 1178Q817 1206 787 1218Q747 1249 710 1248Q708 1272 732 1286Q776 1295 828 1273L929 1242L929 1207Q923 1188 898 1177L876 1199Q855 1206 836 1178Z",{fill:INK,stroke:PAPER,strokeWidth:4}),
    line("shoe-ornament","M452 1206Q488 1224 518 1201Q541 1179 568 1199 M466 1226Q536 1233 589 1205Q625 1185 673 1207 M719 1262Q754 1274 778 1247Q808 1216 840 1231 M731 1280Q801 1291 865 1239Q886 1221 916 1229",PAPER,4),
    node("shoe-rivets",dot(525,1200,7)+dot(668,1176,13)+dot(775,1244,7)+dot(900,1207,12),{fill:INK,stroke:PAPER,strokeWidth:4}),
  ],
  head:{
    anchor:point(609,335),
    graphic:art("M484 58Q457 75 441 100Q427 123 427 151L431 165Q406 171 392 183Q378 196 387 205Q403 218 425 211L438 205Q450 213 457 226L471 235Q482 255 486 289L520 310L578 364L624 327L652 292L654 275Q683 265 711 235Q744 201 742 149Q747 111 706 82L629 83Q593 91 564 70Q527 48 484 58Z",{fill:SKIN,stroke:INK,strokeWidth:6},head),
    eye:{
      path:path("M468 167Q485 151 508 165Q493 171 468 167Z M418 153Q427 140 438 154Q427 159 418 153Z",head),
      holes:path(dot(480,163,5)+dot(426,151,4),head),
    },
    ornament:art("M467 18Q508 1 553 9Q608 10 650 32Q685 47 706 77L632 86Q591 89 560 68Q527 47 486 57Q468 61 462 47Q451 31 467 18Z M631 85Q676 69 705 79Q745 96 747 143Q751 187 726 226Q703 259 657 275L642 268Q670 241 675 210Q676 188 654 181Q628 176 603 197L590 191Q597 166 592 141Q589 109 610 92Z",{fill:INK},head),
    jawAnchor:point(473,240,head),
    jaw:art("M473 240Q453 255 426 256Q411 254 400 249L393 263Q384 278 382 294Q380 308 397 312Q436 322 473 315L497 310Q507 298 497 282L481 264Z",{fill:SKIN,stroke:INK,strokeWidth:5},jaw),
    jawLimit:.31,headLimit:.15,
    details:[
      node("ear","M643 184Q669 180 676 202Q681 223 661 247Q640 276 615 270Q594 266 594 247Q609 208 624 193Z",{fill:SKIN,stroke:INK,strokeWidth:5},head),
      line("ear-cutout","M636 199Q654 193 659 209Q659 227 635 239Q619 250 614 242Q611 234 627 228Q616 215 630 205 M631 200Q646 212 639 225",INK,5,head),
      node("eyebrows","M468 140Q471 117 491 117Q515 120 525 145Q503 126 480 136Z M432 111Q443 113 449 133L446 144Q438 123 426 120Z",{fill:INK},head),
      line("smiling-eye-lines","M465 163Q487 150 511 170 M466 174Q488 177 507 185 M416 148L437 157",INK,4,head),
      line("cheek-smile-folds","M458 182Q449 203 468 220Q484 230 504 226 M468 228Q479 252 469 279 M489 245Q489 265 477 281 M530 230Q529 253 515 267",INK,5,head),
      line("nose-contour","M432 167Q439 175 442 187Q450 204 434 211 M402 207Q414 214 426 209",INK,4,head),
      line("upper-red-lip","M405 230Q432 244 467 236",RED,7,head),
      node("smile-teeth","M404 237Q433 249 467 240L466 247Q437 258 402 244Z",{fill:PAPER,stroke:INK,strokeWidth:2},head),
      line("hair-swept-carving","M483 25Q519 16 554 41 M502 24Q538 23 568 58 M529 25Q558 35 581 64 M558 32Q579 44 592 70 M590 38Q609 52 616 73 M623 47Q642 59 650 72 M652 58L673 72 M621 106Q609 121 616 145 M637 101Q626 124 632 147 M655 98Q648 123 646 149 M671 102Q676 130 662 159 M687 109Q697 136 679 169 M702 121Q715 154 695 180", "#685846",3,head),
      line("hair-part-line","M616 88Q650 76 696 75",PAPER,4,head),
    ],
    jawDetails:[
      node("lower-red-lip","M400 249Q430 264 467 247L463 256Q429 272 400 257Z",{fill:RED,stroke:INK,strokeWidth:3},jaw),
      line("chin-smile-fold","M403 304Q426 311 455 301 M479 278Q474 291 464 298",INK,4,jaw),
    ],
  },
  arms:{
    right:referenceArm([480,386],[421,548],[274,455],1,.16,
      "M481 357Q512 358 513 387Q511 410 489 452L451 558Q445 584 419 582Q390 584 390 554Q391 523 410 480L449 386Q457 359 481 357Z",
      "M405 527Q422 518 441 537Q455 555 439 574Q422 599 399 604Q375 609 350 586L263 495L246 452L274 434L337 481Z",
      "M279 432Q269 385 239 365Q207 345 175 337Q161 330 159 318Q145 338 166 351L209 373Q176 380 145 371Q111 359 91 373L87 382Q108 374 139 390Q104 377 88 389L86 397Q106 391 135 407Q177 430 205 436L245 440L265 460L284 452Z",
      "M209 374Q210 390 239 405 M95 380Q134 383 169 396 M92 391Q134 395 176 410 M263 472L277 479"),
    left:referenceArm([782,348],[908,498],[973,712],-1,.12,
      "M782 320Q809 319 829 341L927 473Q945 493 928 513Q907 533 886 516L767 400Q741 379 748 349Q755 325 782 320Z",
      "M885 509Q907 526 928 508Q948 552 968 617L1003 693L949 715L910 624Q887 562 885 509Z",
      "M958 705L990 699L998 721Q1024 735 1040 747Q1064 765 1092 769Q1085 786 1060 780L1038 771Q1063 797 1091 809Q1095 821 1082 824Q1060 823 1022 791Q1045 823 1056 846Q1056 858 1043 854Q1026 846 1009 815L981 778Q992 805 987 819Q967 801 952 778Q942 757 947 740Z",
      "M976 775L997 788 M994 756L1036 777 M1009 787L1025 804 M962 728L975 732"),
  },
};
