const chats = [
  {
    id: "u1",
    type: "contacts",
    title: "Иван Петров",
    status: "в сети",
    unread: 2,
    messages: [
      {
        id: "u1-m1",
        author: "Иван",
        text: "Привет! Ты на связи?",
        outgoing: false,
        time: "около 7 часов назад",
      },
      {
        id: "u1-m2",
        author: "Вы",
        text: "Да, можем обсудить релиз после обеда.",
        outgoing: true,
        time: "около 6 часов назад",
      },
    ],
    pinned: [
      {
        messageId: "u1-m1",
      },
    ],
  },
  {
    id: "u2",
    type: "contacts",
    title: "Анна Смирнова",
    status: "была 5 минут назад",
    unread: 0,
    messages: [
      {
        id: "u2-m1",
        author: "Анна",
        text: "Соберу правки по дизайну к вечеру.",
        outgoing: false,
        time: "около 5 часов назад",
      },
      {
        id: "u2-m2",
        author: "Вы",
        text: "Отлично, жду в общем документе.",
        outgoing: true,
        time: "около 5 часов назад",
      },
    ],
    pinned: [],
  },
  {
    id: "g1",
    type: "groups",
    title: "Разработка Core",
    status: "участников: 12",
    unread: 7,
    messages: [
      {
        id: "g1-m1",
        author: "Сергей",
        text: "Пофиксил авторизацию в тестовом стенде.",
        outgoing: false,
        time: "около 4 часов назад",
      },
      {
        id: "g1-m2",
        author: "Вы",
        text: "Супер, проверю и дам фидбек.",
        outgoing: true,
        time: "около 4 часов назад",
      },
    ],
    pinned: [
      {
        messageId: "g1-m1",
      },
    ],
  },
  {
    id: "g2",
    type: "groups",
    title: "Маркетинг",
    status: "участников: 7",
    unread: 1,
    messages: [
      {
        id: "g2-m1",
        author: "Оля",
        text: "Нужен скрин главного экрана для анонса.",
        outgoing: false,
        time: "около 3 часов назад",
      },
      {
        id: "g2-m2",
        author: "Вы",
        text: "Сделаю после обновления интерфейса.",
        outgoing: true,
        time: "около 3 часов назад",
      },
    ],
    pinned: [],
  },
];

const extraContactNames = [
  "Дмитрий Волков",
  "Екатерина Орлова",
  "Алексей Романов",
  "Мария Соколова",
  "Никита Кузнецов",
  "Виктория Иванова",
  "Павел Миронов",
  "Юлия Белова",
  "Артем Захаров",
  "Светлана Лебедева",
  "Константин Фролов",
  "Наталья Денисова",
  "Игорь Крылов",
  "Оксана Новикова",
  "Роман Титов",
  "Елена Никитина",
];

extraContactNames.forEach((name, index) => {
  const id = `u${index + 3}`;
  const baseMessageId = `${id}-m1`;
  chats.push({
    id,
    type: "contacts",
    title: name,
    status: index % 3 === 0 ? "в сети" : "был(а) недавно",
    unread: (index % 5) + (index % 2),
    messages: [
      {
        id: baseMessageId,
        author: name.split(" ")[0],
        text: "Тестовое сообщение для проверки прокрутки и списка контактов.",
        outgoing: false,
        time: "около 2 часов назад",
      },
    ],
    pinned: index % 4 === 0 ? [{ messageId: baseMessageId }] : [],
  });
});

const extraGroupNames = [
  "Поддержка",
  "Дизайн",
  "Продажи",
  "HR команда",
  "Финансы",
  "Руководство",
];

extraGroupNames.forEach((name, index) => {
  const id = `g${index + 3}`;
  const baseMessageId = `${id}-m1`;
  chats.push({
    id,
    type: "groups",
    title: name,
    status: `участников: ${8 + index * 3}`,
    unread: index % 4,
    messages: [
      {
        id: baseMessageId,
        author: "Система",
        text: "Групповой чат создан для демонстрации длинного списка.",
        outgoing: false,
        time: "около 1 часа назад",
      },
    ],
    pinned: index % 3 === 0 ? [{ messageId: baseMessageId }] : [],
  });
});

const tabs = document.querySelectorAll(".tab:not(.disabled)");
const entityList = document.getElementById("entityList");
const entitySearch = document.getElementById("entitySearch");
const messageSearch = document.getElementById("messageSearch");
const globalSearchInfo = document.getElementById("globalSearchInfo");
const chatTitle = document.getElementById("chatTitle");
const chatPlaceholder = document.getElementById("chatPlaceholder");
const messagesContainer = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const expandComposerBtn = document.getElementById("expandComposerBtn");
const composerInputWrap = document.getElementById("composerInputWrap");
const emojiToggleBtn = document.getElementById("emojiToggleBtn");
const emojiPanel = document.getElementById("emojiPanel");
const emojiRecentRow = document.getElementById("emojiRecentRow");
const emojiGrid = document.getElementById("emojiGrid");
const chatPinnedBtn = document.getElementById("chatPinnedBtn");
const closePinnedBtn = document.getElementById("closePinnedBtn");
const pinnedPanel = document.getElementById("pinnedPanel");
const pinnedList = document.getElementById("pinnedList");
const serviceNotifyBtn = document.getElementById("serviceNotifyBtn");
const notifyPanel = document.getElementById("notifyPanel");
const closeNotifyBtn = document.getElementById("closeNotifyBtn");
const notifyList = document.getElementById("notifyList");
const serviceSettingsBtn = document.getElementById("serviceSettingsBtn");
const profileSettingsBtn = document.getElementById("profileSettingsBtn");
const rolesModalBackdrop = document.getElementById("rolesModalBackdrop");
const closeRolesModalBtn = document.getElementById("closeRolesModalBtn");
const settingsRolesTabBtn = document.getElementById("settingsRolesTabBtn");
const settingsUsersTabBtn = document.getElementById("settingsUsersTabBtn");
const settingsRolesPanel = document.getElementById("settingsRolesPanel");
const settingsUsersPanel = document.getElementById("settingsUsersPanel");
const openAddRoleBtn = document.getElementById("openAddRoleBtn");
const rolesList = document.getElementById("rolesList");
const rolesCountBadge = document.getElementById("rolesCountBadge");
const usersList = document.getElementById("usersList");
const usersCountBadge = document.getElementById("usersCountBadge");
const usersSearchInput = document.getElementById("usersSearchInput");
const roleEditorBackdrop = document.getElementById("roleEditorBackdrop");
const closeRoleEditorBtn = document.getElementById("closeRoleEditorBtn");
const cancelRoleEditorBtn = document.getElementById("cancelRoleEditorBtn");
const roleEditorTitle = document.getElementById("roleEditorTitle");
const roleEditorForm = document.getElementById("roleEditorForm");
const roleEditorNameInput = document.getElementById("roleEditorNameInput");
const roleColorToggleBtn = document.getElementById("roleColorToggleBtn");
const roleColorToggleSwatch = document.getElementById("roleColorToggleSwatch");
const roleColorToggleText = document.getElementById("roleColorToggleText");
const roleColorMenu = document.getElementById("roleColorMenu");
const roleColorGrid = document.getElementById("roleColorGrid");
const roleEditorRankInput = document.getElementById("roleEditorRankInput");
const roleEditorScopeInput = document.getElementById("roleEditorScopeInput");
const roleEditorFilterInput = document.getElementById("roleEditorFilterInput");
const permCanViewSettings = document.getElementById("permCanViewSettings");
const permCanAddRoles = document.getElementById("permCanAddRoles");
const permCanEditRoles = document.getElementById("permCanEditRoles");
const permCanInviteGroups = document.getElementById("permCanInviteGroups");
const permCanInviteUsers = document.getElementById("permCanInviteUsers");
const limitMessagesEnabled = document.getElementById("limitMessagesEnabled");
const limitMessagesValue = document.getElementById("limitMessagesValue");
const limitRequestsEnabled = document.getElementById("limitRequestsEnabled");
const limitRequestsValue = document.getElementById("limitRequestsValue");
const limitCharsEnabled = document.getElementById("limitCharsEnabled");
const limitCharsValue = document.getElementById("limitCharsValue");
const limitLinesEnabled = document.getElementById("limitLinesEnabled");
const limitLinesValue = document.getElementById("limitLinesValue");
const limitFileSizeEnabled = document.getElementById("limitFileSizeEnabled");
const limitFileSizeValue = document.getElementById("limitFileSizeValue");
const limitFilesPerMessageEnabled = document.getElementById("limitFilesPerMessageEnabled");
const limitFilesPerMessageValue = document.getElementById("limitFilesPerMessageValue");
const limitFormatsEnabled = document.getElementById("limitFormatsEnabled");
const limitFormatsValue = document.getElementById("limitFormatsValue");
const abilityCallEnabled = document.getElementById("abilityCallEnabled");
const abilityVideoCallEnabled = document.getElementById("abilityVideoCallEnabled");
const abilityRemoteDesktopEnabled = document.getElementById("abilityRemoteDesktopEnabled");
const inviteCodeBackdrop = document.getElementById("inviteCodeBackdrop");
const closeInviteCodeBtn = document.getElementById("closeInviteCodeBtn");
const inviteRoleLabel = document.getElementById("inviteRoleLabel");
const inviteCodeDigits = document.getElementById("inviteCodeDigits");
const regenerateInviteCodeBtn = document.getElementById("regenerateInviteCodeBtn");
const copyInviteCodeBtn = document.getElementById("copyInviteCodeBtn");
const userBanBackdrop = document.getElementById("userBanBackdrop");
const closeUserBanBtn = document.getElementById("closeUserBanBtn");
const cancelUserBanBtn = document.getElementById("cancelUserBanBtn");
const confirmUserBanBtn = document.getElementById("confirmUserBanBtn");
const userBanWarnText = document.getElementById("userBanWarnText");
const userEditBackdrop = document.getElementById("userEditBackdrop");
const closeUserEditBtn = document.getElementById("closeUserEditBtn");
const cancelUserEditBtn = document.getElementById("cancelUserEditBtn");
const userEditForm = document.getElementById("userEditForm");
const userEditNameInput = document.getElementById("userEditNameInput");

