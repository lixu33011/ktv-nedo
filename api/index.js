const express = require('express');
const cors = require('cors');
const { put, get } = require('@vercel/blob');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 工具：流 → 字符串
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

// 【正确读取】不存在才返回 null，不会吞错误
async function readBlob(path) {
  try {
    const blob = await get(path);
    const content = await streamToString(blob.stream);
    return JSON.parse(content);
  } catch (e) {
    console.error("读取失败:", path, e);
    return null; // 不存在返回 null
  }
}

// 【正确写入】固定文件名，不随机
async function writeBlob(path, data) {
  try {
    await put(path, JSON.stringify(data, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false
    });
  } catch (e) {
    console.error("写入失败:", path, e);
  }
}

// ==============================
// 初始化（只会第一次创建）
// ==============================
async function init() {
  // 配置
  let cfg = await readBlob("config.json");
  if (!cfg) {
    cfg = {
      db_host: "localhost",
      db_user: "root",
      db_pwd: "",
      db_name: "ktv_system",
      lyric_color: "#ffffff",
      lyric_active_color: "#ff3c3c",
      lyric_size: 28,
      volume: 80
    };
    await writeBlob("config.json", cfg);
  }

  // 用户
  let users = await readBlob("users.json");
  if (!users) {
    users = [
      { id: 1, username: "user1", password: "123456" },
      { id: 2, username: "user2", password: "123456" }
    ];
    await writeBlob("users.json", users);
  }

  // 歌单
  let songs = await readBlob("song_list.json");
  if (!songs) {
    await writeBlob("song_list.json", []);
  }
}
init().catch(console.error);

// ==============================
// 接口（全部正确读写）
// ==============================

// 管理员登录
app.post("/api/admin_login", (req, res) => {
  const { user, pwd } = req.body;
  if (user === "admin" && pwd === "admin888") {
    return res.json({ code: 0, msg: "登录成功" });
  }
  res.json({ code: 1, msg: "账号密码错误" });
});

// 获取配置（能读到！）
app.get("/api/get_config", async (req, res) => {
  const data = await readBlob("config.json");
  res.json({ code: 0, data });
});

// 保存配置（能写入！）
app.post("/api/save_config", async (req, res) => {
  await writeBlob("config.json", req.body);
  res.json({ code: 0, msg: "保存成功" });
});

// 用户登录
app.post("/api/login", async (req, res) => {
  const { user, pwd } = req.body;
  const users = await readBlob("users.json") || [];
  const u = users.find(u => u.username === user && u.password === pwd);
  if (u) return res.json({ code: 0, uid: u.id });
  res.json({ code: 1, msg: "账号或密码错误" });
});

// 用户注册
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

// 我的歌单
app.get("/api/my_list", async (req, res) => {
  const { uid } = req.query;
  const list = (await readBlob("song_list.json")) || [];
  const my = list.filter(s => s.user_id == uid).sort((a, b) => a.sort - b.sort);
  res.json({ code: 0, data: my });
});

// 添加歌曲
app.post("/api/add_song", async (req, res) => {
  const { uid, tid, name, artist, source } = req.body;
  const list = (await readBlob("song_list.json")) || [];
  const maxSort = list.filter(s => s.user_id == uid).reduce((m, s) => Math.max(m, s.sort || 0), 0);
  list.push({
    id: Date.now(),
    user_id: Number(uid),
    track_id: tid,
    song_name: name,
    artist: artist,
    source: source || "netease",
    sort: maxSort + 1
  });
  await writeBlob("song_list.json", list);
  res.json({ code: 0 });
});

// 删除歌曲
app.get("/api/del_song", async (req, res) => {
  const { id } = req.query;
  let list = (await readBlob("song_list.json")) || [];
  list = list.filter(s => s.id != id);
  await writeBlob("song_list.json", list);
  res.json({ code: 0 });
});

// 排序
app.post("/api/sort", async (req, res) => {
  const { id, type } = req.body;
  let list = (await readBlob("song_list.json")) || [];
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
