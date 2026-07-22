(() => {
  "use strict";
  const config = window.SCOUT_CONFIG;
  const data = window.scoutData;
  const state = { route: "dashboard", status: "idle", error: null, orgs: [], actions: [], query: "", loadedAt: null };
  const $ = selector => document.querySelector(selector);

  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const formatDate = value => value ? new Intl.DateTimeFormat(config.locale, { month: "short", day: "numeric" }).format(new Date(value + "T00:00:00")) : "미정";
  const dayDiff = value => value ? Math.ceil((new Date(value + "T00:00:00") - new Date().setHours(0, 0, 0, 0)) / 86400000) : null;
  const stage = id => config.stages.find(item => item.id === Number(id)) || config.stages[0];
  const orgById = id => state.orgs.find(org => org.id === id);

  function toast(message, tone = "info") {
    const item = document.createElement("div");
    item.className = `toast ${tone}`;
    item.textContent = message;
    $("#toast-region").append(item);
    setTimeout(() => item.remove(), 3200);
  }

  function renderNav() {
    $("#primary-nav").innerHTML = config.navigation.map(item => `<button class="nav-item ${state.route === item.id ? "active" : ""}" data-route="${item.id}"><span aria-hidden="true">${item.icon}</span>${escapeHtml(item.label)}</button>`).join("");
  }

  function setRoute(route) {
    if (!config.navigation.some(item => item.id === route)) return;
    state.route = route;
    history.replaceState(null, "", `#${route}`);
    document.body.classList.remove("nav-open");
    $("#menu-button").setAttribute("aria-expanded", "false");
    render();
    $("#main").focus();
  }

  function loadingView() { return `<div class="state-card"><div class="spinner" aria-hidden="true"></div><h2>데이터를 불러오는 중입니다</h2><p>잠시만 기다려 주세요.</p></div>`; }
  function errorView() { return `<div class="state-card error"><h2>데이터를 불러오지 못했습니다</h2><p>${escapeHtml(state.error || "알 수 없는 오류")}</p><button class="button primary" data-action="retry">다시 시도</button></div>`; }
  function emptyView(title, description) { return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div>`; }

  function metric(label, value, hint, tone = "blue") {
    return `<article class="metric-card ${tone}"><span>${escapeHtml(label)}</span><strong>${value}</strong><small>${escapeHtml(hint)}</small></article>`;
  }

  function dashboardView() {
    const stale = state.orgs.filter(org => !org.lastContact || dayDiff(org.lastContact) <= -config.staleContactDays).length;
    const pending = state.actions.filter(action => !action.done);
    const overdue = pending.filter(action => dayDiff(action.due) < 0);
    const mou = state.orgs.filter(org => org.stage >= 4).length;
    const priorities = [...pending].sort((a, b) => dayDiff(a.due) - dayDiff(b.due)).slice(0, 5);
    return `<div class="metrics">${metric("연락 필요", stale, `${config.staleContactDays}일 이상 미연락`, "red")}${metric("미완료 액션", pending.length, `기한 초과 ${overdue.length}건`, "amber")}${metric("MOU 단계", mou, "예정 및 완료", "green")}${metric("전체 기관", state.orgs.length, "데모 기준", "blue")}</div>
      <div class="content-grid"><section class="panel"><div class="panel-head"><div><h2>오늘의 우선순위</h2><p>기한이 가까운 순서입니다.</p></div><button class="text-button" data-route="actions">전체 보기</button></div>${priorities.length ? `<div class="task-list">${priorities.map(actionRow).join("")}</div>` : emptyView("처리할 액션이 없습니다", "새 액션을 추가하면 이곳에 표시됩니다.")}</section>
      <section class="panel"><div class="panel-head"><div><h2>파이프라인 요약</h2><p>현재 단계별 기관 분포입니다.</p></div><button class="text-button" data-route="pipeline">자세히</button></div>${pipelineBars()}</section></div>`;
  }

  function actionRow(action) {
    const org = orgById(action.orgId);
    const diff = dayDiff(action.due);
    const dueText = diff < 0 ? `${Math.abs(diff)}일 지남` : diff === 0 ? "오늘" : `D-${diff}`;
    return `<label class="task-row"><input type="checkbox" data-action-id="${action.id}" ${action.done ? "checked" : ""}><span><strong>${escapeHtml(action.text)}</strong><small>${escapeHtml(org?.name || "기관 미상")}</small></span><em class="due ${diff < 0 ? "overdue" : ""}">${dueText}</em></label>`;
  }

  function pipelineBars() {
    const max = Math.max(1, ...config.stages.map(item => state.orgs.filter(org => org.stage === item.id).length));
    return `<div class="pipeline-bars">${config.stages.map(item => { const count = state.orgs.filter(org => org.stage === item.id).length; return `<div><span>${escapeHtml(item.label)}</span><div class="bar"><i style="width:${Math.round(count / max * 100)}%"></i></div><strong>${count}</strong></div>`; }).join("")}</div>`;
  }

  function pipelineView() {
    return `<div class="kanban">${config.stages.map(item => { const rows = state.orgs.filter(org => org.stage === item.id); return `<section class="kanban-column"><header><span>${escapeHtml(item.label)}</span><b>${rows.length}</b></header>${rows.length ? rows.map(orgCard).join("") : emptyView("기관 없음", "이 단계의 기관이 없습니다.")}</section>`; }).join("")}</div>`;
  }

  function orgCard(org) {
    return `<article class="org-card"><div><span class="stage-pill ${stage(org.stage).color}">${escapeHtml(stage(org.stage).label)}</span><h3>${escapeHtml(org.name)}</h3><p>${escapeHtml(org.memo || "메모 없음")}</p></div><footer><span>${escapeHtml(org.member || "담당 미정")}</span><span>다음 연락 ${formatDate(org.nextContact)}</span></footer></article>`;
  }

  function orgsView() {
    const query = state.query.toLocaleLowerCase(config.locale);
    const rows = state.orgs.filter(org => [org.name, org.member, org.memo].some(value => String(value || "").toLocaleLowerCase(config.locale).includes(query)));
    return `<section class="panel"><div class="panel-head wrap"><div><h2>기관 목록</h2><p>총 ${rows.length}개 기관</p></div><div class="toolbar"><label class="search"><span aria-hidden="true">⌕</span><input id="org-search" type="search" placeholder="기관명, 담당자, 메모 검색" value="${escapeHtml(state.query)}"></label><button class="button primary" data-action="add-org">+ 기관 등록</button></div></div>${rows.length ? `<div class="table-wrap"><table><thead><tr><th>기관</th><th>단계</th><th>담당자</th><th>마지막 연락</th><th>다음 연락</th></tr></thead><tbody>${rows.map(org => `<tr><td><strong>${escapeHtml(org.name)}</strong><small>${escapeHtml(org.memo || "")}</small></td><td><span class="stage-pill ${stage(org.stage).color}">${escapeHtml(stage(org.stage).label)}</span></td><td>${escapeHtml(org.member || "미정")}</td><td>${formatDate(org.lastContact)}</td><td>${formatDate(org.nextContact)}</td></tr>`).join("")}</tbody></table></div>` : emptyView("검색 결과가 없습니다", "검색어를 바꾸거나 기관을 새로 등록해 보세요.")}</section>`;
  }

  function actionsView() {
    const pending = state.actions.filter(action => !action.done);
    const done = state.actions.filter(action => action.done);
    return `<div class="content-grid"><section class="panel"><div class="panel-head"><div><h2>처리 대기</h2><p>${pending.length}건</p></div></div>${pending.length ? `<div class="task-list">${pending.map(actionRow).join("")}</div>` : emptyView("대기 중인 액션이 없습니다", "모든 일이 완료되었습니다.")}</section><section class="panel muted"><div class="panel-head"><div><h2>완료</h2><p>${done.length}건</p></div></div>${done.length ? `<div class="task-list">${done.map(actionRow).join("")}</div>` : emptyView("완료 이력이 없습니다", "완료한 액션이 이곳에 쌓입니다.")}</section></div>`;
  }

  function analyticsView() {
    const withNext = state.orgs.filter(org => org.nextContact).length;
    const completed = state.actions.filter(action => action.done).length;
    const actionRate = state.actions.length ? Math.round(completed / state.actions.length * 100) : 0;
    return `<div class="metrics">${metric("기관", state.orgs.length, "현재 관리 중", "blue")}${metric("다음 연락 설정", withNext, `${Math.round(withNext / Math.max(1, state.orgs.length) * 100)}%`, "violet")}${metric("액션 완료율", `${actionRate}%`, `${completed}/${state.actions.length}건`, "green")}</div><section class="panel"><div class="panel-head"><div><h2>단계별 분포</h2><p>모든 KPI는 정의와 집계 기준을 함께 표시해야 합니다.</p></div></div>${pipelineBars()}<div class="definition-note"><strong>지표 설계 원칙</strong><p>기간 기준, 중복 허용 여부, 테스트 데이터 제외 여부를 KPI마다 문서화하세요. 숫자가 0일 때는 실제 0건인지 로딩 실패인지 구분해서 표시해야 합니다.</p></div></section>`;
  }

  function render() {
    renderNav();
    const navItem = config.navigation.find(item => item.id === state.route);
    const titles = { dashboard: ["오늘의 운영 현황", "중요한 일부터 확인하고 바로 처리하세요."], pipeline: ["기관 파이프라인", "기관의 현재 단계와 다음 이동을 확인하세요."], orgs: ["기관 관리", "기관 정보를 검색하고 최신 상태로 유지하세요."], actions: ["후속 액션", "기한이 지난 일과 오늘 할 일을 놓치지 마세요."], analytics: ["운영 분석", "정의가 명확한 지표로 흐름을 판단하세요."] };
    $("#page-title").textContent = titles[state.route]?.[0] || navItem?.label || "Scout Core";
    $("#page-description").textContent = titles[state.route]?.[1] || "";
    if (state.status === "loading") $("#view").innerHTML = loadingView();
    else if (state.status === "error") $("#view").innerHTML = errorView();
    else $("#view").innerHTML = ({ dashboard: dashboardView, pipeline: pipelineView, orgs: orgsView, actions: actionsView, analytics: analyticsView }[state.route] || dashboardView)();
  }

  async function load() {
    state.status = "loading"; state.error = null; render();
    try {
      const snapshot = await data.loadSnapshot();
      state.orgs = snapshot.orgs; state.actions = snapshot.actions; state.loadedAt = snapshot.meta.loadedAt; state.status = "ready";
      $("#connection-label").textContent = snapshot.meta.source === "demo" ? "데모 데이터" : "데이터 연결됨";
    } catch (error) {
      state.status = "error"; state.error = error?.message || "데이터 연결을 확인해 주세요.";
    }
    render();
  }

  function openOrgDialog() {
    $("#member-select").innerHTML = `<option value="">담당 미정</option>${config.members.map(member => `<option>${escapeHtml(member)}</option>`).join("")}`;
    $("#stage-select").innerHTML = config.stages.map(item => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join("");
    $("#org-form").reset();
    $("#org-dialog").showModal();
  }

  function openExportDialog() {
    const filtered = document.querySelector('#export-form input[value="filtered"]');
    filtered.disabled = !state.query;
    if (!state.query && filtered.checked) document.querySelector('#export-form input[value="all"]').checked = true;
    $("#export-dialog").showModal();
  }

  document.addEventListener("click", async event => {
    const routeButton = event.target.closest("[data-route]");
    if (routeButton) { setRoute(routeButton.dataset.route); return; }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "add-org") openOrgDialog();
    if (action === "export-excel") openExportDialog();
    if (action === "retry") load();
  });
  document.addEventListener("change", async event => {
    if (!event.target.matches("[data-action-id]")) return;
    const id = Number(event.target.dataset.actionId);
    event.target.disabled = true;
    try { await data.toggleAction(id); await load(); toast("액션 상태를 변경했습니다.", "success"); }
    catch (error) { event.target.checked = !event.target.checked; event.target.disabled = false; toast(error.message || "변경하지 못했습니다.", "error"); }
  });
  document.addEventListener("input", event => {
    if (event.target.id === "org-search") { state.query = event.target.value; const selection = [event.target.selectionStart, event.target.selectionEnd]; render(); const input = $("#org-search"); input.focus(); input.setSelectionRange(...selection); }
  });
  $("#org-form").addEventListener("submit", async event => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const button = $("#save-org-button"); button.disabled = true; button.textContent = "저장 중…";
    try {
      await data.addOrg({ name: form.get("name").trim(), member: form.get("member"), stage: Number(form.get("stage")), nextContact: form.get("nextContact") || null, memo: form.get("memo").trim() });
      $("#org-dialog").close(); await load(); setRoute("orgs"); toast("기관을 등록했습니다.", "success");
    } catch (error) { toast(error.message || "저장하지 못했습니다.", "error"); }
    finally { button.disabled = false; button.textContent = "저장"; }
  });
  $("#export-form").addEventListener("submit", event => {
    if (event.submitter?.value === "cancel") return;
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scope = form.get("scope") || "all";
    const sheets = form.getAll("sheet");
    const query = state.query.toLocaleLowerCase(config.locale);
    const orgs = scope === "filtered" ? state.orgs.filter(org => [org.name, org.member, org.memo].some(value => String(value || "").toLocaleLowerCase(config.locale).includes(query))) : state.orgs;
    const orgIds = new Set(orgs.map(org => org.id));
    const actions = scope === "filtered" ? state.actions.filter(action => orgIds.has(action.orgId)) : state.actions;
    const button = $("#download-excel-button"); button.disabled = true; button.textContent = "파일 생성 중…";
    try { const filename = window.ScoutExport.download({ orgs, actions, config, scope, sheets }); $("#export-dialog").close(); toast(`${filename} 다운로드를 시작했습니다.`, "success"); }
    catch (error) { toast(error.message || "엑셀 파일을 만들지 못했습니다.", "error"); }
    finally { button.disabled = false; button.textContent = ".xlsx 다운로드"; }
  });
  $("#refresh-button").addEventListener("click", () => load());
  $("#menu-button").addEventListener("click", event => { const open = document.body.classList.toggle("nav-open"); event.currentTarget.setAttribute("aria-expanded", String(open)); });
  $("#brand-name").textContent = config.appName; $("#brand-subtitle").textContent = config.subtitle;
  state.route = location.hash.slice(1) || "dashboard";
  load();
})();
