import { Habit } from './Habit.js';

class HabitTracker {
    constructor() {
        this.habits = this.load();
        this.profile = this.loadProfile();
        this.mainChart = null;
        this.xpChart = null;
        this.colors = ['#007BFF', '#28A745', '#FFC107', '#FD7E14', '#6F42C1', '#17A2B8', '#6C757D'];
        this.selectedColor = null;
        this.init();
    }

    init() {
        this.renderColorOptions();
        document.getElementById('add-habit').onclick = () => this.add();
        document.getElementById('theme-toggle').onclick = () => this.toggleTheme();
        document.getElementById('save-profile').onclick = () => this.saveProfileData();
        document.getElementById('edit-profile-btn').onclick = () => this.toggleProfileMode(true);
        
        const ctaBtn = document.getElementById('cta-start-btn');
        if (ctaBtn) ctaBtn.onclick = () => this.navigateToTab('list');

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });

        this.applyTheme();
        this.updateProfileUI();
        this.updateHeaderTitle('home');
        this.render();
        this.fetchQuote();
    }

    navigateToTab(target) {
        const btn = document.querySelector(`.tab-btn[data-target="${target}"]`);
        if (btn) btn.click();
    }

    switchTab(e) {
        const target = e.currentTarget.dataset.target;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        e.currentTarget.classList.add('active');
        const targetElement = document.getElementById(`tab-${target}`);
        if (targetElement) targetElement.classList.add('active');

        this.updateHeaderTitle(target);
        if (target === 'stats') this.renderCharts();
    }

    updateHeaderTitle(tab) {
        const header = document.getElementById('dynamic-header');
        const titles = {
            'home': 'Твои привычки формируют твое будущее!',
            'list': 'Чек-лист дня — Отмечай и двигайся дальше',
            'stats': 'Маленькие шаги = большие цифры',
            'profile': `Привет, ${this.profile.firstName}!`
        };
        header.innerText = titles[tab] || 'Habitize';
    }

    renderColorOptions() {
        const container = document.getElementById('color-options');
        if (!container) return;
        container.innerHTML = '';
        this.colors.forEach(color => {
            const div = document.createElement('div');
            div.className = `color-opt ${color === this.selectedColor ? 'active' : ''}`;
            div.style.backgroundColor = color;
            div.onclick = () => { this.selectedColor = color; this.renderColorOptions(); };
            container.appendChild(div);
        });
    }

    loadProfile() {
        return JSON.parse(localStorage.getItem('habitize_prof_v1')) || { firstName: 'Студент', lastName: '', age: '', gender: 'Не указан', goal: '', isFormHidden: false };
    }

    toggleProfileMode(isEdit) {
        document.getElementById('profile-view').style.display = isEdit ? 'none' : 'block';
        document.getElementById('profile-edit').style.display = isEdit ? 'block' : 'none';
    }

    saveProfileData() {
        const fName = document.getElementById('profile-first-name').value.trim();
        const lName = document.getElementById('profile-last-name').value.trim();
        const ageRaw = document.getElementById('profile-age').value.trim();
        const ageVal = parseInt(ageRaw);
        const nameRegex = /^[^\d]+$/;

        if (!fName || !nameRegex.test(fName)) return alert('Введите имя без цифр!');
        if (!lName || !nameRegex.test(lName)) return alert('Введите фамилию без цифр!');
        
        if (ageRaw !== "") {
            if (isNaN(ageVal) || ageVal <= 0) return alert('Введите корректный возраст!');
        }

        this.profile = {
            firstName: fName, lastName: lName, age: ageRaw !== "" ? ageVal : '',
            gender: document.getElementById('profile-gender').value,
            isFormHidden: true
        };
        localStorage.setItem('habitize_prof_v1', JSON.stringify(this.profile));
        this.updateProfileUI();
        this.updateHeaderTitle('profile');
        this.toggleProfileMode(false);
    }

    updateProfileUI() {
        const p = this.profile;
        
        const fnInput = document.getElementById('profile-first-name');
        if (fnInput) fnInput.value = p.firstName;
        
        const lnInput = document.getElementById('profile-last-name');
        if (lnInput) lnInput.value = p.lastName;
        
        const ageInput = document.getElementById('profile-age');
        if (ageInput) ageInput.value = p.age;
        
        const genSelect = document.getElementById('profile-gender');
        if (genSelect) genSelect.value = p.gender;

        const vName = document.getElementById('view-name');
        if (vName) vName.innerText = `${p.firstName} ${p.lastName}`;
        
        const vAgeGen = document.getElementById('view-age-gender');
        if (vAgeGen) vAgeGen.innerText = `${p.age ? p.age + ' лет,' : ''} ${p.gender}`;
        
        this.toggleProfileMode(!p.isFormHidden);
        const totalXP = this.habits.reduce((sum, h) => sum + h.getPoints(), 0);
        document.getElementById('total-stats').innerHTML = `💎 Прогресс в Habitize: <b>${totalXP} XP</b>`;
    }

    async fetchQuote() {
        try {
            const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://zenquotes.io/api/random'));
            const data = await res.json();
            const quote = JSON.parse(data.contents)[0];
            document.querySelector('.quote-text').innerText = `"${quote.q}"`;
            document.querySelector('.quote-author').innerText = "— " + quote.a;
        } catch (e) {
            document.querySelector('.quote-text').innerText = "Дисциплина — это свобода.";
        }
    }

    renderCharts() {
        const ctxMain = document.getElementById('statsChart').getContext('2d');
        if (this.mainChart) this.mainChart.destroy();
        this.mainChart = new Chart(ctxMain, {
            type: 'bar',
            data: {
                labels: this.habits.map(h => h.name),
                datasets: [{
                    data: this.habits.map(h => h.steps.filter(s => s === 'done').length),
                    backgroundColor: this.habits.map(h => h.color),
                    borderRadius: 8
                }]
            },
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 28 } } }
        });

        const ctxXP = document.getElementById('xpHistoryChart').getContext('2d');
        if (this.xpChart) this.xpChart.destroy();
        let dailyXP = new Array(28).fill(0);
        this.habits.forEach(h => {
            h.steps.forEach((step, index) => {
                dailyXP[index] += step === 'done' ? 10 : (step === 'miss' ? -5 : 0);
            });
        });
        let cumulativeXP = [];
        dailyXP.reduce((acc, current, i) => cumulativeXP[i] = acc + current, 0);

        this.xpChart = new Chart(ctxXP, {
            type: 'line',
            data: {
                labels: Array.from({length: 28}, (_, i) => i + 1),
                datasets: [{ label: 'XP', data: cumulativeXP, borderColor: '#28A745', tension: 0.4, fill: true, backgroundColor: 'rgba(40, 167, 69, 0.1)' }]
            },
            options: { plugins: { legend: { display: false } } }
        });
    }

    add() {
        const input = document.getElementById('habit-input');
        if (!input.value.trim()) return alert('Назовите привычку!');
        if (!this.selectedColor) return alert('Выберите цвет!');
        this.habits.push(new Habit(input.value.trim(), Date.now(), [], this.selectedColor));
        input.value = ''; this.save(); this.render(); this.updateProfileUI();
    }

    handleAction(id, type) {
        const h = this.habits.find(h => h.id === id);
        if (h && h.steps.length < 28) {
            h.addStep(type);
            this.save(); this.render(); this.updateProfileUI();
        }
    }

    deleteHabit(id) {
        if (confirm('Удалить привычку из Habitize?')) { this.habits = this.habits.filter(h => h.id !== id); this.save(); this.render(); this.updateProfileUI(); }
    }

    editHabitName(id) {
        const h = this.habits.find(h => h.id === id);
        if (h) {
            const n = prompt('Новое название привычки:', h.name);
            if (n) { h.name = n; this.save(); this.render(); }
        }
    }

    render() {
        const container = document.getElementById('habit-list');
        if (!container) return;
        container.innerHTML = '';
        this.habits.forEach(h => {
            const card = document.createElement('div');
            card.className = 'habit-card animate-hover';
            card.style.borderLeft = `6px solid ${h.color}`;
            let grid = '';
            for (let i = 0; i < 28; i++) {
                let cls = h.steps[i] === 'done' ? 'grid__dot--done' : (h.steps[i] === 'miss' ? 'grid__dot--miss' : '');
                let style = h.steps[i] === 'done' ? `style="background-color: ${h.color}"` : '';
                grid += `<div class="grid__dot ${cls}" ${style}></div>`;
            }
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between">
                    <div><b>${h.name}</b><br><small>${h.getRank().icon} ${h.getRank().name}</small></div>
                    <div class="habit-controls">
                        <button class="btn-icon" onclick="window.app.editHabitName(${h.id})">✎</button>
                        <button class="btn-icon" onclick="window.app.deleteHabit(${h.id})">✕</button>
                    </div>
                </div>
                <div class="grid">${grid}</div>
                <div class="actions">
                    <button class="btn" style="background:${h.color}" onclick="window.app.handleAction(${h.id}, 'done')">Готово</button>
                    <button class="btn btn--miss" onclick="window.app.handleAction(${h.id}, 'miss')">Пропуск</button>
                </div>`;
            container.appendChild(card);
        });
    }

    save() { localStorage.setItem('habitize_data_v1', JSON.stringify(this.habits)); }
    load() {
        const d = JSON.parse(localStorage.getItem('habitize_data_v1') || '[]');
        return d.map(h => new Habit(h.name, h.id, h.steps, h.color));
    }
    toggleTheme() {
        const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('theme', t);
    }
    applyTheme() { document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light'); }
}

window.app = new HabitTracker();