const tipsContainer = document.getElementById("tips-container");

// Build full-screen animated tip panels
function loadTips() {
    tips.forEach((tip, index) => {
        const card = document.createElement("div");
        card.classList.add("tip-card");

        // Alternate swipe direction feel
        const direction = index % 2 === 0 ? "translateX(80px)" : "translateX(-80px)";
        card.style.transform = direction;

        card.innerHTML = `
            <h2>${tip.title}</h2>
            <p>${tip.description}</p>
        `;
        tipsContainer.appendChild(card);
    });
}

// Reveal cards on scroll
function revealOnScroll() {
    const cards = document.querySelectorAll(".tip-card");
    const trigger = window.innerHeight * 0.75;

    cards.forEach(card => {
        const top = card.getBoundingClientRect().top;
        if (top < trigger) {
            card.classList.add("visible");
        }
    });
}

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);

// Advice modal logic
const adviceBtn = document.getElementById("adviceBtn");
const adviceModal = document.getElementById("adviceModal");
const closeAdvice = document.getElementById("closeAdvice");

adviceBtn.onclick = () => adviceModal.style.display = "block";
closeAdvice.onclick = () => adviceModal.style.display = "none";
window.onclick = e => { if (e.target === adviceModal) adviceModal.style.display = "none"; };

loadTips();
