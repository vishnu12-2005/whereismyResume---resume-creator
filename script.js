/* ==========================================================================
   COMPLETE JAVASCRIPT LOGIC — whereismyResume
   ========================================================================== */

// DEVELOPER HARDCODED KEY DEFAULT
const ANTHROPIC_API_KEY = "";

// GLOBAL STATE DATA SCHEMA
let resumeState = {
  personal: {
    name: "",
    jobTitle: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: "",
    photo: "", // base64 string
    photoZoom: 100,
    photoX: 0,
    photoY: 0
  },
  summary: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  languages: [],
  selectedTemplate: 1,
  darkMode: false
};

// AUTO-SAVE DEBOUNCE TIMER
let saveTimeout = null;

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  initCollapsibleCards();
  initPhotoUpload();
  initSkillsInput();
  initDynamicSectionButtons();
  initThemeToggle();
  initSettingsModal();
  initTemplateSwitcher();
  initFormListeners();
  
  // Render dynamic list components in UI from loaded state
  renderDynamicLists();
  
  // SortableJS Drag & Drop Initialization
  initSortableSections();

  // Initial calculation and full preview rendering
  updateProgress();
  updatePreview();
});

// ==========================================================================
// LOCAL STORAGE AUTO-SAVE & LOAD
// ==========================================================================

function loadData() {
  try {
    const rawData = localStorage.getItem("whereismyresume_data");
    if (rawData) {
      const parsed = JSON.parse(rawData);
      
      // Merge with default schema to prevent empty structures
      resumeState = {
        personal: { ...resumeState.personal, ...parsed.personal },
        summary: parsed.summary || "",
        skills: parsed.skills || [],
        experience: parsed.experience || [],
        education: parsed.education || [],
        projects: parsed.projects || [],
        certifications: parsed.certifications || [],
        languages: parsed.languages || [],
        selectedTemplate: parsed.selectedTemplate || 1,
        darkMode: parsed.darkMode || false
      };
    } else {
      // Seed with some nice sample structure (NOT hardcoded, just empty array placeholders)
      resumeState.selectedTemplate = 1;
      resumeState.darkMode = false;
    }
  } catch (e) {
    console.error("Local storage load failed. Initializing empty state.", e);
    showToast("⚠️ Could not load data cleanly.", "warning");
  }

  // Set form fields with loaded data
  document.getElementById("fullName").value = resumeState.personal.name || "";
  document.getElementById("jobTitle").value = resumeState.personal.jobTitle || "";
  document.getElementById("email").value = resumeState.personal.email || "";
  document.getElementById("phone").value = resumeState.personal.phone || "";
  document.getElementById("location").value = resumeState.personal.location || "";
  document.getElementById("linkedin").value = resumeState.personal.linkedin || "";
  document.getElementById("portfolio").value = resumeState.personal.portfolio || "";
  document.getElementById("summary").value = resumeState.summary || "";
  
  // Update character count on loaded summary
  updateCharCounter(resumeState.summary.length);

  // Set Profile Image Preview
  if (resumeState.personal.photo) {
    const preview = document.getElementById("photoPreview");
    preview.src = resumeState.personal.photo;
    preview.classList.remove("hidden");
    document.getElementById("dropzoneContent").classList.add("hidden");
    
    // Show adjustments controls and set slider values
    const controls = document.getElementById("photoControls");
    if (controls) controls.classList.remove("hidden");
    
    const zoomVal = resumeState.personal.photoZoom || 100;
    const xVal = resumeState.personal.photoX || 0;
    const yVal = resumeState.personal.photoY || 0;
    
    document.getElementById("photoZoomRange").value = zoomVal;
    document.getElementById("photoXRange").value = xVal;
    document.getElementById("photoYRange").value = yVal;
    
    preview.style.transform = `scale(${zoomVal / 100}) translate(${xVal}px, ${yVal}px)`;
  } else {
    const controls = document.getElementById("photoControls");
    if (controls) controls.classList.add("hidden");
  }

  // Set Dark mode attribute
  if (resumeState.darkMode) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
  }
}

// Debounced Auto-Save
let currentSaveIsSilent = false;

function triggerAutoSave(silent = false) {
  if (saveTimeout) clearTimeout(saveTimeout);
  
  if (!silent) {
    currentSaveIsSilent = false;
  } else {
    if (saveTimeout === null) {
      currentSaveIsSilent = true;
    }
  }
  
  saveTimeout = setTimeout(() => {
    // Capture static fields into state
    resumeState.personal.name = document.getElementById("fullName").value;
    resumeState.personal.jobTitle = document.getElementById("jobTitle").value;
    resumeState.personal.email = document.getElementById("email").value;
    resumeState.personal.phone = document.getElementById("phone").value;
    resumeState.personal.location = document.getElementById("location").value;
    resumeState.personal.linkedin = document.getElementById("linkedin").value;
    resumeState.personal.portfolio = document.getElementById("portfolio").value;
    resumeState.summary = document.getElementById("summary").value;

    try {
      localStorage.setItem("whereismyresume_data", JSON.stringify(resumeState));
      if (!currentSaveIsSilent) {
        showToast("✓ Saved", "success");
      }
    } catch (e) {
      console.error("Local storage auto-save failed:", e);
      showToast("❌ Auto-save failed: storage full?", "error");
    }
    
    saveTimeout = null;
    currentSaveIsSilent = false;
  }, 500);
}


// ==========================================================================
// COLLAPSIBLE FORM CARDS HANDLER
// ==========================================================================

function initCollapsibleCards() {
  const cards = document.querySelectorAll(".collapsible-card");
  
  cards.forEach(card => {
    const header = card.querySelector(".card-header");
    header.addEventListener("click", () => {
      card.classList.toggle("collapsed");
    });
  });
}

// ==========================================================================
// PROFILE PHOTO UPLOADER
// ==========================================================================

function initPhotoUpload() {
  const dropzone = document.getElementById("photoDropzone");
  const fileInput = document.getElementById("profilePhotoInput");
  const preview = document.getElementById("photoPreview");
  const dropzoneContent = document.getElementById("dropzoneContent");
  const removeBtn = document.getElementById("removePhotoBtn");

  const zoomSlider = document.getElementById("photoZoomRange");
  const xSlider = document.getElementById("photoXRange");
  const ySlider = document.getElementById("photoYRange");
  const controlsSection = document.getElementById("photoControls");

  function updatePhotoTransform() {
    const zoom = zoomSlider.value;
    const x = xSlider.value;
    const y = ySlider.value;
    
    // Apply transform in real time to left form preview
    preview.style.transform = `scale(${zoom / 100}) translate(${x}px, ${y}px)`;
    preview.style.transformOrigin = "center";
    
    // Update internal state
    resumeState.personal.photoZoom = parseInt(zoom);
    resumeState.personal.photoX = parseInt(x);
    resumeState.personal.photoY = parseInt(y);
    
    triggerAutoSave();
    updatePreview();
  }

  if (zoomSlider) {
    zoomSlider.addEventListener("input", updatePhotoTransform);
    xSlider.addEventListener("input", updatePhotoTransform);
    ySlider.addEventListener("input", updatePhotoTransform);
  }

  // Drag over effects
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.backgroundColor = "var(--primary-light)";
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.style.backgroundColor = "";
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.backgroundColor = "";
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handlePhotoFile(e.target.files[0]);
    }
  });

  // Remove photo
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    fileInput.value = "";
    preview.src = "";
    preview.classList.add("hidden");
    dropzoneContent.classList.remove("hidden");
    
    // Hide controls
    if (controlsSection) controlsSection.classList.add("hidden");
    
    resumeState.personal.photo = "";
    resumeState.personal.photoZoom = 100;
    resumeState.personal.photoX = 0;
    resumeState.personal.photoY = 0;
    
    triggerAutoSave();
    updateProgress();
    updatePreview();
    showToast("✓ Photo removed", "info");
  });

  function handlePhotoFile(file) {
    if (!file.type.startsWith("image/")) {
      showToast("❌ Please upload an image file.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.remove("hidden");
      dropzoneContent.classList.add("hidden");
      
      // Show controls and reset values
      if (controlsSection) controlsSection.classList.remove("hidden");
      if (zoomSlider) {
        zoomSlider.value = 100;
        xSlider.value = 0;
        ySlider.value = 0;
      }
      preview.style.transform = "scale(1) translate(0px, 0px)";
      
      // Store in state
      resumeState.personal.photo = e.target.result;
      resumeState.personal.photoZoom = 100;
      resumeState.personal.photoX = 0;
      resumeState.personal.photoY = 0;
      
      triggerAutoSave();
      updateProgress();
      updatePreview();
      showToast("✓ Photo uploaded successfully!", "success");
    };
    reader.readAsDataURL(file);
  }
}

