window.SCOUT_CONFIG = {
  appName: "Scout Core",
  subtitle: "업무 운영 허브",
  locale: "ko-KR",
  members: ["임세진", "팀원 A", "팀원 B"],
  stages: [
    { id: 0, label: "발굴", color: "slate" },
    { id: 1, label: "컨택 시도", color: "blue" },
    { id: 2, label: "미팅 완료", color: "violet" },
    { id: 3, label: "관계 형성", color: "amber" },
    { id: 4, label: "MOU 예정", color: "teal" },
    { id: 5, label: "MOU 완료", color: "green" }
  ],
  navigation: [
    { id: "dashboard", label: "대시보드", icon: "⌂" },
    { id: "pipeline", label: "파이프라인", icon: "▦" },
    { id: "orgs", label: "기관", icon: "▤" },
    { id: "actions", label: "후속 액션", icon: "✓" },
    { id: "analytics", label: "분석", icon: "⌁" }
  ],
  staleContactDays: 30,
  dataMode: "demo"
};
