// State Management
let contacts = [];
let routingMode = 'auto';
let themeControlMode = 'auto';
let manualTheme = 'dark';
let manualEmail = "";
let currentRawTSV = "";
let lastFiredEmail = "";

const icons = {
    moon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    sun: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
    sunset: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 9V2"/><path d="m9 11 3-3 3 3"/><path d="M22 22H2"/><path d="m8 22 4-10 4 10"/></svg>`,
    user: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
};

function parseTSV(tsv) {
    if (!tsv || typeof Papa === 'undefined') return [];
    try {
        const parsed = Papa.parse(tsv.trim(), { delimiter: "\t", skipEmptyLines: true });
        return parsed.data.map(row => ({
            name: row[0] || "Unknown",
            email: row[1] || "",
            role: row[2] || "Staff",
            shiftStart: parseInt(row[3]) || 0,
            shiftEnd: parseInt(row[4]) || 0,
            iconType: row[5] || "user"
        }));
    } catch(e) { return []; }
}

function convertWinCCToCssColor(winccColor) {
    var c = winccColor >>> 0;
    var b = c & 0xFF; var g = (c & 0xFF00) >>> 8; var r = (c & 0xFF0000) >>> 16; var a = ((c & 0xFF000000) >>> 24) / 255;
    return 'rgba(' + [r, g, b, a].join(',') + ')';
}

function setMode(mode) {
    routingMode = mode;
    // We don't need to update autoSelectByShift as we handle selection manually based on mode in updateUI
    updateUI();
}

function toggleThemeManual() {
    themeControlMode = 'manual';
    manualTheme = manualTheme === 'dark' ? 'light' : 'dark';
    updateUI();
}

function toggleEditor() {
    const modal = document.getElementById('tsv-editor-overlay');
    if (modal.style.display === 'flex') modal.style.display = 'none';
    else {
        document.getElementById('tsvInput').value = currentRawTSV;
        modal.style.display = 'flex';
    }
}

function applySettings() {
    const tsv = document.getElementById('tsvInput').value.trim();
    currentRawTSV = tsv;
    contacts = parseTSV(tsv);
    if (window.WebCC) {
        WebCC.Properties.tsvSource = tsv;
        // You might want to fire an event here if you want to notify about data change, but not strictly required
    }
    toggleEditor();
    updateUI();
}

function exportTSV() {
    const blob = new Blob([currentRawTSV], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'shifts.tsv'; a.click();
}

function importTSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { document.getElementById('tsvInput').value = ev.target.result; applySettings(); };
    reader.readAsText(file);
}

function updateUI() {
    const now = new Date();
    // Use WebCC.Properties if available, otherwise fallback to local variables or defaults
    const hour = (window.WebCC && WebCC.Properties && WebCC.Properties.systemHour !== undefined) ? WebCC.Properties.systemHour : now.getHours();

    document.getElementById('current-time-display').textContent = now.toLocaleTimeString();

    document.getElementById('mode-auto').classList.toggle('active', routingMode === 'auto');
    document.getElementById('mode-manual').classList.toggle('active', routingMode === 'manual');

    let activeTheme = manualTheme;
    if (themeControlMode === 'auto') activeTheme = (hour >= 7 && hour < 19) ? 'light' : 'dark';
    document.body.classList.toggle('light-theme', activeTheme === 'light');
    document.getElementById('theme-icon-container').innerHTML = activeTheme === 'light' ? icons.sun : icons.moon;

    const list = document.getElementById('contactList');
    list.innerHTML = '';
    let autoActive = null;

    contacts.forEach(c => {
        let isActive = false;
        if (c.shiftStart > c.shiftEnd) isActive = (hour >= c.shiftStart || hour < c.shiftEnd);
        else isActive = (hour >= c.shiftStart && hour < c.shiftEnd);
        if (isActive) autoActive = c;

        const isSelected = (routingMode === 'auto' && isActive) || (routingMode === 'manual' && manualEmail === c.email);
        const card = document.createElement('div');
        card.className = `premium-card glass-panel p-6 rounded-2xl cursor-pointer ${isActive ? 'shift-active' : 'opacity-40'} ${isSelected ? 'manual-selected' : ''}`;
        card.innerHTML = `<div class="flex justify-between items-center"><div class="flex items-center gap-5"><div class="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">${icons[c.iconType] || icons.user}</div><div><h3 class="font-bold text-lg">${c.name}</h3><p class="text-[10px] uppercase font-black tracking-widest opacity-40">${c.role}</p></div></div><div class="text-right"><div class="text-xs font-mono opacity-60">${c.shiftStart}:00-${c.shiftEnd}:00</div></div></div>`;
        card.onclick = () => { manualEmail = c.email; routingMode = 'manual'; updateUI(); };
        list.appendChild(card);
    });

    const target = (routingMode === 'auto') ? autoActive : contacts.find(c => c.email === manualEmail);
    const email = target ? target.email : "";
    const name = target ? target.name : "";

    document.getElementById('target-name').textContent = name || "-";
    document.getElementById('target-email').textContent = email || "-";
    document.getElementById('payload-to').textContent = email || "-";
    document.getElementById('target-icon').innerHTML = target ? icons[target.iconType] : icons.user;

    if (window.WebCC && WebCC.Properties) {
        if (WebCC.Properties.selectedEmail !== email) {
            WebCC.Properties.selectedEmail = email;
        }
        if (WebCC.Properties.targetName !== name) {
            WebCC.Properties.targetName = name;
        }
    }

    if (email !== lastFiredEmail && email !== "") {
        if (window.WebCC && WebCC.Events) {
            WebCC.Events.fire('SelectionChanged', email);
        }
        lastFiredEmail = email;
    }
}