// ==========================================================================
// SKILLS TAG INPUTS
// ==========================================================================

function initSkillsInput() {
  const skillInput = document.getElementById("skillInput");
  const addBtn = document.getElementById("addSkillBtn");
  const container = document.getElementById("skillsContainer");

  // Render initial skills
  resumeState.skills.forEach(skill => renderSkillTag(skill));

  // Key press listener
  skillInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  });

  addBtn.addEventListener("click", addSkill);

  function addSkill() {
    const value = skillInput.value.trim();
    if (!value) return;

    if (resumeState.skills.length >= 20) {
      showToast("⚠️ Maximum 20 skills allowed.", "warning");
      return;
    }

    if (resumeState.skills.includes(value)) {
      showToast("⚠️ Skill already added.", "warning");
      return;
    }

    // Update State
    resumeState.skills.push(value);
    
    // Render Element
    renderSkillTag(value);
    skillInput.value = "";

    triggerAutoSave();
    updateProgress();
    updatePreview();
  }

  function renderSkillTag(skillText) {
    const tag = document.createElement("div");
    tag.className = "skill-tag";
    tag.innerHTML = `
      <span>${skillText}</span>
      <button class="remove-tag-btn" type="button"><i class="fa-solid fa-xmark"></i></button>
    `;

    tag.querySelector(".remove-tag-btn").addEventListener("click", () => {
      tag.classList.add("removing");
      setTimeout(() => {
        tag.remove();
        resumeState.skills = resumeState.skills.filter(s => s !== skillText);
        triggerAutoSave();
        updateProgress();
        updatePreview();
      }, 200);
    });

    container.appendChild(tag);
  }
}

// ==========================================================================
// THEME SWITCHER LIGHT / DARK
// ==========================================================================

function initThemeToggle() {
  const toggle = document.getElementById("themeToggle");

  toggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    let nextTheme = "light";
    
    if (currentTheme === "light") {
      nextTheme = "dark";
      resumeState.darkMode = true;
    } else {
      resumeState.darkMode = false;
    }

    document.documentElement.setAttribute("data-theme", nextTheme);
    triggerAutoSave();
    
    // Rotate micro-animation rotation
    const thumb = toggle.querySelector(".toggle-thumb");
    thumb.style.transform = nextTheme === "dark" ? "translateX(28px) rotate(360deg)" : "translateX(0px) rotate(0deg)";
    
    showToast(`🌙 Dark mode ${nextTheme === "dark" ? "ON" : "OFF"}`, "info");
  });
}

// ==========================================================================
// DYNAMIC SECTION INPUT GENERATION
// ==========================================================================

// Initialise buttons to create dynamic elements
function initDynamicSectionButtons() {
  document.getElementById("addExperienceBtn").addEventListener("click", () => addDynamicEntry("experience"));
  document.getElementById("addEducationBtn").addEventListener("click", () => addDynamicEntry("education"));
  document.getElementById("addProjectBtn").addEventListener("click", () => addDynamicEntry("projects"));
  document.getElementById("addCertificationBtn").addEventListener("click", () => addDynamicEntry("certifications"));
  document.getElementById("addLanguageBtn").addEventListener("click", () => addDynamicEntry("languages"));

  // Clear All button confirmation logic
  document.getElementById("clearAllBtn").addEventListener("click", () => {
    const confirmClear = confirm("⚠️ Are you sure you want to clear all data? This cannot be undone.");
    if (confirmClear) {
      localStorage.removeItem("whereismyresume_data");
      resumeState = {
        personal: { name: "", jobTitle: "", email: "", phone: "", location: "", linkedin: "", portfolio: "", photo: "" },
        summary: "",
        skills: [],
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        languages: [],
        selectedTemplate: 1,
        darkMode: false
      };
      
      // Reset forms and previews
      document.getElementById("resumeForm").reset();
      document.getElementById("photoPreview").src = "";
      document.getElementById("photoPreview").classList.add("hidden");
      document.getElementById("dropzoneContent").classList.remove("hidden");
      if (document.getElementById("photoControls")) {
        document.getElementById("photoControls").classList.add("hidden");
      }
      document.getElementById("skillsContainer").innerHTML = "";
      document.getElementById("charCounter").innerText = "0 / 500";
      
      document.documentElement.setAttribute("data-theme", "light");
      
      renderDynamicLists();
      updateProgress();
      updatePreview();
      
      showToast("✓ All resume data wiped successfully", "success");
    }
  });
}

// Main method to render loaded arrays into dynamic structures
function renderDynamicLists() {
  const sections = ["experience", "education", "projects", "certifications", "languages"];
  sections.forEach(sec => {
    const listEl = document.getElementById(`${sec}List`);
    listEl.innerHTML = "";
    
    if (resumeState[sec] && resumeState[sec].length > 0) {
      resumeState[sec].forEach((item, index) => {
        createEntryDOM(sec, item, index);
      });
    }
  });
}

function addDynamicEntry(type) {
  let newItem = {};
  
  if (type === "experience") {
    newItem = { company: "", role: "", startDate: "", endDate: "", current: false, description: "" };
  } else if (type === "education") {
    newItem = { institution: "", degree: "", startYear: "", endYear: "", grade: "" };
  } else if (type === "projects") {
    newItem = { name: "", techStack: "", description: "", link: "" };
  } else if (type === "certifications") {
    newItem = { name: "", issuer: "", year: "" };
  } else if (type === "languages") {
    newItem = { language: "", proficiency: "Fluent" };
  }

  resumeState[type].push(newItem);
  const index = resumeState[type].length - 1;
  
  // Render in list
  createEntryDOM(type, newItem, index);
  
  triggerAutoSave();
  updateProgress();
  updatePreview();
  showToast(`✓ Added new ${type} entry`, "info");
}

function removeDynamicEntry(type, index, cardElement) {
  cardElement.classList.add("collapsing-entry");
  setTimeout(() => {
    cardElement.remove();
    resumeState[type].splice(index, 1);
    
    // Re-render indices of remaining elements to prevent misalignment
    renderDynamicLists();
    
    triggerAutoSave();
    updateProgress();
    updatePreview();
    showToast("✓ Entry removed", "info");
  }, 300);
}

