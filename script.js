"use strict";

// Theme toggle
const themeButton = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = themeButton.querySelector(".theme-label");

function setTheme(isDark) {
  document.body.classList.toggle("dark-mode", isDark);
  themeIcon.textContent = isDark ? "☀" : "☾";
  themeLabel.textContent = isDark ? "Light mode" : "Dark mode";
  themeButton.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
}
themeButton.addEventListener("click", () => setTheme(!document.body.classList.contains("dark-mode")));

// Responsive mobile navigation
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});
mainNav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));

// Clickable skill filters. Each project card lists the skills it is associated with.
const skillButtons = [...document.querySelectorAll(".skill-chip")];
const projectCards = [...document.querySelectorAll(".project-card")];
const filterStatus = document.getElementById("filterStatus");
const clearFilterButton = document.getElementById("clearFilter");
const notFound = document.getElementById("notFound");
const missingSkill = document.getElementById("missingSkill");
const showAllProjectsButton = document.getElementById("showAllProjects");

function filterProjects(skill = "") {
  let visibleCount = 0;
  skillButtons.forEach(button => {
    const selected = Boolean(skill) && button.dataset.skill === skill;
    button.setAttribute("aria-pressed", String(selected));
  });
  projectCards.forEach(card => {
    const tags = (card.dataset.projectSkills || "").split(",").map(value => value.trim().toLowerCase());
    const matches = !skill || tags.includes(skill.toLowerCase());
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  clearFilterButton.hidden = !skill;
  notFound.hidden = visibleCount !== 0;
  if (skill && visibleCount === 0) {
    missingSkill.textContent = skill;
    filterStatus.textContent = `No projects found for ${skill}`;
  } else if (skill) {
    filterStatus.textContent = `${visibleCount} ${visibleCount === 1 ? "project" : "projects"} related to ${skill}`;
  } else {
    filterStatus.textContent = "Showing all projects";
  }
}
skillButtons.forEach(button => button.addEventListener("click", () => {
  filterProjects(button.dataset.skill);
  document.getElementById("projects").scrollIntoView({ behavior: "smooth", block: "start" });
}));
clearFilterButton.addEventListener("click", () => filterProjects());
showAllProjectsButton.addEventListener("click", () => {
  filterProjects();
  document.getElementById("projects").scrollIntoView({ behavior: "smooth", block: "start" });
});

// Weather lookup using Open-Meteo geocoding + forecast APIs (no API key required).
const weatherForm = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");
const weatherButton = document.getElementById("weatherButton");
const weatherResult = document.getElementById("weatherResult");
const weatherDescriptions = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  56: "Light freezing drizzle", 57: "Dense freezing drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  66: "Light freezing rain", 67: "Heavy freezing rain", 71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
  77: "Snow grains", 80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
  85: "Slight snow showers", 86: "Heavy snow showers", 95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail"
};

function weatherCodeDescription(code) {
  return weatherDescriptions[code] || "Current conditions unavailable";
}
function showWeatherError(message) {
  weatherResult.replaceChildren();
  const messageNode = document.createElement("span");
  messageNode.className = "result-placeholder";
  messageNode.textContent = message;
  weatherResult.append(messageNode);
}
function addWeatherDetail(label, value) {
  const item = document.createElement("span");
  item.textContent = `${label}: ${value}`;
  return item;
}
function renderWeather(place, current) {
  weatherResult.replaceChildren();
  const layout = document.createElement("div");
  layout.className = "weather-current";
  const placeInfo = document.createElement("div");
  const name = document.createElement("div");
  name.className = "weather-place";
  name.textContent = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
  const description = document.createElement("div");
  description.className = "weather-description";
  description.textContent = weatherCodeDescription(current.weather_code);
  placeInfo.append(name, description);
  const temperature = document.createElement("div");
  temperature.className = "weather-temperature";
  temperature.textContent = `${Math.round(current.temperature_2m)}°C`;
  const details = document.createElement("div");
  details.className = "weather-details";
  details.append(
    addWeatherDetail("Feels like", `${Math.round(current.apparent_temperature)}°C`),
    addWeatherDetail("Humidity", `${current.relative_humidity_2m}%`),
    addWeatherDetail("Wind", `${Math.round(current.wind_speed_10m)} km/h`)
  );
  layout.append(placeInfo, temperature, details);
  weatherResult.append(layout);
}
weatherForm.addEventListener("submit", async event => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (!city) {
    showWeatherError("Please enter a city name.");
    cityInput.focus();
    return;
  }
  weatherButton.disabled = true;
  weatherButton.textContent = "Loading…";
  showWeatherError("Finding the city and current weather…");
  try {
    const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geoUrl.search = new URLSearchParams({ name: city, count: "1", language: "en", format: "json" }).toString();
    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) throw new Error("Could not search for that city.");
    const geoData = await geoResponse.json();
    const place = geoData.results && geoData.results[0];
    if (!place) {
      showWeatherError("City not found. Check the spelling and try again.");
      return;
    }
    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.search = new URLSearchParams({
      latitude: String(place.latitude), longitude: String(place.longitude),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      timezone: "auto"
    }).toString();
    const forecastResponse = await fetch(forecastUrl);
    if (!forecastResponse.ok) throw new Error("Weather data is temporarily unavailable.");
    const forecastData = await forecastResponse.json();
    if (!forecastData.current) throw new Error("Weather data is temporarily unavailable.");
    renderWeather(place, forecastData.current);
  } catch (error) {
    console.error("Weather lookup failed:", error);
    showWeatherError("Unable to fetch weather right now. Please check your connection and try again.");
  } finally {
    weatherButton.disabled = false;
    weatherButton.innerHTML = 'Check weather <span aria-hidden="true">→</span>';
  }
});

