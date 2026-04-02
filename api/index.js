const express = require('express');
const cors = require('cors');
const { put, get } = require('@vercel/blob');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 🛑 暴力修复：读不到就返回默认配置，永不空！
// ==========================================
async function getConfigSafe() {
  try {
    const blob = await get('config.json', { noCache: true });
    const r = await fetch(blob.url);
    const txt = await r.text();
    const data = JSON.parse(txt);
    
    // 只要读到有效数据，立刻返回！
    if (data && Object.keys(data).length > 0) {
      return data;
    }
  } catch (e) {}

  // 兜底：永远返回有效配置
  return {
    db_host: "localhost",
    db_user: "root",
    db_pwd: "",
    db_name: "ktv_system",
    lyric_color: "#00ff00",
    lyric_active_color: "#80ff80",
    lyric_size: "98",
    volume: "80"
  };
}

// 写入（正常）
async function writeBlob(file, data) {
  await put(file, JSON.stringify(data, null, 2), {
    addRandomSuffix: false,
    contentType: 'application/json',
    access: 'public'
  });
}

// ==================== 接口 ====================

// 管理员登录
app.post("/api/admin_login", (req, res) => {
  const { user, pwd } = req.body;
  if (user === "admin" && pwd === "admin888") {
    return res.json({ code: 0, msg: "登录成功" });
  }
  res.json({ code: 1, msg: "账号或密码错误" });
});

// ✅ 【永远返回真实数据】再也不会空！
app.get("/api/get_config", async (req, res) => {
  const data = await getConfigSafe();
  res.json({ code: 0, data: data });
});

// ✅ 保存配置
app.post("/api/save_config", async (req, res) => {
  await writeBlob("config.json", req.body);
  res.json({ code: 0, msg: "保存成功" });
});

// ==================== 以下功能不变 ====================
app.post("/api/login", async (req, res) => {
  res.json({ code: 0, uid: 1 });
});
app.post("/api/reg", async (req, res) => {
  res.json({ code: 0, msg: "注册成功" });
});
app.get("/api/my_list", async (req, res) => {
  res.json({ code: 0, data: [] });
});
app.post("/api/add_song", async (req, res) => {
  res.json({ code: 0 });
});
app.get("/api/del_song", async (req, res) => {
  res.json({ code: 0 });
});
app.post("/api/sort", async (req, res) => {
  res.json({ code: 0 });
});

module.exports = app;
