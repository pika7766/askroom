import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Plus,
  Reply,
  Bell,
  Paperclip,
  SlidersHorizontal,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

const seedCourses = [
  {
    id: 1,
    name: "數位媒體設計",
    code: "DMD-204",
    teacher: "林老師",
    private: false,
    password: "",
    allowReplies: true,
    allowFiles: true,
  },
  {
    id: 2,
    name: "互動程式設計",
    code: "CS-118",
    teacher: "陳老師",
    private: true,
    password: "2468",
    allowReplies: true,
    allowFiles: false,
  },
  {
    id: 3,
    name: "品牌與視覺溝通",
    code: "VIS-305",
    teacher: "王老師",
    private: false,
    password: "",
    allowReplies: true,
    allowFiles: true,
  },
];

const seedUsers = [
  { id: 1, name: "小安", password: "1234", access: [1, 2] },
  { id: 2, name: "Mina", password: "5678", access: [1] },
];

const seedQuestions = [
  {
    id: 1,
    courseId: 1,
    user: "小安",
    text: "老師，期末專題的提案需要先寄 email 預約嗎？",
    time: "今天 10:42",
    ip: "192.168.1.104",
    reply: "不用預約，請在下週一課堂開始前上傳提案即可。",
    repliedAt: "今天 11:08",
  },
  {
    id: 2,
    courseId: 1,
    user: "Mina",
    text: "請問課堂錄影會放在學習平台的哪個區域？",
    time: "昨天 16:21",
    ip: "172.20.4.21",
    reply: "",
    repliedAt: "",
  },
  {
    id: 3,
    courseId: 2,
    user: "小安",
    text: "作業三的 API 可以使用第三方服務嗎？",
    time: "週一 09:15",
    ip: "10.0.0.18",
    reply: "可以，但請在 README 中註明服務名稱與使用方式。",
    repliedAt: "週一 10:02",
  },
];

const adminAccount = import.meta.env.VITE_ADMIN_ACCOUNT || "admin";
const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || "123456";

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeCourse(course) {
  const { allowChat, ...courseWithoutChat } = course;
  return { allowReplies: true, allowFiles: false, ...courseWithoutChat };
}
function normalizeQuestion(question) {
  const { messages, ...questionWithoutChat } = question;
  return questionWithoutChat;
}

