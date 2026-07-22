(() => {
  const now = new Date();
  const iso = days => { const d = new Date(now); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
  let orgs = [
    { id: 1, name: "해솔복지관", stage: 4, member: "임세진", lastContact: iso(-34), nextContact: iso(1), memo: "MOU 일정 최종 확인" },
    { id: 2, name: "모두테크", stage: 2, member: "팀원 A", lastContact: iso(-6), nextContact: iso(3), memo: "직무 요건 전달 예정" },
    { id: 3, name: "새봄센터", stage: 1, member: "팀원 B", lastContact: iso(-42), nextContact: iso(-2), memo: "재연락 필요" },
    { id: 4, name: "온누리협회", stage: 5, member: "임세진", lastContact: iso(-3), nextContact: iso(7), memo: "인재 추천 준비" }
  ];
  let actions = [
    { id: 1, orgId: 1, text: "MOU 일정 확인", due: iso(1), done: false },
    { id: 2, orgId: 3, text: "담당자 재연락", due: iso(-2), done: false },
    { id: 3, orgId: 2, text: "직무기술서 전달", due: iso(3), done: false }
  ];

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const clone = value => JSON.parse(JSON.stringify(value));

  window.scoutData = {
    async loadSnapshot() {
      await delay(180);
      return { orgs: clone(orgs), actions: clone(actions), meta: { source: "demo", loadedAt: new Date().toISOString() } };
    },
    async addOrg(input) {
      await delay(180);
      const item = { id: Date.now(), lastContact: null, ...input };
      orgs = [item, ...orgs];
      return clone(item);
    },
    async toggleAction(id) {
      await delay(120);
      actions = actions.map(action => action.id === id ? { ...action, done: !action.done } : action);
      return clone(actions.find(action => action.id === id));
    }
  };
})();
