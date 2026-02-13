// --- CONFIGURATION ---
const API_KEY = 'e106f1ebf764099faf166a525b9e7ef6'; // Replace this with your actual TMDB Key
const BASE_URL = 'https://api.themoviedb.org/3';

// State to store user answers
let userAnswers = {
    energy: null,
    company: null,
    time: null
};

// --- NAVIGATION LOGIC ---
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active', 'hidden'));
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    
    // Show target screen
    const target = document.getElementById(screenId);
    target.classList.remove('hidden');
    target.classList.add('active');
    
    // Re-render icons (since new HTML might be visible)
    if(window.lucide) lucide.createIcons();
}

function startConsultation() {
    showScreen('screen-energy');
}

function selectOption(category, value) {
    userAnswers[category] = value;
    
    // Auto-advance to next screen based on what was answered
    if (category === 'energy') {
        showScreen('screen-company');
    } else if (category === 'company') {
        showScreen('screen-time');
    } else if (category === 'time') {
        runDiagnosis();
    }
}

// --- THE ALGORITHM (The Doctor's Brain) ---
async function runDiagnosis() {
    showScreen('screen-loading');

    // 1. Construct the API Query based on "Vibes"
    let params = new URLSearchParams({
        api_key: API_KEY,
        language: 'en-US',
        sort_by: 'popularity.desc',
        'vote_count.gte': '300',
        page: 1
    });

    // LOGIC: Energy
    // IDs: 28=Action, 35=Comedy, 18=Drama, 99=Doc, 27=Horror, 53=Thriller
    if (userAnswers.energy === 'vegetable') {
        params.append('with_genres', '28|35'); // Action OR Comedy
        params.append('without_genres', '18,99'); // No Drama, No Docs
    } else if (userAnswers.energy === 'focus') {
        params.append('with_genres', '53|878|9648'); // Thriller, Sci-Fi, Mystery
        params.set('vote_average.gte', '7'); // Only good stuff
    }

    // LOGIC: Company
    if (userAnswers.company === 'date') {
        params.append('with_genres', '10749'); // Romance (adds to existing filters)
    } else if (userAnswers.company === 'group') {
        params.set('sort_by', 'revenue.desc'); // Blockbusters
    }

    // LOGIC: Time
    if (userAnswers.time === 'short') {
        params.set('with_runtime.lte', '100');
    } else if (userAnswers.time === 'epic') {
        params.set('with_runtime.gte', '140');
    }

    // 2. Fetch Data
    try {
        const response = await fetch(`${BASE_URL}/discover/movie?${params.toString()}`);
        const data = await response.json();
        
        // 3. Pick the Golden Trio (Top 3 results)
        const movies = data.results.slice(0, 3);
        displayResults(movies);
    } catch (error) {
        console.error("Doctor crashed:", error);
        alert("System Error. The API Key might be missing or invalid.");
    }
}

// --- RENDERING RESULTS ---
function displayResults(movies) {
    const container = document.getElementById('results-container');
    container.innerHTML = ''; // Clear previous

    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}">
            <div class="movie-info">
                <div class="movie-rating">MATCH: 98%</div>
                <h3>${movie.title}</h3>
                <p>${movie.overview.substring(0, 80)}...</p>
            </div>
        `;
        container.appendChild(card);
    });

    showScreen('screen-results');
}