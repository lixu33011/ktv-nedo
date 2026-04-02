const express = require('express');
const cors = require('cors');
const { put, get } = require('@vercel/blob');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 全局存储：只加载一次，避免多次读Blob
let store = null;

// 【唯一正确读取方法】永远只读一个文件
async function loadStore() {
  if (store) return store;
  try {
    const blob = await get("store.json");
    const res = await fetch(blob.url);
    store = await res.json();
    return store;
  } catch (e) {
    // 初始化数据
    store = {
      config: {
        db_host: "localhost",
        db_user: "root",
        db_pwd: "",
        db_name: "ktv_system",
        lyric_color: "#00ff00",
        lyric_active_color: "#80ff80",
        lyric_size: "98",
        volume: "80"
      },
      users: [
        { id: 1, username: "user1", password: "123456" },
        { id: 2, username: "user2", password: "123456" }
      ],
      song_list: []
    };
    return store;
  }
}

// 【唯一正确保存方法】只保存一个文件
async function saveStore() {
  await put("store.json", JSON.stringify(store, null, 2), {
    access: "public",
    contentType: "application/json"
  });
}

// ===================== 接口 =====================

// 管理员登录
app.post("/api/admin_login", (req, res) => {
  const { user, pwd } = req.body;
  if (user === "admin" && pwd === "admin888") {
    return res.json({ code: 0, msg: "登录成功" });
  }
  res.json({ code: 1, msg: "错误" });
});

// ✅ 获取配置（永远能读到）
app.get("/api/get_config", async (req, res) => {
  const data = await loadStore();
  res.json({ code: 0, data: data.config });
});

// ✅ 保存配置（只改内存 + 存一次）
app.post("/api/save_config", async (req, res) => {
  const data = await loadStore();
  data.config = req.body;
  await saveStore();
  res.json({ code: 0, msg: "保存成功" });
});

// ✅ 用户登录
app.post("/api/login", async (req, res) => {
  const { user, pwd } = req.body;
  const data = await loadStore();
  const u = data.users.find(x => x.username === user && x.password === pwd);
  if (u) return res.json({ code: 0, uid: u.id });
  res.json({ code: 1, msg: "账号或密码错误" });
});

// ✅ 注册
app.post("/api/reg", async (req, res) => {
  const { user, pwd } = req.body;
  const data = await loadStore();
  if (data.users.some(x => x.username === user)) {
    return res.json({ code: 1, msg: "已存在" });
  }
  data.users.push({ id: Date.now(), username: user, password: pwd });
  await saveStore();
  res.json({ code: 0, msg: "注册成功" });
});

// ✅ 我的歌单
app.get("/api/my_list", async (req, res) => {
  const { uid } = req.query;
  const data = await loadStore();
  const my = data.song_list.filter(s => s.user_id == uid).sort((a, b) => a.sort - b.sort);
  res.json({ code: 0, data: my });
});

// ✅ 点歌
app.post("/api/add_song", async (req, res) => {
  const { uid, tid, name, artist } = req.body;
  const data = await loadStore();
  const max = data.song_list.filter(s => s.user_id == uid).reduce((m, s) => Math.max(m, s.sort || 0), 0);
  data.song_list.push({
    id: Date.now(), user_id: +uid, track_id: tid, song_name: name, artist: artist, sort: max + 1
  });
  await saveStore();
  res.json({ code: 0 });
});

// ✅ 删除
app.get("/api/del_song", async (req, res) => {
  const { id } = req.query;
  const data = await loadStore();
  data.song_list = data.song_list.filter(s => s.id != id);
  await saveStore();
  res.json({ code: 0 });
});

// 排序
app.post("/api/sort", async (req, res) => {
  res.json({ code: 0 });
});

module.exports = app;
