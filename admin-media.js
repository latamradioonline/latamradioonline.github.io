/* Adds real image uploads to site-content editors without changing the existing Supabase setup. */
(() => {
  const SUPABASE_URL = "https://syvdtvbuvdjazbulgngp.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_pREbQ7wkjSj9Ln8iUWmljg_3qOUfFoT";
  const IMAGE_BUCKET = "site-content";
  const ADMIN_EMAIL = "latamradio345@gmail.com";
  const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const dialog = document.querySelector("#content-dialog");
  const form = document.querySelector("#content-form");
  const fields = document.querySelector("#dialog-fields");
  let editingId = null;

  if (!client || !dialog || !form || !fields) return;

  const mimeExtensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  const safeUrl = value => {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  };
  const currentSection = () => document.querySelector("[data-tab].active")?.dataset.tab || "news";

  function addCoverUploader() {
    const section = currentSection();
    if (section === "news" || !fields.querySelector(".admin-form-grid") || fields.querySelector("[name='site_image_file']")) return;
    const label = document.createElement("label");
    label.innerHTML = 'Imagen de portada <input name="site_image_file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><small class="field-help">Selecciona una imagen del dispositivo o conserva/pega la URL de imagen existente.</small><img class="editor-image-preview" alt="Vista previa" hidden>';
    const grid = fields.querySelector(".admin-form-grid");
    const urlField = grid.querySelector("[name='image_url']")?.closest("label");
    if (urlField) {
      urlField.querySelector("input")?.setAttribute("placeholder", "https://… (opcional si cargas una imagen)");
      urlField.after(label);
    } else {
      grid.append(label);
    }
    const picker = label.querySelector("input[type=file]");
    const preview = label.querySelector("img");
    picker.addEventListener("change", () => {
      const file = picker.files?.[0];
      if (!file) return;
      if (!mimeExtensions[file.type] || file.size > 8 * 1024 * 1024) {
        picker.value = "";
        preview.hidden = true;
        alert("Elige una imagen JPG, PNG, WebP o GIF de hasta 8 MB.");
        return;
      }
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    });
  }

  const observer = new MutationObserver(addCoverUploader);
  observer.observe(fields, { childList: true, subtree: true });
  document.querySelector("#admin-content")?.addEventListener("click", event => {
    const action = event.target.closest("[data-action]");
    if (action?.dataset.action === "edit") editingId = action.dataset.id;
  }, true);
  document.querySelectorAll("[data-tab]").forEach(tab => tab.addEventListener("click", () => { editingId = null; }));
  document.querySelector("#add-content")?.addEventListener("click", () => { editingId = null; });

  form.addEventListener("submit", async event => {
    const file = form.elements.site_image_file?.files?.[0];
    if (!file) return; // Keep the existing save flow for records without a new upload.
    event.preventDefault();
    event.stopImmediatePropagation();
    const section = currentSection();
    const saveButton = document.querySelector("#save-content");
    const status = document.querySelector("#dialog-status");
    const setStatus = message => { if (status) status.textContent = message; };
    if (file.size > 8 * 1024 * 1024 || !mimeExtensions[file.type]) {
      setStatus("Elige una imagen JPG, PNG, WebP o GIF de hasta 8 MB.");
      return;
    }
    saveButton.disabled = true;
    setStatus("Subiendo imagen y guardando…");
    try {
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || authData.user?.email?.toLowerCase() !== ADMIN_EMAIL) throw new Error("Inicia sesión con la cuenta administradora para subir imágenes.");
      const path = `${section}/${crypto.randomUUID()}.${mimeExtensions[file.type]}`;
      const { error: uploadError } = await client.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const record = {};
      new FormData(form).forEach((value, key) => {
        if (key === "site_image_file" || key === "imagen_file" || value instanceof File) return;
        if (["published", "destacada"].includes(key)) return;
        record[key] = typeof value === "string" ? value.trim() : value;
      });
      form.querySelectorAll('input[type="checkbox"]').forEach(input => { record[input.name] = input.checked; });
      const { data: publicData } = client.storage.from(IMAGE_BUCKET).getPublicUrl(path);
      record.image_url = safeUrl(publicData.publicUrl);
      record.section = section;
      record.sort_order = Number(record.sort_order) || 0;
      if (!record.title) throw new Error("El título es obligatorio.");

      const query = editingId
        ? client.from("site_content").update(record).eq("id", editingId)
        : client.from("site_content").insert(record);
      const { error } = await query;
      if (error) throw error;
      dialog.close();
      editingId = null;
      document.querySelector(`[data-tab='${section}']`)?.click();
    } catch (error) {
      setStatus(`No se pudo guardar: ${error.message}`);
    } finally {
      saveButton.disabled = false;
    }
  }, true);
})();
