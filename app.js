document.addEventListener("DOMContentLoaded", () => {
  const N8N_WEBHOOK_URL = "https://n8n.srv892462.hstgr.cloud/webhook/video-form-intake";
  const form = document.getElementById("videoForm");
  const submitBtn = document.getElementById("submitBtn");
  const submitStatus = document.getElementById("submitStatus");
  const statusEl = submitStatus;
  const errorSummary = document.getElementById("errorSummary");

  const panelT2V = document.getElementById("panelTextToVideo");
  const panelI2V = document.getElementById("panelImageToVideo");
  const panelR2V = document.getElementById("panelReferenceToVideo");

  const touched = {};
  let submitted = false;

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  function getGenerationType() {
    const checked = qs('input[name="generationType"]:checked');
    return checked ? checked.value : "";
  }

  function showPanel(type) {
    panelT2V.classList.add("hidden");
    panelI2V.classList.add("hidden");
    panelR2V.classList.add("hidden");

    if (type === "text_to_video") panelT2V.classList.remove("hidden");
    if (type === "image_to_video") panelI2V.classList.remove("hidden");
    if (type === "reference_to_video") panelR2V.classList.remove("hidden");
  }

  function markTouched(fieldName) {
    touched[fieldName] = true;
  }

  function shouldShowError(fieldName) {
    return submitted || touched[fieldName];
  }

  function setFieldError(fieldName, message) {
    const err = document.querySelector(`[data-error-for="${fieldName}"]`);
    if (err) err.textContent = message || "";

    const input = document.getElementById(fieldName);
    if (input) {
      if (message) input.classList.add("errorInput");
      else input.classList.remove("errorInput");
    }

    // Daca e input file si avem label custom, coloram box-ul, nu input-ul
    const box = document.getElementById(fieldName + "Box");
    if (box) {
      if (message) box.classList.add("errorUpload");
      else box.classList.remove("errorUpload");
    }
  }

  function clearAllErrors() {
    qsa("[data-error-for]").forEach(e => e.textContent = "");
    qsa(".errorInput").forEach(el => el.classList.remove("errorInput"));
    qsa(".errorUpload").forEach(el => el.classList.remove("errorUpload"));
    errorSummary.classList.add("hidden");
    errorSummary.textContent = "";
  }

  function hasFile(inputId) {
    const el = document.getElementById(inputId);
    return el && el.files && el.files.length > 0;
  }

  function validate(showErrors) {
    clearAllErrors();
    const errors = [];

    const clientCode = qs("#clientCode").value.trim();
    const videoLength = qs("#videoLength").value;
    const ratio = qs("#ratioCommon").value;
    const genType = getGenerationType();

    // helper: adauga eroare doar daca avem voie sa o afisam
    function addError(field, msgInline, msgSummary) {
      errors.push(msgSummary);
      if (showErrors && shouldShowError(field)) {
        setFieldError(field, msgInline);
      }
    }

    if (!clientCode) addError("clientCode", "Completeaza Cod Client.", "Cod Client este obligatoriu.");
    if (!videoLength) addError("videoLength", "Alege Lungimea Videoclipului.", "Lungimea Videoclipului este obligatorie.");
    if (!ratio) addError("ratioCommon", "Alege Ratio.", "Ratio este obligatoriu.");
    if (!genType) {
      errors.push("Generation Type este obligatoriu.");
      if (showErrors && shouldShowError("generationType")) {
        setFieldError("generationType", "Selecteaza un Generation Type.");
      }
    }

    if (genType === "text_to_video") {
      const prompt = qs("#promptT2V").value.trim();
      if (!prompt) addError("promptT2V", "Scrie Generation prompt.", "La Text to Video: Generation prompt este obligatoriu.");
    }

    if (genType === "image_to_video") {
      const prompt = qs("#promptI2V").value.trim();
      if (!hasFile("startFrame")) addError("startFrame", "Incarca Start frame (obligatoriu).", "La Image to Video: Start frame este obligatoriu.");
      if (!prompt) addError("promptI2V", "Scrie Generation prompt.", "La Image to Video: Generation prompt este obligatoriu.");
    }

    if (genType === "reference_to_video") {
      const prompt = qs("#promptR2V").value.trim();
      const refCount = ["ref1","ref2","ref3"].filter(id => hasFile(id)).length;

      if (refCount < 1) addError("ref1", "Incarca minim 1 imagine de referinta.", "La Reference to Video: minim 1 imagine de referinta este obligatorie.");
      if (!prompt) addError("promptR2V", "Scrie Generation prompt.", "La Reference to Video: Generation prompt este obligatoriu.");
    }

    // Butonul: activ doar cand e complet valid
    submitBtn.disabled = errors.length > 0;

    // Summary: doar cand user apasa Trimite
    if (showErrors && submitted && errors.length > 0) {
      errorSummary.textContent = "Verifica: " + errors[0];
      errorSummary.classList.remove("hidden");
    }

    return errors.length === 0;
  }

  // afiseaza numele fisierului in box
function wireFileInput(inputId, nameId, previewId) {
  const input = document.getElementById(inputId);
  const nameEl = document.getElementById(nameId);
  const previewEl = document.getElementById(previewId);
  if (!input || !nameEl || !previewEl) return;

  input.addEventListener("change", () => {
    markTouched(inputId);

    const file = input.files && input.files[0] ? input.files[0] : null;

    if (!file) {
      nameEl.textContent = "Nicio imagine selectata";
      previewEl.src = "";
      previewEl.classList.add("hidden");
      validate(true);
      return;
    }

    nameEl.textContent = file.name;

    const url = URL.createObjectURL(file);
    previewEl.src = url;
    previewEl.classList.remove("hidden");

    // eliberam memoria cand s-a incarcat imaginea
    previewEl.onload = () => {
      URL.revokeObjectURL(url);
    };

    validate(true);
  });
}

  function showSummaryErrors() {
  const box = document.getElementById("errorSummary");
  if (!box) return;

  const errors = Array.from(document.querySelectorAll(".error"))
    .map(e => e.textContent?.trim())
    .filter(Boolean);

  if (errors.length === 0) {
    box.classList.add("hidden");
    box.textContent = "";
    return;
  }

  box.classList.remove("hidden");
  box.textContent = "Verifica: " + errors[0];
}



  function wireTouchedEvents() {
    // Text/select/textarea: marcam touched pe blur (cand iese din camp)
    qsa('input[type="text"], textarea, select').forEach(el => {
      el.addEventListener("blur", () => {
        markTouched(el.id);
        validate(true);
      });
      // cand scrie/selecteaza, mentinem butonul updatat fara sa spameze erori
      el.addEventListener("input", () => validate(false));
      el.addEventListener("change", () => validate(false));
    });

    // Radio: marcam touched cand alege ceva
    qsa('input[name="generationType"]').forEach(r => {
      r.addEventListener("change", () => {
        markTouched("generationType");
        showPanel(getGenerationType());
        validate(true);
      });
    });

    function resetUploadsAndPanels() {
  const previews = [
    ["startFramePreview", "startFrameName"],
    ["lastFramePreview", "lastFrameName"],
    ["ref1Preview", "ref1Name"],
    ["ref2Preview", "ref2Name"],
    ["ref3Preview", "ref3Name"],
  ];

  previews.forEach(([p, n]) => {
    const img = document.getElementById(p);
    const name = document.getElementById(n);
    if (img) { img.src = ""; img.classList.add("hidden"); }
    if (name) name.textContent = "Nicio imagine selectata";
  });

  document.getElementById("panelTextToVideo")?.classList.add("hidden");
  document.getElementById("panelImageToVideo")?.classList.add("hidden");
  document.getElementById("panelReferenceToVideo")?.classList.add("hidden");

  // curatam status
  statusEl.classList.remove("statusOk", "statusBad");
}

    // File inputs (numele + touched)
wireFileInput("startFrame", "startFrameName", "startFramePreview");
wireFileInput("lastFrame", "lastFrameName", "lastFramePreview");
wireFileInput("ref1", "ref1Name", "ref1Preview");
wireFileInput("ref2", "ref2Name", "ref2Preview");
wireFileInput("ref3", "ref3Name", "ref3Preview");
  }

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // fortam validare completa la submit
  const ok = validate(false);
  if (!ok) {
    showSummaryErrors();
    return;
  }

  submitBtn.disabled = true;
  statusEl.textContent = "Se trimite...";

  try {
    const fd = new FormData();

    // text fields
    fd.append("clientCode", document.getElementById("clientCode").value.trim());
    fd.append("projectName", document.getElementById("projectName").value.trim());
    fd.append("videoLength", document.getElementById("videoLength").value);
    fd.append("ratioCommon", document.getElementById("ratioCommon").value);

    const generationType = document.querySelector('input[name="generationType"]:checked')?.value || "";
    fd.append("generationType", generationType);

    // prompt: trimitem doar campul relevant (ca tu deja le ai separate)
    if (generationType === "text_to_video") {
      fd.append("promptT2V", document.getElementById("promptT2V").value.trim());
    } else if (generationType === "image_to_video") {
      fd.append("promptI2V", document.getElementById("promptI2V").value.trim());
    } else if (generationType === "reference_to_video") {
      fd.append("promptR2V", document.getElementById("promptR2V").value.trim());
    }

    // imagini (binary) - IMPORTANT: NU setam headers manual!
    if (generationType === "image_to_video") {
      const start = document.getElementById("startFrame").files?.[0];
      const last = document.getElementById("lastFrame").files?.[0];

      if (start) fd.append("startFrame", start, start.name);
      if (last) fd.append("lastFrame", last, last.name);
    }

    if (generationType === "reference_to_video") {
      const r1 = document.getElementById("ref1").files?.[0];
      const r2 = document.getElementById("ref2").files?.[0];
      const r3 = document.getElementById("ref3").files?.[0];

      if (r1) fd.append("ref1", r1, r1.name);
      if (r2) fd.append("ref2", r2, r2.name);
      if (r3) fd.append("ref3", r3, r3.name);
    }

    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      body: fd,
    });

    let data = null;
    try { data = await res.json(); } catch {}

    if (!res.ok) {
      const msg = data?.message || `Eroare la trimitere (HTTP ${res.status}).`;
      throw new Error(msg);
    }

    statusEl.textContent = data?.message || "Trimis cu succes!";
    statusEl.classList.add("statusOk");
    statusEl.classList.remove("statusBad");

    form.reset();
    resetUploadsAndPanels();

    submitBtn.disabled = true;
  } catch (err) {
    statusEl.textContent = err?.message || "Eroare la trimitere. Incearca din nou.";
    statusEl.classList.add("statusBad");
    statusEl.classList.remove("statusOk");
    submitBtn.disabled = false;
  }
});

  // Initial: NU aratam erori, doar tinem butonul disabled corect
  showPanel(getGenerationType());
  wireTouchedEvents();
  validate(false);
});

