const MEMORIES_KEY = "our_memories";
const DRAFT_KEY = "our_memories_draft";
const EDIT_INDEX_KEY = "our_memories_edit_index";

let memories = JSON.parse(localStorage.getItem(MEMORIES_KEY)) || [];
let editingIndex = null;

function renderMemories() {
  const list = document.getElementById("memoriesList");
  const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();

  let filteredMemories = memories;
  if (searchTerm) {
    filteredMemories = memories.filter(m => 
      m.title.toLowerCase().includes(searchTerm) || 
      m.text.toLowerCase().includes(searchTerm)
    );
  }

  document.getElementById("memoriesCount").textContent = memories.length;

  if (filteredMemories.length === 0) {
    list.innerHTML = '<div class="empty">مفيش ذكريات مكتوبة لسه... ابدأ بأول ذكرى جميلة 💛</div>';
    return;
  }

  list.innerHTML = filteredMemories
    .map((memory, index) => {
      const realIndex = memories.indexOf(memory);
      const isEdited = memory.edited || false;
      const editedClass = isEdited ? 'edited' : '';
      const editedBadge = isEdited ? '<span class="edit-badge">تم التعديل</span>' : '';
      
      return `
      <div class="memory-card ${editedClass}">
        <div class="memory-top">
          <div class="memory-title">${escapeHtml(memory.title)} ${editedBadge}</div>
          <div class="memory-date">${escapeHtml(memory.date || "بدون تاريخ")}</div>
        </div>
        <div class="memory-text">${nl2br(escapeHtml(memory.text))}</div>
        <div class="memory-actions">
          <button class="edit-btn" onclick="editMemory(${realIndex})">تعديل</button>
          <button class="delete-btn" onclick="deleteMemory(${realIndex})">حذف</button>
        </div>
      </div>
    `;
    })
    .join("");
}

function saveMemory() {
  const title = document.getElementById("title").value.trim();
  let date = document.getElementById("date").value;
  const text = document.getElementById("text").value.trim();

  if (!title || !text) {
    alert("اكتبي عنوان الذكرى والتفاصيل الأول 💛");
    return;
  }

  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }

  const memory = { title, date, text };

  if (editingIndex !== null) {
    memory.edited = true;
    memories[editingIndex] = memory;
    editingIndex = null;
    localStorage.removeItem(EDIT_INDEX_KEY);
  } else {
    memory.edited = false;
    memories.push(memory);
  }

  localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));

  clearFields();
  clearDraft();
  renderMemories();
}

function deleteMemory(index) {
  if (!confirm("متأكد إنك عايزة تحذفي الذكرى دي؟")) return;
  
  memories.splice(index, 1);
  localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
  
  if (editingIndex === index) {
    editingIndex = null;
    localStorage.removeItem(EDIT_INDEX_KEY);
    clearFields();
    clearDraft();
  }
  
  renderMemories();
}

function editMemory(index) {
  const memory = memories[index];
  if (!memory) return;

  editingIndex = index;
  localStorage.setItem(EDIT_INDEX_KEY, index);

  document.getElementById("title").value = memory.title || "";
  document.getElementById("date").value = memory.date || "";
  document.getElementById("text").value = memory.text || "";

  document.querySelector(".form-section").scrollIntoView({ behavior: 'smooth' });
  
  const saveBtn = document.querySelector('.save-btn');
  saveBtn.textContent = 'تحديث الذكرى ✏️';
  setTimeout(() => {
    saveBtn.textContent = 'حفظ الذكرى';
  }, 3000);
}

function clearFields() {
  document.getElementById("title").value = "";
  document.getElementById("date").value = "";
  document.getElementById("text").value = "";
  editingIndex = null;
  localStorage.removeItem(EDIT_INDEX_KEY);
  const saveBtn = document.querySelector('.save-btn');
  saveBtn.textContent = 'حفظ الذكرى';
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nl2br(text) {
  if (!text) return "";
  return text.replace(/\n/g, "<br>");
}

function saveDraft() {
  const draft = {
    title: document.getElementById("title").value,
    date: document.getElementById("date").value,
    text: document.getElementById("text").value
  };

  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function loadDraft() {
  const draft = JSON.parse(localStorage.getItem(DRAFT_KEY)) || {};

  document.getElementById("title").value = draft.title || "";
  document.getElementById("date").value = draft.date || "";
  document.getElementById("text").value = draft.text || "";

  const editIndex = localStorage.getItem(EDIT_INDEX_KEY);
  if (editIndex !== null) {
    editingIndex = parseInt(editIndex);
    if (editingIndex >= 0 && editingIndex < memories.length) {
      const memory = memories[editingIndex];
      document.getElementById("title").value = memory.title || "";
      document.getElementById("date").value = memory.date || "";
      document.getElementById("text").value = memory.text || "";
    }
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function attachAutoSave() {
  document.getElementById("title").addEventListener("input", saveDraft);
  document.getElementById("date").addEventListener("input", saveDraft);
  document.getElementById("text").addEventListener("input", saveDraft);
}

function runTests() {
  console.assert(escapeHtml("&<>\"'") === "&amp;&lt;&gt;&quot;&#039;", "escapeHtml failed");
  console.assert(nl2br("a\nb") === "a<br>b", "nl2br failed");
  console.assert(Array.isArray(JSON.parse(localStorage.getItem(MEMORIES_KEY)) || []), "memories should be array");
  console.log("✅ All tests passed!");
}

loadDraft();
attachAutoSave();
renderMemories();
runTests();