let activeTab = "contacts";
let activeChatId = null;
let isComposerExpanded = false;
let isPinnedPanelOpen = false;
let isNotifyPanelOpen = false;
let isRolesModalOpen = false;
let isRoleEditorOpen = false;
let isInviteCodeModalOpen = false;
let isUserBanModalOpen = false;
let isUserEditModalOpen = false;
let messageIdCounter = 1000;
let isEmojiPanelOpen = false;
let roleIdCounter = 6;
let editingRoleId = null;
let activeSettingsTab = "roles";
let selectedRoleColor = "#2fb344";
let isRoleColorMenuOpen = false;
let activeInviteCode = "";
let pendingDeleteUserId = null;
let editingUserId = null;

const ROLE_COLOR_POOL = [
  "#9775fa", "#845ef7", "#5f3dc4", "#e03131", "#c92a2a", "#a61e4d", "#f08c00", "#e67700",
  "#f59f00", "#2f9e44", "#2b8a3e", "#37b24d", "#1971c2", "#1864ab", "#1c7ed6", "#0b7285",
  "#1098ad", "#0ca678", "#5c940d", "#74b816", "#9c36b5", "#862e9c", "#d6336c", "#e64980",
  "#495057", "#343a40", "#212529", "#364fc7", "#4263eb", "#087f5b", "#d9480f", "#ff922b",
];

const roleDrafts = [
  {
    id: 1,
    name: "Разработчик",
    rank: 100,
    color: "#9775fa",
    scope: "global",
    filter: "",
    permissions: {
      canViewSettings: true,
      canAddRoles: true,
      canEditRoles: true,
      canInviteGroups: true,
      canInviteUsers: true,
    },
    limits: {
      messagesPerMinute: { enabled: false, value: 15 },
      requestsPerMinute: { enabled: false, value: 15 },
      charsPerMessage: { enabled: false, value: 1024 },
      linesPerMessage: { enabled: false, value: 32 },
      fileSizeMb: { enabled: false, value: 3 },
      filesPerMessage: { enabled: false, value: 9 },
      fileFormats: {
        enabled: false,
        value: "pdf, png, jpg, jpeg, xls, xlsx, doc, docx",
      },
    },
    abilities: {
      call: true,
      videoCall: true,
      remoteDesktop: true,
    },
  },
  {
    id: 2,
    name: "Администратор",
    rank: 90,
    color: "#e03131",
    scope: "global",
    filter: "",
    permissions: {
      canViewSettings: true,
      canAddRoles: true,
      canEditRoles: true,
      canInviteGroups: true,
      canInviteUsers: true,
    },
    limits: {
      messagesPerMinute: { enabled: false, value: 15 },
      requestsPerMinute: { enabled: false, value: 15 },
      charsPerMessage: { enabled: false, value: 1024 },
      linesPerMessage: { enabled: false, value: 32 },
      fileSizeMb: { enabled: false, value: 3 },
      filesPerMessage: { enabled: false, value: 9 },
      fileFormats: {
        enabled: false,
        value: "pdf, png, jpg, jpeg, xls, xlsx, doc, docx",
      },
    },
    abilities: {
      call: true,
      videoCall: true,
      remoteDesktop: true,
    },
  },
  {
    id: 3,
    name: "Сисадмин",
    rank: 80,
    color: "#1971c2",
    scope: "global",
    filter: "",
    permissions: {
      canViewSettings: true,
      canAddRoles: true,
      canEditRoles: true,
      canInviteGroups: true,
      canInviteUsers: true,
    },
    limits: {
      messagesPerMinute: { enabled: false, value: 15 },
      requestsPerMinute: { enabled: false, value: 15 },
      charsPerMessage: { enabled: false, value: 1024 },
      linesPerMessage: { enabled: false, value: 32 },
      fileSizeMb: { enabled: false, value: 3 },
      filesPerMessage: { enabled: false, value: 9 },
      fileFormats: {
        enabled: false,
        value: "pdf, png, jpg, jpeg, xls, xlsx, doc, docx",
      },
    },
    abilities: {
      call: true,
      videoCall: true,
      remoteDesktop: true,
    },
  },
  {
    id: 4,
    name: "Служба безопасности",
    rank: 70,
    color: "#f08c00",
    scope: "global",
    filter: "",
    permissions: {
      canViewSettings: true,
      canAddRoles: true,
      canEditRoles: true,
      canInviteGroups: true,
      canInviteUsers: true,
    },
    limits: {
      messagesPerMinute: { enabled: false, value: 15 },
      requestsPerMinute: { enabled: false, value: 15 },
      charsPerMessage: { enabled: false, value: 1024 },
      linesPerMessage: { enabled: false, value: 32 },
      fileSizeMb: { enabled: false, value: 3 },
      filesPerMessage: { enabled: false, value: 9 },
      fileFormats: {
        enabled: false,
        value: "pdf, png, jpg, jpeg, xls, xlsx, doc, docx",
      },
    },
    abilities: {
      call: true,
      videoCall: true,
      remoteDesktop: true,
    },
  },
  {
    id: 5,
    name: "Куратор",
    rank: 40,
    color: "#37b24d",
    scope: "filter",
    filter: "Москва, Казань",
    permissions: {
      canViewSettings: true,
      canAddRoles: false,
      canEditRoles: false,
      canInviteGroups: true,
      canInviteUsers: true,
    },
    limits: {
      messagesPerMinute: { enabled: true, value: 15 },
      requestsPerMinute: { enabled: true, value: 15 },
      charsPerMessage: { enabled: true, value: 1024 },
      linesPerMessage: { enabled: true, value: 32 },
      fileSizeMb: { enabled: true, value: 3 },
      filesPerMessage: { enabled: true, value: 9 },
      fileFormats: {
        enabled: true,
        value: "pdf, png, jpg, jpeg, xls, xlsx, doc, docx",
      },
    },
    abilities: {
      call: false,
      videoCall: false,
      remoteDesktop: false,
    },
  },
];

