import * as THREE from 'three';
import canon from './canon.js';

// Reviewable procedural animation, in browser metres. Timings and staging are
// prototype values; the canonical variant IDs and source beats remain intact.
// Every body stays assembled. The blade/axe finishes use camera cutaways.
const vec = (x = 0, y = 0, z = 0) => [x, y, z];
const pose = (right, left, body = vec(), legs = [vec(), vec()], height = 1.2, head = vec()) => ({
  body: { position: vec(0, height, 0), rotation: body }, head,
  right, left, rHip: legs[0], lHip: legs[1],
});
const P = {
  ready: pose(vec(.8, -.12, -.12), vec(.95, .14, .12), vec(-.04, 0, 0)),
  brace: pose(vec(1.12, -.15, -.27), vec(1.28, .18, .3), vec(-.08, 0, .04)),
  windR: pose(vec(2.6, -.3, -.48), vec(.65, .15, .22), vec(-.18, -.22, -.1)),
  windL: pose(vec(.8, -.2, -.12), vec(2.25, .2, .55), vec(-.14, .28, .09)),
  crossR: pose(vec(1.2, -.55, .48), vec(.82, .1, .1), vec(.08, .38, .1)),
  crossL: pose(vec(.95, -.1, -.1), vec(1.1, .58, -.5), vec(.06, -.36, -.1)),
  followR: pose(vec(.35, .4, .55), vec(1, .1, .2), vec(.2, .45, .12)),
  axeHigh: pose(vec(2.92, -.1, -.18), vec(2.48, .2, .2), vec(-.26, -.1, -.05)),
  axeLow: pose(vec(.8, -.12, -.35), vec(.65, .15, .2), vec(.3, .12, .08), [vec(-.12), vec(.22)], 1.12),
  bladeBack: pose(vec(1.8, -.8, -.65), vec(.8, .2, .42), vec(-.1, -.46, -.1)),
  bladeAcross: pose(vec(.95, .75, .48), vec(.95, .1, .18), vec(.08, .5, .14)),
  bladeReverse: pose(vec(1.65, -.65, -.4), vec(.65, .15, .28), vec(-.04, -.5, -.12)),
  kickWind: pose(vec(.65, -.15, -.22), vec(.9, .15, .28), vec(-.12, -.18, -.08), [vec(-.45), vec(.1)]),
  kick: pose(vec(.45, -.15, -.32), vec(.8, .12, .35), vec(-.12, .13, -.08), [vec(1.35, -.1, -.08), vec(-.18)], 1.12),
  stompHigh: pose(vec(1, -.2, -.3), vec(1.1, .2, .2), vec(.14, .05, -.12), [vec(1.05), vec(-.15)], 1.1),
  stomp: pose(vec(.65, -.1, -.2), vec(.8, .1, .2), vec(.3, .08, -.12), [vec(.22), vec(-.2)], .99),
  reach: pose(vec(1.18, -.13, -.1), vec(1.18, .13, .1), vec(-.05)),
  lift: pose(vec(2.02, -.1, -.12), vec(2.02, .1, .12), vec(-.16), [vec(-.1), vec(.12)], 1.14),
  pin: pose(vec(.78, -.22, -.16), vec(1.15, .22, .16), vec(.58, .1, .12), [vec(-.8), vec(.45)], .74),
  slam: pose(vec(.65, -.15, -.2), vec(.65, .15, .2), vec(.5, .06, .1), [vec(-.25), vec(.35)], .92),
  toss: pose(vec(.72, -.6, -.45), vec(1.78, .5, .3), vec(.1, -.55, -.14), [vec(-.18), vec(.22)]),
  aim: pose(vec(.96, -.18, -.13), vec(1.12, .2, .16), vec(-.025), [vec(.08), vec(-.08)]),
  recoil: pose(vec(1.1, -.18, -.15), vec(1.25, .2, .18), vec(-.105), [vec(.07), vec(-.09)]),
  recover: pose(vec(.5, -.1, -.1), vec(.65, .1, .1), vec(.04, .08)),
  guard: pose(vec(1.22, -.12, -.35), vec(1.25, .12, .35), vec(-.04)),
  hurtR: pose(vec(.7, -.1, -.5), vec(1.4, .2, .45), vec(-.22, -.3, -.2), [vec(-.1), vec(.24)], 1.12, vec(.12, .18, -.1)),
  hurtL: pose(vec(1.4, -.2, -.4), vec(.65, .1, .5), vec(-.16, .3, .2), [vec(.2), vec(-.12)], 1.08, vec(.16, -.16, .12)),
  held: pose(vec(1.5, -.1, -.4), vec(1.4, .1, .4), vec(-.06), [vec(.1), vec(-.12)], 1.16, vec(-.08)),
  airborne: pose(vec(1.6, -.2, -.6), vec(1.6, .2, .6), vec(-.15), [vec(.42), vec(-.3)], 1.13, vec(-.14)),
  buckle: pose(vec(1.2, -.1, -.45), vec(1.1, .1, .5), vec(.55, .12, .1), [vec(-.75), vec(-.48)], .83, vec(.17)),
  fall: pose(vec(.55, -.1, -.65), vec(.9, .1, .7), vec(-.75, .12, -.4), [vec(.48), vec(-.1)], .7, vec(.15)),
  back: pose(vec(.24, -.1, -.4), vec(.38, .1, .5), vec(-Math.PI / 2, 0, 0), [vec(.13), vec(-.13)], .3, vec(.03)),
  // The lower rigid arm folds alongside the head in a side fall. Leaving it
  // spread laterally would prop the whole torso up on the shoulder and glove.
  side: pose(vec(.05, 0, -Math.PI), vec(.4, 0, .4), vec(0, Math.PI / 2, -Math.PI / 2), [vec(.12), vec(-.12)], .3, vec(.05)),
  prone: pose(vec(1.4, -.1, -.3), vec(1.3, .1, .4), vec(Math.PI / 2, 0, Math.PI), [vec(-.1), vec(.12)], .31, vec(-.1)),
};

