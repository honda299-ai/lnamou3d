// ===== إعدادات Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyBqcB079jZPCgjt865b4ZSi4dEzrZHerwA",
  authDomain: "lanamu3d.firebaseapp.com",
  projectId: "lanamu3d",
  storageBucket: "lanamu3d.firebasestorage.app",
  messagingSenderId: "815987598964",
  appId: "1:815987598964:web:fa6eadefcc4b6e49fc9321"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===== المتغيرات =====
const COLLECTION_NAME = "memories";
let memories = [];
let editingId = null;

// ===== دوال رئيسية =====

// جلب الذكريات من Firebase في الوقت الفعلي
function listenToMemories() {
  db.collection(COLLECTION_NAME)
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      memories = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        memories.push({
          id: doc.id,
          title: data.title || "",
          date: data.date || "",
          text: data.text || "",
          edited: data.edited || false,
          createdAt: data.createdAt || null
        });
      });
      renderMemories();
      updateStatus(`✅ تم تحميل ${memories.length} ذكرى`);
    }, (error) => {
      console.error("خطأ في الاستماع:", error);
      updateStatus("❌ حدث خطأ في تحميل الذكريات");
    });
}

// عرض الذكريات
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
    .map((memory) => {
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
          <button class="edit-btn" onclick="editMemory('${memory.id}')">تعديل</button>
          <button class="delete-btn" onclick="deleteMemory('${memory.id}')">حذف</button>
        </div>
      </div>
    `;
    })
    .join("");
}

// حفظ ذكرى جديدة أو تحديثها
async function saveMemory() {
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

  updateStatus("⏳ جاري الحفظ...");

  try {
    if (editingId) {
      // تحديث ذكرى موجودة
      await db.collection(COLLECTION_NAME).doc(editingId).update({
        title: title,
        date: date,
        text: text,
        edited: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      updateStatus("✅ تم تحديث الذكرى!");
    } else {
      // إضافة ذكرى جديدة
      await db.collection(COLLECTION_NAME).add({
        title: title,
        date: date,
        text: text,
        edited: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      updateStatus("✅ تم حفظ الذكرى!");
    }

    clearFields();
    editingId = null;
    
  } catch (error) {
    console.error("خطأ في الحفظ:", error);
    updateStatus("❌ حدث خطأ في الحفظ");
    alert("حدث خطأ في حفظ الذكرى. تأكد من اتصال الإنترنت.");
  }
}

// حذف ذكرى
async function deleteMemory(id) {
  if (!confirm("متأكد إنك عايزة تحذفي الذكرى دي؟")) return;

  updateStatus("⏳ جاري الحذف...");

  try {
    await db.collection(COLLECTION_NAME).doc(id).delete();
    updateStatus("✅ تم حذف الذكرى");
    if (editingId === id) {
      clearFields();
      editingId = null;
    }
  } catch (error) {
    console.error("خطأ في الحذف:", error);
    updateStatus("❌ حدث خطأ في الحذف");
    alert("حدث خطأ في حذف الذكرى.");
  }
}

// تعديل ذكرى
async function editMemory(id) {
  const memory = memories.find(m => m.id === id);
  if (!memory) return;

  editingId = id;

  document.getElementById("title").value = memory.title || "";
  document.getElementById("date").value = memory.date || "";
  document.getElementById("text").value = memory.text || "";

  document.querySelector(".form-section").scrollIntoView({ behavior: 'smooth' });
  
  const saveBtn = document.querySelector('.save-btn');
  saveBtn.textContent = 'تحديث الذكرى ✏️';
  setTimeout(() => {
    saveBtn.textContent = 'حفظ الذكرى';
  }, 3000);
  
  updateStatus("✏️ جاري تعديل الذكرى...");
}

// مسح الحقول
function clearFields() {
  document.getElementById("title").value = "";
  document.getElementById("date").value = "";
  document.getElementById("text").value = "";
  editingId = null;
  const saveBtn = document.querySelector('.save-btn');
  saveBtn.textContent = 'حفظ الذكرى';
}

// ===== دوال مساعدة =====

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

function updateStatus(message) {
  const statusEl = document.getElementById("loadingStatus");
  if (statusEl) {
    statusEl.textContent = message;
  }
}

// ===== بدء التطبيق =====

// التحقق من اتصال Firebase وبدء الاستماع
console.log("🚀 بدء تشغيل تطبيق دفتر الذكريات...");
console.log("📁 مشروع Firebase:", firebaseConfig.projectId);

// بدء الاستماع للذكريات
listenToMemories();

// عرض رسالة ترحيب
updateStatus("🔄 جاري تحميل الذكريات...");