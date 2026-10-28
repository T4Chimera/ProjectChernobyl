// Prototype operational orders. These reveal no definitive explanation of the disaster.
export const MISSIONS = Object.freeze([
  { id:'contact', type:'interact', targetId:'radio', title:'ESTABLISH CONTACT', text:'Overwatch to field operator. Check the radio at the Foundation checkpoint. We need a clean channel before you enter the facility.' },
  { id:'supplies', type:'interact', targetId:'supply-checkpoint', title:'PREPARE YOUR EQUIPMENT', text:'Confirm your ammunition at the checkpoint supply crate. Facility power is down. Keep your weapon light trained ahead.' },
  { id:'intake', type:'sector', sector:1, targetId:'intake-logs', title:'ENTER SECTOR 01', text:'Proceed east to Reactor 1 intake. Maintain visual contact with your route back. Report any movement.' },
  { id:'logs', type:'interact', targetId:'intake-logs', title:'RECOVER INTAKE RECORDS', text:'Locate the intake terminal. Copy the surviving records; do not attempt to restore facility lighting.' },
  { id:'archive', type:'interact', targetId:'personnel-archive', title:'CHECK THE PERSONNEL ARCHIVE', text:'The personnel room is on your right. Recover the archive index. The seated operative is not hostile unless provoked. Leave him alone.' },
  { id:'felon', type:'boss', bossId:'Felon', title:'CONTAIN FELON', text:'Armed infected operative identified as Felon. Use solid cover between bursts. His elimination is required to secure the intake route.' },
  { id:'valve', type:'interact', targetId:'turbine-valve', title:'ISOLATE THE TURBINE LINE', text:'Proceed to Sector 2. Turn the manual turbine valve to isolate the damaged line. Resupply before leaving each sector.' },
  { id:'nikolai', type:'boss', bossId:'Nikolai', title:'SECURE THE TURBINE FLOOR', text:'Nikolai is searching this sector. Keep distance from the axe. Do not allow both contacts to corner you.' },
  { id:'novak', type:'boss', bossId:'Novak', title:'STOP THE SILENT CONTACT', text:'Novak is faster. Keep your escape route clear and watch your stamina. Hold the turbine floor.' },
  { id:'isolate', type:'interact', targetId:'grid-isolator', title:'ISOLATE THE GRID', text:'Move to Sector 3 control. Set the grid isolator to safe. This isolates damaged circuits; it will not turn the lights on.' },
  { id:'backup', type:'interact', targetId:'control-backup', title:'COPY THE CONTROL BACKUP', text:'Locate the backup console. Preserve the data without altering it. Analysis comes after extraction.' },
  { id:'john', type:'boss', bossId:'John', title:'SECURE THE CONTROL SECTOR', text:'Chaos Insurgency contact identified as John. Secure the control sector before proceeding to Reactor 4.' },
  { id:'gauge', type:'interact', targetId:'containment-gauge', title:'READ THE CONTAINMENT GAUGE', text:'Enter the damaged Reactor 4 sector. Read the containment gauge. Avoid unnecessary contact with debris.' },
  { id:'case', type:'interact', targetId:'research-case', title:'RECOVER THE SEALED CASE', text:'Recover the sealed research case. Keep it closed. Overwatch has no clearance to assess its contents in the field.' },
  { id:'sukhoi', type:'boss', bossId:'Sukhoi', title:'CONTAIN SUKHOI', text:'Sukhoi is in the incident zone. Stay outside his reach. If he closes the distance, break contact and reposition.' },
  { id:'crane', type:'interact', targetId:'crane-lock', title:'LOCK THE CONSTRUCTION CRANE', text:'Proceed to unfinished Reactor 5. Engage the crane lock before you approach the field transmitter.' },
  { id:'transmitter', type:'interact', targetId:'transmitter', title:'ALIGN THE FIELD TRANSMITTER', text:'Align the transmitter with the checkpoint. Keep this channel open. Do not energize the plant grid.' },
  { id:'jayden', type:'boss', bossId:'Jayden', title:'SECURE THE TRANSMITTER', text:'Jayden is covering the construction site. Use the supports for cover and secure the transmitter route.' },
  { id:'sample', type:'interact', targetId:'anomaly-sample', title:'RECOVER THE SEALED SAMPLE', text:'Advance to unfinished Reactor 6. Recover the marked sealed sample. Stay out of the dark liquid.' },
  { id:'uplink', type:'interact', targetId:'uplink', title:'SEND THE FIELD PACKAGE', text:'Upload the recovered indices and instrument readings. Keep the originals for extraction. The cause remains under investigation.' },
  { id:'katya', type:'boss', bossId:'Katya', title:'CLEAR THE EXTRACTION ROUTE', text:'Katya is close. Watch for warning pools, keep your distance, and use the supply crates. Do not mistake quiet for safety.' },
  { id:'extraction', type:'interact', targetId:'extraction', title:'RETURN TO THE CHECKPOINT', text:'Field objectives complete. Return west to the Foundation checkpoint and confirm extraction. Overwatch will receive your report there.' },
]);

export class MissionDirector {
  constructor(onAdvance=()=>{}) { this.onAdvance=onAdvance; this.reset(); }
  reset() { this.index=0; this.interactions=new Set(); this.bosses=new Set(); this.sectors=new Set(); this.complete=false; }
  current() { return MISSIONS[this.index] ?? null; }
  observe(event) {
    if(event.type==='interaction') this.interactions.add(event.id);
    if(event.type==='boss-defeated') this.bosses.add(event.id);
    if(event.type==='sector') this.sectors.add(event.id);
    let changed=false;
    while(this.index<MISSIONS.length) {
      const m=this.current();
      const done=m.type==='interact'?this.interactions.has(m.targetId):m.type==='boss'?this.bosses.has(m.bossId):this.sectors.has(m.sector);
      if(!done) break;
      this.index++; changed=true;
    }
    this.complete=this.index===MISSIONS.length;
    if(changed) this.onAdvance(this.current(), this.complete);
    return changed;
  }
  view(world,state) {
    const m=this.current();
    const target=m?.targetId?world.interactables.find(i=>i.id===m.targetId):null;
    const boss=m?.bossId?state.bosses.get(m.bossId):null;
    return {index:Math.min(this.index+1,MISSIONS.length),total:MISSIONS.length,
      title:m?.title??'EXTRACTION CONFIRMED',text:m?.text??'Overwatch: Field package received. Your team is clear.',
      targetId:m?.targetId??m?.bossId,targetPosition:target?.position??boss?.position??null,complete:this.complete};
  }
}