function frame(at, a, v, ap = [0, .5], vp = [0, -.5], options = {}) {
  return { at, attacker: { ...structuredClone(P[a]), position: vec(ap[0], options.ay || 0, ap[1]), rotation: vec(0, options.ar || 0, 0),
    weaponAim: ['aim','recoil','ready','brace'].includes(a) ? 1 : 0, recoil: a === 'recoil' ? 1 : 0 },
    victim: { ...structuredClone(P[v]), position: vec(vp[0], options.vy || 0, vp[1]), rotation: vec(0, Math.PI + (options.vr || 0), 0), weaponAim: 0, recoil: 0 },
    hold: options.hold || 0, struggle: options.struggle || 0, cutaway: !!options.cutaway };
}
const cue = (at, kind, intensity = .6, blood = false, anchor = 'victim') => ({ at, kind, intensity, blood, anchor });
const hit = (at, intensity = .7, blood = true) => [cue(at - .12, 'whoosh', intensity, false, 'attacker'), cue(at, 'impact', intensity, blood), cue(at + .035, 'pain', intensity)];
const drop = at => [cue(at, 'thud', .8), cue(at + .03, 'cloth-tear', .45)];
const shot = at => [cue(at, 'gunshot', 1, true, 'attacker'), cue(at + .025, 'pain', .65)];
const definitions = {
  Felon_KickAndShot: {
    label: 'Rifle strike, kick and finishing shot', duration: 3.25,
    frames: [frame(0,'ready','guard'),frame(.3,'windR','guard',[.06,.5]),frame(.53,'crossR','hurtR',[.08,.36],[.04,-.49]),frame(.82,'kickWind','hurtR',[.08,.4],[.1,-.61]),frame(1.12,'kick','fall',[.06,.3],[.12,-.88]),frame(1.6,'aim','back',[.04,.36],[.22,-1.2]),frame(2.12,'aim','back',[.04,.32],[.22,-1.2]),frame(2.19,'recoil','back',[.04,.35],[.24,-1.22]),frame(2.5,'aim','back',[.04,.35],[.24,-1.22]),frame(3.25,'recover','back',[.1,.45],[.24,-1.22])],
    cues: [...hit(.53),...hit(1.12,.8,false),...drop(1.58),...shot(2.15),cue(.95,'scream',.8)],
  },
  Felon_RifleAndBurst: {
    label: 'Rifle butt strike and three-shot burst', duration: 3.1,
    frames: [frame(0,'brace','guard',[-.05,.55]),frame(.25,'windL','guard'),frame(.46,'crossL','hurtL',[-.1,.35],[-.1,-.45]),frame(.83,'aim','buckle',[-.12,.53],[-.1,-.6]),frame(1.15,'aim','held',[-.12,.5],[-.1,-.6]),frame(1.22,'recoil','hurtR',[-.12,.52],[-.07,-.66]),frame(1.42,'aim','hurtR',[-.12,.5],[-.07,-.66]),frame(1.49,'recoil','hurtL',[-.12,.52],[-.12,-.72]),frame(1.67,'aim','fall',[-.12,.5],[-.09,-.9]),frame(1.74,'recoil','fall',[-.12,.54],[-.06,-1.03]),frame(2.28,'aim','side',[-.1,.57],[.02,-1.15]),frame(3.1,'recover','side',[-.06,.65],[.02,-1.15])],
    cues: [...hit(.46),...shot(1.19),...shot(1.46),...shot(1.71),...drop(2.2),cue(.9,'scream',.7)],
  },
  Sukhoi_AppendageAndSlam: {
    label: 'Appendage restraint, slam and two-second hold', duration: 5.25,
    frames: [frame(0,'windR','guard',[0,.55]),frame(.5,'reach','held',[0,.4],[0,-.4],{hold:1}),frame(.88,'lift','airborne',[0,.37],[0,-.4],{vy:.48,hold:1,struggle:1}),frame(1.22,'slam','fall',[0,.28],[0,-.65]),frame(1.6,'pin','prone',[.05,.05],[0,-.85],{struggle:1}),frame(3.65,'pin','prone',[.05,.02],[0,-.85],{struggle:1}),frame(4,'stompHigh','prone',[.08,.04],[0,-.85]),frame(4.3,'kick','side',[.08,-.02],[.2,-1.15]),frame(5.25,'recover','side',[.1,.4],[.3,-1.3])],
    cues: [cue(.5,'grab',.9),cue(.58,'scream',1),...drop(1.43),cue(1.65,'cloth-tear',.7),cue(2.45,'pain',.65),cue(3.3,'pain',.6),...hit(4.3,.9)],
  },
  Sukhoi_LiftAndStrikes: {
    label: 'Lift, slam and four staged heavy strikes', duration: 5.2,
    frames: [frame(0,'reach','guard',[0,.45],[0,-.42]),frame(.35,'reach','held',[0,.38],[0,-.4],{hold:1}),frame(.8,'lift','airborne',[0,.35],[0,-.38],{vy:.65,hold:1,struggle:1}),frame(1.2,'slam','fall',[0,.3],[0,-.7]),frame(1.58,'axeHigh','back',[.1,.05],[0,-.94]),frame(1.87,'axeLow','back',[.1,-.05],[0,-.97],{cutaway:true}),frame(2.27,'axeHigh','back',[.16,.02],[.03,-.97]),frame(2.56,'axeLow','side',[.12,-.08],[.06,-1],{cutaway:true}),frame(2.98,'axeHigh','side',[.1,-.02],[.06,-1]),frame(3.25,'axeLow','side',[.08,-.1],[.1,-1.03],{cutaway:true}),frame(3.67,'axeHigh','side',[.1,.01],[.1,-1.03]),frame(3.94,'axeLow','side',[.08,-.08],[.12,-1.06],{cutaway:true}),frame(5.2,'recover','side',[.16,.35],[.12,-1.06])],
    cues: [cue(.35,'grab',.9),cue(.67,'scream',1),...drop(1.4),...hit(1.87,.9),...hit(2.56,.85,false),...hit(3.25,.8,false),...hit(3.94,.9,false)],
  },
  Sukhoi_KnockdownAndPin: {
    label: 'Knockdown, two-second pin and overhead finish', duration: 4.75,
    frames: [frame(0,'windR','guard'),frame(.45,'crossR','fall',[.08,.32],[.1,-.6]),frame(.85,'pin','back',[.1,.12],[.12,-.9],{struggle:1}),frame(2.95,'pin','back',[.08,.08],[.12,-.9],{struggle:1}),frame(3.35,'axeHigh','back',[.1,.05],[.12,-.94]),frame(3.72,'axeLow','side',[.08,-.06],[.16,-1],{cutaway:true}),frame(4.75,'recover','side',[.15,.3],[.16,-1])],
    cues: [...hit(.45,.85),...drop(.83),cue(.88,'grab',.8),cue(1,'scream',.95),cue(1.9,'pain',.7),cue(2.8,'cloth-tear',.55),...hit(3.72,.95)],
  },
  Mikoyan_TwoStrikes: {
    label: 'Reluctant shove and two forceful strikes', duration: 2.7,
    frames: [frame(0,'windL','guard',[-.1,.55]),frame(.48,'crossL','hurtL',[-.1,.33],[-.06,-.48]),frame(.87,'windR','hurtL',[-.1,.5],[-.1,-.58]),frame(1.4,'crossR','fall',[-.05,.3],[.06,-.76]),frame(1.98,'recover','back',[-.07,.4],[.12,-1.1]),frame(2.7,'ready','back',[-.2,.65],[.12,-1.1],{ar:-.15})],
    cues: [...hit(.48,.65),cue(.8,'pain',.55),...hit(1.4,.8,false),...drop(1.95)],
  },
  Mikoyan_GrabAndCollapse: {
    label: 'Two-hand restraint, lift and collapse', duration: 3.15,
    frames: [frame(0,'ready','guard'),frame(.4,'reach','held',[0,.4],[0,-.4],{hold:1}),frame(.95,'lift','airborne',[0,.39],[0,-.4],{vy:.32,hold:1,struggle:.8}),frame(1.52,'slam','buckle',[0,.31],[0,-.6]),frame(2,'recover','prone',[.12,.25],[-.12,-.96]),frame(3.15,'ready','prone',[.2,.5],[-.12,-.96],{ar:.25})],
    cues: [cue(.4,'grab',.65),cue(.78,'pain',.55),cue(1.05,'scream',.7),...hit(1.52,.7),...drop(1.98)],
  },
  Mikoyan_KickAndStrike: {
    label: 'Defensive kick and downward strike', duration: 3,
    frames: [frame(0,'kickWind','guard',[.12,.52]),frame(.48,'kick','buckle',[.1,.31],[-.05,-.7]),frame(.95,'ready','prone',[.1,.3],[-.17,-.98]),frame(1.34,'windL','prone',[.06,.08],[-.17,-.98]),frame(1.82,'crossL','side',[-.1,-.02],[-.23,-1.03],{cutaway:true}),frame(3,'recover','side',[-.1,.45],[-.23,-1.03])],
    cues: [...hit(.48,.7,false),...drop(.92),cue(1.25,'pain',.55),...hit(1.82,.75)],
  },
  Nikolai_AxeCombination: {
    label: 'Diagonal axe strike and overhead follow-through', duration: 3.25,
    frames: [frame(0,'bladeBack','guard',[.18,.6],[0,-.5],{ar:-.2}),frame(.58,'bladeAcross','hurtR',[.1,.34],[.08,-.56]),frame(1.1,'axeHigh','buckle',[.1,.42],[.06,-.7]),frame(1.74,'axeLow','fall',[.03,.16],[.18,-.88],{cutaway:true}),frame(2.25,'axeLow','side',[.03,.22],[.23,-1.15]),frame(3.25,'recover','side',[.2,.52],[.23,-1.15])],
    cues: [cue(.45,'slice',.7),...hit(.58,.75),cue(1.24,'scream',.75),cue(1.64,'slice',.8),...hit(1.74,.9),...drop(2.2)],
  },
  Nikolai_KickAndAxe: {
    label: 'Push kick and staged overhead axe finish', duration: 3.4,
    frames: [frame(0,'kickWind','guard',[-.12,.55]),frame(.54,'kick','fall',[-.1,.3],[.03,-.76]),frame(1.05,'ready','back',[-.14,.27],[.08,-1.14]),frame(1.6,'axeHigh','back',[-.12,-.03],[.08,-1.14]),frame(2.04,'axeLow','side',[-.15,-.14],[.12,-1.18],{cutaway:true}),frame(2.4,'axeLow','side',[-.12,-.08],[.12,-1.18]),frame(3.4,'recover','side',[-.1,.42],[.12,-1.18])],
    cues: [...hit(.54,.75,false),...drop(1.02),cue(1.45,'scream',.8),cue(1.92,'slice',.8),...hit(2.04,.9)],
  },
  Novak_BladeAndStrike: {
    label: 'Fast diagonal cutaway and reverse strike', duration: 2.55,
    frames: [frame(0,'bladeBack','guard',[.2,.6],[0,-.5],{ar:-.25}),frame(.34,'bladeAcross','hurtL',[.12,.22],[-.08,-.55]),frame(.72,'bladeReverse','hurtL',[-.2,.22],[-.08,-.6],{ar:.2}),frame(1.15,'bladeAcross','fall',[-.3,.06],[-.25,-.8],{ar:.35,cutaway:true}),frame(1.76,'ready','prone',[-.38,.15],[-.35,-1.03],{ar:.5}),frame(2.55,'recover','prone',[-.5,.4],[-.35,-1.03],{ar:.65})],
    cues: [cue(.29,'slice',.7),...hit(.34,.65),cue(.55,'pain',.5),cue(1.08,'slice',.8),...hit(1.15,.75,false),...drop(1.72)],
  },
  Novak_RapidBladeFlurry: {
    label: 'Four alternating blade passes and collapse', duration: 2.8,
    frames: [frame(0,'bladeBack','guard',[.24,.55]),frame(.27,'bladeAcross','hurtR',[.1,.25],[.07,-.52]),frame(.45,'bladeReverse','hurtR',[-.1,.2],[.07,-.58]),frame(.65,'bladeAcross','hurtL',[-.2,.15],[-.08,-.61],{ar:.1}),frame(.86,'bladeReverse','hurtL',[.05,.1],[-.08,-.67],{ar:-.15}),frame(1.08,'bladeAcross','hurtR',[.16,.04],[.04,-.74],{cutaway:true}),frame(1.32,'bladeBack','buckle',[.05,.02],[.01,-.82]),frame(1.55,'bladeAcross','fall',[-.13,-.08],[-.13,-.98],{ar:.25,cutaway:true}),frame(2.07,'ready','side',[-.25,.03],[-.18,-1.13]),frame(2.8,'recover','side',[-.45,.28],[-.18,-1.13],{ar:.4})],
    cues: [...[.27,.65,1.08,1.55].flatMap((at,i)=>[cue(at-.04,'slice',.6+i*.05),...hit(at,.55+i*.08,i===0)]),cue(.48,'scream',.7),...drop(2.03)],
  },
  John_HeavyStrike: {
    label: 'Measured heavy strike and full-body knockdown', duration: 2.6,
    frames: [frame(0,'brace','guard',[-.1,.63]),frame(.42,'windR','guard',[-.06,.5]),frame(.76,'crossR','fall',[.08,.24],[.12,-.72]),frame(1.4,'followR','back',[.13,.16],[.25,-1.17]),frame(2.1,'ready','back',[.11,.3],[.25,-1.17]),frame(2.6,'recover','back',[.04,.46],[.25,-1.17])],
    cues: [...hit(.76,.95),cue(.83,'scream',.85),...drop(1.37)],
  },
  John_StrikeAndThrow: {
    label: 'Heavy strike, arm restraint and turning throw', duration: 3.6,
    frames: [frame(0,'windL','guard'),frame(.45,'crossL','hurtL',[-.12,.32],[-.1,-.47]),frame(.85,'reach','held',[-.1,.35],[-.1,-.4],{hold:1}),frame(1.35,'reach','held',[-.12,.3],[-.13,-.43],{hold:1,struggle:1,ar:.1,vr:.1}),frame(1.88,'toss','airborne',[-.2,.18],[-.55,-.66],{ar:-.65,vr:-.3,vy:.3}),frame(2.42,'followR','fall',[-.15,.13],[-.9,-.93],{ar:-.7,vr:-.7}),frame(2.85,'ready','side',[-.08,.15],[-1.06,-1.06],{ar:-.7,vr:-.7}),frame(3.6,'recover','side',[0,.35],[-1.06,-1.06],{ar:-.55,vr:-.7})],
    cues: [...hit(.45,.8),cue(.85,'grab',.75),cue(1.1,'cloth-tear',.55),cue(1.62,'scream',.85),cue(1.85,'whoosh',.85),...drop(2.8)],
  },
  Jayden_ShotAndKnockdown: {
    label: 'Opening shot, rifle strike and finishing shot', duration: 3.35,
    frames: [frame(0,'aim','guard',[.08,.68]),frame(.22,'recoil','hurtR',[.08,.7],[.06,-.6]),frame(.55,'windL','hurtR',[.08,.48],[.06,-.64]),frame(.92,'crossL','fall',[-.1,.24],[-.08,-.87]),frame(1.48,'aim','back',[-.1,.34],[-.13,-1.2]),frame(2.02,'aim','back',[-.1,.32],[-.13,-1.2]),frame(2.1,'recoil','back',[-.1,.36],[-.1,-1.23]),frame(2.5,'aim','back',[-.1,.36],[-.1,-1.23]),frame(3.35,'recover','back',[-.16,.55],[-.1,-1.23])],
    cues: [...shot(.18),...hit(.92,.85,false),...drop(1.45),...shot(2.06),cue(.6,'scream',.8)],
  },
  Jayden_StrikeAndDoubleShot: {
    label: 'Rifle strike and controlled two-shot finish', duration: 3.4,
    frames: [frame(0,'windR','guard',[-.12,.55]),frame(.52,'crossR','hurtR',[.04,.31],[.1,-.5]),frame(.98,'aim','buckle',[.03,.52],[.13,-.68]),frame(1.4,'aim','held',[.03,.48],[.13,-.68]),frame(1.47,'recoil','hurtL',[.03,.51],[.09,-.74]),frame(1.83,'aim','hurtL',[.03,.48],[.09,-.74]),frame(1.9,'recoil','fall',[.03,.52],[.13,-.94]),frame(2.44,'aim','side',[.03,.52],[.23,-1.22]),frame(3.4,'recover','side',[.15,.65],[.23,-1.22])],
    cues: [...hit(.52,.85),...shot(1.44),...shot(1.87),...drop(2.4),cue(1.05,'scream',.8)],
  },
  Katya_GrabAndCollapse: {
    label: 'Two-handed lift, restraint and collapse', duration: 3.7,
    frames: [frame(0,'reach','guard',[0,.5]),frame(.4,'reach','held',[0,.39],[0,-.4],{hold:1}),frame(1.02,'lift','airborne',[0,.36],[0,-.4],{vy:.52,hold:1,struggle:1}),frame(1.55,'lift','airborne',[.03,.35],[.03,-.39],{vy:.5,hold:1,struggle:1}),frame(2,'toss','fall',[.1,.15],[.5,-.78],{ar:.3,vr:.4}),frame(2.62,'recover','side',[.12,.2],[.7,-1.07],{ar:.3,vr:.5}),frame(3.7,'ready','side',[.1,.4],[.7,-1.07],{ar:.2,vr:.5})],
    cues: [cue(.4,'grab',.85),cue(.65,'scream',.95),cue(1.15,'cloth-tear',.7),cue(1.7,'pain',.7),...hit(2,.85),...drop(2.57)],
  },
  Katya_PinAndKick: {
    label: 'Knockdown, full-body pin and release kick', duration: 4.7,
    frames: [frame(0,'windL','guard'),frame(.4,'crossL','fall',[-.1,.3],[-.1,-.65]),frame(.83,'pin','back',[-.1,.08],[-.1,-.94],{struggle:1}),frame(1.3,'slam','back',[-.08,-.02],[-.12,-.97]),frame(1.8,'pin','back',[-.1,.06],[-.12,-.97],{struggle:1}),frame(2.95,'pin','back',[-.1,.04],[-.12,-.97],{struggle:1}),frame(3.35,'stompHigh','back',[-.05,-.02],[-.12,-.97]),frame(3.7,'kick','side',[-.08,-.1],[-.28,-1.21]),frame(4.7,'recover','side',[-.06,.32],[-.35,-1.31])],
    cues: [...hit(.4,.8,false),...drop(.8),cue(.88,'grab',.85),...hit(1.3,.8),cue(1.75,'scream',.9),cue(2.6,'cloth-tear',.6),...hit(3.7,.9,false)],
  },
  Katya_RestraintAndCollapse: {
    label: 'Turning restraint and controlled collapse', duration: 3.4,
    frames: [frame(0,'reach','guard',[-.1,.5]),frame(.4,'reach','held',[-.1,.39],[-.1,-.4],{hold:1}),frame(.95,'reach','held',[-.1,.35],[-.1,-.42],{hold:1,struggle:1,ar:-.06,vr:-.06}),frame(1.45,'toss','buckle',[.08,.18],[.3,-.63],{ar:.35,vr:.4}),frame(2,'recover','prone',[.17,.12],[.49,-.99],{ar:.3,vr:.5}),frame(2.6,'ready','prone',[.25,.24],[.49,-.99],{ar:.4,vr:.5}),frame(3.4,'recover','prone',[.35,.46],[.49,-.99],{ar:.55,vr:.5})],
    cues: [cue(.4,'grab',.7),cue(.67,'pain',.65),cue(1,'cloth-tear',.55),cue(1.3,'scream',.8),cue(1.45,'whoosh',.65),...drop(1.97)],
  },
  Katya_StrikeAndKick: {
    label: 'Hook strike and forceful kick', duration: 3.2,
    frames: [frame(0,'windR','guard',[.1,.58]),frame(.55,'crossR','hurtR',[.12,.31],[.14,-.5]),frame(1.02,'kickWind','hurtR',[.1,.35],[.18,-.64]),frame(1.4,'kick','fall',[.1,.2],[.28,-.89]),frame(1.97,'ready','back',[.08,.3],[.43,-1.21],{vr:-.2}),frame(2.5,'recover','back',[.17,.4],[.43,-1.21],{ar:-.2,vr:-.2}),frame(3.2,'ready','back',[.26,.58],[.43,-1.21],{ar:-.35,vr:-.2})],
    cues: [...hit(.55,.8),cue(.88,'scream',.8),...hit(1.4,.9,false),...drop(1.94)],
  },
};

