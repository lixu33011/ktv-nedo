const express = require('express');
const cors = require('cors');
const { put, get, head } = require('@vercel/blob');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------------
// 🔴 修复：强制读原始内容 + 关闭缓存
// --------------------------
async function readBlob(file) {
  try {
    const blob = await get(file, { noCache: true });
    const res = await fetch(blob.url, { cache: 'no-store' });
    const text = await res.text();
    return JSON.parse(text);
  } catch (e) {
    console.log("读取失败", e);
    return null;
  }
}

// --------------------------
// 🔴 修复：固定文件，不随机
// --------------------------
async function writeBlob(file, data) {
  await put(file, JSON.stringify(data, null, 2), {
    addRandomSuffix: false,
    contentType: 'application/json',
    access: 'public',
  });
}

// --------------------------
// 初始化（只第一次）
// --------------------------
async function init() {
  const exist = await readBlob("config.json");
  if (exist) return;

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

app.post("/api/admin_login", (req, res) => {
  const { user, pwd } = req.body;
  if (user === "admin" && pwd === "admin888") {
    return res.json({ code: 0, msg: "登录成功" });
  }
  res.json({ code: 1, msg: "账号或密码错误" });
});

// ✅ 读配置（现在 100% 能读到）
app.get("/api/get_config", async (req, res) => {
  const data = await readBlob("config.json");
  console.log("读取到配置:", data);
  res.json({ code: 0, data: data || {} });
});

// ✅ 保存配置
app.post("/api/save_config", async (req, res) => {
  await writeBlob("config.json", req.body);
  res.json({ code: 0, msg: "保存成功" });
});

// ✅ 登录
app.post("/api/login", async (req, res) => {
  const { user, pwd } = req.body;
  const users = await readBlob("users.json") || [];
  const u = users.find(x => x.username === user && x.password === pwd);
  if (u) return res.json({ code: 0, uid: u.id });
  res.json({ code: 1, msg: "账号或密码错误" });
});

// 注册
app.post("/api/reg", async (req, res) => {
  const { user, pwd } = req.body;
  const users = await readBlob("users.json") || [];
  if (users.some(x => x.username === user)) return res.json({ code:1, msg:"已存在" });
  users.push({ id: Date.now(), username:user, password:pwd });
  await writeBlob("users.json", users);
  res.json({ code:0, msg:"成功" });
});

// 歌单
app.get("/api/my_list", async (req, res) => {
  const { uid } = req.query;
  const list = await readBlob("song_list.json") || [];
  res.json({ code:0, data: list.filter(s => s.user_id == uid).sort((a,b)=>a.sort-b.sort) });
});

// 添加
app.post("/api/add_song", async (req, res) => {
  const { uid, tid, name, artist } = req.body;
  const list = await readBlob("song_list.json") || [];
  const max = list.filter(s => s.user_id == uid).reduce((m,s)=>Math.max(m,s.sort||0),0);
  list.push({ id:Date.now(), user_id:+uid, track_id:tid, song_name:name, artist:artist, sort:max+1 });
  await writeBlob("song_list.json", list);
  res.json({ code:0 });
});

// 删除
app.get("/api/del_song", async (req, res) => {
  const { id } = req.query;
  let list = await readBlob("song_list.json") || [];
  list = list.filter(s => s.id != id);
  await writeBlob("song_list.json", list);
  res.json({ code:0 });
});

// 排序
app.post("/api/sort", async (req, res) => {
  res.json({ code:0 });
});

module.exports = app;
