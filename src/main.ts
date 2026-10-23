import "./style.css";
import { OceanScore } from "./sound";
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const motion = document.querySelector<HTMLButtonElement>("#motion")!;
let paused = reduced.matches;
function updateMotion() {
  motion.hidden = reduced.matches;
  document.documentElement.classList.toggle("motion-paused", paused);
  document.documentElement.classList.toggle("js-motion", !paused);
  motion.textContent = paused ? "Enable motion" : "Pause motion";
  motion.setAttribute("aria-pressed", String(paused));
  document.querySelectorAll("video").forEach((v) => {
    if (paused || document.hidden) v.pause();
    else void v.play().catch(() => {});
  });
}
motion.addEventListener("click", () => {
  paused = !paused;
  updateMotion();
});
reduced.addEventListener("change", (e) => {
  paused = e.matches;
  updateMotion();
});
updateMotion();
const menuButton = document.querySelector<HTMLButtonElement>(".menu-button")!;
const panel = document.querySelector<HTMLElement>("#menu-panel")!;
function setMenu(open: boolean) {
  panel.hidden = !open;
  menuButton.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
  if (open) panel.querySelector<HTMLAnchorElement>("a")?.focus();
  else menuButton.focus();
}
menuButton.addEventListener("click", () => setMenu(panel.hidden));
panel
  .querySelectorAll("a")
  .forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (panel.hidden) return;
  if (e.key === "Escape") setMenu(false);
  if (e.key === "Tab") {
    const focusable = [
      menuButton,
      ...panel.querySelectorAll<HTMLAnchorElement>("a"),
    ];
    const first = focusable[0],
      last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
const revealObserver = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        revealObserver.unobserve(e.target);
      }
    }),
  { threshold: 0.15 },
);
document
  .querySelectorAll(".reveal")
  .forEach((el) => revealObserver.observe(el));
const scenes = [...document.querySelectorAll<HTMLElement>(".scene")];
const chapterIndex = document.querySelector("#chapter-index")!;
const chapterName = document.querySelector("#chapter-name")!;
const progress = document.querySelector<HTMLElement>(".progress-track i")!;
let scheduled = false;
function position() {
  const middle = innerHeight * 0.5;
  let current = 0;
  scenes.forEach((s, i) => {
    if (s.getBoundingClientRect().top <= middle) current = i;
  });
  chapterIndex.textContent = String(current + 1).padStart(2, "0");
  chapterName.textContent = scenes[current].dataset.chapter!;
  const total = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = `${total > 0 ? (scrollY / total) * 100 : 0}%`;
  scheduled = false;
}
addEventListener(
  "scroll",
  () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(position);
    }
  },
  { passive: true },
);
addEventListener("resize", position);
position();
const score = new OceanScore();
const sound = document.querySelector<HTMLButtonElement>("#sound")!;
let soundEnabled = false;
function paintSound() {
  sound.classList.toggle("sound-on", soundEnabled);
  sound.setAttribute("aria-pressed", String(soundEnabled));
  sound.querySelector(".sound-label")!.textContent = soundEnabled
    ? "Sound on"
    : "Sound off";
  sound.setAttribute(
    "aria-label",
    soundEnabled
      ? "Turn off the original mellow ocean soundtrack"
      : "Turn on the original mellow ocean soundtrack",
  );
}
sound.addEventListener("click", async () => {
  sound.disabled = true;
  try {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      await score.start();
      if (document.hidden) await score.stop();
    } else await score.stop();
    paintSound();
  } catch {
    soundEnabled = false;
    paintSound();
    document.querySelector("#sound-status")!.textContent =
      "Sound could not start in this browser. You can still enjoy the ocean in silence.";
  } finally {
    sound.disabled = false;
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    void score.stop();
    document.querySelectorAll("video").forEach((v) => v.pause());
  } else {
    if (soundEnabled)
      void score.start().catch(() => {
        soundEnabled = false;
        paintSound();
      });
    updateMotion();
  }
});
window.addEventListener("pagehide", () => void score.stop());

// Load a real film only when motion is welcome. Save-data visitors keep the poster.
const filmHost = document.querySelector<HTMLElement>(".hero-media")!;
let film: HTMLVideoElement | undefined;
function syncFilm() {
  const saveData = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection?.saveData;
  if (!film && !paused && !saveData) {
    film = document.createElement("video");
    film.muted = true;
    film.loop = true;
    film.playsInline = true;
    film.preload = "metadata";
    film.setAttribute("aria-hidden", "true");
    film.poster = "./media/hero.jpg";
    film.src = matchMedia("(max-width:650px)").matches
      ? "./media/hero-mobile.mp4"
      : "./media/hero.mp4";
    film.addEventListener("playing", () => film!.classList.add("ready"));
    film.addEventListener("error", () => film!.classList.remove("ready"));
    filmHost.append(film);
  }
  if (film) {
    const r = filmHost.getBoundingClientRect();
    if (paused || document.hidden || r.bottom <= 0 || r.top >= innerHeight)
      film.pause();
    else void film.play().catch(() => {});
  }
}
new IntersectionObserver(() => syncFilm(), { threshold: 0 }).observe(filmHost);
motion.addEventListener("click", syncFilm);
reduced.addEventListener("change", syncFilm);
document.addEventListener("visibilitychange", syncFilm);
syncFilm();