const cache = new WeakMap();
export function getExecutionClips(source = canon) {
  if (cache.has(source)) return cache.get(source);
  const clips = Object.entries(source.Executions.Bosses).flatMap(([bossId, variants]) => variants.map(variant => {
    const animation = definitions[variant.Id];
    if (!animation) throw new Error(`Missing execution choreography: ${variant.Id}`);
    return { bossId, id: variant.Id, label: animation.label, duration: animation.duration,
      sourceDuration: variant.Duration, beats: structuredClone(variant.Beats),
      cues: animation.cues.slice().sort((a, b) => a.at - b.at), keyframes: animation.frames };
  }));
  cache.set(source, clips); return clips;
}
const resolve = value => typeof value === 'string' ? getExecutionClips().find(clip => clip.id === value) : value;
const mix = (a, b, t) => a.map((n, i) => n + (b[i] - n) * t);
function interpolateActor(a, b, t) {
  const orientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...a.body.rotation))
    .slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(...b.body.rotation)), t);
  const result = { position: mix(a.position, b.position, t), rotation: mix(a.rotation, b.rotation, t),
    weaponAim: a.weaponAim + (b.weaponAim - a.weaponAim) * t, recoil: a.recoil + (b.recoil - a.recoil) * t,
    body: { position: mix(a.body.position, b.body.position, t), rotation: mix(a.body.rotation, b.body.rotation, t), quaternion: orientation.toArray() } };
  for (const joint of ['head','right','left','rHip','lHip']) result[joint] = mix(a[joint], b[joint], t);
  return result;
}

