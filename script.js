
// ===============================
// CHHOTU EDUCATION GROUP
// Main JavaScript
// ===============================

// IMPORTANT:
// This is a front-end demo only.
// Real owner login and payment verification
// require a secure backend.

// Change this password for local testing only.
// Anyone can see it in browser source code.
const OWNER_DEMO_PASSWORD = "CHANGE_THIS_PASSWORD";

let isOwner = false;
let selectedExam = "aiims";

let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let remainingSeconds = 300;
let timerInterval = null;
let testFinished = false;

// Sample questions for FREE demo test.
// Add your actual question bank here.
const demoQuestions = [
    {
        question: "What does AI stand for?",
        options: [
            "Artificial Intelligence",
            "Automatic Internet",
            "Advanced Information",
            "Artificial Internet"
        ],
        answer: 0
    },
    {
        question: "Which language is commonly used for AI?",
        options: ["HTML", "Python", "CSS", "XML"],
        answer: 1
    },
    {
        question: "Which data structure follows FIFO?",
        options: ["Stack", "Tree", "Queue", "Graph"],
        answer: 2
    }
];

// ===============================
// NAVIGATION
// ===============================

function switchTab(tabName, button) {
    document.querySelectorAll(".tab-content").forEach(section => {
        section.classList.remove("active");
    });

    document.querySelectorAll(".nav-links button").forEach(btn => {
        btn.classList.remove("active");
    });

    const selectedSection = document.getElementById(tabName);

    if (selectedSection) {
        selectedSection.classList.add("active");
    }

    if (button) {
        button.classList.add("active");
    }
}

// ===============================
// EXAM SELECTION
// ===============================

function openExam(exam) {
    selectedExam = exam;

    const examNames = {
        aiims: "AIIMS NORCET",
        neet: "NEET PG",
        rrb: "RRB",
        ssc: "SSC CGL"
    };

    const heading = document.getElementById("exam-heading");

    if (heading) {
        heading.textContent = examNames[exam] || "Mock Test";
    }

    const examSection = document.getElementById("exam-section");

    if (examSection) {
        examSection.style.display = "flex";
    }

    const ownerPanel = document.getElementById("owner-panel");

    if (ownerPanel) {
        ownerPanel.style.display = isOwner ? "block" : "none";
    }
}

function closeExam() {
    const examSection = document.getElementById("exam-section");

    if (examSection) {
        examSection.style.display = "none";
    }
}

// ===============================
// OWNER LOGIN
// ===============================

function ownerLogin() {
    const password = prompt("Enter Owner Password:");

    if (password === null) return;

    if (password === OWNER_DEMO_PASSWORD) {
        isOwner = true;

        const ownerPanel = document.getElementById("owner-panel");

        if (ownerPanel) {
            ownerPanel.style.display = "block";
        }

        alert("Owner demo login successful!");
    } else {
        alert("Incorrect password!");
    }
}

// ===============================
// FREE / PAID TEST
// ===============================

function startDemoTest() {
    startTest("free");
}

function startTest(type) {
    if (type === "paid" && !isOwner) {
        alert(
            "Paid test access is locked. Payment verification and user login must be connected to the server first."
        );
        return;
    }

    // Only sample questions are currently available.
    // Add your real exam question bank before launch.
    currentQuestions = [...demoQuestions];

    if (type === "paid") {
        alert(
            "Owner access opened. Currently only sample questions are added. Add your complete paid question bank before launching."
        );
    }

    currentQuestionIndex = 0;
    score = 0;
    remainingSeconds = 300;
    testFinished = false;

    const testModal = document.getElementById("test-modal");

    if (testModal) {
        testModal.style.display = "flex";
    }

    loadQuestion();
    startTimer();
}

// ===============================
// LOAD QUESTION
// ===============================

