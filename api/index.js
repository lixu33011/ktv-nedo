const express = require('express');
const cors = require('cors');
const { put } = require('@vercel/blob');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 内存缓存（避免重复创建）
let BLOB_URLS = {
  config: null,
  users: null,
  song_list: null
};

// =========================
// ✅ 官方唯一正确写法：保存
// =========================
async function save(file, data) {
  const res = await put(file, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json'
  });
  return res.url;
}

// =========================
// ✅ 读取（通过公开 URL）
// =========================
async function load(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    return null;
  }
}

// =========================
// 初始化（只跑一次）
// =========================
async function init() {
  if (!BLOB_URLS.config) {
    BLOB_URLS.config = await save("config.json", {
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
  if (!BLOB_URLS.users) {
    BLOB_URLS.users = await save("users.json", [
      { id: 1, username: "user1", password: "123456" }
    ]);
  }
  if (!BLOB_URLS.song_list) {
    BLOB_URLS.song_list = await save("song_list.json", []);
  }
}
init().catch(console.error);

// =========================
// 接口
// =========================

app.post("/api/admin_login", (req, res) => {
  const { user, pwd } = req.body;
  if (user === "admin" && pwd === "admin888") {
    return res.json({ code: 0, msg: "登录成功" });
  }
  res.json({ code: 1, msg: "账号或密码错误" });
});

// ✅ 读取配置（官方方式）
app.get("/api/get_config", async (req, res) => {
  if (!BLOB_URLS.config) return res.json({ code:0, data:{} });
  const data = await load(BLOB_URLS.config);
  res.json({ code:0, data });
});

// ✅ 保存配置（官方方式）
app.post("/api/save_config", async (req, res) => {
  BLOB_URLS.config = await save("config.json", req.body);
  res.json({ code:0, msg:"保存成功" });
});

// 登录
app.post("/api/login", async (req, res) => {
  const { user, pwd } = req.body;
  const list = await load(BLOB_URLS.users);
  const u = list.find(i => i.username === user && i.password === pwd);
  if (u) return res.json({ code:0, uid: u.id });
  res.json({ code:1, msg:"账号或密码错误" });
});

// 其他接口保持最简
app.post("/api/reg", async (req, res) => res.json({ code:0 }));
app.get("/api/my_list", async (req, res) => res.json({ code:0, data:[] }));
app.post("/api/add_song", async (req, res) => res.json({ code:0 }));
app.get("/api/del_song", async (req, res) => res.json({ code:0 }));
app.post("/api/sort", async (req, res) => res.json({ code:0 }));

module.exports = app;