/** Absolute-time sampling makes scrubbing/replay independent of frame rate. */
export function sampleExecution(variant, elapsed) {
  const clip = resolve(variant);
  if (!clip?.keyframes) throw new Error(`Unknown execution clip: ${String(variant)}`);
  const time = THREE.MathUtils.clamp(Number.isFinite(elapsed) ? elapsed : 0, 0, clip.duration);
  let index = 0;
  while (index < clip.keyframes.length - 2 && time > clip.keyframes[index + 1].at) index++;
  const a = clip.keyframes[index], b = clip.keyframes[index + 1] || a;
  const phase = THREE.MathUtils.clamp((time - a.at) / Math.max(.001, b.at - a.at), 0, 1);
  const t = phase * phase * (3 - 2 * phase);
  const attacker = interpolateActor(a.attacker, b.attacker, t), victim = interpolateActor(a.victim, b.victim, t);
  const struggle = (a.struggle + (b.struggle - a.struggle) * t) * Math.sin(Math.PI * time / clip.duration);
  victim.body.rotation.z += Math.sin(time * 17) * .035 * struggle;
  victim.right[2] += Math.sin(time * 21) * .1 * struggle;
  victim.left[2] -= Math.sin(time * 19) * .1 * struggle;
  victim.rHip[0] += Math.sin(time * 13) * .07 * struggle;
  victim.lHip[0] -= Math.sin(time * 14) * .07 * struggle;
  attacker.head[0] += Math.sin(time * 2.7) * .025 * Math.sin(Math.PI * time / clip.duration);
  const hold = a.hold + (b.hold - a.hold) * t;
  attacker.weaponStow = hold;
  const contacts = hold > .001 ? ['right','left'].map(hand => ({ actor: 'attacker', hand, targetActor: 'victim',
    target: vec(hand === 'right' ? -.32 : .32, .05, -.28), weight: hold })) : [];
  return { attacker, victim, contacts, time, duration: clip.duration,
    focus: vec((attacker.position[0] + victim.position[0]) * .5, .9 + victim.position[1] * .4, (attacker.position[2] + victim.position[2]) * .5),
    cutaway: (a.cutaway && phase < .65) || (b.cutaway && phase > .55) };
}