function getDeviceKey() {
  const storedKey = localStorage.getItem("askroom-device-key");
  if (storedKey) return storedKey;
  const deviceKey = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`;
  localStorage.setItem("askroom-device-key", deviceKey);
  return deviceKey;
}
function App() {
  const [view, setView] = useState(
    new URLSearchParams(window.location.search).get("view") === "admin"
      ? "admin"
      : "user",
  );
  const [courses, setCourses] = useState(() =>
    load("askroom-courses", seedCourses).map(normalizeCourse),
  );
  const [users, setUsers] = useState(() =>
    load("askroom-users", seedUsers).map((user) => ({
      ...user,
      access: user.access || [1],
    })),
  );
  const [questions, setQuestions] = useState(() =>
    load("askroom-questions", seedQuestions).map(normalizeQuestion),
  );
  const [admin, setAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({ account: "", password: "" });
  const [userLoginForm, setUserLoginForm] = useState({ account: "", password: "" });
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [openQuestion, setOpenQuestion] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [newCourse, setNewCourse] = useState({
    name: "",
    code: "",
    teacher: "",
    private: false,
    password: "",
  });
  const [newQuestion, setNewQuestion] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [coursePassword, setCoursePassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [accountForm, setAccountForm] = useState({ name: "", password: "" });
  const [passwordForm, setPasswordForm] = useState({ old: "", next: "" });
  const [forgotForm, setForgotForm] = useState({ account: "", next: "" });
  const [notice, setNotice] = useState(null);
  const [courseSettings, setCourseSettings] = useState({
    allowReplies: true,
    allowFiles: false,
  });
  const remoteStateReady = useRef(false);

  useEffect(
    () => localStorage.setItem("askroom-courses", JSON.stringify(courses)),
    [courses],
  );
  useEffect(
    () => localStorage.setItem("askroom-users", JSON.stringify(users)),
    [users],
  );
  useEffect(
    () => localStorage.setItem("askroom-questions", JSON.stringify(questions)),
    [questions],
  );
  useEffect(() => {
    let active = true;
    const pullRemoteState = async () => {
      try {
        const response = await fetch("/api/state");
        if (!response.ok) return;
        const remoteState = await response.json();
        if (!active) return;
        if (remoteState) {
          setCourses(remoteState.courses.map(normalizeCourse));
          setUsers(remoteState.users);
          setQuestions(remoteState.questions.map(normalizeQuestion));
        } else if (!remoteStateReady.current) {
          await fetch("/api/state", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courses, users, questions }),
          });
        }
        remoteStateReady.current = true;
      } catch {
        // Local development can run without the API server.
      }
    };
    pullRemoteState();
    const timer = setInterval(pullRemoteState, 3000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (view !== "user" || currentUser || sessionStorage.getItem("askroom-logged-out") === "true") return;
    const autoUser = users.find((user) => user.autoLoginKey === getDeviceKey());
    if (autoUser) setCurrentUser(autoUser);
  }, [currentUser, users, view]);
  useEffect(() => {
    const sync = (event) => {
      if (event.key === "askroom-courses" && event.newValue) {
        const nextCourses = JSON.parse(event.newValue).map(normalizeCourse);
        setCourses(nextCourses);
        if (selectedCourse) {
          const updatedCourse = nextCourses.find((course) => course.id === selectedCourse.id);
          setSelectedCourse(updatedCourse || null);
        }
      }
      if (event.key === "askroom-users" && event.newValue)
        setUsers(JSON.parse(event.newValue));
      if (event.key === "askroom-questions" && event.newValue) {
        const nextQuestions = JSON.parse(event.newValue).map(normalizeQuestion);
        const changed = nextQuestions.find((next) => {
          const previous = questions.find((question) => question.id === next.id);
          return previous && next.reply !== previous.reply;
        });
        const added = nextQuestions.find(
          (next) => !questions.some((question) => question.id === next.id),
        );
        if (changed || added) {
          const target = changed || added;
          const isOwn = currentUser && target.user === currentUser.name;
          if (view === "user" && isOwn && changed)
            setNotice({
              type: "reply",
              courseId: target.courseId,
              questionId: target.id,
            });
          if (view === "admin" && added)
            setNotice({
              type: "question",
              courseId: target.courseId,
              questionId: target.id,
            });
        }
        setQuestions(nextQuestions);
      }
    };
    window.addEventListener("storage", sync);
    const channel =
      "BroadcastChannel" in window
        ? new BroadcastChannel("askroom-sync")
        : null;
    if (channel) channel.onmessage = sync;
    return () => {
      window.removeEventListener("storage", sync);
      channel?.close();
    };
  }, [currentUser, questions, selectedCourse, view]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 2600);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    if (
      selectedCourse &&
      !courses.some((course) => course.id === selectedCourse.id)
    )
      setSelectedCourse(null);
  }, [courses, selectedCourse]);

  const courseQuestions = useMemo(
    () =>
      questions.filter((question) => question.courseId === selectedCourse?.id),
    [questions, selectedCourse],
  );
  const changeView = (next) => {
    setView(next);
    window.history.replaceState({}, "", `?view=${next}`);
    setAdmin(false);
    setCurrentUser(null);
    setSelectedCourse(null);
  };
  const notify = (message, type) => {
    const errorMessage = /不正確|錯誤|無法|找不到|請完成|尚未|上限|請輸入/.test(message);
    setToast({ message, type: type || (errorMessage ? "error" : "success") });
  };
  const broadcast = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    const nextState = { courses, users, questions };
    if (key === "askroom-courses") nextState.courses = value;
    if (key === "askroom-users") nextState.users = value;
    if (key === "askroom-questions") nextState.questions = value;
    fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextState),
    }).catch(() => {});
    if ("BroadcastChannel" in window)
      new BroadcastChannel("askroom-sync").postMessage({
        key,
        newValue: JSON.stringify(value),
      });
  };
  const openCourseSettings = (course) => {
    setCourseSettings({
      allowReplies: true,
      allowFiles: false,
      ...course,
    });
    setModal("course-settings");
  };
  const saveCourseSettings = (event) => {
    event.preventDefault();
    const nextCourses = courses.map((course) =>
      course.id === selectedCourse.id
        ? { ...course, ...courseSettings }
        : course,
    );
    setCourses(nextCourses);
    setSelectedCourse({ ...selectedCourse, ...courseSettings });
    broadcast("askroom-courses", nextCourses);
    setModal(null);
    notify("課程設定已更新");
  };

  const loginAdmin = (event) => {
    event.preventDefault();
    if (adminForm.account === adminAccount && adminForm.password === adminPassword)
      setAdmin(true);
    else notify("帳號或密碼不正確");
  };
  const loginUserWithPassword = (event) => {
    event.preventDefault();
    const user = users.find((item) => item.name === userLoginForm.account && item.password === userLoginForm.password);
    if (!user) return notify("帳號或密碼不正確");
    sessionStorage.removeItem("askroom-logged-out");
    const updatedUser = { ...user, autoLoginKey: getDeviceKey() };
    const nextUsers = users.map((item) => item.id === user.id ? updatedUser : item);
    setUsers(nextUsers);
    broadcast("askroom-users", nextUsers);
    setCurrentUser(updatedUser);
    setUserLoginForm({ account: "", password: "" });
    notify(`歡迎回來，${user.name}`);
  };
  const resetUserPassword = (event) => {
    event.preventDefault();
    const user = users.find((item) => item.name === forgotForm.account);
    if (!user) return notify("找不到這個使用者帳號");
    if (!forgotForm.next) return notify("請輸入新密碼");
    const updatedUser = { ...user, password: forgotForm.next };
    const nextUsers = users.map((item) => item.id === user.id ? updatedUser : item);
    setUsers(nextUsers);
    broadcast("askroom-users", nextUsers);
    setForgotForm({ account: "", next: "" });
    setModal(null);
    notify("密碼已重設");
  };
  const createCourse = (event) => {
    event.preventDefault();
    if (
      !newCourse.name ||
      !newCourse.code ||
      (newCourse.private && !newCourse.password)
    )
      return notify("請完成課程資料與隱私密碼");
    const nextCourses = [
      ...courses,
      {
        ...newCourse,
        id: Date.now(),
        code: newCourse.code.toUpperCase().trim(),
        allowReplies: true,
        allowFiles: false,
      },
    ];
    setCourses(nextCourses);
    broadcast("askroom-courses", nextCourses);
    setNewCourse({
      name: "",
      code: "",
      teacher: "",
      private: false,
      password: "",
    });
    setModal(null);
    notify("課程已建立");
  };
  const chooseCourse = (course) => {
    if (
      view === "user" &&
      course.private &&
      !currentUser?.access?.includes(course.id)
    ) {
      setSelectedCourse(course);
      setModal("course-password");
      return;
    }
    setSelectedCourse(course);
  };
  const unlockCourse = (event) => {
    event.preventDefault();
    if (coursePassword !== selectedCourse.password)
      return notify("密碼不正確，請再試一次");
    const nextUsers = users.map((user) =>
      user.id === currentUser.id
        ? {
            ...user,
            access: [...new Set([...(user.access || []), selectedCourse.id])],
          }
        : user,
    );
    const updatedUser = nextUsers.find((user) => user.id === currentUser.id);
    setUsers(nextUsers);
    broadcast("askroom-users", nextUsers);
    setCurrentUser(updatedUser);
    setCoursePassword("");
    setModal(null);
    notify("課程已加入");
  };
  const joinCourse = (event) => {
    event.preventDefault();
    const normalizedCode = joinCode.trim().replace(/\s+/g, "").toLowerCase();
    const course = courses.find(
      (item) => item.code.trim().replace(/\s+/g, "").toLowerCase() === normalizedCode,
    );
    if (!course) return notify("找不到這個課程代碼，請檢查後再試一次");
    if (course.private && joinPassword.trim() !== course.password.trim())
      return notify("課程密碼不正確");
    const nextUsers = users.map((user) =>
      user.id === currentUser.id
        ? { ...user, access: [...new Set([...(user.access || []), course.id])] }
        : user,
    );
    const updatedUser = nextUsers.find((user) => user.id === currentUser.id);
    setUsers(nextUsers);
    broadcast("askroom-users", nextUsers);
    setCurrentUser(updatedUser);
    setSelectedCourse(course);
    setJoinCode("");
    setJoinPassword("");
    setModal(null);
    notify(`已加入「${course.name}」`);
  };
  const createUser = (event) => {
    event.preventDefault();
    if (!accountForm.name || !accountForm.password)
      return notify("請輸入暱稱與密碼");
    const user = { id: Date.now(), ...accountForm, access: [], autoLoginKey: getDeviceKey() };
    sessionStorage.removeItem("askroom-logged-out");
    const nextUsers = [...users, user];
    setUsers(nextUsers);
    broadcast("askroom-users", nextUsers);
    setCurrentUser(user);
    setModal(null);
    setAccountForm({ name: "", password: "" });
    notify("帳號建立完成");
  };
  const submitQuestion = (event) => {
    event.preventDefault();
    if (!newQuestion.trim()) return;
    const nextQuestions = [
      {
        id: Date.now(),
        courseId: selectedCourse.id,
        user: currentUser.name,
        text: newQuestion.trim(),
        time: "剛剛",
        ip: "隱藏",
        reply: "",
        repliedAt: "",
        file: selectedCourse.allowFiles ? selectedFile : null,
      },
      ...questions,
    ];
    setQuestions(nextQuestions);
    broadcast("askroom-questions", nextQuestions);
    setNewQuestion("");
    setSelectedFile(null);
    notify("問題已匿名送出");
  };
  const sendReply = (event) => {
    event.preventDefault();
    if (!replyText.trim()) return;
    if (!selectedCourse?.allowReplies) return notify("這堂課目前沒有開放回覆");
    const nextQuestions = questions.map((question) =>
      question.id === openQuestion.id
        ? {
            ...question,
            reply: replyText.trim(),
            repliedAt: "剛剛",
          }
        : question,
    );
    setQuestions(nextQuestions);
    broadcast("askroom-questions", nextQuestions);
    setOpenQuestion({
      ...openQuestion,
      reply: replyText.trim(),
      repliedAt: "剛剛",
    });
    setReplyText("");
    notify("回覆已送出");
  };
  const selectNotice = () => {
    if (!notice) return;
    const course = courses.find((item) => item.id === notice.courseId);
    const question = questions.find((item) => item.id === notice.questionId);
    if (course) setSelectedCourse(course);
    if (question) {
      setOpenQuestion(question);
      setReplyText(question.reply || "");
    }
    setNotice(null);
    setModal(null);
  };
  const deleteCourse = (course) => {
    if (window.confirm(`確定刪除「${course.name}」？`)) {
      const nextCourses = courses.filter((item) => item.id !== course.id);
      const nextQuestions = questions.filter(
        (item) => item.courseId !== course.id,
      );
      setCourses(nextCourses);
      setQuestions(nextQuestions);
      setSelectedCourse(null);
      broadcast("askroom-courses", nextCourses);
      broadcast("askroom-questions", nextQuestions);
      notify("課程已刪除");
    }
  };
  const deleteQuestion = (question) => {
    if (!window.confirm("確定要刪除這則提問嗎？刪除後無法復原。")) return;
    const nextQuestions = questions.filter((item) => item.id !== question.id);
    setQuestions(nextQuestions);
    if (openQuestion?.id === question.id) setOpenQuestion(null);
    broadcast("askroom-questions", nextQuestions);
    notify("提問已刪除");
  };
  const changePassword = (event) => {
    event.preventDefault();
    if (passwordForm.old !== currentUser.password)
      return notify("目前密碼不正確");
    if (!passwordForm.next) return notify("請輸入新密碼");
    const updated = { ...currentUser, password: passwordForm.next };
    const nextUsers = users.map((user) =>
      user.id === currentUser.id ? updated : user,
    );
    setUsers(nextUsers);
    broadcast("askroom-users", nextUsers);
    setCurrentUser(updated);
    setModal(null);
    setPasswordForm({ old: "", next: "" });
    notify("密碼已更新");
  };
  const logoutUser = () => {
    sessionStorage.setItem("askroom-logged-out", "true");
    setCurrentUser(null);
    setSelectedCourse(null);
    setModal(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="?view=user"
          onClick={(event) => {
            event.preventDefault();
            changeView("user");
          }}
        >
          <span className="brand-mark">
            <MessageCircle size={19} />
          </span>
          <span>
            Askroom<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="topbar-right">
          <span className="status-dot" /> 匿名提問平台{" "}
          <button
            className="role-switch"
            onClick={() => changeView(view === "admin" ? "user" : "admin")}
          >
            {view === "admin" ? "切換使用者入口" : "管理員入口"}{" "}
            <ArrowRight size={14} />
          </button>
        </div>
      </header>
      {view === "admin" ? (
        <AdminView
          admin={admin}
          adminForm={adminForm}
          setAdminForm={setAdminForm}
          loginAdmin={loginAdmin}
          courses={courses}
          selectedCourse={selectedCourse}
          setSelectedCourse={setSelectedCourse}
          chooseCourse={chooseCourse}
          deleteCourse={deleteCourse}
          deleteQuestion={deleteQuestion}
          setModal={setModal}
          openCourseSettings={openCourseSettings}
          courseQuestions={courseQuestions}
          openQuestion={openQuestion}
          setOpenQuestion={setOpenQuestion}
          replyText={replyText}
          setReplyText={setReplyText}
          sendReply={sendReply}
          setAdmin={setAdmin}
        />
      ) : (
        <UserView
          currentUser={currentUser}
          users={users}
          courses={courses}
          selectedCourse={selectedCourse}
          chooseCourse={chooseCourse}
          loginUser={loginUserWithPassword}
          userLoginForm={userLoginForm}
          setUserLoginForm={setUserLoginForm}
          setModal={setModal}
          logoutUser={logoutUser}
          setSelectedCourse={setSelectedCourse}
          notify={notify}
          courseQuestions={courseQuestions}
          newQuestion={newQuestion}
          setNewQuestion={setNewQuestion}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          submitQuestion={submitQuestion}
        />
      )}
      {modal === "new-course" && (
        <Modal title="新增課程" close={() => setModal(null)}>
          <form className="form-stack" onSubmit={createCourse}>
            <p className="modal-copy">
              建立後，請把課程代碼提供給學生，學生才能搜尋並加入。
            </p>
            <Field label="課程名稱">
              <input
                value={newCourse.name}
                onChange={(event) =>
                  setNewCourse({ ...newCourse, name: event.target.value })
                }
                placeholder="例如：數位媒體設計"
              />
            </Field>
            <div className="form-grid">
              <Field label="課程代碼">
                <input
                  value={newCourse.code}
                  onChange={(event) =>
                    setNewCourse({ ...newCourse, code: event.target.value })
                  }
                  placeholder="DMD-204"
                />
              </Field>
              <Field label="授課教師">
                <input
                  value={newCourse.teacher}
                  onChange={(event) =>
                    setNewCourse({ ...newCourse, teacher: event.target.value })
                  }
                  placeholder="姓名"
                />
              </Field>
            </div>
            <label className="toggle-row">
              <span>
                <LockKeyhole size={16} /> 設為隱私課程
              </span>
              <input
                type="checkbox"
                checked={newCourse.private}
                onChange={(event) =>
                  setNewCourse({ ...newCourse, private: event.target.checked })
                }
              />
            </label>
            {newCourse.private && (
              <Field label="課程密碼">
                <input
                  type="text"
                  value={newCourse.password}
                  onChange={(event) =>
                    setNewCourse({ ...newCourse, password: event.target.value })
                  }
                  placeholder="設定登入密碼"
                />
              </Field>
            )}
            <button className="primary-btn full" type="submit">
              <Plus size={17} /> 建立課程
            </button>
          </form>
        </Modal>
      )}
      {modal === "course-settings" && (
        <Modal title="課程功能設定" close={() => setModal(null)}>
          <form className="form-stack" onSubmit={saveCourseSettings}>
            <p className="modal-copy">打開後，學生就能在這堂課使用對應功能。</p>
            <CapabilityToggle icon={<Reply size={16} />} label="開放老師回覆" value={courseSettings.allowReplies} onChange={(value) => setCourseSettings({ ...courseSettings, allowReplies: value })} />
            <CapabilityToggle icon={<Paperclip size={16} />} label="開放照片與檔案" value={courseSettings.allowFiles} onChange={(value) => setCourseSettings({ ...courseSettings, allowFiles: value })} />
            <button className="primary-btn full" type="submit">儲存設定 <Check size={16} /></button>
          </form>
        </Modal>
      )}
      {modal === "join-course" && (
        <Modal title="加入新課程" close={() => setModal(null)}>
          <form className="form-stack" onSubmit={joinCourse}>
            <div className="lock-message">
              <div className="lock-icon">
                <BookOpen size={21} />
              </div>
              <p>請向老師索取課程代碼。加入後，課程會出現在你的課程清單。</p>
            </div>
            <Field label="課程代碼">
              <input
                autoFocus
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="例如：DMD-204"
              />
            </Field>
            {courses.some(
              (course) =>
                course.code.toLowerCase() === joinCode.trim().toLowerCase() &&
                course.private,
            ) && (
              <Field label="隱私課程密碼">
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(event) => setJoinPassword(event.target.value)}
                  placeholder="輸入老師提供的密碼"
                />
              </Field>
            )}
            <button className="primary-btn full" type="submit">
              加入課程 <ArrowRight size={16} />
            </button>
          </form>
        </Modal>
      )}
      {modal === "new-reply" && (
        <Modal title="收到老師回覆" close={() => setModal(null)}>
          <div className="reply-notice">
            <div className="reply-notice-icon">
              <Reply size={22} />
            </div>
            <p>你的問題有新回覆了，回到課程裡就能查看完整內容。</p>
          </div>
          <button className="primary-btn full" onClick={() => setModal(null)}>
            知道了 <Check size={16} />
          </button>
        </Modal>
      )}
      {notice && (
        <Modal
          title={notice.type === "question" ? "收到新的提問" : "收到新的回覆"}
          close={() => setNotice(null)}
        >
          <div className="reply-notice">
            <div className="reply-notice-icon">
              <Bell size={22} />
            </div>
            <p>
              {notice.type === "question"
                ? "有一位使用者剛剛送出問題，點擊下方按鈕直接查看。"
                : "老師或同學在你的問題下留下了新訊息，點擊下方按鈕直接查看。"}
            </p>
          </div>
          <button className="primary-btn full" onClick={selectNotice}>
            前往查看 <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {modal === "course-password" && (
        <Modal
          title="這是隱私課程"
          close={() => {
            setModal(null);
            setSelectedCourse(null);
          }}
        >
          <div className="lock-message">
            <div className="lock-icon">
              <LockKeyhole size={23} />
            </div>
            <p>輸入課程密碼後即可進入。解鎖後會記住此裝置的登入資格。</p>
          </div>
          <form className="form-stack" onSubmit={unlockCourse}>
            <Field label="課程密碼">
              <input
                autoFocus
                type="password"
                value={coursePassword}
                onChange={(event) => setCoursePassword(event.target.value)}
                placeholder="輸入密碼"
              />
            </Field>
            <button className="primary-btn full" type="submit">
              確認進入 <ArrowRight size={16} />
            </button>
          </form>
        </Modal>
      )}
      {modal === "account" && (
        <Modal title="建立使用者帳號" close={() => setModal(null)}>
          <form className="form-stack" onSubmit={createUser}>
            <p className="modal-copy">
              帳號只會保存在此裝置，用來查看自己的提問與課程權限。
            </p>
            <Field label="暱稱">
              <input
                autoFocus
                value={accountForm.name}
                onChange={(event) =>
                  setAccountForm({ ...accountForm, name: event.target.value })
                }
                placeholder="例如：小樹"
              />
            </Field>
            <Field label="密碼">
              <input
                type="password"
                value={accountForm.password}
                onChange={(event) =>
                  setAccountForm({
                    ...accountForm,
                    password: event.target.value,
                  })
                }
                placeholder="至少 4 個字元"
              />
            </Field>
            <button className="primary-btn full" type="submit">
              建立並開始提問 <ArrowRight size={16} />
            </button>
          </form>
        </Modal>
      )}
      {modal === "forgot-password" && (
        <Modal title="忘記密碼" close={() => setModal(null)}>
          <form className="form-stack" onSubmit={resetUserPassword}>
            <p className="modal-copy">輸入使用者帳號並設定新密碼即可重新登入。</p>
            <Field label="使用者帳號">
              <input autoFocus value={forgotForm.account} onChange={(event) => setForgotForm({ ...forgotForm, account: event.target.value })} placeholder="輸入帳號" />
            </Field>
            <Field label="新密碼">
              <input type="password" value={forgotForm.next} onChange={(event) => setForgotForm({ ...forgotForm, next: event.target.value })} placeholder="輸入新密碼" />
            </Field>
            <button className="primary-btn full" type="submit">重設密碼 <Check size={16} /></button>
          </form>
        </Modal>
      )}
      {modal === "password" && (
        <Modal title="更改密碼" close={() => setModal(null)}>
          <form className="form-stack" onSubmit={changePassword}>
            <Field label="目前密碼">
              <input
                type="password"
                value={passwordForm.old}
                onChange={(event) =>
                  setPasswordForm({ ...passwordForm, old: event.target.value })
                }
              />
            </Field>
            <Field label="新密碼">
              <input
                type="password"
                value={passwordForm.next}
                onChange={(event) =>
                  setPasswordForm({ ...passwordForm, next: event.target.value })
                }
              />
            </Field>
            <button className="primary-btn full" type="submit">
              更新密碼 <Check size={16} />
            </button>
          </form>
        </Modal>
      )}
      {toast && (
        <div className={`toast ${toast.type === "error" ? "toast-error" : ""}`}>
          {toast.type === "error" ? <XCircle size={16} /> : <Check size={16} />} {toast.message}
        </div>
      )}
    </div>
  );
}

function AdminView({
  admin,
  adminForm,
  setAdminForm,
  loginAdmin,
  courses,
  selectedCourse,
  setSelectedCourse,
  chooseCourse,
  deleteCourse,
  deleteQuestion,
  setModal,
  openCourseSettings,
  courseQuestions,
  openQuestion,
  setOpenQuestion,
  replyText,
  setReplyText,
  sendReply,
  setAdmin,
}) {
  if (!admin)
    return (
      <main className="auth-page">
        <div className="auth-panel">
          <div className="eyebrow">
            <ShieldCheck size={15} /> STAFF ACCESS
          </div>
          <h1>管理員登入</h1>
          <p>管理課程、閱讀問題，並在一個安靜的空間回覆學生。</p>
          <form className="form-stack" onSubmit={loginAdmin}>
            <Field label="管理員帳號">
              <input
                autoFocus
                value={adminForm.account}
                onChange={(event) =>
                  setAdminForm({ ...adminForm, account: event.target.value })
                }
                placeholder="輸入帳號"
              />
            </Field>
            <Field label="密碼">
              <input
                type="password"
                value={adminForm.password}
                onChange={(event) =>
                  setAdminForm({ ...adminForm, password: event.target.value })
                }
                placeholder="輸入密碼"
              />
            </Field>
            <button className="primary-btn full" type="submit">
              登入管理後台 <ArrowRight size={16} />
            </button>
          </form>
          <div className="demo-note">
            管理員帳密請使用 Render 環境變數設定
          </div>
        </div>
      </main>
    );
  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="side-heading">
          <div>
            <span className="eyebrow">WORKSPACE</span>
            <h2>課程管理</h2>
          </div>
          <button
            className="icon-btn"
            title="新增課程"
            onClick={() => setModal("new-course")}
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="side-list">
          {courses.map((course) => (
            <button
              className={`course-nav ${selectedCourse?.id === course.id ? "active" : ""}`}
              key={course.id}
              onClick={() => chooseCourse(course)}
            >
              <span className="course-symbol">
                <BookOpen size={16} />
              </span>
              <span>
                <strong>{course.name}</strong>
                <small>
                  {course.code} {course.private && <LockKeyhole size={11} />}
                </small>
              </span>
              <ChevronDown size={14} className="nav-arrow" />
            </button>
          ))}
        </div>
        <button className="logout-btn" onClick={() => setAdmin(false)}>
          <LogOut size={16} /> 登出後台
        </button>
      </aside>
      <section className="content-panel">
        {selectedCourse ? (
          <>
            <div className="content-header">
              <div>
                <span className="eyebrow">
                  {selectedCourse.code} · {selectedCourse.teacher}
                </span>
                <h1>{selectedCourse.name}</h1>
                <p>{courseQuestions.length} 則提問</p>
              </div>
              <button
                className="settings-btn"
                onClick={() => openCourseSettings(selectedCourse)}
              >
                <SlidersHorizontal size={15} /> 課程設定
              </button>
              <button
                className="danger-btn"
                onClick={() => deleteCourse(selectedCourse)}
              >
                <Trash2 size={15} /> 刪除課程
              </button>
            </div>
            <div className="question-layout">
              <div className="question-list">
                <div className="list-caption">
                  所有提問 <span>{courseQuestions.length}</span>
                </div>
                {courseQuestions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    active={openQuestion?.id === question.id}
                    onClick={() => {
                      setOpenQuestion(question);
                      setReplyText(question.reply || "");
                    }}
                  />
                ))}
              </div>
              <div className="detail-panel">
                {openQuestion ? (
                  <>
                    <div className="detail-top">
                      <span className="eyebrow">QUESTION DETAIL</span>
                      <div className="detail-actions">
                        <button className="danger-btn" onClick={() => deleteQuestion(openQuestion)}>
                          <Trash2 size={14} /> 刪除提問
                        </button>
                        <button className="icon-btn" onClick={() => setOpenQuestion(null)}>
                          <X size={17} />
                        </button>
                      </div>
                    </div>
                    <div className="detail-question">
                      <div className="avatar">
                        {openQuestion.user.slice(0, 1)}
                      </div>
                      <div>
                        <strong>{openQuestion.user}</strong>
                        <small>{openQuestion.time}</small>
                      </div>
                    </div>
                    <p className="detail-text">{openQuestion.text}</p>
                    <div className="ip-row">
                      <Eye size={15} /> 傳送 IP <code>{openQuestion.ip}</code>
                    </div>
                    {selectedCourse.allowReplies && <div className="reply-block">
                      <label>你的回覆</label>
                      {openQuestion.reply && (
                        <div className="existing-reply">
                          <Reply size={14} /> {openQuestion.reply}
                        </div>
                      )}
                      <form onSubmit={sendReply}>
                        <textarea
                          value={replyText}
                          onChange={(event) => setReplyText(event.target.value)}
                          placeholder="寫下給學生的回覆..."
                        />
                        <button className="primary-btn full" type="submit">
                          <Reply size={16} />{" "}
                          {openQuestion.reply ? "更新回覆" : "送出回覆"}
                        </button>
                      </form>
                    </div>}
                  </>
                ) : (
                  <div className="empty-detail">
                    <CircleHelp size={28} />
                    <strong>選擇一則提問</strong>
                    <span>點擊左側問題查看內容與傳送資訊</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="course-empty">
            <div className="empty-icon">
              <BookOpen size={25} />
            </div>
            <span className="eyebrow">COURSE OVERVIEW</span>
            <h1>選擇一個課程</h1>
            <p>從左側選擇課程，開始閱讀與回覆學生的提問。</p>
            <button
              className="primary-btn"
              onClick={() => setModal("new-course")}
            >
              <Plus size={16} /> 新增課程
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function UserView({
  currentUser,
  users,
  courses,
  selectedCourse,
  chooseCourse,
  loginUser,
  userLoginForm,
  setUserLoginForm,
  setModal,
  logoutUser,
  setSelectedCourse,
  courseQuestions,
  newQuestion,
  setNewQuestion,
  selectedFile,
  setSelectedFile,
  submitQuestion,
}) {
  const joinedCourses = currentUser
    ? courses.filter((course) => currentUser.access?.includes(course.id))
    : [];
  const selectQuestionFile = (event) => {
    const file = event.target.files?.[0];
    if (!file || file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setSelectedFile({ name: file.name, type: file.type, data: reader.result });
    reader.readAsDataURL(file);
  };
  if (!currentUser)
    return (
      <main className="user-landing">
        <section className="landing-copy">
          <div className="eyebrow">
            <span className="pulse" /> STUDENT SPACE
          </div>
          <h1>匿名提問教學平台</h1>
          <p>AI輔助製作</p>
          <form className="form-stack login-form" onSubmit={loginUser}>
            <Field label="使用者帳號">
              <input autoFocus value={userLoginForm.account} onChange={(event) => setUserLoginForm({ ...userLoginForm, account: event.target.value })} placeholder="輸入帳號" />
            </Field>
            <Field label="密碼">
              <input type="password" value={userLoginForm.password} onChange={(event) => setUserLoginForm({ ...userLoginForm, password: event.target.value })} placeholder="輸入密碼" />
            </Field>
            <button className="primary-btn full" type="submit">登入使用者空間 <ArrowRight size={16} /></button>
            <div className="login-links"><button type="button" onClick={() => setModal("account")}>建立新帳號</button><button type="button" onClick={() => setModal("forgot-password")}>忘記密碼？</button></div>
          </form>
        </section>
      </main>
    );
  return (
    <main className="student-workspace">
      <aside className="student-side">
        <div className="profile">
          <div className="avatar large">{currentUser.name.slice(0, 1)}</div>
          <div>
            <strong>{currentUser.name}</strong>
            <span>匿名學習者</span>
          </div>
          <button
            className="logout-icon-btn"
            type="button"
            title="登出"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              logoutUser();
            }}
          >
            <LogOut size={16} /> <span>登出</span>
          </button>
        </div>
        <div className="side-heading">
          <div>
            <span className="eyebrow">MY SPACE</span>
            <h2>我的課程</h2>
          </div>
          <button
            className="icon-btn"
            title="加入課程"
            onClick={() => setModal("join-course")}
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="side-list">
          {joinedCourses.map((course) => (
            <button
              className={`course-nav ${selectedCourse?.id === course.id ? "active" : ""}`}
              key={course.id}
              onClick={() => chooseCourse(course)}
            >
              <span className="course-symbol">
                <BookOpen size={16} />
              </span>
              <span>
                <strong>{course.name}</strong>
                <small>
                  {course.code} {course.private && <LockKeyhole size={11} />}
                </small>
              </span>
            </button>
          ))}
        </div>
        {joinedCourses.length === 0 && (
          <div className="course-hint">
            還沒有加入課程
            <br />
            <strong>按右上角 + 加入第一堂課</strong>
          </div>
        )}
        <button className="settings-link" onClick={() => setModal("password")}>
          <KeyRound size={15} /> 更改密碼
        </button>
      </aside>
      <section className="student-content">
        {selectedCourse ? (
          <>
            <div className="content-header student-head">
              <div>
                <span className="eyebrow">
                  {selectedCourse.code} · {selectedCourse.teacher}
                </span>
                <h1>{selectedCourse.name}</h1>
                <p>你的提問只有授課老師能看見。</p>
              </div>
              <span className="privacy-badge">
                <ShieldCheck size={14} /> 匿名模式
              </span>
            </div>
            <div className="ask-composer">
              <div className="composer-mark">
                <MessageCircle size={19} />
              </div>
              <form onSubmit={submitQuestion}>
                <textarea
                  value={newQuestion}
                  onChange={(event) => setNewQuestion(event.target.value)}
                  placeholder="想問老師什麼？放心寫下來..."
                />
                <div className="composer-bottom">
                  <span>
                    <EyeOff size={14} /> 你的名字不會顯示在提問旁
                  </span>
                  {selectedCourse.allowFiles && <label className="file-btn" title="附加照片或檔案"><Paperclip size={16} /><input type="file" onChange={selectQuestionFile} /></label>}
                  {selectedFile && <small className="selected-file">{selectedFile.name}</small>}
                  <button className="primary-btn" type="submit">
                    送出問題 <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            </div>
            <div className="student-questions">
              <div className="list-caption">
                我的提問{" "}
                <span>
                  {
                    courseQuestions.filter(
                      (item) => item.user === currentUser.name,
                    ).length
                  }
                </span>
              </div>
              {courseQuestions
                .filter((item) => item.user === currentUser.name)
                .map((question) => (
                  <QuestionCard key={question.id} question={question} student showReplyStatus={selectedCourse.allowReplies} />
                ))}
            </div>
          </>
        ) : (
          <div className="course-empty">
            <div className="empty-icon">
              <BookOpen size={25} />
            </div>
            <span className="eyebrow">WELCOME BACK</span>
            <h1>{joinedCourses.length ? "選擇一個課程" : "先加入一個課程"}</h1>
            <p>
              {joinedCourses.length
                ? "選擇課程後，就可以匿名向老師提問。"
                : "請使用課程代碼加入，老師才能收到你的問題。"}
            </p>
            {!joinedCourses.length && (
              <button
                className="primary-btn"
                onClick={() => setModal("join-course")}
              >
                <Plus size={16} /> 加入課程
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function CapabilityToggle({ icon, label, value, onChange }) {
  return <label className="toggle-row"><span>{icon} {label}</span><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function QuestionCard({ question, onClick, active, student, showReplyStatus = true }) {
  return (
    <button
      className={`question-card ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <div className="question-meta">
        <span className="avatar">{question.user.slice(0, 1)}</span>
        <span>
          <strong>{student ? "我" : question.user}</strong>
          <small>{question.time}</small>
        </span>
        {showReplyStatus && <span className={`reply-state ${question.reply ? "answered" : ""}`}>
          {question.reply ? <><Check size={12} /> 已回覆</> : "待回覆"}
        </span>}
      </div>
      <p>{question.text}</p>
      {question.reply && (
        <div className="card-reply">
          <Reply size={13} /> {question.reply}
        </div>
      )}
    </button>
  );
}
function Modal({ title, close, children }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={close}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default App;