// Build the DOM input nodes for entries
function createEntryDOM(type, data, index) {
  const parent = document.getElementById(`${type}List`);
  const card = document.createElement("div");
  card.className = "entry-card";
  card.setAttribute("data-index", index);

  const currentYear = new Date().getFullYear();

  let innerHTML = `<span class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></span>`;
  
  // Build headers depending on type
  if (type === "experience") {
    innerHTML += `
      <button class="remove-entry-btn" type="button" onclick="removeDynamicEntryWrapper('experience', ${index}, this)"><i class="fa-solid fa-trash"></i></button>
      <div class="form-grid">
        <div class="form-group col-span-2">
          <label>Company Name <span class="required-star">*</span></label>
          <input type="text" class="exp-company" value="${data.company || ''}" placeholder="e.g. Google" oninput="updateEntryField('experience', ${index}, 'company', this.value)" onchange="triggerAutoSave(false)" required>
        </div>
        <div class="form-group col-span-2">
          <label>Job Title / Role <span class="required-star">*</span></label>
          <input type="text" class="exp-role" value="${data.role || ''}" placeholder="e.g. Software Engineer" oninput="updateEntryField('experience', ${index}, 'role', this.value)" onchange="triggerAutoSave(false)" required>
        </div>
        <div class="form-group">
          <label>Start Date</label>
          <input type="month" class="exp-start" value="${data.startDate || ''}" oninput="updateEntryField('experience', ${index}, 'startDate', this.value)" onchange="triggerAutoSave(false)">
        </div>
        <div class="form-group">
          <label>End Date</label>
          <input type="month" class="exp-end" value="${data.endDate || ''}" ${data.current ? 'disabled' : ''} oninput="updateEntryField('experience', ${index}, 'endDate', this.value)" onchange="triggerAutoSave(false)">
        </div>
        <div class="form-group col-span-2">
          <label class="checkbox-group">
            <input type="checkbox" class="exp-current" ${data.current ? 'checked' : ''} onchange="toggleExperienceCurrent(${index}, this)">
            <span>I currently work here</span>
          </label>
        </div>
        <div class="form-group col-span-2">
          <label>Description</label>
          <textarea rows="3" class="exp-desc" placeholder="Describe your responsibilities and achievements..." oninput="updateEntryField('experience', ${index}, 'description', this.value)" onchange="triggerAutoSave(false)">${data.description || ''}</textarea>
        </div>
      </div>
    `;
  } else if (type === "education") {
    innerHTML += `
      <button class="remove-entry-btn" type="button" onclick="removeDynamicEntryWrapper('education', ${index}, this)"><i class="fa-solid fa-trash"></i></button>
      <div class="form-grid">
        <div class="form-group col-span-2">
          <label>Institution Name <span class="required-star">*</span></label>
          <input type="text" class="edu-inst" value="${data.institution || ''}" placeholder="e.g. Stanford University" oninput="updateEntryField('education', ${index}, 'institution', this.value)" onchange="triggerAutoSave(false)" required>
        </div>
        <div class="form-group col-span-2">
          <label>Degree / Field of Study</label>
          <input type="text" class="edu-degree" value="${data.degree || ''}" placeholder="e.g. B.S. Computer Science" oninput="updateEntryField('education', ${index}, 'degree', this.value)" onchange="triggerAutoSave(false)">
        </div>
        <div class="form-group">
          <label>Start Year</label>
          <input type="number" class="edu-start" max="${currentYear}" value="${data.startYear || ''}" placeholder="e.g. 2020" oninput="updateEntryField('education', ${index}, 'startYear', this.value)" onchange="triggerAutoSave(false)">
        </div>
        <div class="form-group">
          <label>End Year</label>
          <input type="number" class="edu-end" max="${currentYear}" value="${data.endYear || ''}" placeholder="e.g. 2024" oninput="updateEntryField('education', ${index}, 'endYear', this.value)" onchange="triggerAutoSave(false)">
        </div>
        <div class="form-group col-span-2">
          <label>Grade / GPA / %</label>
          <input type="text" class="edu-grade" value="${data.grade || ''}" placeholder="e.g. 3.9 GPA" oninput="updateEntryField('education', ${index}, 'grade', this.value)" onchange="triggerAutoSave(false)">
        </div>
      </div>
    `;
  } else if (type === "projects") {
    innerHTML += `
      <button class="remove-entry-btn" type="button" onclick="removeDynamicEntryWrapper('projects', ${index}, this)"><i class="fa-solid fa-trash"></i></button>
      <div class="form-grid">
        <div class="form-group col-span-2">
          <label>Project Name <span class="required-star">*</span></label>
          <input type="text" class="proj-name" value="${data.name || ''}" placeholder="e.g. Portfolio Website" oninput="updateEntryField('projects', ${index}, 'name', this.value)" onchange="triggerAutoSave(false)" required>
        </div>
        <div class="form-group col-span-2">
          <label>Tech Stack Used</label>
          <input type="text" class="proj-tech" value="${data.techStack || ''}" placeholder="e.g. HTML, CSS, JavaScript" oninput="updateEntryField('projects', ${index}, 'techStack', this.value)" onchange="triggerAutoSave(false)">
        </div>
        <div class="form-group col-span-2">
          <label>Description</label>
          <textarea rows="3" class="proj-desc" placeholder="Describe the project objective and your contributions..." oninput="updateEntryField('projects', ${index}, 'description', this.value)" onchange="triggerAutoSave(false)">${data.description || ''}</textarea>
        </div>
        <div class="form-group col-span-2">
          <label>Live Link / GitHub Link</label>
          <input type="url" class="proj-link" value="${data.link || ''}" placeholder="github.com/username/project" oninput="updateEntryField('projects', ${index}, 'link', this.value)" onchange="triggerAutoSave(false)">
        </div>
      </div>
    `;
  } else if (type === "certifications") {
    innerHTML += `
      <button class="remove-entry-btn" type="button" onclick="removeDynamicEntryWrapper('certifications', ${index}, this)"><i class="fa-solid fa-trash"></i></button>
      <div class="form-grid">
        <div class="form-group col-span-2">
          <label>Certificate Name</label>
          <input type="text" value="${data.name || ''}" placeholder="e.g. AWS Solutions Architect" oninput="updateEntryField('certifications', ${index}, 'name', this.value)" onchange="triggerAutoSave(false)">
        </div>
        <div class="form-group">
          <label>Issuing Organization</label>
          <input type="text" value="${data.issuer || ''}" placeholder="e.g. Amazon Web Services" oninput="updateEntryField('certifications', ${index}, 'issuer', this.value)" onchange="triggerAutoSave(false)">
        </div>
        <div class="form-group">
          <label>Year Issued</label>
          <input type="number" max="${currentYear}" value="${data.year || ''}" placeholder="e.g. 2023" oninput="updateEntryField('certifications', ${index}, 'year', this.value)" onchange="triggerAutoSave(false)">
        </div>
      </div>
    `;
  } else if (type === "languages") {
    innerHTML += `
      <button class="remove-entry-btn" type="button" onclick="removeDynamicEntryWrapper('languages', ${index}, this)"><i class="fa-solid fa-trash"></i></button>
      <div class="form-grid">
        <div class="form-group">
          <label>Language Name</label>
          <input type="text" value="${data.language || ''}" placeholder="e.g. Spanish" oninput="updateEntryField('languages', ${index}, 'language', this.value)" onchange="triggerAutoSave(false)">
        </div>
        <div class="form-group">
          <label>Proficiency</label>
          <select onchange="updateEntryField('languages', ${index}, 'proficiency', this.value, false)" class="form-select">
            <option value="Beginner" ${data.proficiency === 'Beginner' ? 'selected' : ''}>Beginner</option>
            <option value="Intermediate" ${data.proficiency === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
            <option value="Fluent" ${data.proficiency === 'Fluent' ? 'selected' : ''}>Fluent</option>
            <option value="Native" ${data.proficiency === 'Native' ? 'selected' : ''}>Native</option>
          </select>
        </div>
      </div>
    `;
  }

  card.innerHTML = innerHTML;
  parent.appendChild(card);
}

// Global wrap function to hook removing
window.removeDynamicEntryWrapper = function(type, index, element) {
  const card = element.closest(".entry-card");
  removeDynamicEntry(type, index, card);
};

// Global wrap to handle current experiences checkbox
window.toggleExperienceCurrent = function(index, checkbox) {
  const card = checkbox.closest(".entry-card");
  const endDateInput = card.querySelector(".exp-end");
  
  resumeState.experience[index].current = checkbox.checked;
  
  if (checkbox.checked) {
    endDateInput.disabled = true;
    endDateInput.value = "";
    resumeState.experience[index].endDate = "";
  } else {
    endDateInput.disabled = false;
  }
  
  triggerAutoSave();
  updateProgress();
  updatePreview();
};

// Update field mapping
window.updateEntryField = function(type, index, field, value, silent = true) {
  // Prevent year fields from exceeding current year
  if ((field === "startYear" || field === "endYear" || field === "year") && value) {
    const currentYear = new Date().getFullYear();
    const numVal = parseInt(value);
    if (!isNaN(numVal) && numVal > currentYear) {
      value = currentYear.toString();
      if (document.activeElement && (document.activeElement.type === "number" || document.activeElement.tagName === "INPUT")) {
        document.activeElement.value = value;
      }
    }
  }

  resumeState[type][index][field] = value;
  triggerAutoSave(silent);
  updateProgress();
  updatePreview();
};

// ==========================================================================
// DRAG AND DROP RE-ORDERING (SortableJS)
// ==========================================================================

function initSortableSections() {
  const sections = ["experience", "education", "projects"];
  
  sections.forEach(sec => {
    const el = document.getElementById(`${sec}List`);
    Sortable.create(el, {
      animation: 150,
      handle: ".drag-handle",
      ghostClass: "sortable-ghost",
      onEnd: (e) => {
        const oldIndex = e.oldIndex;
        const newIndex = e.newIndex;
        
        if (oldIndex === newIndex) return;
        
        // Move item in internal state array
        const list = resumeState[sec];
        const movedItem = list.splice(oldIndex, 1)[0];
        list.splice(newIndex, 0, movedItem);
        
        // Re-index entry forms cleanly to reflect new orders
        renderDynamicLists();
        
        triggerAutoSave();
        updatePreview();
        showToast("✓ Order updated", "info");
      }
    });
  });
}