// Function to initialize default contacts if no TSV is provided
function initDefaultContacts() {
     contacts = [
        { name: "Alex Rivera", email: "a.rivera@industrial.com", role: "Night Supervisor", shiftStart: 22, shiftEnd: 6, iconType: "moon" },
        { name: "Sarah Jenkins", email: "s.jenkins@industrial.com", role: "Morning Lead", shiftStart: 6, shiftEnd: 14, iconType: "sun" },
        { name: "Mark Thompson", email: "m.thompson@industrial.com", role: "Afternoon Lead", shiftStart: 14, shiftEnd: 22, iconType: "sunset" }
    ];
    currentRawTSV = contacts.map(c => `${c.name}\t${c.email}\t${c.role}\t${c.shiftStart}\t${c.shiftEnd}\t${c.iconType}`).join('\n');
    updateUI();
}

window.onload = function() {
    let initialized = false;

    // Attempt to start WebCC
    if (window.WebCC) {
         try {
            WebCC.start(function(result) {
                initialized = true;
                const p = WebCC.Properties || {};
                if (p.tsvSource) {
                    currentRawTSV = p.tsvSource;
                    contacts = parseTSV(currentRawTSV);
                    updateUI();
                } else {
                    initDefaultContacts();
                }
                // Set initial state from WinCC Properties if available
                 if (p.backgroundColor) {
                   document.body.style.backgroundColor = convertWinCCToCssColor(p.backgroundColor);
                }

                setInterval(updateUI, 1000);
            }, {
                methods: {
                    syncFromTSV: function(tsv) { currentRawTSV = tsv; contacts = parseTSV(tsv); updateUI(); },
                    setSystemHour: function(hour) { if(WebCC.Properties) WebCC.Properties.systemHour = hour; updateUI(); }
                },
                events: ['SelectionChanged'],
                properties: {
                    targetName: "",
                    selectedEmail: "",
                    tsvSource: "",
                    backgroundColor: 0xFF0A0F1D,
                    systemHour: 12
                }
            });
         } catch(e) {
             console.error("WebCC.start failed:", e);
         }

        // Timeout to fallback if WebCC.start doesn't call callback (not embedded in iframe correctly or not communicating)
        setTimeout(() => {
            if (!initialized) {
                 console.log("WebCC start timeout, initializing defaults");
                 // We don't remove WebCC here, just init defaults.
                 // If WebCC connects later, it might overwrite this, which is fine.
                 initDefaultContacts();
                 // Make sure we have an interval running if WebCC didn't start it
                 setInterval(updateUI, 1000);
            }
        }, 1000);
    } else {
        // Fallback for browser testing without WebCC
        setTimeout(() => {
             initDefaultContacts();
             setInterval(updateUI, 1000);
        }, 100);
    }
};