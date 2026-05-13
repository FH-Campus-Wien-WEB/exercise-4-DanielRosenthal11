import { ButtonBuilder, ElementBuilder, MovieBuilder } from "./builders.js";

// Externalized message strings
const messages = {
  dataLoadError: 'Daten konnten nicht geladen werden, Status',
  movieAlreadyInCollection: 'Film bereits in der Sammlung.',
  addMovieFailed: 'Hinzufügen des Films ist fehlgeschlagen.',
  deleteMovieFailed: 'Film konnte nicht gelöscht werden.',
  noResultsFound: 'Keine Ergebnisse gefunden.',
  searchFailed: 'Die Suche ist fehlgeschlagen...',
  loggedOutGreeting: 'Bitte logge dich ein, um deine Filmkollektion zu sehen.',
  loginFailed: 'Login failed'
};

let currentSession = null;

// Neue Variable, um aktive Filter zu speichern
let activeGenres = new Set();

function updateGenres() {
  const header = document.querySelector('nav>h2');
  const listElement = document.querySelector("#filter");

  listElement.innerHTML = '';

  if (!currentSession) {
    header.style.display = 'none';
    return;
  }

  fetch("/genres")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(genres => {
      header.style.display = 'block';
      
      // "All" Button
      const allBtn = new ButtonBuilder("All").onclick(() => toggleGenre("All"));
      new ElementBuilder("li").append(allBtn).appendTo(listElement);
      if (activeGenres.size === 0) allBtn.element.classList.add('active'); // Standardmäßig aktiv

      // Spezifische Genre Buttons
      for (const genre of genres) {
        const btn = new ButtonBuilder(genre).onclick(() => toggleGenre(genre));
        if (activeGenres.has(genre)) {
          btn.element.classList.add('active');
        }
        new ElementBuilder("li").append(btn).appendTo(listElement);
      }

      // Initiales Laden, falls nichts ausgewählt ist -> zeige Alle
      if (activeGenres.size === 0 && document.querySelector("main").childElementCount === 0) {
        toggleGenre("All");
      }
    })
    .catch(error => {
      console.error('Failed to load genres:', error);
      listElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function toggleGenre(genre) {
  if (genre === "All") {
    activeGenres.clear(); // Alle spezifischen Filter löschen
  } else {
    if (activeGenres.has(genre)) {
      activeGenres.delete(genre); // Klick auf aktiven Filter -> deaktivieren
    } else {
      activeGenres.add(genre); // Klick auf inaktiven Filter -> aktivieren
    }
  }

  // UI aktualisieren (Klassen setzen)
  const buttons = document.querySelectorAll("#filter button");
  buttons.forEach(btn => {
    if (btn.textContent === "All") {
      btn.classList.toggle('active', activeGenres.size === 0);
    } else {
      btn.classList.toggle('active', activeGenres.has(btn.textContent));
    }
  });

  // Filme mit den ausgewählten Genres laden
  loadMovies(Array.from(activeGenres));
}

function loadMovies(genresArray = []) {
  const url = new URL("/movies", location.href);
  
  // Wenn spezifische Genres ausgewählt sind, hänge sie kommasepariert an die URL an
  if (genresArray.length > 0) {
    url.searchParams.set("genres", genresArray.join(','));
  }

  fetch(url)
    .then(response => {
      removeMovies();
      const mainElement = document.querySelector("main");

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(movies => {
      const mainElement = document.querySelector("main");
      movies.forEach(movie => new MovieBuilder(movie, deleteMovie, Boolean(currentSession)).appendTo(mainElement));
    })
    .catch(error => {
      console.error('Failed to load movies:', error);
      const mainElement = document.querySelector("main");
      mainElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function removeMovies() {
  const mainElement = document.querySelector("main");
  while (mainElement.childElementCount > 0) {
    mainElement.firstChild.remove();
  }
}

function addMovie(imdbID) {
  fetch(`/movies/${imdbID}`, { method: 'PUT' })
    .then(response => {
      if (response.status === 201 || response.status === 200) {
        const searchItem = document.getElementById(`search-${imdbID}`);
        if (searchItem) {
          searchItem.remove();
        }
    
        loadMovies();
        updateGenres();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    })
    .catch(error => {
      console.error('Failed to add movie:', error);
      alert(messages.addMovieFailed);
    });
}

function deleteMovie(imdbID) {
  fetch(`/movies/${imdbID}`, { method: 'DELETE' })
    .then(response => {
      if (response.ok) {
        const article = document.getElementById(imdbID);
        if (article) {
          article.remove();
        }
        updateGenres();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    })
    .catch(error => {
      console.error('Failed to delete movie:', error);
      alert(messages.deleteMovieFailed);
    });
}

function searchMovies(query) {
  fetch(`/search?query=${encodeURIComponent(query)}`)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(results => {
      const resultsDiv = document.getElementById("searchResults");
      resultsDiv.innerHTML = '';

      if (!results || results.length === 0) {
        new ElementBuilder("p").text(messages.noResultsFound).appendTo(resultsDiv);
        return;
      }

      results.forEach(movie => {
        const row = new ElementBuilder("div").id(`search-${movie.imdbID}`).appendTo(resultsDiv);
        new ElementBuilder("span").text(`${movie.Title} (${movie.Year})`).appendTo(row);
        new ButtonBuilder("Add").onclick(() => addMovie(movie.imdbID)).appendTo(row);
      });
    })
    .catch(error => {
      console.error('Search failed:', error);
      const resultsDiv = document.getElementById("searchResults");
      new ElementBuilder("p").text(messages.searchFailed).appendTo(resultsDiv);
    });
}

window.onload = function () {
  fetch("/session")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      currentSession = data || null;
      updateUI();
    })
    .catch(error => {
      console.error('Failed to load session:', error);
      currentSession = null;
      updateUI();
    });

  function renderUserGreeting() {
    const greetingElement = document.getElementById('userGreeting');
    if (currentSession) {
      const loginDate = new Date(currentSession.loginTime);
      const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      const timeOptions = { hour: '2-digit', minute: '2-digit' };
      
      const dateStr = loginDate.toLocaleDateString('de-DE', dateOptions);
      const timeStr = loginDate.toLocaleTimeString('de-DE', timeOptions);
      
      greetingElement.textContent = `Hi ${currentSession.firstName} ${currentSession.lastName}, du hast dich am ${dateStr} um ${timeStr} angemeldet.`;
    } else {
      greetingElement.textContent = messages.loggedOutGreeting;
    }
  }

  function updateUI() {
    const authBtn = document.getElementById('authBtn');
    const addMoviesBtn = document.getElementById('addMoviesBtn');

    renderUserGreeting();
    updateGenres();

    if (currentSession) {
      authBtn.textContent = 'Logout';
      authBtn.onclick = () => {
        fetch("/logout")
          .then(response => {
            if (response.ok) {
              currentSession = null;
              updateUI();
            }
          })
          .catch(error => {
            console.error('Logout failed:', error);
          });
      };
      addMoviesBtn.style.display = 'inline';
    } else {
      removeMovies();
      authBtn.textContent = 'Login';
      authBtn.onclick = () => {
        const loginForm = document.getElementById('loginForm');
        loginForm.reset();
        document.getElementById('loginDialog').showModal();
      };
      addMoviesBtn.style.display = 'none';
    }
  }

  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const credentials = Object.fromEntries(formData.entries());

    fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials)
    })
    .then(response => {
      if (!response.ok) throw new Error(messages.loginFailed);
      return response.json();
    })
    .then(sessionData => {
      currentSession = sessionData;
      document.getElementById('loginDialog').close();
      updateUI();
      loadMovies();
    })
    .catch(error => {
      console.error(error);
      alert(error.message);
    });
  });

  document.getElementById('cancelLogin').addEventListener('click', () => {
    document.getElementById('loginDialog').close();
  });

  document.getElementById('addMoviesBtn').addEventListener('click', () => {
    const searchForm = document.getElementById('searchForm');
    searchForm.reset();
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchDialog').showModal();
  });

  document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('query').value;
    searchMovies(query);
  });

  document.getElementById('cancelSearch').addEventListener('click', () => {
    document.getElementById('searchDialog').close();
  });
};