const userDrafts = [
  { id: 1, name: "Разработчик", rank: 100, color: "#9775fa", banned: false },
  { id: 2, name: "Администратор", rank: 90, color: "#e03131", banned: false },
  { id: 3, name: "Сисадмин", rank: 80, color: "#1971c2", banned: false },
  { id: 4, name: "Куратор Москва", rank: 40, color: "#37b24d", banned: false },
  { id: 5, name: "Пользователь #01", rank: 10, color: "#495057", banned: false },
];

const BASE_EMOJIS = [
  { emoji: "😀", name: "grinning", category: "people & body" },
  { emoji: "😁", name: "beaming", category: "people & body" },
  { emoji: "😂", name: "joy", category: "people & body" },
  { emoji: "🤣", name: "rofl", category: "people & body" },
  { emoji: "😊", name: "blush", category: "people & body" },
  { emoji: "😍", name: "heart eyes", category: "people & body" },
  { emoji: "😘", name: "kiss", category: "people & body" },
  { emoji: "😎", name: "cool", category: "people & body" },
  { emoji: "🤔", name: "thinking", category: "people & body" },
  { emoji: "😴", name: "sleeping", category: "people & body" },
  { emoji: "😭", name: "cry", category: "people & body" },
  { emoji: "😡", name: "angry", category: "people & body" },
  { emoji: "👍", name: "thumbs up", category: "people & body" },
  { emoji: "👎", name: "thumbs down", category: "people & body" },
  { emoji: "👏", name: "clap", category: "people & body" },
  { emoji: "🙏", name: "pray", category: "people & body" },
  { emoji: "🔥", name: "fire", category: "objects" },
  { emoji: "💡", name: "idea", category: "objects" },
  { emoji: "💻", name: "laptop", category: "objects" },
  { emoji: "📌", name: "pin", category: "objects" },
  { emoji: "📎", name: "paperclip", category: "objects" },
  { emoji: "📞", name: "phone", category: "objects" },
  { emoji: "🎉", name: "party", category: "activities" },
  { emoji: "🏆", name: "trophy", category: "activities" },
  { emoji: "⚽", name: "football", category: "activities" },
  { emoji: "🎮", name: "gamepad", category: "activities" },
  { emoji: "🐶", name: "dog", category: "animals & nature" },
  { emoji: "🐱", name: "cat", category: "animals & nature" },
  { emoji: "🐼", name: "panda", category: "animals & nature" },
  { emoji: "🌲", name: "tree", category: "animals & nature" },
  { emoji: "🌞", name: "sun", category: "animals & nature" },
  { emoji: "🍎", name: "apple", category: "food & drink" },
  { emoji: "🍔", name: "burger", category: "food & drink" },
  { emoji: "🍕", name: "pizza", category: "food & drink" },
  { emoji: "☕", name: "coffee", category: "food & drink" },
  { emoji: "🚀", name: "rocket", category: "travel & places" },
  { emoji: "✈️", name: "airplane", category: "travel & places" },
  { emoji: "🚗", name: "car", category: "travel & places" },
  { emoji: "❤️", name: "heart", category: "symbols" },
  { emoji: "💯", name: "hundred", category: "symbols" },
  { emoji: "✅", name: "check", category: "symbols" },
  { emoji: "❗", name: "exclamation", category: "symbols" },
];