function loadQuestion() {
    const question = currentQuestions[currentQuestionIndex];

    if (!question) {
        finishTest();
        return;
    }

    const questionText = document.getElementById("question-text");
    const optionsContainer = document.getElementById("options-container");
    const questionNumber = document.getElementById("question-number");

    if (questionText) {
        questionText.textContent = question.question;
    }

    if (questionNumber) {
        questionNumber.textContent =
            `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
    }

    if (!optionsContainer) return;

    optionsContainer.innerHTML = "";

    question.options.forEach((option, index) => {
        const button = document.createElement("button");

        button.className = "option-btn";
        button.textContent = option;

        button.addEventListener("click", () => {
            if (testFinished) return;

            const allButtons =
                optionsContainer.querySelectorAll("button");

            allButtons.forEach(btn => {
                btn.disabled = true;
            });

            if (index === question.answer) {
                score++;
                button.classList.add("correct");
            } else {
                button.classList.add("wrong");
                allButtons[question.answer].classList.add("correct");
            }
        });

        optionsContainer.appendChild(button);
    });
}

// ===============================
// NEXT QUESTION
// ===============================

function nextQuestion() {
    if (testFinished) return;

    currentQuestionIndex++;

    if (currentQuestionIndex < currentQuestions.length) {
        loadQuestion();
    } else {
        finishTest();
    }
}

// ===============================
// TIMER
// ===============================

function startTimer() {
    clearInterval(timerInterval);

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        remainingSeconds--;

        updateTimerDisplay();

        if (remainingSeconds <= 0) {
            finishTest();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timer = document.getElementById("timer");

    if (!timer) return;

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    timer.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ===============================
// FINISH TEST
// ===============================

function finishTest() {
    if (testFinished) return;

    testFinished = true;
    clearInterval(timerInterval);

    const optionsContainer = document.getElementById("options-container");

    if (optionsContainer) {
        optionsContainer.innerHTML = "";
    }

    const questionText = document.getElementById("question-text");

    if (questionText) {
        questionText.textContent =
            `Test Completed! Your Score: ${score}/${currentQuestions.length}`;
    }

    const questionNumber = document.getElementById("question-number");

    if (questionNumber) {
        questionNumber.textContent = "Result";
    }

    saveAttempt(score, currentQuestions.length);
}

// ===============================
// CLOSE TEST
// ===============================

function closeTestModal() {
    clearInterval(timerInterval);

    const testModal = document.getElementById("test-modal");

    if (testModal) {
        testModal.style.display = "none";
    }
}

// ===============================
// SAVE ATTEMPTS
// ===============================

function saveAttempt(result, total) {
    const container = document.getElementById("attempts-container");

    if (!container) return;

    const card = document.createElement("div");
    card.className = "attempt-card";

    const title = document.createElement("h3");
    title.textContent = selectedExam.toUpperCase();

    const details = document.createElement("p");
    details.textContent = `Score: ${result}/${total}`;

    card.appendChild(title);
    card.appendChild(details);

    container.prepend(card);
}

// ===============================
// PAYMENT
// ===============================

function payNow() {
    alert(
        "Payment verification is not connected yet. Do not grant paid access based on a screenshot or a return from a UPI app. A payment gateway and secure server verification are required."
    );
}

// ===============================
// STUDY MATERIAL UPLOAD
// ===============================

function handleUpload(event) {
    const file = event.target.files[0];

    if (!file) return;

    const container = document.getElementById("study-material-list");

    if (!container) return;

    const fileURL = URL.createObjectURL(file);

    const item = document.createElement("div");
    item.className = "material-card";

    const fileName = document.createElement("p");
    fileName.textContent = file.name;

    const link = document.createElement("a");
    link.href = fileURL;
    link.textContent = "Open Material";
    link.target = "_blank";
    link.rel = "noopener";

    item.appendChild(fileName);
    item.appendChild(link);

    container.appendChild(item);

    alert("File added for this browser session. It is not uploaded to a shared server.");
}

// ===============================
// THEME
// ===============================

function toggleTheme() {
    document.body.classList.toggle("light-theme");
}