export function getExecutionCues(variant, previous, elapsed) {
  const clip = resolve(variant);
  if (!clip || !Number.isFinite(elapsed) || elapsed < previous) return [];
  return clip.cues.filter(cue => cue.at > previous && cue.at <= Math.min(elapsed, clip.duration)).map(cue => ({ ...cue }));
}

const bounds = new THREE.Box3();
const yawQuaternion = new THREE.Quaternion();
const axis = new THREE.Vector3(0, 1, 0);
const supportMeshes = new WeakMap();
function humanoidSupport(rig) {
  if (!supportMeshes.has(rig)) {
    const meshes = [];
    rig.body.traverse(object => {
      if (!object.isMesh) return;
      for (let parent = object; parent && parent !== rig.body; parent = parent.parent) {
        if (parent === rig.weapon || rig.appendages?.includes(parent)) return;
      }
      meshes.push(object);
    });
    supportMeshes.set(rig, meshes);
  }
  let floor = Infinity;
  for (const mesh of supportMeshes.get(rig)) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    floor = Math.min(floor, bounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld).min.y);
  }
  return floor;
}

function clearEquipmentFloor(object, floor, worldRotation) {
  object.updateWorldMatrix(true, true); bounds.setFromObject(object);
  if (bounds.min.y >= floor) return;
  const original = object.quaternion.clone();
  const parentRotation = object.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  const flat = parentRotation.multiply(worldRotation);
  // Bend/rotate around the attachment first, so the object stays on the wrist
  // or appendage base. Binary search gives the smallest continuous correction.
  object.quaternion.copy(flat); object.updateWorldMatrix(true, true); bounds.setFromObject(object);
  if (bounds.min.y >= floor) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 10; i++) {
      const t = (lo + hi) / 2;
      object.quaternion.copy(original).slerp(flat, t);
      object.updateWorldMatrix(true, true); bounds.setFromObject(object);
      if (bounds.min.y < floor) lo = t; else hi = t;
    }
    object.quaternion.copy(original).slerp(flat, hi);
  } else {
    // Loose equipment may settle independently; it must never lift the body.
    const worldPosition = object.getWorldPosition(new THREE.Vector3());
    worldPosition.y += floor - bounds.min.y;
    object.position.copy(object.parent.worldToLocal(worldPosition));
  }
  object.updateWorldMatrix(true, true);
}

