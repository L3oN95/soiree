# 🍽️ Dinner-Einladung — interaktive Überraschungs-Mission

Eine kleine, liebevolle Single-Page-Web-App als Überraschungseinladung.
Kein Backend, keine Datenbank, nichts wird gespeichert oder gesendet.

## ▶️ Lokal ansehen
Einfach **`index.html`** im Browser öffnen (Doppelklick genügt).
> Für die schönen Schriftarten & Musik ist eine Internetverbindung praktisch,
> es funktioniert aber auch offline (dann mit System-Schriftart).

## ✏️ Anpassen — die 3 wichtigen Zeilen
Oben in **`script.js`** im Block `CONFIG`:

```js
const CONFIG = {
  inviteWhen:  "Morgen Abend · Donnerstag, 18. Juni 2026",
  inviteTime:  "19:30 Uhr",
  invitePlace: "[Restaurantname hier eintragen]",   // ← unbedingt eintragen!
  ...
};
```

Der **Tresor-Code** ist `143` (1 Herz · 4 Missionen · 3 gefundene Dinge —
und „143" heißt klassisch *I love you*). Auch änderbar im CONFIG-Block.

## 🖼️ Bilder
- Die App lädt `fotos/foto-01.jpg` … `foto-31.jpg`.
- Diese wurden automatisch aus dem Ordner `Bilder/` kopiert und umbenannt.
- Weitere/andere Bilder: einfach passend nummeriert in `fotos/` ablegen und
  `CONFIG.photoCount` anpassen. Fehlt ein Bild, zeigt die App einen Platzhalter.

## 🚀 Veröffentlichen (Vercel / Netlify)
Es ist eine rein statische Seite — kein Build nötig.
- **Netlify:** den gesamten Ordner auf <https://app.netlify.com/drop> ziehen.
- **Vercel:** `vercel` im Ordner ausführen oder den Ordner im Dashboard hochladen.

## 📂 Struktur
```
Dinner Einladung/
├─ index.html        Aufbau der 8 Kapitel
├─ style.css         Design & Animationen
├─ script.js         Logik, Mini-Spiel, Effekte  ← CONFIG oben
├─ fotos/            foto-01.jpg … foto-31.jpg
└─ Bilder/           Originalbilder (Backup)
```

## 🗺️ Der Ablauf
1. Einstieg (Typewriter) → 2. Die Frage (mit weghüpfendem „Nein") →
3. Chat → 4. Polaroid-Erinnerungen → **5. Foto-Memory (Pärchen finden, mit euren Fotos)** →
6. Taschenlampen-Labyrinth → 7. Mini-Quiz → **8. Herzen fangen** →
**9. Kiss-Cam (uns in der Stadion-Menge finden & filmen)** →
10. Tresor (Code `143`) → 11. Finale Enthüllung 🎉

Vier Mini-Spiele insgesamt: Labyrinth-Schatzsuche, Foto-Memory, Herzen-Fangen und Kiss-Cam.
Das Kiss-Cam-Belohnungsfoto wird über `CONFIG.kisscamPhoto` in `script.js` gesetzt
(am besten das echte Stadion-Foto).

Viel Spaß ❤️
