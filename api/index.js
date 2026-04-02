const express = require('express');
const cors = require('cors');
const { put, get } = require('@vercel/blob');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------------
// 【修复】强缓存禁用 + 正确读取流
// --------------------------
async function readBlob(file) {
  try {
    const blob = await get(file, { noCache: true }); // 👈 强制不缓存
    const res = await fetch(blob.url);
    const text = await res.text();
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

// --------------------------
// 【修复】固定文件名写入
// --------------------------
async function writeBlob(file, data) {
  await put(file, JSON.stringify(data, null, 2), {
    addRandomSuffix: false,
    contentType: 'application/json',
    access: 'public'
  });
}

// --------------------------
// 自动初始化（第一次运行）
// --------------------------
async function init() {
  if (await readBlob("config.json")) return;

  await writeBlob("config.json", {
    db_host: "localhost",
    db_user: "root",
    db_pwd: "",
    db_name: "ktv_system",
    lyric_color: "#ffffff",
    lyric_active_color: "#ff3c3c",
    lyric_size: 28,
    volume: 80
  });

  await writeBlob("users.json", [
    { id: 1, username: "user1", password: "123456" },
    { id: 2, username: "user2", password: "123456" }
  ]);

  await writeBlob("song_list.json", []);
}
init().catch(console.error);

// --------------------------
// 接口
// --------------------------

// 管理员登录
app.post("/api/admin_login", (req, res) => {
  const { user, pwd } = req.body;
  if (user === "admin" && pwd === "admin888") {
    return res.json({ code: 0, msg: "登录成功" });
  }
  res.json({ code: 1, msg: "账号或密码错误" });
});

// ✅ 获取配置（永远能读到）
app.get("/api/get_config", async (req, res) => {
  const data = await readBlob("config.json");
  res.json({ code: 0, data: data || {} });
});

// ✅ 保存配置（永久生效）
app.post("/api/save_config", async (req, res) => {
  await writeBlob("config.json", req.body);
  res.json({ code: 0, msg: "保存成功" });
});

// ✅ 用户登录（100%能读到）
app.post("/api/login", async (req, res) => {
  const { user, pwd } = req.body;
  const users = await readBlob("users.json") || [];
  const u = users.find(u => u.username === user && u.password === pwd);
  if (u) {
    return res.json({ code: 0, uid: u.id });
  }
  res.json({ code: 1, msg: "账号或密码错误" });
});

// ✅ 注册
app.post("/api/reg", async (req, res) => {
  const { user, pwd } = req.body;
  const users = await readBlob("users.json") || [];
  if (users.some(x => x.username === user)) {
    return res.json({ code: 1, msg: "用户名已存在" });
  }
  users.push({ id: Date.now(), username: user, password: pwd });
  await writeBlob("users.json", users);
  res.json({ code: 0, msg: "注册成功" });
});

// ✅ 我的歌单
app.get("/api/my_list", async (req, res) => {
  const { uid } = req.query;
  const list = await readBlob("song_list.json") || [];
  res.json({ code: 0, data: list.filter(s => s.user_id == uid).sort((a, b) => a.sort - b.sort) });
});

// ✅ 添加歌曲
app.post("/api/add_song", async (req, res) => {
  const { uid, tid, name, artist, source } = req.body;
  const list = await readBlob("song_list.json") || [];
  const maxSort = list.filter(s => s.user_id == uid).reduce((m, s) => Math.max(m, s.sort || 0), 0);
  list.push({
    id: Date.now(), user_id: +uid, track_id: tid, song_name: name, artist: artist,
    source: source || "netease", sort: maxSort + 1
  });
  await writeBlob("song_list.json", list);
  res.json({ code: 0 });
});

// ✅ 删除歌曲
app.get("/api/del_song", async (req, res) => {
  const { id } = req.query;
  let list = await readBlob("song_list.json") || [];
  list = list.filter(s => s.id != id);
  await writeBlob("song_list.json", list);
  res.json({ code: 0 });
});

// ✅ 排序
app.post("/api/sort", async (req, res) => {
  const { id, type } = req.body;
  let list = await readBlob("song_list.json") || [];
  const song = list.find(s => s.id == id);
  if (!song) return res.json({ code: 1 });
  const userSongs = list.filter(s => s.user_id === song.user_id).sort((a, b) => a.sort - b.sort);
  const idx = userSongs.findIndex(s => s.id == id);
  if (type === "up" && idx > 0) {
    [userSongs[idx].sort, userSongs[idx - 1].sort] = [userSongs[idx - 1].sort, userSongs[idx].sort];
  }
  if (type === "down" && idx < userSongs.length - 1) {
    [userSongs[idx].sort, userSongs[idx + 1].sort] = [userSongs[idx + 1].sort, userSongs[idx].sort];
  }
  await writeBlob("song_list.json", list);
  res.json({ code: 0 });
});

module.exports = app;