function settleWeapon(rig, state, floor) {
  if (!rig.weapon) return;
  if (rig.armed) {
    const fall = THREE.MathUtils.smoothstep(Math.max(Math.abs(state.body.rotation[0]), Math.abs(state.body.rotation[2])), .7, 1.25);
    if (fall > 0) {
      // A dropped rifle settles next to the casualty instead of acting as a
      // long lever underneath the torso. Only equipment moves independently.
      const yaw = rig.mesh.rotation.y;
      const position = new THREE.Vector3(.78, .26, -.05).applyAxisAngle(axis, yaw).add(rig.mesh.position);
      position.y = floor + .26;
      const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + .22, -.08));
      const localPosition = rig.body.worldToLocal(position);
      const localRotation = rig.body.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation);
      rig.weapon.position.lerp(localPosition, fall); rig.weapon.quaternion.slerp(localRotation, fall);
    }
    clearEquipmentFloor(rig.weapon, floor + .008,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rig.mesh.rotation.y, 0)));
  } else {
    clearEquipmentFloor(rig.weapon, floor + .008,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, rig.mesh.rotation.y, 0)));
  }
}
function carryRifle(rig, state) {
  const weapon = rig.weapon, aim = state.weaponAim;
  if (weapon.parent !== rig.body) rig.body.add(weapon);
  weapon.scale.setScalar(.75);
  // A strike carries the rifle with the right wrist. In the aiming portion,
  // intersect the two rigid shoulder reach spheres to keep both gloves on it.
  rig.right.updateMatrix();
  const carryRotation = rig.right.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.05, 0, -.08)));
  const aimRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.06 - state.recoil * .08, 0, -.08));
  const rightGrip = new THREE.Vector3(0, -.23, .06).multiplyScalar(.75).applyQuaternion(aimRotation);
  const leftGrip = new THREE.Vector3(0, 0, -.63).multiplyScalar(.75).applyQuaternion(aimRotation);
  const difference = rig.left.position.clone().sub(rig.right.position).sub(leftGrip.clone().sub(rightGrip));
  const normal = difference.clone().normalize();
  const preferred = new THREE.Vector3(0, -.12, -1).addScaledVector(normal, -new THREE.Vector3(0, -.12, -1).dot(normal)).normalize();
  const reach = rig.rHand.position.length();
  const hand = rig.right.position.clone().add(difference.clone().multiplyScalar(.5))
    .addScaledVector(preferred, Math.sqrt(Math.max(0, reach * reach - difference.lengthSq() / 4)));
  const aimPosition = hand.sub(rightGrip);
  const heldGrip = new THREE.Vector3(0, -.23, .06).multiplyScalar(.75).applyQuaternion(carryRotation);
  const carryPosition = rig.rHand.position.clone().applyMatrix4(rig.right.matrix).sub(heldGrip);
  weapon.position.copy(carryPosition).lerp(aimPosition, aim);
  weapon.quaternion.copy(carryRotation).slerp(aimRotation, aim); weapon.updateMatrix();
  for (const [joint, attachment, grip] of [[rig.right,rig.rHand,new THREE.Vector3(0,-.23,.06)], [rig.left,rig.lHand,new THREE.Vector3(0,0,-.63)]]) {
    const target = grip.applyMatrix4(weapon.matrix).sub(joint.position).normalize();
    const orientation = new THREE.Quaternion().setFromUnitVectors(attachment.position.clone().normalize(), target);
    joint.quaternion.slerp(orientation, aim);
  }
  const stow = state.weaponStow || 0;
  weapon.position.lerp(new THREE.Vector3(.4, -.16, .24), stow);
  weapon.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(.2, 0, 1.05)), stow);
}
function placeRig(rig, state, origin, heading) {
  const root = new THREE.Vector3(...state.position).applyAxisAngle(axis, heading).add(origin);
  rig.mesh.position.copy(root); rig.mesh.rotation.set(0, heading + state.rotation[1], 0);
  rig.body.position.set(...state.body.position); rig.body.quaternion.fromArray(state.body.quaternion);
  rig.torso.scale.set(1, 1, 1);
  rig.rHip.position.set(.2, -.4, 0); rig.lHip.position.set(-.2, -.4, 0);
  for (const joint of ['head','right','left','rHip','lHip']) rig[joint].rotation.set(...state[joint]);
  // Equipment stays welded to one of the six body parts throughout the take.
  if (rig.weapon) {
    if (rig.armed) {
      carryRifle(rig, state);
    } else {
      if (rig.weapon.parent !== rig.rHand) rig.rHand.add(rig.weapon);
      rig.weapon.position.set(0, 0, -.08); rig.weapon.rotation.set(0, 0, 0); rig.weapon.scale.setScalar(1);
    }
  }
  rig.mesh.updateWorldMatrix(true, true);
  const support = humanoidSupport(rig);
  if (support < origin.y) rig.body.position.y += origin.y - support;
  rig.mesh.updateWorldMatrix(true, true);
  settleWeapon(rig, state, origin.y);
}

