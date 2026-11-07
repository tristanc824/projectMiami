const micButton = document.querySelector("#mic-button");
const micLabel = micButton.querySelector(".mic-label");
const transcript = document.querySelector("#transcript");
const language = document.querySelector("#speech-language");
const reviewButton = document.querySelector("#review-button");
const clearButton = document.querySelector("#clear-button");
const resultSection = document.querySelector("#result-section");
const statusToast = document.querySelector("#status");
const readButton = document.querySelector("#read-button");

const defaultCase = {
  relationship_verified: false,
  amount_usdc: "80",
  requested_usdc: "200",
  other_contributions_usdc: "120",
  fiat_leg: "simulated",
  output_locale: "es-US",
  output_language: "Spanish (Latin America)",
};

let currentCase = { ...defaultCase };
let currentVerdict = null;
let recognition = null;
let listening = false;
let statusTimer = null;

function showStatus(message, error = false) {
  window.clearTimeout(statusTimer);
  statusToast.textContent = message;
  statusToast.classList.toggle("error", error);
  statusToast.classList.add("show");
  statusTimer = window.setTimeout(() => statusToast.classList.remove("show"), 4200);
}

function renderFacts(facts) {
  currentCase = { ...currentCase, ...facts, fiat_leg: "simulated" };
  document.querySelector("#fact-amount").textContent = currentCase.amount_usdc;
  document.querySelector("#fact-requested").textContent = currentCase.requested_usdc;
  document.querySelector("#fact-contributions").textContent = currentCase.other_contributions_usdc;
  const relationship = document.querySelector("#fact-relationship");
  relationship.textContent = currentCase.relationship_verified ? "Verified" : "Not verified";
  relationship.classList.toggle("warning-text", !currentCase.relationship_verified);
}

function setListening(active) {
  listening = active;
  micButton.classList.toggle("listening", active);
  micButton.setAttribute("aria-pressed", String(active));
  micLabel.textContent = active ? "Listening…" : "Tap to speak";
}

function isLocalCommand(text) {
  const command = text.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (["clear", "clear this", "start over", "reset", "borrar", "empezar de nuevo", "reiniciar"].includes(command)) {
    resetReview();
    showStatus("Cleared. Say the next request when you’re ready.");
    return true;
  }
  if (["read summary", "read the summary", "read it aloud", "speak summary", "leer resumen", "lee el resumen", "léelo en voz alta"].includes(command)) {
    speakSummary();
    return true;
  }
  return false;
}

async function runReview() {
  const spokenText = transcript.value.trim();
  if (!spokenText) {
    showStatus("Say or type a request first.", true);
    transcript.focus();
    return;
  }
  if (isLocalCommand(spokenText)) return;

  currentCase.output_locale = language.value;

  reviewButton.disabled = true;
  reviewButton.textContent = "Reviewing with three agents…";
  showStatus("PlainSpeaker, Skeptic, and Judge are reviewing the safe facts.");
  try {
    const response = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: spokenText, case: currentCase }),
    });
    const data = await response.json().catch(() => ({ error: "bad-response" }));
    if (!response.ok) throw new Error(data.error || "review-failed");
    renderFacts(data.case);
    renderResult(data);
    showStatus("Review ready. Nothing was signed or sent.");
  } catch (error) {
    const messages = {
      "missing-key": "Set SWARMS_API_KEY in the terminal that started the app.",
      budget: "The Swarms balance cannot cover this review.",
      "bad-verdict": "The Judge returned invalid JSON twice. No decision was shown.",
      "swarms-api": "The Swarms API could not complete the review.",
    };
    showStatus(messages[error.message] || "The review could not be completed.", true);
  } finally {
    reviewButton.disabled = false;
    reviewButton.innerHTML = 'Review this request <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>';
  }
}