// Portfolio FAQ assistant. This is intentionally local and does not call an AI service.
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatMessages = document.getElementById("chatMessages");
const quickQuestionButtons = document.querySelectorAll("[data-question]");
function addChatMessage(text, sender) {
  const row = document.createElement("div");
  row.className = `chat-message ${sender === "user" ? "user-message" : "assistant-message"}`;
  const avatar = document.createElement("span");
  avatar.className = "message-avatar";
  avatar.textContent = sender === "user" ? "Y" : "A";
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;
  row.append(avatar, bubble);
  chatMessages.append(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
function getAssistantReply(question) {
  const q = question.toLowerCase();
  if (/\b(hello|hi|hey|howdy)\b/.test(q)) return "Hey! Thanks for visiting Alfes’s portfolio. You can ask me about skills, projects, background, or contact details.";
  if (/skill|technolog|language|stack|know how/.test(q)) return "The skills listed in this portfolio are C, C++, HTML, and CSS. The project cards also mention Python and JavaScript. Select a skill chip in the Skills section to find related projects.";
  if (/project|work|built|website|app|github/.test(q)) return "There are three projects listed: Python Program Collection, Code with AI Quiz, and Book Reading List Application. Scroll to Projects to read their descriptions and open their links.";
  if (/about|background|student|study|college|degree|who are you|who is alfes/.test(q)) return "Alfes Khan is a B.Tech Computer Science Engineering student interested in software development, web technologies, and problem-solving. He enjoys learning by building practical projects.";
  if (/contact|email|reach|message/.test(q)) return "You can contact Alfes at khanalfes29@gmail.com. The GitHub profile is github.com/AlfesKhan.";
  if (/weather|temperature|forecast/.test(q)) return "Use the Weather section to search for a city and view current temperature, conditions, humidity, and wind speed.";
  if (/hire|opportunit|collaborat/.test(q)) return "For collaboration or opportunities, email khanalfes29@gmail.com or use the GitHub link in the Contact section.";
  if (/thank/.test(q)) return "You’re welcome! Feel free to explore the projects or reach out by email.";
  return "I can help with questions about Alfes’s background, skills (C, C++, HTML, CSS), listed projects, weather feature, or contact information. Try asking about one of those topics.";
}
function askAssistant(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;
  addChatMessage(cleanQuestion, "user");
  addChatMessage(getAssistantReply(cleanQuestion), "assistant");
}
chatForm.addEventListener("submit", event => {
  event.preventDefault();
  askAssistant(userInput.value);
  userInput.value = "";
  userInput.focus();
});
quickQuestionButtons.forEach(button => button.addEventListener("click", () => askAssistant(button.dataset.question)));

// Footer year and active navigation link
 document.getElementById("currentYear").textContent = new Date().getFullYear();
const navLinks = [...mainNav.querySelectorAll("a")];
if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  document.querySelectorAll("main section[id]").forEach(section => sectionObserver.observe(section));
}
