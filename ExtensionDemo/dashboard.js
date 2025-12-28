const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".section-content");

navItems.forEach(item => {
    item.addEventListener("click", () => {

        // Remove active class
        navItems.forEach(i => i.classList.remove("active"));
        sections.forEach(s => s.classList.remove("active"));

        // Add active to clicked
        item.classList.add("active");
        document.getElementById(item.dataset.target).classList.add("active");
    });
});
