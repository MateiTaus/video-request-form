document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("videoForm");
  const submitBtn = document.getElementById("submitBtn");
  const submitStatus = document.getElementById("submitStatus");
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

    // File inputs (numele + touched)
wireFileInput("startFrame", "startFrameName", "startFramePreview");
wireFileInput("lastFrame", "lastFrameName", "lastFramePreview");
wireFileInput("ref1", "ref1Name", "ref1Preview");
wireFileInput("ref2", "ref2Name", "ref2Preview");
wireFileInput("ref3", "ref3Name", "ref3Preview");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitted = true;
    submitStatus.textContent = "";
    submitStatus.style.color = "rgba(255,255,255,0.72)";

    const ok = validate(true);
    if (!ok) {
      submitStatus.textContent = "Formular incomplet. Corecteaza campurile marcate cu rosu.";
      return;
    }

    submitStatus.style.color = "rgba(70,227,139,0.95)";
    submitStatus.textContent = "Perfect. Formular valid (in pasul urmator il conectam la n8n).";
  });

  // Initial: NU aratam erori, doar tinem butonul disabled corect
  showPanel(getGenerationType());
  wireTouchedEvents();
  validate(false);
});
