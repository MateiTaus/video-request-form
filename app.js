// Formular Generare Video — T&T Automations
// Trimite cererea la n8n (workflow „Generate videos with veo 3.1 fast").
const N8N_WEBHOOK_URL = "https://n8n.srv892462.hstgr.cloud/webhook/video-form-intake";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const form = $("#videoForm");
  const submitBtn = $("#submitBtn");
  const statusEl = $("#submitStatus");
  const summary = $("#errorSummary");

  // Ce câmpuri are fiecare tip de generare
  const TYPES = {
    text_to_video:      { prompt: "promptT2V", files: [] },
    image_to_video:     { prompt: "promptI2V", files: ["startFrame", "lastFrame"] },
    reference_to_video: { prompt: "promptR2V", files: ["ref1", "ref2", "ref3"] },
    ugc:                { prompt: null,        files: ["productImage"] },
  };

  const touched = new Set();
  let submitted = false;

  const val = (id) => ($("#" + id)?.value || "").trim();
  const radio = (name) => $(`input[name="${name}"]:checked`)?.value || "";
  const hasFile = (id) => !!$("#" + id)?.files?.length;
  const genType = () => radio("generationType");

  // ── Casete de upload (generate din <div class="upload" data-file="...">) ──
  $$(".upload").forEach((box) => {
    const id = box.dataset.file;
    box.innerHTML = `
      <input id="${id}" name="${id}" type="file" accept="image/jpeg,image/png,image/webp" class="fileHidden" />
      <label id="${id}Box" for="${id}" class="uploadBox${box.dataset.tall ? " tall" : ""}">
        <div class="uploadTop">Încarcă imagine</div>
        <img id="${id}Preview" class="uploadPreview hidden" alt="" />
        <div id="${id}Name" class="uploadName">Nicio imagine selectată</div>
        <div class="uploadHint">${box.dataset.hint || "Click aici"}</div>
      </label>
      <div class="miniNote">JPG, PNG sau WEBP.</div>`;
    const input = $("#" + id);
    input.addEventListener("change", () => {
      touched.add(id);
      const file = input.files?.[0];
      const img = $("#" + id + "Preview");
      $("#" + id + "Name").textContent = file ? file.name : "Nicio imagine selectată";
      if (file) {
        const url = URL.createObjectURL(file);
        img.onload = () => URL.revokeObjectURL(url);
        img.src = url;
        img.classList.remove("hidden");
      } else {
        img.src = "";
        img.classList.add("hidden");
      }
      validate();
    });
  });

  // ── Afișare panouri ──
  function updatePanels() {
    const type = genType();
    Object.keys(TYPES).forEach((t) => $("#panel_" + t).classList.toggle("hidden", t !== type));
    const ugc = type === "ugc";
    $("#ratioCommon").disabled = ugc;
    $("#ratioHelp").textContent = ugc ? "UGC folosește automat formatul 9:16." : "Se aplică tipului de generare ales.";
    $("#voiceBox").classList.toggle("hidden", !(ugc && radio("voiceCustom") === "DA"));
  }

  // ── Validare ──
  function getErrors() {
    const type = genType();
    const ugc = type === "ugc";
    const e = [];
    const add = (field, msg) => e.push({ field, msg });

    if (!val("clientCode")) add("clientCode", "Completează codul de client.");
    if (!val("videoLength")) add("videoLength", "Alege lungimea videoclipului.");
    if (!ugc && !val("ratioCommon")) add("ratioCommon", "Alege formatul.");
    if (!type) add("generationType", "Alege tipul de generare.");

    if (type === "reference_to_video" && ["16s", "24s"].includes(val("videoLength")))
      add("videoLength", "Reference to Video funcționează momentan doar pe 8 secunde.");

    const cfg = TYPES[type];
    if (cfg?.prompt && !val(cfg.prompt)) add(cfg.prompt, "Scrie promptul de generare.");
    if (type === "image_to_video" && !hasFile("startFrame")) add("startFrame", "Încarcă start frame-ul.");
    if (type === "reference_to_video" && !["ref1", "ref2", "ref3"].some(hasFile)) add("ref1", "Încarcă minim o imagine de referință.");

    if (ugc) {
      if (!hasFile("productImage")) add("productImage", "Încarcă poza cu produsul.");
      if (!val("ugcScript")) add("ugcScript", "Scrie scriptul pentru video.");
      if (!val("ugcDetails")) add("ugcDetails", "Completează informațiile video.");
      if (radio("voiceCustom") === "DA") {
        if (!val("voiceId")) add("voiceId", "Completează ID-ul vocii.");
        if (!radio("voiceAccount")) add("voiceAccount", "Alege contul ElevenLabs.");
      }
    }
    return e;
  }

  function validate() {
    const errors = getErrors();
    $$("[data-error-for]").forEach((el) => (el.textContent = ""));
    $$(".errorInput, .errorUpload").forEach((el) => el.classList.remove("errorInput", "errorUpload"));

    errors.forEach(({ field, msg }) => {
      if (!submitted && !touched.has(field)) return;
      const slot = $(`[data-error-for="${field}"]`);
      if (slot && !slot.textContent) slot.textContent = msg;
      $("#" + field)?.classList.add("errorInput");
      $("#" + field + "Box")?.classList.add("errorUpload");
    });

    submitBtn.disabled = errors.length > 0;
    summary.classList.toggle("hidden", !(submitted && errors.length));
    summary.textContent = submitted && errors.length ? "Verifică: " + errors[0].msg : "";
    return errors.length === 0;
  }

  // ── Evenimente ──
  $$('input[type="text"], textarea, select').forEach((el) => {
    el.addEventListener("input", validate);
    el.addEventListener("change", () => { touched.add(el.id); validate(); });
    el.addEventListener("blur", () => { touched.add(el.id); validate(); });
  });
  $$('input[type="radio"]').forEach((r) =>
    r.addEventListener("change", () => { touched.add(r.name); updatePanels(); validate(); })
  );
  $("#ugcScript").addEventListener("input", () => ($("#ugcScriptCount").textContent = val("ugcScript").length));

  // ── Trimitere ──
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    submitted = true;
    if (!validate()) return;

    submitBtn.disabled = true;
    statusEl.className = "status";
    statusEl.textContent = "Se trimite...";

    const type = genType();
    const fd = new FormData();
    fd.append("clientCode", val("clientCode"));
    fd.append("projectName", val("projectName"));
    fd.append("videoLength", val("videoLength"));
    fd.append("ratioCommon", type === "ugc" ? "9:16" : val("ratioCommon"));
    fd.append("generationType", type);

    const cfg = TYPES[type];
    if (cfg.prompt) fd.append(cfg.prompt, val(cfg.prompt));
    cfg.files.forEach((id) => { const f = $("#" + id).files?.[0]; if (f) fd.append(id, f, f.name); });

    if (type === "ugc") {
      fd.append("ugcScript", val("ugcScript"));
      fd.append("ugcDetails", val("ugcDetails"));
      fd.append("voiceCustom", radio("voiceCustom") || "NU");
      if (radio("voiceCustom") === "DA") {
        fd.append("voiceId", val("voiceId"));
        fd.append("voiceAccount", radio("voiceAccount"));
      }
    }

    try {
      const res = await fetch(N8N_WEBHOOK_URL, { method: "POST", body: fd });
      let data = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data?.message || `Eroare la trimitere (HTTP ${res.status}).`);

      statusEl.textContent = data?.message || "Trimis cu succes!";
      statusEl.classList.add("statusOk");
      resetForm();
    } catch (err) {
      statusEl.textContent = err?.message || "Eroare la trimitere. Încearcă din nou.";
      statusEl.classList.add("statusBad");
      submitBtn.disabled = false;
    }
  });

  function resetForm() {
    form.reset();
    touched.clear();
    submitted = false;
    $$(".uploadPreview").forEach((img) => { img.src = ""; img.classList.add("hidden"); });
    $$(".uploadName").forEach((n) => (n.textContent = "Nicio imagine selectată"));
    $("#ugcScriptCount").textContent = "0";
    updatePanels();
    validate();
  }

  updatePanels();
  validate();
});
