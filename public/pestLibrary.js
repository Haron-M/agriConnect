document.addEventListener("DOMContentLoaded", () => {
    const filterButtons = document.querySelectorAll(".filter-btn");
    const pestCards = document.querySelectorAll(".pest-card");

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Remove active status from all buttons and add to the clicked one
            filterButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            const selectedCrop = button.getAttribute("data-crop");

            // Filter cards
            pestCards.forEach(card => {
                const cardCrop = card.getAttribute("data-crop");

                if (selectedCrop === "all" || cardCrop === selectedCrop) {
                    card.style.display = "flex";
                } else {
                    card.style.display = "none";
                }
            });
        });
    });
});