const RECENT_EMOJI_KEY = "connect_recent_emojis";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getAvatarInitials(title) {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getAvatarColor(title) {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 42%)`;
}

function getNowTime() {
  return "только что";
}

function getRecentEmojis() {
  try {
    const raw = localStorage.getItem(RECENT_EMOJI_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => BASE_EMOJIS.find((item) => item.emoji === value))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function addRecentEmoji(emojiValue) {
  const prev = getRecentEmojis().map((item) => item.emoji).filter(Boolean);
  const next = [emojiValue, ...prev.filter((item) => item !== emojiValue)].slice(0, 24);
  localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(next));
}

function renderEmojiGrid() {
  const data = BASE_EMOJIS;
  emojiGrid.innerHTML = "";

  data.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emoji-btn";
    btn.title = item.name;
    btn.textContent = item.emoji;
    btn.dataset.emoji = item.emoji;
    emojiGrid.appendChild(btn);
  });
}

function renderRecentEmojiRow() {
  const recent = getRecentEmojis();
  emojiRecentRow.innerHTML = "";
  if (recent.length === 0) {
    emojiRecentRow.innerHTML = '<div class="placeholder"><p>Пока нет.</p></div>';
    return;
  }

  recent.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emoji-btn";
    btn.title = item.name;
    btn.textContent = item.emoji;
    btn.dataset.emoji = item.emoji;
    emojiRecentRow.appendChild(btn);
  });
}

function setEmojiPanelOpen(value) {
  isEmojiPanelOpen = value;
  emojiPanel.classList.toggle("hidden", !value);
  if (value) {
    renderRecentEmojiRow();
    renderEmojiGrid();
  }
}

function setRolesModalOpen(value) {
  isRolesModalOpen = value;
  rolesModalBackdrop.classList.toggle("hidden", !value);
  if (value) {
    setSettingsTab(activeSettingsTab);
  }
  syncModalLock();
}

function setSettingsTab(tabName) {
  activeSettingsTab = tabName === "users" ? "users" : "roles";
  const isRoles = activeSettingsTab === "roles";
  settingsRolesTabBtn.classList.toggle("active", isRoles);
  settingsUsersTabBtn.classList.toggle("active", !isRoles);
  settingsRolesPanel.classList.toggle("active", isRoles);
  settingsUsersPanel.classList.toggle("active", !isRoles);
}

function setRoleEditorOpen(value) {
  isRoleEditorOpen = value;
  roleEditorBackdrop.classList.toggle("hidden", !value);
  if (!value) {
    setRoleColorMenuOpen(false);
  }
  syncModalLock();
}

function setInviteCodeModalOpen(value) {
  isInviteCodeModalOpen = value;
  inviteCodeBackdrop.classList.toggle("hidden", !value);
  syncModalLock();
}

function setUserBanModalOpen(value) {
  isUserBanModalOpen = value;
  userBanBackdrop.classList.toggle("hidden", !value);
  if (!value) {
    pendingDeleteUserId = null;
  }
  syncModalLock();
}

function setUserEditModalOpen(value) {
  isUserEditModalOpen = value;
  userEditBackdrop.classList.toggle("hidden", !value);
  if (!value) {
    editingUserId = null;
  }
  syncModalLock();
}

function syncModalLock() {
  document.body.classList.toggle(
    "modal-open",
    isRolesModalOpen
      || isRoleEditorOpen
      || isInviteCodeModalOpen
      || isUserBanModalOpen
      || isUserEditModalOpen
  );
}

function generateInviteCode8() {
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

function renderInviteDigits(code) {
  inviteCodeDigits.innerHTML = code
    .split("")
    .map((digit) => `<span class="invite-digit">${digit}</span>`)
    .join("");
}

function issueInviteCode() {
  activeInviteCode = generateInviteCode8();
  renderInviteDigits(activeInviteCode);
}

function openInviteModalForRole(roleId) {
  const role = roleDrafts.find((item) => item.id === roleId);
  if (!role) return;
  inviteRoleLabel.textContent = `Роль: ${role.name}`;
  issueInviteCode();
  setInviteCodeModalOpen(true);
}

function openInviteModalForUser(userId) {
  const user = userDrafts.find((item) => item.id === userId);
  if (!user) return;
  inviteRoleLabel.textContent = `Пользователь: ${user.name}`;
  issueInviteCode();
  setInviteCodeModalOpen(true);
}

function openDeleteUserConfirm(userId) {
  const user = userDrafts.find((item) => item.id === userId);
  if (!user) return;
  pendingDeleteUserId = userId;
  userBanWarnText.textContent = `Вы действительно хотите удалить пользователя "${user.name}"? Это удалит всю историю пользователя, все медиафайлы и упоминания.`;
  setUserBanModalOpen(true);
}

function openUserEditModal(userId) {
  const user = userDrafts.find((item) => item.id === userId);
  if (!user) return;
  editingUserId = userId;
  userEditNameInput.value = user.name;
  setUserEditModalOpen(true);
}

function getEnabledLimitsCount(role) {
  return Object.values(role.limits).filter((item) => item.enabled).length;
}

function getRoleScopeText(role) {
  if (role.scope === "global") {
    return "Глобальный";
  }
  return `Фильтр: ${escapeHtml(role.filter || "не указан")}`;
}

function getRoleSummary(role) {
  const capabilities = role.permissions?.canViewSettings
    ? "Видит настройки"
    : "Не видит настройки";
  const limitsCount = getEnabledLimitsCount(role);
  return `${capabilities}. Ограничений: ${limitsCount}.`;
}

function renderRolesList() {
  rolesCountBadge.textContent = `${roleDrafts.length} ролей`;
  if (roleDrafts.length === 0) {
    rolesList.innerHTML = '<div class="roles-list-empty">Роли пока не созданы.</div>';
    return;
  }

  const sorted = [...roleDrafts].sort((a, b) => b.rank - a.rank);
  rolesList.innerHTML = sorted
    .map((role) => {
      return `
        <article class="role-card">
          <header>
            <div class="role-name-wrap">
              <span class="role-dot" style="background:${escapeHtml(role.color)};"></span>
              <strong>${escapeHtml(role.name)}</strong>
            </div>
            <div class="role-head-actions">
              <div class="role-btn-row">
                <button
                  class="role-rank-btn"
                  type="button"
                  style="background:${escapeHtml(role.color)};"
                  aria-label="Ранг роли ${role.rank}"
                  title="Ранг ${role.rank}"
                >
                  ${role.rank}
                </button>
                <button
                  class="role-edit-btn"
                  type="button"
                  data-role-id="${role.id}"
                  aria-label="Редактировать роль ${escapeHtml(role.name)}"
                  title="Редактировать роль"
                >
                  <img class="icon-img" src="./icons/tabler/pencil.svg" alt="" aria-hidden="true" />
                </button>
                <button
                  class="role-invite-btn"
                  type="button"
                  data-role-invite-id="${role.id}"
                  aria-label="Сгенерировать приглашение для роли ${escapeHtml(role.name)}"
                  title="Сгенерировать приглашение"
                >
                  <img class="icon-img" src="./icons/tabler/key.svg" alt="" aria-hidden="true" />
                </button>
              </div>
            </div>
          </header>
          <p>${getRoleScopeText(role)}</p>
          <p class="role-summary">${getRoleSummary(role)}</p>
        </article>
      `;
    })
    .join("");
}

function renderUsersList() {
  const term = (usersSearchInput?.value || "").trim().toLowerCase();
  const filteredUsers = term
    ? userDrafts.filter((item) => item.name.toLowerCase().includes(term))
    : userDrafts;

  usersCountBadge.textContent = `${filteredUsers.length} пользователей`;
  if (filteredUsers.length === 0) {
    usersList.innerHTML = '<div class="roles-list-empty">Пользователи не найдены.</div>';
    return;
  }

  const sorted = [...filteredUsers].sort((a, b) => b.rank - a.rank);
  usersList.innerHTML = sorted
    .map((user) => {
      return `
        <article class="role-card${user.banned ? " is-banned" : ""}">
          <header>
            <div class="role-name-wrap">
              <span class="role-dot" style="background:${escapeHtml(user.color)};"></span>
              <strong>${escapeHtml(user.name)}</strong>
            </div>
            <div class="role-head-actions">
              <div class="role-btn-row user-btn-row">
                <button
                  class="role-rank-btn"
                  type="button"
                  style="background:${escapeHtml(user.color)};"
                  aria-label="Ранг пользователя ${user.rank}"
                  title="Ранг ${user.rank}"
                >
                  ${user.rank}
                </button>
                <button
                  class="role-ban-btn"
                  type="button"
                  data-user-ban-id="${user.id}"
                  aria-label="Забанить пользователя ${escapeHtml(user.name)}"
                  title="Бан"
                >
                  <img class="icon-img" src="./icons/tabler/ban.svg" alt="" aria-hidden="true" />
                </button>
                <button
                  class="role-edit-btn"
                  type="button"
                  data-user-edit-id="${user.id}"
                  aria-label="Редактировать пользователя ${escapeHtml(user.name)}"
                  title="Редактировать"
                >
                  <img class="icon-img" src="./icons/tabler/pencil.svg" alt="" aria-hidden="true" />
                </button>
                <button
                  class="role-invite-btn"
                  type="button"
                  data-user-invite-id="${user.id}"
                  aria-label="Сгенерировать пригласительный код пользователя ${escapeHtml(user.name)}"
                  title="Пригласительный код"
                >
                  <img class="icon-img" src="./icons/tabler/key.svg" alt="" aria-hidden="true" />
                </button>
              </div>
            </div>
          </header>
          <p>${user.banned ? "Пользователь забанен" : "Пользователь активен"}</p>
          <p class="role-summary">Ранг и доступы как у роли выше.</p>
        </article>
      `;
    })
    .join("");
}

function setLimitInputState(checkbox, input) {
  input.disabled = !checkbox.checked;
}

function setRoleColorMenuOpen(value) {
  isRoleColorMenuOpen = value;
  roleColorMenu.classList.toggle("hidden", !value);
  roleColorToggleBtn.setAttribute("aria-expanded", value ? "true" : "false");
}

function renderRoleColorGrid() {
  roleColorGrid.innerHTML = ROLE_COLOR_POOL.map((color) => {
    const active = color.toLowerCase() === selectedRoleColor.toLowerCase();
    return `
      <button
        class="role-color-option${active ? " active" : ""}"
        type="button"
        data-role-color="${color}"
        style="background:${color};"
        title="${color.toUpperCase()}"
        aria-label="Выбрать цвет ${color.toUpperCase()}"
      >${active ? "✓" : ""}</button>
    `;
  }).join("");
}

function setSelectedRoleColor(color) {
  selectedRoleColor = (color || "#2fb344").toLowerCase();
  roleColorToggleSwatch.style.background = selectedRoleColor;
  roleColorToggleText.textContent = selectedRoleColor.toUpperCase();
  renderRoleColorGrid();
}

function syncRoleEditorLimitStates() {
  setLimitInputState(limitMessagesEnabled, limitMessagesValue);
  setLimitInputState(limitRequestsEnabled, limitRequestsValue);
  setLimitInputState(limitCharsEnabled, limitCharsValue);
  setLimitInputState(limitLinesEnabled, limitLinesValue);
  setLimitInputState(limitFileSizeEnabled, limitFileSizeValue);
  setLimitInputState(limitFilesPerMessageEnabled, limitFilesPerMessageValue);
  setLimitInputState(limitFormatsEnabled, limitFormatsValue);
}

function syncRoleEditorFilterState() {
  const isFilter = roleEditorScopeInput.value === "filter";
  roleEditorFilterInput.disabled = !isFilter;
}

function readRoleFormData() {
  return {
    name: roleEditorNameInput.value.trim(),
    color: selectedRoleColor || "#2fb344",
    rank: Number(roleEditorRankInput.value) || 1,
    scope: roleEditorScopeInput.value === "filter" ? "filter" : "global",
    filter: roleEditorFilterInput.value.trim(),
    permissions: {
      canViewSettings: permCanViewSettings.checked,
      canAddRoles: permCanAddRoles.checked,
      canEditRoles: permCanEditRoles.checked,
      canInviteGroups: permCanInviteGroups.checked,
      canInviteUsers: permCanInviteUsers.checked,
    },
    limits: {
      messagesPerMinute: {
        enabled: limitMessagesEnabled.checked,
        value: Number(limitMessagesValue.value) || 15,
      },
      requestsPerMinute: {
        enabled: limitRequestsEnabled.checked,
        value: Number(limitRequestsValue.value) || 15,
      },
      charsPerMessage: {
        enabled: limitCharsEnabled.checked,
        value: Number(limitCharsValue.value) || 1024,
      },
      linesPerMessage: {
        enabled: limitLinesEnabled.checked,
        value: Number(limitLinesValue.value) || 32,
      },
      fileSizeMb: {
        enabled: limitFileSizeEnabled.checked,
        value: Number(limitFileSizeValue.value) || 3,
      },
      filesPerMessage: {
        enabled: limitFilesPerMessageEnabled.checked,
        value: Number(limitFilesPerMessageValue.value) || 9,
      },
      fileFormats: {
        enabled: limitFormatsEnabled.checked,
        value: limitFormatsValue.value.trim() || "pdf, png, jpg, jpeg, xls, xlsx, doc, docx",
      },
    },
    abilities: {
      call: abilityCallEnabled.checked,
      videoCall: abilityVideoCallEnabled.checked,
      remoteDesktop: abilityRemoteDesktopEnabled.checked,
    },
  };
}

function fillRoleForm(role) {
  roleEditorNameInput.value = role.name;
  setSelectedRoleColor(role.color);
  roleEditorRankInput.value = String(role.rank);
  roleEditorScopeInput.value = role.scope === "filter" ? "filter" : "global";
  roleEditorFilterInput.value = role.filter || "";
  permCanViewSettings.checked = !!role.permissions?.canViewSettings;
  permCanAddRoles.checked = !!role.permissions?.canAddRoles;
  permCanEditRoles.checked = !!role.permissions?.canEditRoles;
  permCanInviteGroups.checked = !!role.permissions?.canInviteGroups;
  permCanInviteUsers.checked = !!role.permissions?.canInviteUsers;

  limitMessagesEnabled.checked = role.limits.messagesPerMinute.enabled;
  limitMessagesValue.value = String(role.limits.messagesPerMinute.value);
  limitRequestsEnabled.checked = role.limits.requestsPerMinute.enabled;
  limitRequestsValue.value = String(role.limits.requestsPerMinute.value);
  limitCharsEnabled.checked = role.limits.charsPerMessage.enabled;
  limitCharsValue.value = String(role.limits.charsPerMessage.value);
  limitLinesEnabled.checked = role.limits.linesPerMessage.enabled;
  limitLinesValue.value = String(role.limits.linesPerMessage.value);
  limitFileSizeEnabled.checked = role.limits.fileSizeMb.enabled;
  limitFileSizeValue.value = String(role.limits.fileSizeMb.value);
  limitFilesPerMessageEnabled.checked = role.limits.filesPerMessage.enabled;
  limitFilesPerMessageValue.value = String(role.limits.filesPerMessage.value);
  limitFormatsEnabled.checked = role.limits.fileFormats.enabled;
  limitFormatsValue.value = role.limits.fileFormats.value;
  abilityCallEnabled.checked = !!role.abilities?.call;
  abilityVideoCallEnabled.checked = !!role.abilities?.videoCall;
  abilityRemoteDesktopEnabled.checked = !!role.abilities?.remoteDesktop;

  syncRoleEditorFilterState();
  syncRoleEditorLimitStates();
}

function resetRoleForm() {
  fillRoleForm({
    id: 0,
    name: "",
    color: "#2fb344",
    rank: 40,
    scope: "global",
    filter: "",
    permissions: {
      canViewSettings: false,
      canAddRoles: false,
      canEditRoles: false,
      canInviteGroups: false,
      canInviteUsers: false,
    },
    limits: {
      messagesPerMinute: { enabled: false, value: 15 },
      requestsPerMinute: { enabled: false, value: 15 },
      charsPerMessage: { enabled: false, value: 1024 },
      linesPerMessage: { enabled: false, value: 32 },
      fileSizeMb: { enabled: false, value: 3 },
      filesPerMessage: { enabled: false, value: 9 },
      fileFormats: {
        enabled: false,
        value: "pdf, png, jpg, jpeg, xls, xlsx, doc, docx",
      },
    },
    abilities: {
      call: false,
      videoCall: false,
      remoteDesktop: false,
    },
  });
}

function openRoleEditorForCreate() {
  editingRoleId = null;
  roleEditorTitle.textContent = "Добавить роль";
  resetRoleForm();
  setRoleEditorOpen(true);
}

function openRoleEditorForEdit(roleId) {
  const role = roleDrafts.find((item) => item.id === roleId);
  if (!role) return;
  editingRoleId = roleId;
  roleEditorTitle.textContent = "Редактировать роль";
  fillRoleForm(role);
  setRoleEditorOpen(true);
}

function insertTextAtCursor(text) {
  const start = messageInput.selectionStart ?? messageInput.value.length;
  const end = messageInput.selectionEnd ?? messageInput.value.length;
  const before = messageInput.value.slice(0, start);
  const after = messageInput.value.slice(end);
  messageInput.value = `${before}${text}${after}`;
  const nextPos = start + text.length;
  messageInput.setSelectionRange(nextPos, nextPos);
  messageInput.focus();
}

function getActiveChat() {
  return chats.find((chat) => chat.id === activeChatId);
}

function getMessageById(chat, messageId) {
  return chat.messages.find((message) => message.id === messageId);
}

function setActiveTab(tabName) {
  activeTab = tabName;
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
}

function getNotifications() {
  const list = [];
  chats.forEach((chat) => {
    if (Number(chat.unread) <= 0) return;
    const targetMessage = [...chat.messages].reverse().find((message) => !message.outgoing)
      || chat.messages[chat.messages.length - 1];
    if (!targetMessage) return;

    list.push({
      chatId: chat.id,
      chatType: chat.type,
      chatTitle: chat.title,
      messageId: targetMessage.id,
      author: targetMessage.author,
      text: targetMessage.text,
      time: targetMessage.time || "только что",
    });
  });
  return list;
}

function updateNotifyIndicator() {
  const hasNotifications = getNotifications().length > 0;
  serviceNotifyBtn.classList.toggle("has-alert", hasNotifications);
}

function positionPanelLeftOfButton(panel, button, gap = 8) {
  const parent = panel.offsetParent;
  if (!parent) return;

  const parentRect = parent.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const panelWidth = panel.offsetWidth || 0;
  const left = Math.max(8, buttonRect.left - parentRect.left - panelWidth - gap);
  const top = Math.max(8, buttonRect.top - parentRect.top);

  panel.style.left = `${left}px`;
  panel.style.right = "auto";
  panel.style.top = `${top}px`;
  panel.style.transform = "none";
}

function jumpToMessage(messageId) {
  messageSearch.value = "";
  renderMessages();

  const target = messagesContainer.querySelector(`[data-message-id="${messageId}"]`);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.remove("message-jump-highlight");
  void target.offsetWidth;
  target.classList.add("message-jump-highlight");
  setTimeout(() => {
    target.classList.remove("message-jump-highlight");
  }, 1800);
}

function renderNotifications() {
  const notifications = getNotifications();
  if (notifications.length === 0) {
    notifyList.innerHTML = '<div class="notify-item"><p>Новых уведомлений нет.</p></div>';
    return;
  }

  notifyList.innerHTML = "";
  notifications.forEach((item) => {
    const safeAuthor = escapeHtml(item.author);
    const safeText = escapeHtml(item.text);
    const safeTime = escapeHtml(item.time);
    const safeChatId = escapeHtml(item.chatId);
    const safeChatType = escapeHtml(item.chatType);
    const safeMessageId = escapeHtml(item.messageId);
    const safeChatTitle = escapeHtml(item.chatTitle);
    const block = document.createElement("article");
    block.className = "notify-item";
    block.innerHTML = `
      <div class="notify-item-head">
        <div class="notify-item-meta">
          <strong>${safeAuthor}</strong>
          <span>${safeTime}</span>
        </div>
        <button class="notify-jump-btn" type="button" data-chat-id="${safeChatId}" data-chat-type="${safeChatType}" data-message-id="${safeMessageId}" aria-label="Перейти к сообщению" title="Перейти к сообщению">
          <img class="icon-img" src="./icons/tabler/arrow-right.svg" alt="" aria-hidden="true" />
        </button>
      </div>
      <p>${safeChatTitle}: ${safeText}</p>
    `;
    notifyList.appendChild(block);
  });
}

function getCurrentChats() {
  const byTab = chats.filter((chat) => chat.type === activeTab);
  const term = entitySearch.value.trim().toLowerCase();
  if (!term) return byTab;
  return byTab.filter((chat) => chat.title.toLowerCase().includes(term));
}

function renderEntityList() {
  const list = getCurrentChats();
  entityList.innerHTML = "";

  list.forEach((chat) => {
    const safeTitle = escapeHtml(chat.title);
    const safeStatus = escapeHtml(chat.status);
    const avatarText = escapeHtml(getAvatarInitials(chat.title));
    const avatarColor = getAvatarColor(chat.title);
    const unreadCount = Number.isFinite(chat.unread) ? Math.max(0, chat.unread) : 0;
    const unreadMarkup =
      unreadCount > 0
        ? `<span class="entity-unread">${unreadCount > 99 ? "99+" : unreadCount}</span>`
        : "";

    const item = document.createElement("li");
    item.className = "entity-item";
    if (chat.id === activeChatId) item.classList.add("active");
    item.dataset.id = chat.id;
    item.innerHTML = `
      <div class="entity-main">
        <div class="entity-avatar" style="--avatar-bg: ${avatarColor};">${avatarText}</div>
        <div class="entity-text">
          <div class="entity-title">${safeTitle}</div>
          <div class="entity-sub">${safeStatus}</div>
        </div>
        ${unreadMarkup}
      </div>
    `;
    entityList.appendChild(item);
  });

  if (list.length === 0) {
    entityList.innerHTML = '<li class="entity-item">Ничего не найдено</li>';
  }
}

function renderMessages() {
  const activeChat = getActiveChat();

  if (!activeChat) {
    chatTitle.textContent = "Добро пожаловать в Мессенджер Коннект";
    chatPlaceholder.classList.remove("hidden");
    messagesContainer.classList.add("hidden");
    messagesContainer.innerHTML = "";
    isPinnedPanelOpen = false;
    pinnedPanel.classList.add("hidden");
    chatPinnedBtn.disabled = true;
    return;
  }

  chatTitle.textContent = activeChat.title;
  chatPlaceholder.classList.add("hidden");
  messagesContainer.classList.remove("hidden");
  chatPinnedBtn.disabled = false;

  const term = messageSearch.value.trim().toLowerCase();
  const visibleMessages = term
    ? activeChat.messages.filter((msg) => msg.text.toLowerCase().includes(term))
    : activeChat.messages;

  messagesContainer.innerHTML = "";
  visibleMessages.forEach((msg) => {
    const safeAuthor = escapeHtml(msg.author);
    const safeText = escapeHtml(msg.text);
    const avatarText = escapeHtml(getAvatarInitials(msg.author));
    const avatarColor = getAvatarColor(msg.author);
    const safeTime = escapeHtml(msg.time || getNowTime());

    const block = document.createElement("article");
    block.className = "message";
    block.dataset.messageId = msg.id;
    block.innerHTML = `
      <div class="message-avatar" style="--avatar-bg: ${avatarColor};">
        <span class="message-avatar-initials">${avatarText}</span>
        <span class="message-avatar-status"></span>
      </div>
      <div class="message-body">
        <div class="message-meta">
          <span class="message-author">${safeAuthor}</span>
          <span class="message-time">${safeTime}</span>
        </div>
        <div class="message-text">${safeText}</div>
      </div>
    `;
    messagesContainer.appendChild(block);
  });

  if (visibleMessages.length === 0) {
    messagesContainer.innerHTML = '<div class="placeholder"><p>По запросу ничего не найдено.</p></div>';
  }
}

function renderPinnedMessages() {
  const activeChat = getActiveChat();
  if (!activeChat) {
    pinnedList.innerHTML = "";
    return;
  }

  const pinnedMessages = Array.isArray(activeChat.pinned) ? activeChat.pinned : [];
  if (pinnedMessages.length === 0) {
    pinnedList.innerHTML = '<div class="pinned-item"><p>Закрепленных сообщений пока нет.</p></div>';
    return;
  }

  pinnedList.innerHTML = "";
  pinnedMessages.forEach((item) => {
    const sourceMessage = item.messageId ? getMessageById(activeChat, item.messageId) : null;
    const safeAuthor = escapeHtml(sourceMessage?.author || item.author || "Пользователь");
    const safeText = escapeHtml(sourceMessage?.text || item.text || "");
    const safeTime = escapeHtml(sourceMessage?.time || item.time || "только что");
    const safeMessageId = escapeHtml(item.messageId || "");
    const block = document.createElement("article");
    block.className = "pinned-item";
    block.innerHTML = `
      <div class="pinned-item-head">
        <div class="pinned-item-meta">
          <strong>${safeAuthor}</strong>
          <span>${safeTime}</span>
        </div>
        <button class="pinned-jump-btn" type="button" data-message-id="${safeMessageId}" aria-label="Перейти к сообщению" title="Перейти к сообщению">
          <img class="icon-img" src="./icons/tabler/arrow-right.svg" alt="" aria-hidden="true" />
        </button>
      </div>
      <p>${safeText}</p>
    `;
    pinnedList.appendChild(block);
  });
}

function updateGlobalSearchInfo() {
  if (!globalSearchInfo) return;

  const term = messageSearch.value.trim().toLowerCase();
  if (!term) {
    globalSearchInfo.textContent = "0 совпадений";
    return;
  }

  let count = 0;
  chats.forEach((chat) => {
    chat.messages.forEach((msg) => {
      if (msg.text.toLowerCase().includes(term)) count += 1;
    });
  });
  globalSearchInfo.textContent = `${count} совпадений`;
}

function updateTabUnreadIndicators() {
  tabs.forEach((tab) => {
    const tabType = tab.dataset.tab;
    const hasUnread = chats.some(
      (chat) => chat.type === tabType && Number(chat.unread) > 0
    );
    tab.classList.toggle("has-unread", hasUnread);
  });
}

function updateComposerToggleVisibility() {
  const isFocused = document.activeElement === messageInput;
  composerInputWrap.classList.toggle("show-expand-toggle", isFocused);
}

function setComposerExpanded(expanded) {
  isComposerExpanded = expanded;
  composerInputWrap.classList.toggle("expanded", expanded);
  expandComposerBtn.setAttribute(
    "aria-label",
    expanded ? "Свернуть поле ввода" : "Развернуть поле ввода"
  );
  expandComposerBtn.title = expanded ? "Свернуть поле ввода" : "Развернуть поле ввода";
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveTab(tab.dataset.tab);
    activeChatId = null;
    isPinnedPanelOpen = false;
    isNotifyPanelOpen = false;
    pinnedPanel.classList.add("hidden");
    notifyPanel.classList.add("hidden");
    renderEntityList();
    renderMessages();
  });
});

entityList.addEventListener("click", (event) => {
  const item = event.target.closest(".entity-item");
  if (!item || !item.dataset.id) return;
  activeChatId = item.dataset.id;
  isPinnedPanelOpen = false;
  isNotifyPanelOpen = false;
  pinnedPanel.classList.add("hidden");
  notifyPanel.classList.add("hidden");
  renderEntityList();
  renderMessages();
});

entitySearch.addEventListener("input", () => {
  activeChatId = null;
  renderEntityList();
  renderMessages();
});

messageSearch.addEventListener("input", () => {
  updateGlobalSearchInfo();
  renderMessages();
});

messageInput.addEventListener("focus", () => {
  updateComposerToggleVisibility();
});

messageInput.addEventListener("blur", () => {
  setTimeout(() => {
    updateComposerToggleVisibility();
  }, 0);
});

expandComposerBtn.addEventListener("mousedown", (event) => {
  event.preventDefault();
});

expandComposerBtn.addEventListener("click", () => {
  setComposerExpanded(!isComposerExpanded);
  messageInput.focus();
});

emojiToggleBtn.addEventListener("click", () => {
  setEmojiPanelOpen(!isEmojiPanelOpen);
});

function handleEmojiPick(event) {
  const button = event.target.closest(".emoji-btn");
  if (!button) return;
  const emojiValue = button.dataset.emoji;
  if (!emojiValue) return;
  insertTextAtCursor(`${emojiValue} `);
  addRecentEmoji(emojiValue);
  setEmojiPanelOpen(false);
}

emojiRecentRow.addEventListener("click", handleEmojiPick);
emojiGrid.addEventListener("click", handleEmojiPick);

chatPinnedBtn.addEventListener("click", () => {
  if (!activeChatId) return;
  isPinnedPanelOpen = !isPinnedPanelOpen;
  pinnedPanel.classList.toggle("hidden", !isPinnedPanelOpen);
  if (isPinnedPanelOpen) {
    isNotifyPanelOpen = false;
    notifyPanel.classList.add("hidden");
  }
  if (isPinnedPanelOpen) {
    renderPinnedMessages();
    requestAnimationFrame(() => {
      positionPanelLeftOfButton(pinnedPanel, chatPinnedBtn);
    });
  }
});

closePinnedBtn.addEventListener("click", () => {
  isPinnedPanelOpen = false;
  pinnedPanel.classList.add("hidden");
});

serviceNotifyBtn.addEventListener("click", () => {
  isNotifyPanelOpen = !isNotifyPanelOpen;
  notifyPanel.classList.toggle("hidden", !isNotifyPanelOpen);
  if (isNotifyPanelOpen) {
    isPinnedPanelOpen = false;
    pinnedPanel.classList.add("hidden");
    renderNotifications();
    requestAnimationFrame(() => {
      positionPanelLeftOfButton(notifyPanel, serviceNotifyBtn);
    });
  }
});

closeNotifyBtn.addEventListener("click", () => {
  isNotifyPanelOpen = false;
  notifyPanel.classList.add("hidden");
});

notifyList.addEventListener("click", (event) => {
  const button = event.target.closest(".notify-jump-btn");
  if (!button) return;

  const chatId = button.dataset.chatId;
  const chatType = button.dataset.chatType;
  const messageId = button.dataset.messageId;
  if (!chatId || !chatType || !messageId) return;

  setActiveTab(chatType);
  activeChatId = chatId;
  isNotifyPanelOpen = false;
  notifyPanel.classList.add("hidden");
  renderEntityList();
  renderMessages();
  jumpToMessage(messageId);
});

document.addEventListener("click", (event) => {
  if (!isEmojiPanelOpen) return;
  const target = event.target;
  if (
    emojiPanel.contains(target)
    || emojiToggleBtn.contains(target)
  ) {
    return;
  }
  setEmojiPanelOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isEmojiPanelOpen) {
    setEmojiPanelOpen(false);
  }
  if (event.key === "Escape" && isUserBanModalOpen) {
    setUserBanModalOpen(false);
    return;
  }
  if (event.key === "Escape" && isUserEditModalOpen) {
    setUserEditModalOpen(false);
    return;
  }
  if (event.key === "Escape" && isInviteCodeModalOpen) {
    setInviteCodeModalOpen(false);
    return;
  }
  if (event.key === "Escape" && isRoleEditorOpen) {
    setRoleEditorOpen(false);
    return;
  }
  if (event.key === "Escape" && isRolesModalOpen) {
    setRolesModalOpen(false);
  }
});

window.addEventListener("resize", () => {
  if (isPinnedPanelOpen) {
    positionPanelLeftOfButton(pinnedPanel, chatPinnedBtn);
  }
  if (isNotifyPanelOpen) {
    positionPanelLeftOfButton(notifyPanel, serviceNotifyBtn);
  }
});

pinnedList.addEventListener("click", (event) => {
  const button = event.target.closest(".pinned-jump-btn");
  if (!button) return;

  const { messageId } = button.dataset;
  if (!messageId) return;

  isPinnedPanelOpen = false;
  pinnedPanel.classList.add("hidden");
  jumpToMessage(messageId);
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !activeChatId) return;

  const activeChat = getActiveChat();
  activeChat.messages.push({
    id: `${activeChat.id}-m${messageIdCounter}`,
    author: "Вы",
    text,
    outgoing: true,
    time: getNowTime(),
  });
  messageIdCounter += 1;
  messageInput.value = "";
  updateNotifyIndicator();
  updateGlobalSearchInfo();
  renderMessages();
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

serviceSettingsBtn.addEventListener("click", () => {
  setRolesModalOpen(true);
});

profileSettingsBtn.addEventListener("click", () => {
  setRolesModalOpen(true);
});

closeRolesModalBtn.addEventListener("click", () => {
  setRolesModalOpen(false);
});

settingsRolesTabBtn.addEventListener("click", () => {
  setSettingsTab("roles");
});

settingsUsersTabBtn.addEventListener("click", () => {
  setSettingsTab("users");
});

rolesModalBackdrop.addEventListener("click", (event) => {
  if (event.target === rolesModalBackdrop) {
    setRolesModalOpen(false);
  }
});

openAddRoleBtn.addEventListener("click", () => {
  openRoleEditorForCreate();
});

rolesList.addEventListener("click", (event) => {
  const editButton = event.target.closest(".role-edit-btn");
  if (editButton) {
    const roleId = Number(editButton.dataset.roleId);
    if (!Number.isFinite(roleId)) return;
    openRoleEditorForEdit(roleId);
    return;
  }

  const inviteButton = event.target.closest(".role-invite-btn");
  if (inviteButton) {
    const roleId = Number(inviteButton.dataset.roleInviteId);
    if (!Number.isFinite(roleId)) return;
    openInviteModalForRole(roleId);
  }
});

usersList.addEventListener("click", (event) => {
  const inviteButton = event.target.closest(".role-invite-btn");
  if (inviteButton) {
    const userId = Number(inviteButton.dataset.userInviteId);
    if (!Number.isFinite(userId)) return;
    openInviteModalForUser(userId);
    return;
  }

  const banButton = event.target.closest(".role-ban-btn");
  if (banButton) {
    const userId = Number(banButton.dataset.userBanId);
    if (!Number.isFinite(userId)) return;
    openDeleteUserConfirm(userId);
    return;
  }

  const editButton = event.target.closest(".role-edit-btn");
  if (editButton) {
    const userId = Number(editButton.dataset.userEditId);
    if (!Number.isFinite(userId)) return;
    openUserEditModal(userId);
    return;
  }
});

closeRoleEditorBtn.addEventListener("click", () => {
  setRoleEditorOpen(false);
});

cancelRoleEditorBtn.addEventListener("click", () => {
  setRoleEditorOpen(false);
});

roleEditorBackdrop.addEventListener("click", (event) => {
  if (event.target === roleEditorBackdrop) {
    setRoleEditorOpen(false);
  }
});

closeInviteCodeBtn.addEventListener("click", () => {
  setInviteCodeModalOpen(false);
});

inviteCodeBackdrop.addEventListener("click", (event) => {
  if (event.target === inviteCodeBackdrop) {
    setInviteCodeModalOpen(false);
  }
});

closeUserBanBtn.addEventListener("click", () => {
  setUserBanModalOpen(false);
});

cancelUserBanBtn.addEventListener("click", () => {
  setUserBanModalOpen(false);
});

userBanBackdrop.addEventListener("click", (event) => {
  if (event.target === userBanBackdrop) {
    setUserBanModalOpen(false);
  }
});

confirmUserBanBtn.addEventListener("click", () => {
  if (pendingDeleteUserId === null) return;
  const targetIndex = userDrafts.findIndex((item) => item.id === pendingDeleteUserId);
  if (targetIndex >= 0) {
    userDrafts.splice(targetIndex, 1);
    renderUsersList();
  }
  setUserBanModalOpen(false);
});

closeUserEditBtn.addEventListener("click", () => {
  setUserEditModalOpen(false);
});

cancelUserEditBtn.addEventListener("click", () => {
  setUserEditModalOpen(false);
});

userEditBackdrop.addEventListener("click", (event) => {
  if (event.target === userEditBackdrop) {
    setUserEditModalOpen(false);
  }
});

userEditForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (editingUserId === null) return;
  const nextName = userEditNameInput.value.trim();
  if (!nextName) return;
  const user = userDrafts.find((item) => item.id === editingUserId);
  if (!user) return;
  user.name = nextName;
  renderUsersList();
  setUserEditModalOpen(false);
});

usersSearchInput.addEventListener("input", () => {
  renderUsersList();
});

regenerateInviteCodeBtn.addEventListener("click", () => {
  issueInviteCode();
});

copyInviteCodeBtn.addEventListener("click", async () => {
  if (!activeInviteCode) return;
  try {
    await navigator.clipboard.writeText(activeInviteCode);
    copyInviteCodeBtn.textContent = "Скопировано";
    setTimeout(() => {
      copyInviteCodeBtn.innerHTML = '<img class="icon-img" src="./icons/tabler/copy.svg" alt="" aria-hidden="true" />Копировать';
    }, 1200);
  } catch {
    copyInviteCodeBtn.textContent = "Ошибка";
    setTimeout(() => {
      copyInviteCodeBtn.innerHTML = '<img class="icon-img" src="./icons/tabler/copy.svg" alt="" aria-hidden="true" />Копировать';
    }, 1200);
  }
});

roleColorToggleBtn.addEventListener("click", () => {
  setRoleColorMenuOpen(!isRoleColorMenuOpen);
});

roleColorGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".role-color-option");
  if (!button) return;
  const color = button.dataset.roleColor;
  if (!color) return;
  setSelectedRoleColor(color);
  setRoleColorMenuOpen(false);
});

roleEditorScopeInput.addEventListener("change", () => {
  syncRoleEditorFilterState();
});

[
  [limitMessagesEnabled, limitMessagesValue],
  [limitRequestsEnabled, limitRequestsValue],
  [limitCharsEnabled, limitCharsValue],
  [limitLinesEnabled, limitLinesValue],
  [limitFileSizeEnabled, limitFileSizeValue],
  [limitFilesPerMessageEnabled, limitFilesPerMessageValue],
  [limitFormatsEnabled, limitFormatsValue],
].forEach(([checkbox, input]) => {
  checkbox.addEventListener("change", () => {
    setLimitInputState(checkbox, input);
  });
});

roleEditorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = readRoleFormData();
  if (!payload.name) return;

  if (editingRoleId === null) {
    roleDrafts.push({
      id: roleIdCounter,
      ...payload,
    });
    roleIdCounter += 1;
  } else {
    const targetIndex = roleDrafts.findIndex((item) => item.id === editingRoleId);
    if (targetIndex >= 0) {
      roleDrafts[targetIndex] = {
        ...roleDrafts[targetIndex],
        ...payload,
      };
    }
  }

  renderRolesList();
  setRoleEditorOpen(false);
});

document.addEventListener("click", (event) => {
  if (!isRoleColorMenuOpen) return;
  const target = event.target;
  if (
    roleColorToggleBtn.contains(target)
    || roleColorMenu.contains(target)
  ) {
    return;
  }
  setRoleColorMenuOpen(false);
});

renderEntityList();
renderMessages();
updateGlobalSearchInfo();
updateTabUnreadIndicators();
updateNotifyIndicator();
renderRolesList();
renderUsersList();
setSelectedRoleColor("#2fb344");
syncRoleEditorFilterState();
syncRoleEditorLimitStates();