require("dotenv").config();
const express = require("express");
const multer  = require("multer");
const { Resend } = require("resend");

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────
//  API – Send Email
// ─────────────────────────────────────────────
app.post("/api/send", upload.array("attachments", 10), async (req, res) => {
  try {
    const { recipientName, recipientEmail, subject, body, senderName, fromEmail } = req.body;

    if (!recipientEmail || !subject || !body) {
      return res.status(400).json({ success: false, error: "Missing required fields." });
    }

    const attachments = (req.files || []).map(f => ({
      filename: f.originalname,
      content:  f.buffer,
    }));

    const localPart   = (fromEmail || "noreply").trim().replace(/@.*$/, "");
    const resolvedFrom = localPart + "@aiienscampus.in";

    const { data, error } = await resend.emails.send({
      from: `${senderName || "Mail Sender"} <${resolvedFrom}>`,
      to:   recipientEmail,
      subject,
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7">
          ${recipientName ? `<p>Hi <strong>${recipientName}</strong>,</p>` : ""}
          <div style="white-space:pre-wrap">${body.replace(/\n/g, "<br/>")}</div>
        </div>
      `,
      attachments: attachments.length ? attachments : undefined,
    });

    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, id: data.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Unexpected error." });
  }
});

// ─────────────────────────────────────────────
//  Frontend HTML
// ─────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Mail Sender · aiienscampus.in</title>
  <meta name="description" content="Professional email sender powered by Resend API"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

    :root {
      --bg:       #0a0a0b;
      --panel:    #111113;
      --surface:  #18181b;
      --raised:   #222226;
      --border:   #2a2a2f;
      --border-s: #1e1e22;
      --accent:   #6366f1;
      --a-dim:    rgba(99,102,241,.12);
      --text:     #fafafa;
      --text2:    #a1a1aa;
      --text3:    #51515a;
      --green:    #22c55e;
      --red:      #ef4444;
      --r:        10px;
      --rs:       7px;
    }

    html,body{height:100%}
    body{
      font-family:'Inter',system-ui,sans-serif;
      background:var(--bg);
      color:var(--text);
      min-height:100vh;
      display:flex;
      flex-direction:column;
      -webkit-font-smoothing:antialiased;
    }

    /* ── Topbar ── */
    .topbar{
      height:52px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:0 24px;
      background:var(--panel);
      border-bottom:1px solid var(--border);
      position:sticky;top:0;z-index:20;
      flex-shrink:0;
    }
    .brand{display:flex;align-items:center;gap:9px}
    .brand-icon{
      width:28px;height:28px;
      background:var(--accent);
      border-radius:7px;
      display:grid;place-items:center;
    }
    .brand-name{font-size:.85rem;font-weight:600;letter-spacing:-.2px}

    .status-pill{
      display:flex;align-items:center;gap:6px;
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:100px;
      padding:4px 12px 4px 8px;
      font-size:.7rem;font-weight:500;color:var(--text2);
    }
    .dot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green)}

    /* ── Layout ── */
    .layout{
      flex:1;display:flex;
      max-width:980px;width:100%;
      margin:0 auto;
      padding:28px 20px 48px;
      gap:20px;align-items:flex-start;
    }

    /* ── Sidebar ── */
    .sidebar{
      width:210px;flex-shrink:0;
      display:flex;flex-direction:column;gap:2px;
      position:sticky;top:68px;
    }
    .sb-section{
      font-size:.65rem;font-weight:600;
      text-transform:uppercase;letter-spacing:.9px;
      color:var(--text3);
      padding:0 8px;margin:14px 0 4px;
    }
    .sb-section:first-child{margin-top:0}
    .sb-item{
      display:flex;align-items:center;gap:8px;
      padding:7px 8px;border-radius:var(--rs);
      font-size:.8rem;font-weight:500;
      color:var(--text2);cursor:default;
      transition:background .12s,color .12s;
    }
    .sb-item.active{background:var(--a-dim);color:var(--text)}
    .sb-item svg{opacity:.7;flex-shrink:0}
    .sb-item.active svg{opacity:1}
    .sb-hr{height:1px;background:var(--border-s);margin:6px 0}

    /* ── Compose card ── */
    .card{
      flex:1;min-width:0;
      background:var(--panel);
      border:1px solid var(--border);
      border-radius:12px;
      overflow:hidden;
    }

    .card-head{
      padding:18px 22px 16px;
      border-bottom:1px solid var(--border);
      display:flex;align-items:center;justify-content:space-between;
    }
    .card-title{font-size:.875rem;font-weight:600;letter-spacing:-.2px}
    .card-sub{font-size:.72rem;color:var(--text2);margin-top:2px}

    /* ── Compose rows (Gmail-style) ── */
    .f-row{
      display:flex;align-items:center;
      border-bottom:1px solid var(--border-s);
      padding:0 22px;min-height:48px;
      transition:background .1s;
    }
    .f-row:focus-within{background:rgba(255,255,255,.015)}
    .f-lbl{
      width:90px;flex-shrink:0;
      font-size:.75rem;font-weight:500;color:var(--text3);
    }
    .f-row input{
      flex:1;background:transparent;border:none;outline:none;
      color:var(--text);font-family:'Inter',sans-serif;
      font-size:.85rem;padding:13px 0;
    }
    .f-row input::placeholder{color:var(--text3)}

    /* from row split */
    .from-split{flex:1;display:flex;align-items:center}
    .from-split .name-inp{
      width:150px;flex-shrink:0;
      border-right:1px solid var(--border-s);
      padding-right:14px;margin-right:14px;
    }
    .domain-suffix{
      font-size:.85rem;color:var(--text3);
      white-space:nowrap;user-select:none;
      padding:13px 0 13px 1px;
    }
    .alias-inp{
      width:100px;flex-shrink:0;
    }

    /* Body */
    .body-wrap{
      padding:0 22px;
      border-bottom:1px solid var(--border-s);
    }
    .body-wrap textarea{
      width:100%;background:transparent;border:none;outline:none;
      color:var(--text);font-family:'Inter',sans-serif;
      font-size:.85rem;line-height:1.8;
      padding:16px 0 20px;resize:none;min-height:200px;
    }
    .body-wrap textarea::placeholder{color:var(--text3)}

    /* Attachments */
    .attach{
      padding:14px 22px;
      border-bottom:1px solid var(--border-s);
      transition:background .12s;
    }
    .attach.drag{background:rgba(99,102,241,.04)}
    .attach-top{display:flex;align-items:center;gap:10px}

    .attach-trigger{
      display:inline-flex;align-items:center;gap:6px;
      background:var(--surface);border:1px solid var(--border);
      border-radius:var(--rs);
      color:var(--text2);font-family:'Inter',sans-serif;
      font-size:.75rem;font-weight:500;
      padding:5px 11px;cursor:pointer;position:relative;
      transition:background .12s,color .12s,border-color .12s;
    }
    .attach-trigger:hover{background:var(--raised);color:var(--text);border-color:#3f3f46}
    .attach-trigger input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%}
    .drag-txt{font-size:.7rem;color:var(--text3)}

    .chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
    .chip{
      display:inline-flex;align-items:center;gap:6px;
      background:var(--surface);border:1px solid var(--border);
      border-radius:6px;padding:4px 9px;
      font-size:.72rem;
      animation:fadeUp .15s ease;
    }
    .chip-name{
      max-width:140px;overflow:hidden;
      text-overflow:ellipsis;white-space:nowrap;
      color:var(--text);font-weight:500;
    }
    .chip-size{color:var(--text3)}
    .chip-rm{
      background:none;border:none;cursor:pointer;
      color:var(--text3);display:flex;align-items:center;
      padding:0;border-radius:3px;transition:color .12s;
    }
    .chip-rm:hover{color:var(--red)}

    @keyframes fadeUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}

    /* Alerts */
    .alert{
      margin:0 22px 14px;
      border-radius:var(--rs);
      padding:10px 13px;
      font-size:.775rem;font-weight:500;
      display:flex;align-items:center;gap:8px;
      animation:fadeUp .2s ease;
    }
    .alert-ok{background:rgba(34,197,94,.09);border:1px solid rgba(34,197,94,.22);color:#86efac}
    .alert-err{background:rgba(239,68,68,.09);border:1px solid rgba(239,68,68,.22);color:#fca5a5}

    /* Footer */
    .card-foot{
      display:flex;align-items:center;justify-content:space-between;
      padding:13px 22px;
      background:var(--surface);border-top:1px solid var(--border);
      gap:10px;
    }
    .send-btn{
      display:inline-flex;align-items:center;gap:7px;
      background:var(--accent);border:none;border-radius:var(--rs);
      color:#fff;font-family:'Inter',sans-serif;
      font-size:.82rem;font-weight:600;
      padding:8px 18px;cursor:pointer;
      transition:opacity .15s,transform .1s;
      letter-spacing:-.1px;
    }
    .send-btn:hover:not(:disabled){opacity:.88;transform:translateY(-1px)}
    .send-btn:active:not(:disabled){transform:translateY(0)}
    .send-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
    .foot-note{font-size:.7rem;color:var(--text3)}
    .foot-note b{color:var(--text2);font-weight:500}

    /* Spinner */
    .spin{
      width:13px;height:13px;
      border:2px solid rgba(255,255,255,.25);
      border-top-color:#fff;
      border-radius:50%;
      animation:rot .65s linear infinite;
    }
    @keyframes rot{to{transform:rotate(360deg)}}

    @media(max-width:700px){
      .layout{flex-direction:column;padding:16px 12px 36px}
      .sidebar{width:100%;position:static;flex-direction:row;flex-wrap:wrap;gap:4px}
      .sb-section{display:none}
      .sb-hr{display:none}
      .from-split .name-inp{width:110px}
    }
  </style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const { useState, useRef } = React;
const DOMAIN = "@aiienscampus.in";
const kb = b => b < 1024 ? b+"B" : b < 1048576 ? (b/1024|0)+"KB" : (b/1048576).toFixed(1)+"MB";

function App() {
  const [form, setForm] = useState({
    senderName:"", fromLocal:"",
    toName:"", toEmail:"",
    subject:"", body:"",
  });
  const [files,  setFiles]  = useState([]);
  const [status, setStatus] = useState(null);
  const [msg,    setMsg]    = useState("");
  const [drag,   setDrag]   = useState(false);
  const fileRef = useRef();

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));
  const addFiles = list => setFiles(p => [...p, ...Array.from(list)]);
  const rmFile   = i   => setFiles(f => f.filter((_,x) => x !== i));

  const onDrop = e => {
    e.preventDefault(); setDrag(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const submit = async e => {
    e.preventDefault();
    setStatus("loading"); setMsg("");

    const fd = new FormData();
    fd.append("senderName",     form.senderName);
    fd.append("fromEmail",      form.fromLocal);
    fd.append("recipientName",  form.toName);
    fd.append("recipientEmail", form.toEmail);
    fd.append("subject",        form.subject);
    fd.append("body",           form.body);
    files.forEach(f => fd.append("attachments", f));

    try {
      const r = await fetch("/api/send", {method:"POST", body:fd});
      const d = await r.json();
      if (d.success) {
        setStatus("success");
        setMsg("Delivered · ID: " + d.id);
        setForm(f => ({...f, toName:"", toEmail:"", subject:"", body:""}));
        setFiles([]);
      } else {
        setStatus("error"); setMsg(d.error || "Something went wrong.");
      }
    } catch {
      setStatus("error"); setMsg("Network error — please try again.");
    }
  };

  return <>
    {/* ── Topbar ── */}
    <header className="topbar">
      <div className="brand">
        <img src="data:image/png;base64,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8bLVIUs+bwRutZYFK+sXgy48e3lMmjRJSOKhSeihGUjk3kMXrrPCxh2uAhCEU5sNr0rGIGDbY21VLLPKKqscc8wxTvFKXOAUj5siprFjxzIOuZQSiUBmmStnyqICSyja1I3KVkKKpigROgpGykL1asTLBOd0zE5efvnljz766BtuuOHYY4/1O4kSg0cXJVgXa8GDlwEnlgYRqwI/NMqyYAhfZcOPLyvzzjuv7iJRJvTQDCRy76EL11lh294O47wjCydENI0psLkjoSY0hPG1kpW+7+2//75PPfXE3nvvueKKP/BhdZ55vvpvOQYO7N/c3FgUelUUgmrbGVIrTlpqwpuIWGINjamB4DJ9o402OvXUU++4fdSuO+/Su6FXVVMzvdctA69bb1CZB30dtHUfPXq0FbFMNEifsRG9gAllgStOeLDchrPQRlEty0kyrqgMJHJvw3LMyV1QAx7BDpjdaY6MNRobG5VIBAWgfvufAfanVA4ZMuT//u//rr322l//+tdrrLEGRsA7XZYjAbdzrHZ6mG33MIgyC1VVDuWzsbFRiU99rL7vvvsuuOCC3XbbbcEFFwxulX+t1kKVIOEoXv6Bh2efffb000//7LPPvHqlnQElG56zgUoUhMEDPzzowj9wRU7ooRlI5N5DF66zwsYL9rkd/qtf/WqnnXa66aabXn/9dfsccbgZMCoaIiACZoxpQBUvrLvuupdeeumVV165ww47LLroopSYSKl72IS9Kg80WsNJZmNcekRGD2SaDKpFkRnkCUWN85RCgjylap6rrKopkKcRs1loErYmcwQTpI/UBU0bC9iwlDGtiy++uK8XV1111cUXX7zQQgv1nadPbXUNvV78SBS3XCl5o9Hrvffeu+666w77xeE77LTjjTfe6HVLrwsu5txAZP7LArf868KJEghcCZVP/gmUIlElJFR+BhK5V/4adWmEtq4tjVPeeeed559//uSTT8bUjocfffSRn+02+aRJk9z2krEPxsEjoBfo5XS/3nrrnXHGGXfffffee++9xBJLONozMwfsAJzry4zgYldfvfTlmQ0BMIguylDSB/KqoeyWsjAS2UCOCDHCJgjMLQq4STdZM2UgA6qMYciQIYcddthDDz3kHuYHP/iBK28ndDaSw4m08IBz/X4iqMqk5GNzLwN38aNGjZKrPLAUGxDKgqEtq44cSr74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Hj36448/xiA2lc3jHGe3d9jALTgSj1OekLCPAOw3QxMobV0R6qeJAATVsuBtYUb6KnU0688//9wo5vv+++/b7cAtDQN7nk2bwZW+xgI5JCsxHbemI8/jxo0zuwBNBhpv2aIQ2JgxY/zI4FN3QTLmuVzozhXOjSC9IT766KOxY8fKhlRQYkzJAQLiK9e/R0Ua9TUp85V2Pg1arh+9QC+p053sMeCZIDbJNISJGEJOpELSCBmMTlZqUuaCBsRJacqSidZ5puHWiAntzEAi93YmsL3dbRUbA5l6oO3A119//ZBDDllxxRWXWWaZNddcc9VVVz300ENxPdK3E2yn9o43u/6GAGMdddRRwlhqqaW+853vrLLKKk899ZT9rLeAbXKbkNwG2MBYVUej2NWjRo36yU9+svTSS6+wwgrf/e53b7rpJnlAFkiTQZtH4T8gVOBT2G+++eb555+/wQYbfOtb3/re975nUv/zP//z7Vl/NLDccsspA8u18Gddll9+eTlZfPHFV1999dtuu02QEMOVXlpxLCal4AG4+eabt9lmm2WXXdaw/F944YWWAKejTnnwxi3dc1i+8847e+21l8SaqRntuuuukYdoLasUYdgTpJEfDyoSf+2114444gj5M4RHxVgiFz8YETRFSQCypgCZRhoJkdL11lvv2WeflRbJNFCM2IPKCgw1kXs3L4oDkeOb7U149dVXt9566/vvv9+Vqy304Ycfor9rr732xBNPtFc98bZWZ4eLR+wuo9xwww1YGJwlndwfeughTfTCICjJBGVZwFYDBgxA3yZoysOHD//kk08c3JzvUMY555zz9ttvIzVNbJRlOc8zNgRwAocddth+++132mmnPf/884jJjN577z1ncEPLtmMjhBAlm6KwIgz0Ijhr//a3vzVEG9ZFSC40vHXk8F//+pe3jtXH48DzmWee+ctf/tJPGalgQJk3tdlWn3vuOS8eriyfgH/3u9/dcccdqHO2HfMMxAnmCJqUlsli7bvvvt5GV155pV8bDh+eVStrLJlpBSLJgwdMnq31K6+8YulVDRFPoOES2pOBRO7tyV4ZfT2yYY0WIWQl2ZMdpe331ltv2Tyq6N5WtDltrbvvvvvWW2/1xOMCTTQEG56gSs9PRyG8RQxohX/MJXhbV5OqoWkMbUQxKMuCvqam5JN/A5k+n8qoGiKcE4xYlnPG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55133uc+97mvfOUrbhtmEQLWolRePrfccsuee+651157KZpmKQc+dO0IImf4SuSFF164//7777bbbrvO/Ntll10OPfTQa6+91nSelAFyI8NBqenygVYzaiV28cUXoxcDlm9IOIUoylI1xZ133sku0AKNWs5w+KIMaWXitkH57W9/C2SrrbaaNm3a7rvvftRRR4FlxwDyOUf6hIEU9z7Z6MHLdNpVDaddUVBHFB0lQFfpUSjXXHPN00477aabbnr00Ufvu+++888/f4cddth7772hKDQChSs9s88+O8twUrA8SzGRkF/96lfK8fXXX3/sscc+9NBDZjQ1n+FAhrPLU+FTYR944IFLL730lFNOueKKK9x1oMEEqNI9/PDD++yzj9HvfOc77kPSlgPhQ9cOB85uFA63u+66S/jll19+3XXXXXXVVT/4wQ+OOeYYN4wvfvGLyOHpsZ0bZTipGa1dVmApN99887nnnnv33XfLn4VULAfMXHbZZZiBaTnYtkxSDkNbaPCLYc6S3GCDDS644IJ77rnnF7/4hZsQntdYY42f/vSnCBkaHksPM5DiPnhz+6SvHCglFluVRSlRQTxmKgrHHXecp7/ll19+u+2223fffXfeeee1115bBVF0br31Vm4Vy+JBHkKjAK+6A79EV0U+9dRT//SnPylq3//+92+77baqX8poI8gIRk/NsuUAXFGD7IH68ccfZ9H1zO5epRArzV5NmNpzqzUaLREl/9IbWyD8+VSGSy211BZbbPHpT3960003XXnllX//+98r8R7ALZM0IpQRXXD4yIGi9VLL7O6LdHa65aOUmA4zjJYjnF0Iuxx0G4WzVEHx+etf/3riiSc+9thjH/zgB/0yOP744z/5yU8uscQSjz766DzzzAOKcyNIjD3JQIp7T27ryy9KyVARHHiivgjQveOOO7zi+POf//yZz3zmjDPO8DpCdfBGwnOxh0GPq8ssswxnnvwLgdIo3IghzqZQtlSW+++/X01/05vetP3226txnl6VJEPlyXn0ItAjs0DhqpvbjCKu4CqOHlHNdeONN/oJ4s343HPPrcunwCuELlA7nFRhFSV/nxbWWmutAw44wAulI444woP8IYccAtmrKu/i3UXcS4bDsXaz44qYUddthkUrZ1EmkhIQuhUp+vLnxkjMrjU0nJiaj1Vz8FPghhtuWGyxxeyd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" alt="aiienscampus" style={{height:30,width:'auto',borderRadius:6}} />
        <span className="brand-name">aiienscampus</span>
      </div>
      <div className="status-pill">
        <div className="dot"/>
        Resend API · aiienscampus.in
      </div>
    </header>

    {/* ── Body ── */}
    <div className="layout">

      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sb-section">Compose</div>
        <div className="sb-item active">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          New message
        </div>
        <div className="sb-hr"/>
        <div className="sb-section">Details</div>
        <div className="sb-item">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Verified domain
        </div>
        <div className="sb-item">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Attachments OK
        </div>
        <div className="sb-item">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.9"/>
            <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>
          </svg>
          Delivered instantly
        </div>
      </nav>

      {/* Compose card */}
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">New message</div>
            <div className="card-sub">Compose and send via Resend API</div>
          </div>
        </div>

        <form onSubmit={submit}>
          <div
            onDragOver={e=>{e.preventDefault();setDrag(true)}}
            onDragLeave={()=>setDrag(false)}
            onDrop={onDrop}
          >
            {/* From */}
            <div className="f-row">
              <span className="f-lbl">From</span>
              <div className="from-split">
                <input
                  className="name-inp"
                  id="sender-name"
                  type="text"
                  placeholder="Your name"
                  value={form.senderName}
                  onChange={set("senderName")}
                />
                <input
                  className="alias-inp"
                  id="from-local"
                  type="text"
                  placeholder="alias"
                  required
                  autoComplete="off"
                  spellCheck="false"
                  value={form.fromLocal}
                  onChange={e => setForm(f=>({...f, fromLocal:e.target.value.replace(/@.*/,"")}))}
                />
                <span className="domain-suffix">{DOMAIN}</span>
              </div>
            </div>

            {/* To */}
            <div className="f-row">
              <span className="f-lbl">To</span>
              <input
                id="to-name"
                type="text"
                placeholder="Recipient name"
                value={form.toName}
                onChange={set("toName")}
                style={{width:150, flexShrink:0, paddingRight:14, borderRight:"1px solid var(--border-s)", marginRight:14}}
              />
              <input
                id="to-email"
                type="email"
                placeholder="recipient@example.com"
                required
                value={form.toEmail}
                onChange={set("toEmail")}
              />
            </div>

            {/* Subject */}
            <div className="f-row">
              <span className="f-lbl">Subject</span>
              <input
                id="subject"
                type="text"
                placeholder="What's this about?"
                required
                value={form.subject}
                onChange={set("subject")}
              />
            </div>

            {/* Body */}
            <div className="body-wrap">
              <textarea
                id="body"
                placeholder="Write your message here…"
                required
                value={form.body}
                onChange={set("body")}
              />
            </div>

            {/* Attachments */}
            <div className={"attach" + (drag ? " drag" : "")}>
              <div className="attach-top">
                <label className="attach-trigger" htmlFor="file-input">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Attach files
                  <input id="file-input" type="file" multiple ref={fileRef}
                    onChange={e => addFiles(e.target.files)}/>
                </label>
                <span className="drag-txt">or drag &amp; drop</span>
              </div>
              {files.length > 0 && (
                <div className="chips">
                  {files.map((f,i) => (
                    <div className="chip" key={i}>
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#6366f1" strokeWidth="2"/>
                        <polyline points="14 2 14 8 20 8" stroke="#6366f1" strokeWidth="2"/>
                      </svg>
                      <span className="chip-name">{f.name}</span>
                      <span className="chip-size">{kb(f.size)}</span>
                      <button type="button" className="chip-rm" onClick={() => rmFile(i)}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          <line x1="18" y1="6" x2="6"  y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                          <line x1="6"  y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Alerts */}
          {status === "success" && (
            <div className="alert alert-ok">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5" stroke="#86efac" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {msg}
            </div>
          )}
          {status === "error" && (
            <div className="alert alert-err">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#fca5a5" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="13" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16.5" r="1" fill="#fca5a5"/>
              </svg>
              {msg}
            </div>
          )}

          {/* Footer */}
          <div className="card-foot">
            <button id="send-btn" className="send-btn" type="submit" disabled={status==="loading"}>
              {status === "loading" ? (
                <><div className="spin"/> Sending…</>
              ) : (
                <>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
                      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Send message
                </>
              )}
            </button>
            <span className="foot-note">Powered by <b>Resend</b> · <b>aiienscampus.in</b></span>
          </div>
        </form>
      </div>
    </div>
  </>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
</script>
</body>
</html>`;

// ─────────────────────────────────────────────
//  Serve Frontend
// ─────────────────────────────────────────────
app.get("/{*path}", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ─────────────────────────────────────────────
//  Start
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("\n  🚀  Mail Sender → http://localhost:" + PORT + "\n");
});
