// ─────────────────────────────────────────────
//  État global
// ─────────────────────────────────────────────
let chapitresData = [];
let currentChapitre = null;
let questions = [];
let questionIndex = 0;
let score = 0;
let answered = false;
let bestScores = JSON.parse(localStorage.getItem('bestScores') || '{}');

// ─────────────────────────────────────────────
//  Navigation entre pages
// ─────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function showHome()      { showPage('page-home'); }
function showChapitres() { showPage('page-chapitres'); loadChapitres(); }
function showScore()     { showPage('page-score'); }

// ─────────────────────────────────────────────
//  Menu hamburger mobile
// ─────────────────────────────────────────────
function toggleMenu() {
  const menu   = document.getElementById('mobile-menu');
  const iconM  = document.getElementById('icon-menu');
  const iconC  = document.getElementById('icon-close');
  const open   = menu.classList.toggle('hidden');
  iconM.classList.toggle('hidden', !open);
  iconC.classList.toggle('hidden', open);
}

// ─────────────────────────────────────────────
//  Chargement des chapitres
// ─────────────────────────────────────────────
async function loadChapitres() {
  const container = document.getElementById('chapitres-list');
  container.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10">Chargement…</div>';

  try {
    const res = await fetch('/api/chapitres');
    if (!res.ok) throw new Error('Erreur réseau');
    const data = await res.json();
    chapitresData = data.chapitres;

    // Mise à jour stats accueil
    const totalQ = chapitresData.reduce((s, c) => s + c.nb_questions, 0);
    setEl('stat-chapitres', chapitresData.length);
    setEl('stat-questions', totalQ);
    updateBestScoreHome();

    if (chapitresData.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10">Aucun chapitre disponible.</div>';
      return;
    }

    container.innerHTML = '';
    chapitresData.forEach(ch => {
      const best = bestScores[ch.id];
      const bestHtml = best !== undefined
        ? `<span class="text-xs text-green-600 font-semibold">Meilleur : ${best}/${ch.nb_questions}</span>`
        : `<span class="text-xs text-gray-400">Non commencé</span>`;

      const card = document.createElement('div');
      card.className = 'chapitre-card';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">${ch.nb_questions} questions</span>
        </div>
        <h3 class="font-bold text-gray-800 text-sm sm:text-base mb-1 leading-snug">${ch.titre || ch.title}</h3>
        <p class="text-xs text-gray-500 flex-1 mb-4 leading-relaxed">${ch.description}</p>
        <div class="flex items-center justify-between mt-auto">
          ${bestHtml}
          <span class="text-xs font-semibold text-brand-600 flex items-center gap-1">
            Démarrer
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
            </svg>
          </span>
        </div>
      `;
      card.addEventListener('click', () => startQcm(ch.id));
      container.appendChild(card);
    });

  } catch (e) {
    container.innerHTML = `<div class="col-span-full text-center text-red-400 py-10">Impossible de charger les chapitres.<br><span class="text-sm">${e.message}</span></div>`;
  }
}

// ─────────────────────────────────────────────
//  Démarrage du QCM
// ─────────────────────────────────────────────
async function startQcm(chapitreId) {
  try {
    const res = await fetch(`/api/chapitres/${chapitreId}`);
    if (!res.ok) throw new Error('Chapitre introuvable');
    const data = await res.json();

    currentChapitre = chapitreId;
    questions = data.questions || [];
    questionIndex = 0;
    score = 0;
    answered = false;

    setEl('qcm-titre', data.title || data.titre);
    showPage('page-qcm');
    afficherQuestion();

    // Afficher le lien Résultats dans la nav
    document.getElementById('nav-score-link').classList.remove('hidden');
    document.getElementById('mobile-score-link').classList.remove('hidden');

  } catch (e) {
    alert('Erreur : ' + e.message);
  }
}

// ─────────────────────────────────────────────
//  Affichage d'une question
// ─────────────────────────────────────────────
function afficherQuestion() {
  if (questionIndex >= questions.length) {
    afficherScore();
    return;
  }

  const q = questions[questionIndex];
  answered = false;

  // Progression
  const pct = Math.round((questionIndex / questions.length) * 100);
  document.getElementById('qcm-progress-bar').style.width = pct + '%';
  setEl('qcm-progress-text', `${questionIndex + 1} / ${questions.length}`);

  // Énoncé
  setEl('question-enonce', q.question);

  // Options
  const list = document.getElementById('options-list');
  list.innerHTML = '';
  q.answers.forEach((text, idx) => {
    const letter = String.fromCharCode(65 + idx); // A, B, C, D…
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.dataset.index = idx;
    btn.innerHTML = `<span class="letter">${letter}</span><span>${text}</span>`;
    btn.addEventListener('click', () => choisirReponse(idx, q.correct, q.explanation));
    list.appendChild(btn);
  });

  // Cache explication et bouton suivant
  document.getElementById('explication-box').classList.add('hidden');
  document.getElementById('btn-suivant').classList.add('hidden');
}

// ─────────────────────────────────────────────
//  Traitement d'une réponse
// ─────────────────────────────────────────────
function choisirReponse(index, bonneReponse, explication) {
  if (answered) return;
  answered = true;

  if (index === bonneReponse) score++;

  // Colorer les options
  document.querySelectorAll('.option-btn').forEach(btn => {
    const i = parseInt(btn.dataset.index, 10);
    btn.disabled = true;
    if (i === bonneReponse) {
      btn.classList.add('correct');
    } else if (i === index && index !== bonneReponse) {
      btn.classList.add('wrong');
    }
  });

  // Afficher explication
  if (explication) {
    setEl('explication-text', explication);
    document.getElementById('explication-box').classList.remove('hidden');
  }

  // Afficher bouton suivant
  const btnSuivant = document.getElementById('btn-suivant');
  btnSuivant.textContent = questionIndex + 1 >= questions.length ? 'Voir les résultats' : 'Suivant →';
  btnSuivant.classList.remove('hidden');
}

// ─────────────────────────────────────────────
//  Passer à la question suivante
// ─────────────────────────────────────────────
function questionSuivante() {
  questionIndex++;
  afficherQuestion();
}

// ─────────────────────────────────────────────
//  Affichage du score final
// ─────────────────────────────────────────────
function afficherScore() {
  const total = questions.length;
  const pct   = Math.round((score / total) * 100);

  // Sauvegarde meilleur score
  if (bestScores[currentChapitre] === undefined || score > bestScores[currentChapitre]) {
    bestScores[currentChapitre] = score;
    localStorage.setItem('bestScores', JSON.stringify(bestScores));
  }

  // Titre du chapitre
  const ch = chapitresData.find(c => c.id === currentChapitre);
  setEl('score-chapitre', ch ? ch.titre || ch.title : '');
  setEl('score-value', `${score} / ${total}`);
  setEl('score-percent', `${pct}%`);

  // Icône et couleur selon score
  const iconEl = document.getElementById('score-icon');
  const barEl  = document.getElementById('score-bar');

  if (pct >= 80) {
    iconEl.className = 'inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 bg-green-100';
    iconEl.innerHTML = `<svg class="w-12 h-12 text-green-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    barEl.className = 'h-4 rounded-full bg-green-400 transition-all duration-1000';
    setEl('score-message', 'Excellent ! Vous maîtrisez bien ce chapitre.');
  } else if (pct >= 50) {
    iconEl.className = 'inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 bg-yellow-100';
    iconEl.innerHTML = `<svg class="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>`;
    barEl.className = 'h-4 rounded-full bg-yellow-400 transition-all duration-1000';
    setEl('score-message', 'Pas mal ! Quelques révisions s\'imposent encore.');
  } else {
    iconEl.className = 'inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 bg-red-100';
    iconEl.innerHTML = `<svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm0-12a9 9 0 100 18 9 9 0 000-18z"/></svg>`;
    barEl.className = 'h-4 rounded-full bg-red-400 transition-all duration-1000';
    setEl('score-message', 'Continuez vos efforts ! Relisez le chapitre et réessayez.');
  }

  showPage('page-score');
  // Animer la barre après un court délai
  setTimeout(() => { barEl.style.width = pct + '%'; }, 100);
  barEl.style.width = '0%';

  updateBestScoreHome();
}

// ─────────────────────────────────────────────
//  Recommencer le même chapitre
// ─────────────────────────────────────────────
function recommencer() {
  if (currentChapitre) startQcm(currentChapitre);
}

// ─────────────────────────────────────────────
//  Utilitaires
// ─────────────────────────────────────────────
function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateBestScoreHome() {
  const scores = Object.values(bestScores);
  if (scores.length === 0) {
    setEl('stat-score', '—');
  } else {
    const best = Math.max(...scores);
    setEl('stat-score', best + ' pts');
  }
}

// ─────────────────────────────────────────────
//  Initialisation
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Pré-charger les chapitres pour les stats de la home
  try {
    const res = await fetch('/api/chapitres');
    const data = await res.json();
    chapitresData = data.chapitres;
    setEl('stat-chapitres', chapitresData.length);
    setEl('stat-questions', chapitresData.reduce((s, c) => s + c.nb_questions, 0));
    updateBestScoreHome();
  } catch (_) {}

  showHome();
});
