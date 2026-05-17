export class Habit {
    constructor(name, id = Date.now(), steps = [], color = '#28A745') {
        this.name = name;
        this.id = id;
        this.steps = steps; // Массив статусов ('done', 'miss')
        this.color = color;
    }

    // Рассчет очков опыта для конкретной привычки
    getPoints() {
        return this.steps.reduce((acc, step) => {
            if (step === 'done') return acc + 10;
            if (step === 'miss') return acc - 5;
            return acc;
        }, 0);
    }

    // Определение ранга на основе выполненных дней (из 28 возможных)
    getRank() {
        const p = this.steps.filter(s => s === 'done').length;
        if (p >= 25) return { name: 'Легенда', icon: '👑' };
        if (p >= 15) return { name: 'Мастер', icon: '🔥' };
        if (p >= 10) return { name: 'Профи', icon: '⚡' };
        if (p >= 5) return { name: 'Ученик', icon: '🌱' };
        return { name: 'Новичок', icon: '🍼' };
    }

    // Добавление новой отметки (не более 28)
    addStep(status) {
        if (this.steps.length < 28) {
            this.steps.push(status);
        }
    }
}