function resetUploadsAndPanels() {
  const pairs = [
    ["startFramePreview", "startFrameName"],
    ["lastFramePreview", "lastFrameName"],
    ["ref1Preview", "ref1Name"],
    ["ref2Preview", "ref2Name"],
    ["ref3Preview", "ref3Name"],
  ];

  pairs.forEach(([previewId, nameId]) => {
    const img = document.getElementById(previewId);
    const name = document.getElementById(nameId);

    if (img) {
      img.src = "";
      img.classList.add("hidden");
    }
    if (name) {
      name.textContent = "Nicio imagine selectata";
    }
  });

  // ascundem panourile conditional
  const t2v = document.getElementById("panelTextToVideo");
  const i2v = document.getElementById("panelImageToVideo");
  const r2v = document.getElementById("panelReferenceToVideo");

  if (t2v) t2v.classList.add("hidden");
  if (i2v) i2v.classList.add("hidden");
  if (r2v) r2v.classList.add("hidden");

  // reset radio selection
  const radios = document.querySelectorAll('input[name="generationType"]');
  radios.forEach(r => r.checked = false);

  // daca exista summary errors, il ascundem
  const box = document.getElementById("errorSummary");
  if (box) {
    box.classList.add("hidden");
    box.textContent = "";
  }

  // curatam orice highlight rosu ramas
  document.querySelectorAll(".errorInput").forEach(el => el.classList.remove("errorInput"));
  document.querySelectorAll(".errorUpload").forEach(el => el.classList.remove("errorUpload"));
  document.querySelectorAll("[data-error-for]").forEach(e => e.textContent = "");
}

