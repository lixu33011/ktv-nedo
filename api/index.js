const express = require('express');
const cors = require('cors');
const { put, del, list } = require('@vercel/blob');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 统一保存：先删旧文件，再写入新文件
async function save(name, data) {
  const listRes = await list({ prefix: name + "-" });
  for (const blob of listRes.blobs) {
    try { await del(blob.url); } catch {}
  }
  const res = await put(name + ".json", JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json"
  });
  return res;
}

// 统一读取：找最新的
async function load(name) {
  try {
    const listRes = await list({ prefix: name + "-" });
    if (listRes.blobs.length === 0) throw "no";
    const latest = listRes.blobs.sort((a, b) => b.uploadedAt - a.uploadedAt)[0];
    const r = await fetch(latest.url);
    return await r.json();
  } catch (e) {
    return null;
  }
}

// 初始化
async function init() {
  if (!await load("config")) {
    await save("config", {
      db_host: "localhost",
      db_user: "root",
      db_pwd: "",
      db_name: "ktv_system",
      lyric_color: "#00ff00",
      lyric_active_color: "#80ff80",
      lyric_size: "98",
      volume: "80"
    });
  }
  if (!await load("users")) {
    await save("users", [
      { id: 1, username: "user1", password: "123456" },
      { id: 2, username: "user2", password: "123456" }
    ]);
  }
  if (!await load("song_list")) {
    await save("song_list", []);
  }
}
init().catch(console.error);

// -------------------------- 接口 --------------------------
app.post("/api/admin_login", (req, res) => {
  const { user, pwd } = req.body;
  if (user === "admin" && pwd === "admin888") {
    return res.json({ code: 0, msg: "成功" });
  }
  res.json({ code: 1, msg: "账号或密码错误" });
});

app.get("/api/get_config", async (req, res) => {
  const data = await load("config");
  res.json({ code: 0, data: data || {} });
});

app.post("/api/save_config", async (req, res) => {
  await save("config", req.body);
  res.json({ code: 0, msg: "保存成功" });
});

app.post("/api/login", async (req, res) => {
  const { user, pwd } = req.body;
  const users = await load("users") || [];
  const u = users.find(u => u.username === user && u.password === pwd);
  if (u) return res.json({ code: 0, uid: u.id });
  res.json({ code: 1, msg: "账号或密码错误" });
});

app.post("/api/reg", async (req, res) => {
  const { user, pwd } = req.body;
  const users = await load("users") || [];
  if (users.some(x => x.username === user)) {
    return res.json({ code: 1, msg: "已存在" });
  }
  users.push({ id: Date.now(), username: user, password: pwd });
  await save("users", users);
  res.json({ code: 0, msg: "注册成功" });
});

app.get("/api/my_list", async (req, res) => {
  const { uid } = req.query;
  const list = await load("song_list") || [];
  res.json({ code: 0, data: list.filter(s => s.user_id == uid).sort((a,b)=>a.sort-b.sort) });
});

app.post("/api/add_song", async (req, res) => {
  const { uid, tid, name, artist } = req.body;
  const list = await load("song_list") || [];
  const max = list.filter(s => s.user_id == uid).reduce((m,s)=>Math.max(m,s.sort||0),0);
  list.push({ id: Date.now(), user_id:+uid, track_id:tid, song_name:name, artist:artist, sort:max+1 });
  await save("song_list", list);
  res.json({ code: 0 });
});

app.get("/api/del_song", async (req, res) => {
  const { id } = req.query;
  let list = await load("song_list") || [];
  list = list.filter(s => s.id != id);
  await save("song_list", list);
  res.json({ code: 0 });
});

app.post("/api/sort", async (req, res) => {
  res.json({ code: 0 });
});

module.exports = app;