function renderResult(data) {
  currentVerdict = data.verdict;
  document.querySelector("#summary-en").textContent = data.verdict.sentence;
  const localSummary = document.querySelector("#summary-es");
  localSummary.textContent = data.verdict.sentence_es;
  localSummary.lang = currentCase.output_locale;
  localSummary.dir = ["ar", "fa", "ps", "ur"].includes(currentCase.output_locale.split("-")[0]) ? "rtl" : "auto";
  document.querySelector("#translation-language").textContent = currentCase.output_language;
  document.querySelector("#plain-output").textContent = data.outputs.PlainSpeaker;
  document.querySelector("#skeptic-output").textContent = data.outputs.Skeptic;
  document.querySelector("#threat-output").textContent = data.verdict.threat;
  document.querySelector("#limit-output").textContent = data.verdict.limit;

  const badge = document.querySelector("#decision-badge");
  badge.textContent = data.verdict.decision;
  badge.className = `decision-badge ${data.verdict.decision}`;
  const cost = data.credit_cost;
  document.querySelector("#cost-label").textContent =
    cost === null ? "Cost unavailable" : `${Number(cost).toFixed(4)} credits`;
  document.querySelector("#attempt-label").textContent =
    data.attempts === 1 ? "Judge JSON valid on first run" : "Judge JSON valid after one retry";

  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function speakSummary() {
  if (!currentVerdict) {
    showStatus("Run a review before asking me to read the summary.", true);
    return;
  }
  if (!("speechSynthesis" in window)) {
    showStatus("Read-aloud is not available in this browser.", true);
    return;
  }
  window.speechSynthesis.cancel();
  const english = new SpeechSynthesisUtterance(currentVerdict.sentence);
  english.lang = "en-US";
  const local = new SpeechSynthesisUtterance(currentVerdict.sentence_es);
  local.lang = currentCase.output_locale;
  const voices = window.speechSynthesis.getVoices();
  const locale = currentCase.output_locale.toLowerCase();
  const baseLanguage = locale.split("-")[0];
  const localVoiceAvailable =
    voices.length === 0 ||
    voices.some((voice) => {
      const voiceLocale = voice.lang.toLowerCase();
      return voiceLocale === locale || voiceLocale.split("-")[0] === baseLanguage;
    });
  window.speechSynthesis.speak(english);
  if (localVoiceAvailable) {
    window.speechSynthesis.speak(local);
    showStatus(`Reading the English and ${currentCase.output_language} summary.`);
  } else {
    showStatus(`This browser has no ${currentCase.output_language} read-aloud voice. The translated text is still shown.`, true);
  }
}

function resetReview() {
  transcript.value = "";
  currentCase = {
    ...defaultCase,
    output_locale: language.value,
    output_language: language.selectedOptions[0].textContent.trim(),
  };
  currentVerdict = null;
  renderFacts(currentCase);
  resultSection.hidden = true;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micButton.disabled = true;
    micLabel.textContent = "Speech unavailable";
    showStatus("This browser does not support speech recognition. You can type instead.", true);
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => setListening(true);
  recognition.onend = () => setListening(false);
  recognition.onerror = (event) => {
    setListening(false);
    if (event.error !== "aborted") showStatus(`Microphone error: ${event.error}.`, true);
  };
  recognition.onresult = (event) => {
    let words = "";
    let final = false;
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      words += event.results[index][0].transcript;
      final ||= event.results[index].isFinal;
    }
    transcript.value = words.trim();
    if (final) runReview();
  };
}

micButton.addEventListener("click", () => {
  if (!recognition) return;
  if (listening) {
    recognition.stop();
    return;
  }
  recognition.lang = language.value;
  transcript.value = "";
  try {
    recognition.start();
  } catch {
    showStatus("The microphone is already starting.", true);
  }
});

reviewButton.addEventListener("click", runReview);
clearButton.addEventListener("click", resetReview);
readButton.addEventListener("click", speakSummary);
language.addEventListener("change", () => {
  currentCase.output_locale = language.value;
  currentCase.output_language = language.selectedOptions[0].textContent.trim();
  if (recognition) recognition.lang = language.value;
  showStatus(`${currentCase.output_language} selected for listening and summaries.`);
});
transcript.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") runReview();
});

renderFacts(currentCase);
setupSpeechRecognition();