// ==========================================================================
// COMPLETION PROGRESS BAR CALCULATION
// ==========================================================================

function updateProgress() {
  let pct = 0;
  
  // 1. Name (15%)
  if (document.getElementById("fullName").value.trim().length > 0) pct += 15;
  // 2. Email (10%)
  if (document.getElementById("email").value.trim().length > 0) pct += 10;
  // 3. Phone (10%)
  if (document.getElementById("phone").value.trim().length > 0) pct += 10;
  // 4. Summary (15%)
  if (document.getElementById("summary").value.trim().length > 0) pct += 15;
  // 5. At least 1 skill (10%)
  if (resumeState.skills.length > 0) pct += 10;
  // 6. At least 1 Experience (20%)
  if (resumeState.experience.length > 0) pct += 20;
  // 7. At least 1 Education (20%)
  if (resumeState.education.length > 0) pct += 20;

  // Render updates
  const label = document.getElementById("progressLabel");
  const bar = document.getElementById("progressBarFill");
  
  bar.style.width = `${pct}%`;
  
  if (pct === 100) {
    label.innerText = "🎉 Resume Complete!";
  } else {
    label.innerText = `Profile ${pct}%`;
  }

  // Adjust colors dynamically based on thresholds
  if (pct <= 30) {
    bar.style.backgroundColor = "#ef4444"; // Red
  } else if (pct <= 70) {
    bar.style.backgroundColor = "#f59e0b"; // Amber
  } else {
    bar.style.backgroundColor = "#10b981"; // Green
  }
}

// ==========================================================================
// CHAR COUNTER FOR SUMMARY textarea
// ==========================================================================

function updateCharCounter(length) {
  const counter = document.getElementById("charCounter");
  counter.innerText = `${length} / 500`;
}

// Bind input event to capture form entries on keystroke
function initFormListeners() {
  const inputs = document.querySelectorAll("#fullName, #jobTitle, #email, #phone, #location, #linkedin, #portfolio");
  inputs.forEach(input => {
    input.addEventListener("input", () => {
      triggerAutoSave(true);
      updateProgress();
      updatePreview();
    });
    input.addEventListener("change", () => {
      triggerAutoSave(false);
    });
  });

  const summaryArea = document.getElementById("summary");
  summaryArea.addEventListener("input", (e) => {
    updateCharCounter(e.target.value.length);
    triggerAutoSave(true);
    updateProgress();
    updatePreview();
  });
  summaryArea.addEventListener("change", () => {
    triggerAutoSave(false);
  });
}

// ==========================================================================
// AI SUMMARY GENERATOR (ANTHROPIC CLAUDE, OPENAI & GEMINI CLIENT CALLS)
// ==========================================================================

function initSettingsModal() {
  const modal = document.getElementById("settingsModal");
  const trigger = document.getElementById("settingsBtn");
  const overlay = document.getElementById("modalOverlay");
  const closeBtn = document.getElementById("closeSettingsBtn");
  const cancelBtn = document.getElementById("cancelSettingsBtn");
  const saveBtn = document.getElementById("saveSettingsBtn");
  const toggleVisibility = document.getElementById("toggleKeyVisibility");
  
  // Show loaded settings
  const savedProvider = localStorage.getItem("whereismyresume_ai_provider") || "anthropic";
  const savedKey = localStorage.getItem("whereismyresume_ai_key") || "";
  
  document.getElementById("aiProviderSelect").value = savedProvider;
  document.getElementById("aiApiKeyInput").value = savedKey;

  trigger.addEventListener("click", () => {
    modal.classList.add("active");
  });

  const closeModal = () => modal.classList.remove("active");
  overlay.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  saveBtn.addEventListener("click", () => {
    const provider = document.getElementById("aiProviderSelect").value;
    const key = document.getElementById("aiApiKeyInput").value.trim();

    localStorage.setItem("whereismyresume_ai_provider", provider);
    localStorage.setItem("whereismyresume_ai_key", key);

    closeModal();
    showToast("✓ AI settings saved successfully!", "success");
  });

  toggleVisibility.addEventListener("click", () => {
    const keyInput = document.getElementById("aiApiKeyInput");
    const icon = document.getElementById("keyEyeIcon");
    
    if (keyInput.type === "password") {
      keyInput.type = "text";
      icon.className = "fa-solid fa-eye-slash";
    } else {
      keyInput.type = "password";
      icon.className = "fa-solid fa-eye";
    }
  });

  // Bind AI button click
  document.getElementById("aiGenerateBtn").addEventListener("click", generateSummaryWithAI);
}

async function generateSummaryWithAI() {
  const name = document.getElementById("fullName").value.trim();
  const title = document.getElementById("jobTitle").value.trim();
  const skills = resumeState.skills.join(", ");
  
  if (!name || !title) {
    showToast("⚠️ Please enter Full Name and Job Title first.", "warning");
    // Scroll and highlight fields
    if (!name) highlightInvalidField(document.getElementById("fullName"), "Name required to generate summary");
    if (!title) highlightInvalidField(document.getElementById("jobTitle"), "Job title required to generate summary");
    return;
  }

  // Get active configurations
  const provider = localStorage.getItem("whereismyresume_ai_provider") || "anthropic";
  const userKey = localStorage.getItem("whereismyresume_ai_key") || "";
  
  // Decide which API key to use (user settings key, or hardcoded key)
  const apiKey = userKey || ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    showToast("🔑 Please save an API key in the AI Settings first.", "warning");
    document.getElementById("settingsModal").classList.add("active");
    return;
  }

  showAILoading();

  const promptText = `Write a confident, ATS-friendly 3-sentence professional summary for ${name}, a ${title} with expertise in ${skills || 'various technologies'}. Start with the job title. Be specific, impactful, and concise. Do not use generic, overly flowery phrases. Output ONLY the summary text, no conversational introductions or markers.`;

  try {
    let summaryResult = "";

    if (provider === "anthropic") {
      // Anthropic Claude sonnet call
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-danger-externally-keyless-requests-enabled": "true" // standard browser bypass flags
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 300,
          messages: [{ role: "user", content: promptText }]
        })
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      summaryResult = data.content[0].text;

    } else if (provider === "openai") {
      // OpenAI GPT call
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: promptText }],
          max_tokens: 300
        })
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      summaryResult = data.choices[0].message.content;

    } else if (provider === "gemini") {
      // Gemini Flash call
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      summaryResult = data.candidates[0].content.parts[0].text;
    }

    // Populate and update state
    const cleanSummary = summaryResult.trim().replace(/^"|"$/g, ""); // strip quotes
    const summaryTextarea = document.getElementById("summary");
    summaryTextarea.value = cleanSummary;
    updateCharCounter(cleanSummary.length);
    
    resumeState.summary = cleanSummary;
    triggerAutoSave();
    updateProgress();
    updatePreview();
    
    showToast("✨ Professional summary generated successfully!", "success");

  } catch (err) {
    console.error("AI Generation failure: ", err);
    showToast("❌ AI generation failed. Check key, CORS policy, or try again.", "error");
  } finally {
    hideAILoading();
  }
}

function showAILoading() {
  document.getElementById("aiShimmer").classList.add("shimmering");
  const btn = document.getElementById("aiGenerateBtn");
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating...`;
}

function hideAILoading() {
  document.getElementById("aiShimmer").classList.remove("shimmering");
  const btn = document.getElementById("aiGenerateBtn");
  btn.disabled = false;
  btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> <span>✨ Generate with AI</span>`;
}

