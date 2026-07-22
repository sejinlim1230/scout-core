(() => {
  "use strict";
  const text = value => String(value ?? "");
  const dateValue = value => value ? new Date(`${value}T00:00:00`) : null;
  function styleSheet(sheet, widths) {
    sheet["!cols"] = widths.map(width => ({ wch: width }));
    if (sheet["!ref"]) sheet["!autofilter"] = { ref: sheet["!ref"] };
  }
  function makeSummary(orgs, actions, scopeLabel, config) {
    const rows = [["Scout Core 데이터 내보내기"],["생성일시",new Date()],["데이터 범위",scopeLabel],["기관 수",orgs.length],["후속 액션 수",actions.length],["미완료 액션",actions.filter(a=>!a.done).length],["완료 액션",actions.filter(a=>a.done).length],[],["단계","기관 수"],...config.stages.map(s=>[s.label,orgs.filter(o=>Number(o.stage)===s.id).length])];
    const sheet = XLSX.utils.aoa_to_sheet(rows,{cellDates:true}); sheet["!cols"]=[{wch:24},{wch:28}]; if(sheet.B2)sheet.B2.z="yyyy-mm-dd hh:mm"; return sheet;
  }
  function makeOrgs(orgs, config) {
    const label=id=>config.stages.find(s=>s.id===Number(id))?.label||"미정";
    const sheet=XLSX.utils.json_to_sheet(orgs.map(o=>({"기관 ID":text(o.id),"기관명":text(o.name),"현재 단계":label(o.stage),"담당자":text(o.member||"미정"),"마지막 연락일":dateValue(o.lastContact),"다음 연락일":dateValue(o.nextContact),"메모":text(o.memo)})),{cellDates:true});
    styleSheet(sheet,[16,24,16,16,15,15,46]); Object.keys(sheet).filter(k=>/^[EF]\d+$/.test(k)).forEach(k=>{if(sheet[k]?.v)sheet[k].z="yyyy-mm-dd";}); return sheet;
  }
  function makeActions(actions, orgs) {
    const names=new Map(orgs.map(o=>[o.id,o.name]));
    const sheet=XLSX.utils.json_to_sheet(actions.map(a=>({"액션 ID":text(a.id),"기관명":text(names.get(a.orgId)||"기관 미상"),"할 일":text(a.text),"마감일":dateValue(a.due),"상태":a.done?"완료":"미완료"})),{cellDates:true});
    styleSheet(sheet,[16,24,42,15,12]); Object.keys(sheet).filter(k=>/^D\d+$/.test(k)).forEach(k=>{if(sheet[k]?.v)sheet[k].z="yyyy-mm-dd";}); return sheet;
  }
  function download({orgs,actions,config,scope="all",sheets=["summary","orgs","actions"]}) {
    if(!window.XLSX)throw new Error("엑셀 생성 모듈을 불러오지 못했습니다."); if(!sheets.length)throw new Error("시트를 하나 이상 선택해 주세요.");
    const wb=XLSX.utils.book_new(),scopeLabel=scope==="filtered"?"현재 검색 결과":"전체 데이터";
    if(sheets.includes("summary"))XLSX.utils.book_append_sheet(wb,makeSummary(orgs,actions,scopeLabel,config),"요약");
    if(sheets.includes("orgs"))XLSX.utils.book_append_sheet(wb,makeOrgs(orgs,config),"기관 목록");
    if(sheets.includes("actions"))XLSX.utils.book_append_sheet(wb,makeActions(actions,orgs),"후속 액션");
    const filename=`Scout_Core_${new Date().toISOString().slice(0,10)}.xlsx`; XLSX.writeFile(wb,filename,{compression:true,cellStyles:true}); return filename;
  }
  window.ScoutExport={download};
})();
