// JavaScript Logic for Chhotu Education Group Website

// Sample Questions for Demo Test
const demoQuestions = [
    {
        question: "What is the normal blood pressure range in a healthy adult?",
        options: ["120/80 mmHg", "140/90 mmHg", "100/60 mmHg", "160/100 mmHg"],
        correct: 0
    },
    {
        question: "Which organ is primary for drug metabolism in the human body?",
        options: ["Kidney", "Liver", "Lungs", "Heart"],
        correct: 1
    },
    {
        question: "What is the full form of NORCET?",
        options: ["Nursing Officer Common Eligibility Test", "National Officer Recruitment Common Entrance Test", "Nursing Exam Central Eligibility Test", "None of these"],
        correct: 0
    }
];

let currentQIndex = 0;
let userScore = 0;
let timerInterval;

// Tab Switch Functionality
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabName + '-tab').classList.add('active');
    event.currentTarget.classList.add('active');
}

// Start Demo Test Modal
function startDemoTest() {
    currentQIndex = 0;
    userScore = 0;
    document.getElementById('testModal').style.display = 'flex';
    loadQuestion();
    startTimer(300); // 5 minutes timer
}

function loadQuestion() {
    const q = demoQuestions[currentQIndex];
    document.getElementById('qNumber').innerText = `Question ${currentQIndex + 1} of ${demoQuestions.length}`;
    document.getElementById('qText').innerText = q.question;
    
    const optsGroup = document.getElementById('optionsGroup');
    optsGroup.innerHTML = '';
    
    q.options.forEach((opt, idx) => {
        const label = document.createElement('label');
        label.className = 'option-label';
        label.innerHTML = `<input type="radio" name="qOpt" value="${idx}"> ${opt}`;
        optsGroup.appendChild(label);
    });
}

function nextQuestion() {
    const selected = document.querySelector('input[name="qOpt"]:checked');
    if (selected) {
        if (parseInt(selected.value) === demoQuestions[currentQIndex].correct) {
            userScore++;
        }
    }
    
    currentQIndex++;
    if (currentQIndex < demoQuestions.length) {
        loadQuestion();
    } else {
        finishTest();
    }
}

function finishTest() {
    clearInterval(timerInterval);
    alert(`Test Complete! Your Score: ${userScore} / ${demoQuestions.length}`);
    
    // Save to attempts tab
    const attemptsContainer = document.getElementById('attempts-container');
    const attemptCard = document.createElement('div');
    attemptCard.className = 'test-row';
    attemptCard.innerHTML = `
        <div>
            <h3>Demo Test Attempt</h3>
            <p>Score: ${userScore}/${demoQuestions.length} · Completed Just Now</p>
        </div>
        <span class="badge" style="background:#10b981; color:white;">Passed</span>
    `;
    if (attemptsContainer.querySelector('.placeholder-text')) {
        attemptsContainer.innerHTML = '';
    }
    attemptsContainer.appendChild(attemptCard);

    closeTestModal();
}

function closeTestModal() {
    clearInterval(timerInterval);
    document.getElementById('testModal').style.display = 'none';
}

function startTimer(duration) {
    let timer = duration, minutes, seconds;
    clearInterval(timerInterval);
    timerInterval = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        document.getElementById('timerDisplay').innerText = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(timerInterval);
            finishTest();
        }
    }, 1000);
}

// Upload Media/File Handler
function handleUpload(e) {
    e.preventDefault();
    const title = document.getElementById('fileTitle').value;
    const type = document.getElementById('fileType').value;
    const fileInput = document.getElementById('fileInput');

    if (fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const fileUrl = URL.createObjectURL(file);
    const container = document.getElementById('mediaContainer');

    const card = document.createElement('div');
    card.className = 'media-card';

    if (type === 'video') {
        card.innerHTML = `
            <video controls src="${fileUrl}"></video>
            <div class="media-info">
                <h4>${title}</h4>
                <span class="badge">Video</span>
            </div>
        `;
    } else {
        card.innerHTML = `
            <div style="padding: 40px; text-align: center; background: #131b2e;">
                <i class="fa-solid fa-file-pdf" style="font-size: 50px; color: #ef4444;"></i>
            </div>
            <div class="media-info">
                <h4>${title}</h4>
                <a href="${fileUrl}" download="${file.name}" class="badge" style="text-decoration:none;">Download File</a>
            </div>
        `;
    }

    container.prepend(card);
    document.getElementById('uploadForm').reset();
    alert('File uploaded successfully to portal section!');
}

function toggleTheme() {
    alert("Dark theme is active by default for Chhotu Education Group.");
}
function checkComingSoonPassword() {
    let password = prompt("Enter password for NEET PG:");
    if (password === "Akhand@123") { // Yahan "12345" ki jagah aap apna password badal sakte hain
        alert("Access Granted!");
        // Yahan aage ka code likh sakte hain jo unlock hone par chalega
    } else if (password !== null) {
        alert("Wrong Password!");
    }
}