// ==========================================================================
// TOAST NOTIFICATION STACKABLE SYSTEM
// ==========================================================================

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast-card ${type}`;
  
  let icon = '<i class="fa-solid fa-circle-info toast-icon"></i>';
  if (type === "success") icon = '<i class="fa-solid fa-circle-check toast-icon"></i>';
  if (type === "error") icon = '<i class="fa-solid fa-circle-xmark toast-icon"></i>';
  if (type === "warning") icon = '<i class="fa-solid fa-triangle-exclamation toast-icon"></i>';

  toast.innerHTML = `${icon} <span>${message}</span>`;
  
  // Click to dismiss
  toast.addEventListener("click", () => {
    dismissToast(toast);
  });

  container.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => {
    dismissToast(toast);
  }, 3000);
}

function dismissToast(toast) {
  if (toast.classList.contains("removing")) return;
  toast.classList.add("removing");
  setTimeout(() => {
    toast.remove();
  }, 300);
}

// ==========================================================================
// TEMPLATE SWITCHER RENDERER
// ==========================================================================

const templateMetadata = [
  { name: "The Executive", stripe: "#1a1a1a" },
  { name: "The Creative", stripe: "#4f46e5" },
  { name: "The Minimalist", stripe: "#94a3b8" },
  { name: "The Bold", stripe: "#0f172a" },
  { name: "The Developer", stripe: "#10b981" },
  { name: "The Designer", stripe: "#7c3aed" },
  { name: "The Elegant", stripe: "#f43f5e" },
  { name: "The Corporate", stripe: "#1d4ed8" },
  { name: "The Fresh Graduate", stripe: "#0891b2" },
  { name: "The Compact", stripe: "#475569" }
];

function initTemplateSwitcher() {
  const row = document.getElementById("templatesRow");
  row.innerHTML = "";

  templateMetadata.forEach((meta, idx) => {
    const tNum = idx + 1;
    const card = document.createElement("div");
    card.className = "template-card";
    if (resumeState.selectedTemplate === tNum) {
      card.classList.add("active-template");
    }

    card.innerHTML = `
      <div class="template-card-stripe" style="background-color: ${meta.stripe};"></div>
      <span class="template-card-name">${meta.name}</span>
      <span class="template-card-num">T${tNum}</span>
    `;

    card.addEventListener("click", () => {
      // Deactivate other items
      document.querySelectorAll(".template-card").forEach(c => c.classList.remove("active-template"));
      card.classList.add("active-template");

      // Swap template classes in Preview
      switchTemplateClass(tNum);
      
      showToast(`🎨 Template ${tNum} applied: ${meta.name}`, "success");
    });

    row.appendChild(card);
  });
}

function switchTemplateClass(tNum) {
  const preview = document.getElementById("resumePreview");
  
  preview.classList.add("switching");
  
  setTimeout(() => {
    // Remove all standard template-X classes
    for (let i = 1; i <= 10; i++) {
      preview.classList.remove(`template-${i}`);
    }
    
    preview.classList.add(`template-${tNum}`);
    resumeState.selectedTemplate = tNum;
    
    // Auto-save the template choice
    triggerAutoSave();
    
    // Re-render contents inside newly styled classes
    updatePreview();
    
    preview.classList.remove("switching");
  }, 150); // slight transition gap
}

// ==========================================================================
// RESUME COMPILER & RENDERER (LIVE PREVIEW)
// ==========================================================================

function updatePreview() {
  const preview = document.getElementById("resumePreview");
  const tNum = resumeState.selectedTemplate;

  // Clear current preview contents
  preview.innerHTML = "";

  const name = document.getElementById("fullName").value.trim();
  const jobTitle = document.getElementById("jobTitle").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const location = document.getElementById("location").value.trim();
  const linkedin = document.getElementById("linkedin").value.trim();
  const portfolio = document.getElementById("portfolio").value.trim();
  const summary = document.getElementById("summary").value.trim();

  // Guard for completely empty states
  if (!name && !jobTitle && !email && !phone && !summary && resumeState.skills.length === 0) {
    preview.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-size: 14px; text-align: center;">
      <i class="fa-solid fa-file-invoice" style="font-size: 48px; margin-bottom: 12px; color: #cbd5e1;"></i>
      <p>Your resume live preview will appear here.</p>
      <p style="font-size: 12px; margin-top: 4px;">Start typing your personal details in the form.</p>
    </div>`;
    return;
  }

  // Compile individual elements
  const zoom = resumeState.personal.photoZoom || 100;
  const x = resumeState.personal.photoX || 0;
  const y = resumeState.personal.photoY || 0;
  
  const photoHTML = resumeState.personal.photo ? `
    <div class="photo-avatar-container">
      <img src="${resumeState.personal.photo}" class="photo-avatar" alt="Avatar" style="transform: scale(${zoom / 100}) translate(${x}px, ${y}px); transform-origin: center;">
    </div>
  ` : '';
  
  // Skills tags
  let skillsHTML = "";
  if (resumeState.skills.length > 0) {
    skillsHTML = resumeState.skills.map(s => `<span class="skill-chip">${s}</span>`).join("");
  }

  // Experience mapping
  let expHTML = "";
  if (resumeState.experience.length > 0) {
    expHTML = resumeState.experience.map(exp => {
      if (!exp.company && !exp.role) return "";
      const dates = exp.current ? `${formatDate(exp.startDate)} — Present` : `${formatDate(exp.startDate)} — ${formatDate(exp.endDate)}`;
      return `
        <div class="resume-item">
          <div class="item-header">
            <span>${exp.role || "Job Title"}</span>
            <span>${dates}</span>
          </div>
          <div class="item-sub">
            <span>${exp.company || "Company"}</span>
          </div>
          ${exp.description ? `<p class="item-desc">${exp.description.replace(/\n/g, '<br>')}</p>` : ''}
        </div>
      `;
    }).join("");
  }

  // Education mapping
  let eduHTML = "";
  if (resumeState.education.length > 0) {
    eduHTML = resumeState.education.map(edu => {
      if (!edu.institution) return "";
      const dates = (edu.startYear || edu.endYear) ? `${edu.startYear || ''} — ${edu.endYear || ''}` : '';
      return `
        <div class="resume-item">
          <div class="item-header">
            <span>${edu.degree || "Degree / Field of Study"}</span>
            <span>${dates}</span>
          </div>
          <div class="item-sub">
            <span>${edu.institution}</span>
            ${edu.grade ? `<span>${edu.grade}</span>` : ''}
          </div>
        </div>
      `;
    }).join("");
  }

  // Projects mapping
  let projHTML = "";
  if (resumeState.projects.length > 0) {
    projHTML = resumeState.projects.map(p => {
      if (!p.name) return "";
      return `
        <div class="resume-item">
          <div class="item-header">
            <span>${p.name}</span>
            ${p.link ? `<span><a href="${p.link}" target="_blank" style="color: inherit; text-decoration: none;"><i class="fa-solid fa-link" style="font-size:10px;"></i> Link</a></span>` : ''}
          </div>
          ${p.techStack ? `<div class="item-sub" style="font-weight: 500;">Tech: ${p.techStack}</div>` : ''}
          ${p.description ? `<p class="item-desc">${p.description.replace(/\n/g, '<br>')}</p>` : ''}
        </div>
      `;
    }).join("");
  }

  // Certifications mapping
  let certHTML = "";
  if (resumeState.certifications.length > 0) {
    certHTML = resumeState.certifications.map(c => {
      if (!c.name) return "";
      return `
        <div class="resume-item" style="margin-bottom: 8px;">
          <div class="item-header">
            <span>${c.name}</span>
            <span>${c.year || ''}</span>
          </div>
          ${c.issuer ? `<div class="item-sub">${c.issuer}</div>` : ''}
        </div>
      `;
    }).join("");
  }

  // Languages mapping
  let langHTML = "";
  if (resumeState.languages.length > 0) {
    langHTML = resumeState.languages.map(l => {
      if (!l.language) return "";
      return `
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
          <span style="font-weight:600;">${l.language}</span>
          <span style="font-style:italic;">${l.proficiency}</span>
        </div>
      `;
    }).join("");
  }

  // Hiding sections helper
  const hasContact = (email || phone || location || linkedin || portfolio);
  const checkSection = (html) => html.trim().length > 0;

  // ==========================================================================
  // TEMPLATES COMPILATION CODES
  // ==========================================================================

  if (tNum === 1) {
    // ----------------------------------------------------
    // TEMPLATE 1 — "The Executive" (Classic Serif Single-Column)
    // ----------------------------------------------------
    preview.innerHTML = `
      <div class="resume-header" style="${photoHTML ? 'display: flex; align-items: center; justify-content: space-between; text-align: left;' : ''}">
        <div style="${photoHTML ? 'flex: 1;' : ''}">
          <h1 class="resume-name">${name || "Your Name"}</h1>
          ${jobTitle ? `<div class="resume-title">${jobTitle}</div>` : ''}
          ${hasContact ? `
            <div class="resume-contact" style="${photoHTML ? 'justify-content: flex-start;' : ''}">
              ${email ? `<span><i class="fa-solid fa-envelope"></i> ${email}</span>` : ''}
              ${phone ? `<span><i class="fa-solid fa-phone"></i> ${phone}</span>` : ''}
              ${location ? `<span><i class="fa-solid fa-location-dot"></i> ${location}</span>` : ''}
              ${linkedin ? `<span><i class="fa-brands fa-linkedin"></i> ${linkedin}</span>` : ''}
              ${portfolio ? `<span><i class="fa-solid fa-globe"></i> ${portfolio}</span>` : ''}
            </div>
          ` : ''}
        </div>
        ${photoHTML}
      </div>
      
      ${summary ? `
        <div class="resume-section">
          <h3 class="section-title">Professional Summary</h3>
          <p class="summary-text">${summary}</p>
        </div>
      ` : ''}

      ${checkSection(expHTML) ? `
        <div class="resume-section">
          <h3 class="section-title">Work Experience</h3>
          ${expHTML}
        </div>
      ` : ''}

      ${checkSection(eduHTML) ? `
        <div class="resume-section">
          <h3 class="section-title">Education</h3>
          ${eduHTML}
        </div>
      ` : ''}

      ${checkSection(projHTML) ? `
        <div class="resume-section">
          <h3 class="section-title">Projects</h3>
          ${projHTML}
        </div>
      ` : ''}

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        ${checkSection(skillsHTML) ? `
          <div class="resume-section">
            <h3 class="section-title">Skills</h3>
            <div class="skills-tags">${skillsHTML}</div>
          </div>
        ` : ''}
        
        ${checkSection(certHTML) || checkSection(langHTML) ? `
          <div class="resume-section">
            ${checkSection(certHTML) ? `
              <h3 class="section-title">Certifications</h3>
              ${certHTML}
            ` : ''}
            ${checkSection(langHTML) ? `
              <h3 class="section-title" style="margin-top:15px;">Languages</h3>
              ${langHTML}
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  } else if (tNum === 2) {
    // ----------------------------------------------------
    // TEMPLATE 2 — "The Creative" (Indigo Left Sidebar Column)
    // ----------------------------------------------------
    preview.innerHTML = `
      <aside class="sidebar">
        ${photoHTML}
        <div>
          <h1 class="resume-name">${name || "Your Name"}</h1>
          ${jobTitle ? `<div class="resume-title">${jobTitle}</div>` : ''}
        </div>
        
        ${hasContact ? `
          <div>
            <h3 class="sidebar-section-title"><i class="fa-solid fa-address-book"></i> Contact</h3>
            <div class="contact-list">
              ${email ? `<div class="contact-item"><i class="fa-solid fa-envelope"></i> ${email}</div>` : ''}
              ${phone ? `<div class="contact-item"><i class="fa-solid fa-phone"></i> ${phone}</div>` : ''}
              ${location ? `<div class="contact-item"><i class="fa-solid fa-location-dot"></i> ${location}</div>` : ''}
              ${linkedin ? `<div class="contact-item"><i class="fa-brands fa-linkedin"></i> ${linkedin}</div>` : ''}
              ${portfolio ? `<div class="contact-item"><i class="fa-solid fa-globe"></i> ${portfolio}</div>` : ''}
            </div>
          </div>
        ` : ''}

        ${checkSection(skillsHTML) ? `
          <div>
            <h3 class="sidebar-section-title"><i class="fa-solid fa-gears"></i> Skills</h3>
            <div style="margin: -3px;">${skillsHTML}</div>
          </div>
        ` : ''}

        ${checkSection(langHTML) ? `
          <div>
            <h3 class="sidebar-section-title"><i class="fa-solid fa-language"></i> Languages</h3>
            ${langHTML}
          </div>
        ` : ''}
      </aside>
      
      <main class="main-content">
        ${summary ? `
          <div>
            <h3 class="section-title"><i class="fa-solid fa-user-tie"></i> Profile</h3>
            <p class="summary-text">${summary}</p>
          </div>
        ` : ''}

        ${checkSection(expHTML) ? `
          <div>
            <h3 class="section-title"><i class="fa-solid fa-briefcase"></i> Experience</h3>
            ${expHTML}
          </div>
        ` : ''}

        ${checkSection(eduHTML) ? `
          <div>
            <h3 class="section-title"><i class="fa-solid fa-graduation-cap"></i> Education</h3>
            ${eduHTML}
          </div>
        ` : ''}

        ${checkSection(projHTML) ? `
          <div>
            <h3 class="section-title"><i class="fa-solid fa-laptop-code"></i> Projects</h3>
            ${projHTML}
          </div>
        ` : ''}

        ${checkSection(certHTML) ? `
          <div>
            <h3 class="section-title"><i class="fa-solid fa-award"></i> Certifications</h3>
            ${certHTML}
          </div>
        ` : ''}
      </main>
    `;
  } else if (tNum === 3) {
    // ----------------------------------------------------
    // TEMPLATE 3 — "The Minimalist" (Whitespace Light Design)
    // ----------------------------------------------------
    preview.innerHTML = `
      <div style="margin-bottom: 30px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <h1 class="resume-name" style="font-weight: 300;">${name || "Your Name"}</h1>
          ${jobTitle ? `<div class="resume-title" style="letter-spacing: 1px;">${jobTitle}</div>` : ''}
          ${hasContact ? `
            <div class="resume-contact" style="border-bottom: none; padding-bottom: 0; margin-bottom: 0;">
              ${email ? `<span>${email}</span>` : ''}
              ${phone ? `<span>${phone}</span>` : ''}
              ${location ? `<span>${location}</span>` : ''}
              ${linkedin ? `<span>${linkedin}</span>` : ''}
            </div>
          ` : ''}
        </div>
        ${photoHTML}
      </div>

      ${summary ? `
        <div class="resume-section">
          <div class="section-left">Summary</div>
          <div class="section-right">
            <p class="summary-text">${summary}</p>
          </div>
        </div>
      ` : ''}

      ${checkSection(expHTML) ? `
        <div class="resume-section">
          <div class="section-left">Experience</div>
          <div class="section-right">${expHTML}</div>
        </div>
      ` : ''}

      ${checkSection(eduHTML) ? `
        <div class="resume-section">
          <div class="section-left">Education</div>
          <div class="section-right">${eduHTML}</div>
        </div>
      ` : ''}

      ${checkSection(projHTML) ? `
        <div class="resume-section">
          <div class="section-left">Projects</div>
          <div class="section-right">${projHTML}</div>
        </div>
      ` : ''}

      ${checkSection(skillsHTML) ? `
        <div class="resume-section">
          <div class="section-left">Skills</div>
          <div class="section-right">${skillsHTML}</div>
        </div>
      ` : ''}

      ${checkSection(certHTML) ? `
        <div class="resume-section">
          <div class="section-left">Awards</div>
          <div class="section-right">${certHTML}</div>
        </div>
      ` : ''}
    `;
  } else if (tNum === 4) {
    // ----------------------------------------------------
    // TEMPLATE 4 — "The Bold" (High Contrast Bold Header)
    // ----------------------------------------------------
    preview.innerHTML = `
      <div class="header-dark">
        <div>
          <h1 class="resume-name">${name || "Your Name"}</h1>
          ${jobTitle ? `<div class="resume-title">${jobTitle}</div>` : ''}
        </div>
        ${photoHTML}
      </div>
      
      ${hasContact ? `
        <div class="contact-bar">
          ${email ? `<span><i class="fa-solid fa-envelope" style="color:var(--accent);"></i> ${email}</span>` : ''}
          ${phone ? `<span><i class="fa-solid fa-phone" style="color:var(--accent);"></i> ${phone}</span>` : ''}
          ${location ? `<span><i class="fa-solid fa-location-dot" style="color:var(--accent);"></i> ${location}</span>` : ''}
          ${linkedin ? `<span><i class="fa-brands fa-linkedin" style="color:var(--accent);"></i> ${linkedin}</span>` : ''}
        </div>
      ` : ''}

      <div class="main-body">
        ${summary ? `
          <div>
            <h3 class="section-title">About Me</h3>
            <p class="summary-text">${summary}</p>
          </div>
        ` : ''}

        ${checkSection(expHTML) ? `
          <div>
            <h3 class="section-title">Experience</h3>
            ${expHTML}
          </div>
        ` : ''}

        ${checkSection(eduHTML) ? `
          <div>
            <h3 class="section-title">Education</h3>
            ${eduHTML}
          </div>
        ` : ''}

        ${checkSection(projHTML) ? `
          <div>
            <h3 class="section-title">Key Projects</h3>
            ${projHTML}
          </div>
        ` : ''}

        ${checkSection(skillsHTML) ? `
          <div>
            <h3 class="section-title">Expertise</h3>
            <div style="margin: -3px;">${skillsHTML}</div>
          </div>
        ` : ''}
      </div>
    `;
  } else if (tNum === 5) {
    // ----------------------------------------------------
    // TEMPLATE 5 — "The Developer" (Terminal Code Monospace Layout)
    // ----------------------------------------------------
    preview.innerHTML = `
      <div class="terminal-header" style="${photoHTML ? 'display: flex; justify-content: space-between; align-items: center;' : ''}">
        <div>
          <div class="terminal-name">&gt; <span class="terminal-cursor">${name || "Your_Name"}</span></div>
          ${jobTitle ? `<div class="terminal-title"># ${jobTitle}</div>` : ''}
          ${hasContact ? `
            <div class="terminal-contact">
              /* Contact Details */
              <div>Email: "${email || ''}"</div>
              <div>Phone: "${phone || ''}"</div>
              ${location ? `<div>Location: "${location}"</div>` : ''}
              ${linkedin ? `<div>LinkedIn: "${linkedin}"</div>` : ''}
            </div>
          ` : ''}
        </div>
        ${photoHTML}
      </div>
      
      <div class="main-body">
        ${summary ? `
          <div class="resume-section">
            <h3 class="section-title">// Summary</h3>
            <p class="summary-text" style="font-family:var(--font-mono); font-size:12px;">${summary}</p>
          </div>
        ` : ''}

        ${checkSection(expHTML) ? `
          <div class="resume-section">
            <h3 class="section-title">// Work_History</h3>
            ${expHTML}
          </div>
        ` : ''}

        ${checkSection(eduHTML) ? `
          <div class="resume-section">
            <h3 class="section-title">// Education_Subroutine</h3>
            ${eduHTML}
          </div>
        ` : ''}

        ${checkSection(projHTML) ? `
          <div class="resume-section">
            <h3 class="section-title">// Projects_Repository</h3>
            ${projHTML}
          </div>
        ` : ''}

        ${checkSection(skillsHTML) ? `
          <div class="resume-section">
            <h3 class="section-title">// Stack_Capabilities</h3>
            <div style="margin: -3px;">${skillsHTML}</div>
          </div>
        ` : ''}
      </div>
    `;
  } else if (tNum === 6) {
    // ----------------------------------------------------
    // TEMPLATE 6 — "The Designer" (Diagonal Cut Creative Design)
    // ----------------------------------------------------
    preview.innerHTML = `
      <div class="diagonal-header" style="${photoHTML ? 'display: flex; justify-content: space-between; align-items: center;' : ''}">
        <div>
          <h1 class="resume-name">${name || "Your Name"}</h1>
          ${jobTitle ? `<div class="resume-title">${jobTitle}</div>` : ''}
          ${hasContact ? `
            <div class="resume-contact">
              ${email ? `<span><i class="fa-solid fa-at"></i> ${email}</span>` : ''}
              ${phone ? `<span><i class="fa-solid fa-mobile-screen"></i> ${phone}</span>` : ''}
              ${location ? `<span><i class="fa-solid fa-map-pin"></i> ${location}</span>` : ''}
            </div>
          ` : ''}
        </div>
        ${photoHTML}
      </div>
      
      <div class="main-body">
        ${summary ? `
          <div>
            <h3 class="section-title">Design Philosophy</h3>
            <p class="summary-text">${summary}</p>
          </div>
        ` : ''}

        ${checkSection(expHTML) ? `
          <div>
            <h3 class="section-title">Creative Journey</h3>
            ${expHTML}
          </div>
        ` : ''}

        ${checkSection(eduHTML) ? `
          <div>
            <h3 class="section-title">Qualifications</h3>
            ${eduHTML}
          </div>
        ` : ''}

        ${checkSection(projHTML) ? `
          <div>
            <h3 class="section-title">Exhibitions / Projects</h3>
            ${projHTML}
          </div>
        ` : ''}

        ${checkSection(skillsHTML) ? `
          <div>
            <h3 class="section-title">Toolkits</h3>
            <div style="margin: -3px;">${skillsHTML}</div>
          </div>
        ` : ''}
      </div>
    `;
  } else if (tNum === 7) {
    // ----------------------------------------------------
    // TEMPLATE 7 — "The Elegant" (Sophisticated Rose Italics)
    // ----------------------------------------------------
    preview.innerHTML = `
      <div class="header-elegant">
        ${photoHTML ? `<div style="display: flex; justify-content: center; margin-bottom: 12px;">${photoHTML}</div>` : ''}
        <h1 class="resume-name">${name || "Your Name"}</h1>
        <div class="elegant-divider" style="width: 100px;"></div>
        ${jobTitle ? `<div class="resume-title">${jobTitle}</div>` : ''}
        ${hasContact ? `
          <div class="resume-contact">
            ${email ? `<span>${email}</span>` : ''}
            <span>•</span>
            ${phone ? `<span>${phone}</span>` : ''}
            ${location ? `<span>•</span><span>${location}</span>` : ''}
          </div>
        ` : ''}
      </div>

      ${summary ? `
        <div class="resume-section">
          <h3 class="section-title">Aspirations</h3>
          <div class="elegant-divider"></div>
          <p class="summary-text" style="font-style:italic;">"${summary}"</p>
        </div>
      ` : ''}

      ${checkSection(expHTML) ? `
        <div class="resume-section">
          <h3 class="section-title">Professional Chronicles</h3>
          <div class="elegant-divider"></div>
          ${expHTML}
        </div>
      ` : ''}

      ${checkSection(eduHTML) ? `
        <div class="resume-section">
          <h3 class="section-title">Academic Background</h3>
          <div class="elegant-divider"></div>
          ${eduHTML}
        </div>
      ` : ''}

      ${checkSection(skillsHTML) ? `
        <div class="resume-section" style="text-align: center;">
          <h3 class="section-title">Core Aptitudes</h3>
          <div class="elegant-divider"></div>
          <div style="margin: -3px; display:flex; justify-content:center; flex-wrap:wrap;">${skillsHTML}</div>
        </div>
      ` : ''}
    `;
  } else if (tNum === 8) {
    // ----------------------------------------------------
    // TEMPLATE 8 — "The Corporate" (Safe Traditional Blue 2-Col)
    // ----------------------------------------------------
    preview.innerHTML = `
      <div class="corporate-header">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h1 class="resume-name">${name || "Your Name"}</h1>
            ${jobTitle ? `<div class="resume-title">${jobTitle}</div>` : ''}
          </div>
          ${photoHTML}
        </div>
        ${hasContact ? `
          <div class="resume-contact">
            ${email ? `<span><i class="fa-solid fa-envelope"></i> ${email}</span>` : ''}
            ${phone ? `<span><i class="fa-solid fa-phone"></i> ${phone}</span>` : ''}
            ${location ? `<span><i class="fa-solid fa-location-dot"></i> ${location}</span>` : ''}
            ${linkedin ? `<span><i class="fa-brands fa-linkedin"></i> ${linkedin}</span>` : ''}
          </div>
        ` : ''}
      </div>

      <div class="main-body">
        <div class="left-col">
          ${summary ? `
            <div>
              <h3 class="section-title">Executive Summary</h3>
              <p class="summary-text">${summary}</p>
            </div>
          ` : ''}

          ${checkSection(expHTML) ? `
            <div>
              <h3 class="section-title">Employment History</h3>
              ${expHTML}
            </div>
          ` : ''}

          ${checkSection(projHTML) ? `
            <div>
              <h3 class="section-title">Major Projects</h3>
              ${projHTML}
            </div>
          ` : ''}
        </div>
        
        <div class="right-col">
          ${checkSection(skillsHTML) ? `
            <div>
              <h3 class="section-title">Skills & Proficiencies</h3>
              <div style="margin: -3px;">${skillsHTML}</div>
            </div>
          ` : ''}

          ${checkSection(eduHTML) ? `
            <div>
              <h3 class="section-title">Education</h3>
              ${eduHTML}
            </div>
          ` : ''}

          ${checkSection(certHTML) ? `
            <div>
              <h3 class="section-title">Certifications</h3>
              ${certHTML}
            </div>
          ` : ''}

          ${checkSection(langHTML) ? `
            <div>
              <h3 class="section-title">Languages</h3>
              ${langHTML}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } else if (tNum === 9) {
    // ----------------------------------------------------
    // TEMPLATE 9 — "The Fresh Graduate" (Cyan Header & Colorful Pills)
    // ----------------------------------------------------
    preview.innerHTML = `
      <div class="graduate-header" style="${photoHTML ? 'display: flex; align-items: center; justify-content: space-between; text-align: left; padding: 30px 40px;' : ''}">
        <div style="${photoHTML ? 'flex: 1;' : ''}">
          <h1 class="resume-name">${name || "Your Name"}</h1>
          ${jobTitle ? `<div class="resume-title">${jobTitle}</div>` : ''}
          ${hasContact ? `
            <div class="resume-contact" style="${photoHTML ? 'justify-content: flex-start;' : ''}">
              ${email ? `<span><i class="fa-solid fa-envelope"></i> ${email}</span>` : ''}
              ${phone ? `<span><i class="fa-solid fa-phone"></i> ${phone}</span>` : ''}
              ${location ? `<span><i class="fa-solid fa-location-dot"></i> ${location}</span>` : ''}
            </div>
          ` : ''}
        </div>
        ${photoHTML}
      </div>

      <div class="main-body">
        ${summary ? `
          <div class="resume-section">
            <h3 class="section-title">Professional Intro</h3>
            <p class="summary-text">${summary}</p>
          </div>
        ` : ''}

        ${checkSection(expHTML) ? `
          <div class="resume-section">
            <h3 class="section-title">Internships / Experience</h3>
            ${expHTML}
          </div>
        ` : ''}

        ${checkSection(eduHTML) ? `
          <div class="resume-section">
            <h3 class="section-title">Education History</h3>
            ${eduHTML}
          </div>
        ` : ''}

        ${checkSection(projHTML) ? `
          <div class="resume-section">
            <h3 class="section-title">Academic Projects</h3>
            ${projHTML}
          </div>
        ` : ''}

        ${checkSection(skillsHTML) ? `
          <div class="resume-section">
            <h3 class="section-title">Skills</h3>
            <div style="margin: -3px;">${skillsHTML}</div>
          </div>
        ` : ''}
      </div>
    `;
  } else if (tNum === 10) {
    // ----------------------------------------------------
    // TEMPLATE 10 — "The Compact" (Dense High Info Layout)
    // ----------------------------------------------------
    preview.innerHTML = `
      <div class="compact-header" style="${photoHTML ? 'display: flex; align-items: center; justify-content: space-between;' : ''}">
        <div>
          <h1 class="resume-name">${name || "Your Name"}</h1>
          ${jobTitle ? `<div class="resume-title">${jobTitle}</div>` : ''}
          ${hasContact ? `
            <div class="resume-contact">
              ${email ? `<span>${email}</span>` : ''}
              ${phone ? `<span>| ${phone}</span>` : ''}
              ${location ? `<span>| ${location}</span>` : ''}
              ${linkedin ? `<span>| ${linkedin}</span>` : ''}
            </div>
          ` : ''}
        </div>
        ${photoHTML}
      </div>

      <div class="main-body">
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${summary ? `
            <div class="resume-section">
              <h3 class="section-title">Summary</h3>
              <p class="summary-text">${summary}</p>
            </div>
          ` : ''}

          ${checkSection(expHTML) ? `
            <div class="resume-section">
              <h3 class="section-title">Experience</h3>
              ${expHTML}
            </div>
          ` : ''}
        </div>
        
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${checkSection(skillsHTML) ? `
            <div class="resume-section">
              <h3 class="section-title">Skills</h3>
              <div style="margin: -2px;">${skillsHTML}</div>
            </div>
          ` : ''}

          ${checkSection(eduHTML) ? `
            <div class="resume-section">
              <h3 class="section-title">Education</h3>
              ${eduHTML}
            </div>
          ` : ''}

          ${checkSection(projHTML) ? `
            <div class="resume-section">
              <h3 class="section-title">Projects</h3>
              ${projHTML}
            </div>
          ` : ''}

          ${checkSection(certHTML) ? `
            <div class="resume-section">
              <h3 class="section-title">Certifications</h3>
              ${certHTML}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

// Helpers
function formatDate(monthStr) {
  if (!monthStr) return "";
  const d = new Date(monthStr + "-02"); // avoid time-zone off-by-one errors
  if (isNaN(d.getTime())) return monthStr;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ==========================================================================
// FORM VALIDATIONS & PRINT EXPORTER (PDF GENERATION)
// ==========================================================================

function highlightInvalidField(field, errorText) {
  const group = field.closest(".form-group");
  group.classList.add("invalid");
  
  const errorMsg = group.querySelector(".error-msg");
  if (errorMsg) {
    errorMsg.innerText = errorText;
    errorMsg.classList.remove("hidden");
  }

  // Remove validation effects when correcting fields
  field.addEventListener("input", function removeVal() {
    group.classList.remove("invalid");
    if (errorMsg) errorMsg.classList.add("hidden");
    field.removeEventListener("input", removeVal);
  });
}

function validateForm() {
  let isValid = true;
  let firstInvalidField = null;

  const nameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");

  // Validate Name
  if (!nameInput.value.trim()) {
    highlightInvalidField(nameInput, "Full name is required");
    isValid = false;
    if (!firstInvalidField) firstInvalidField = nameInput;
  }

  // Validate Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailInput.value.trim()) {
    highlightInvalidField(emailInput, "Email is required");
    isValid = false;
    if (!firstInvalidField) firstInvalidField = emailInput;
  } else if (!emailRegex.test(emailInput.value.trim())) {
    highlightInvalidField(emailInput, "Please enter a valid email address");
    isValid = false;
    if (!firstInvalidField) firstInvalidField = emailInput;
  }

  // Validate Phone
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{8,15}$/;
  if (!phoneInput.value.trim()) {
    highlightInvalidField(phoneInput, "Phone number is required");
    isValid = false;
    if (!firstInvalidField) firstInvalidField = phoneInput;
  } else if (!phoneRegex.test(phoneInput.value.trim())) {
    highlightInvalidField(phoneInput, "Please enter a valid phone number (8-15 digits)");
    isValid = false;
    if (!firstInvalidField) firstInvalidField = phoneInput;
  }

  if (!isValid && firstInvalidField) {
    // Scroll smoothly and expand its collapsible parent card if collapsed
    const parentCard = firstInvalidField.closest(".collapsible-card");
    if (parentCard && parentCard.classList.contains("collapsed")) {
      parentCard.classList.remove("collapsed");
    }
    
    firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" });
    firstInvalidField.focus();
    showToast("⚠️ Please correct form errors before exporting.", "error");
  }

  return isValid;
}

// Bind PDF download button
document.getElementById("downloadBtn").addEventListener("click", downloadPDF);

function downloadPDF() {
  if (!validateForm()) return;
  
  const btn = document.getElementById("downloadBtn");
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating...`;
  btn.classList.remove("pulsing");
  btn.disabled = true;
  
  const element = document.getElementById("resumePreview");
  const name = document.getElementById("fullName").value || "Resume";
  
  const opt = {
    margin: 0,
    filename: `${name.replace(/\s+/g, '_')}_Resume.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { 
      scale: 2.5, 
      useCORS: true, 
      allowTaint: true,
      logging: false
    },
    jsPDF: { 
      unit: "mm", 
      format: "a4", 
      orientation: "portrait" 
    }
  };
  
  html2pdf().set(opt).from(element).save().then(() => {
    btn.innerHTML = `<i class="fa-solid fa-download"></i> <span>Download PDF</span>`;
    btn.classList.add("pulsing");
    btn.disabled = false;
    showToast("✓ Resume downloaded successfully!", "success");
  }).catch((err) => {
    console.error("PDF generation error:", err);
    btn.innerHTML = `<i class="fa-solid fa-download"></i> <span>Download PDF</span>`;
    btn.classList.add("pulsing");
    btn.disabled = false;
    showToast("❌ PDF Generation failed.", "error");
  });
}