/** Apply only the six R6 joints/root; callers must skip locomotion this frame. */
export function applyExecutionPose({ attackerRig, victimRig, variant, elapsed, origin = [0, 0, 0], heading = 0 }) {
  const clip = resolve(variant), sampled = sampleExecution(clip, elapsed);
  const base = origin?.isVector3 ? origin : new THREE.Vector3(...origin);
  placeRig(attackerRig, sampled.attacker, base, heading);
  placeRig(victimRig, sampled.victim, base, heading);
  for (const contact of sampled.contacts) {
    const joint = attackerRig[contact.hand], hand = attackerRig[contact.hand === 'right' ? 'rHand' : 'lHand'];
    const target = victimRig.body.localToWorld(new THREE.Vector3(...contact.target));
    attackerRig.body.worldToLocal(target); target.sub(joint.position).normalize();
    yawQuaternion.setFromUnitVectors(hand.position.clone().normalize(), target);
    joint.quaternion.slerp(yawQuaternion, contact.weight);
  }
  const action = Math.sin(Math.PI * sampled.time / clip.duration);
  for (const rig of [attackerRig, victimRig]) {
    if (rig.jaw) rig.jaw.rotation.x = action * .55;
    rig.appendages?.forEach((appendage, i) => {
      appendage.rotation.set(-.35 - action * .8 + Math.sin(sampled.time * 3 + i) * .1, 0, Math.sin(sampled.time * 2 + i) * .15);
      if (appendage.userData.tip) appendage.userData.tip.rotation.x = action * .4 + Math.sin(sampled.time * 4 + i) * .12;
    });
    rig.mesh.updateWorldMatrix(true, true);
    rig.appendages?.forEach((appendage, i) => {
      const worldDirection = new THREE.Vector3(Math.sin(rig.mesh.rotation.y + i * .2), .12, -Math.cos(rig.mesh.rotation.y + i * .2)).normalize();
      const flat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), worldDirection);
      clearEquipmentFloor(appendage, base.y + .008, flat);
    });
  }
  return { focus: new THREE.Vector3(...sampled.focus).applyAxisAngle(axis, heading).add(base),
    attackerPosition: attackerRig.mesh.position.clone(), victimPosition: victimRig.mesh.position.clone(), cutaway: sampled.cutaway };
}
