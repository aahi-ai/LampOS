# lampOS

A small desktop OS that runs entirely in the browser — plain HTML, CSS, and JavaScript, no frameworks or build step.

Live at: [your-vercel-url-here]

lampOS started as a personal landing page and grew into something closer to a real OS: draggable windows, a custom dock, and a small kernel underneath that every app reads and writes through instead of managing its own storage.

## What makes this different

Every app sits on top of one shared system instead of working alone:

- **A virtual filesystem** (`LampKernel`) with real paths like `/notes/items`, backed by a single localStorage key
- **A pub-sub event bus** so apps can react to each other's data without being wired together directly
- **A terminal with an actual interpreter** — a tokenizer (handles quotes and `|` pipes) feeding a dispatch-table evaluator, sitting on top of the same kernel

Run `ls /todo` or `cat /notes/items` in the terminal and it's reading the exact same data the GUI apps use.

## Apps

Notes, Files, Calendar, To-Do, Weather, Settings, Search, Snake, Terminal, Calculator, Movies, Contact

## Project structure
lampOS/

├── index.html   — markup for every window and the dock

├── lampos.css   — styling, theme variables, animations

└── lampos.js    — kernel, event bus, and every app's logic

## Terminal commands
help, ls [path], cat <path>, write <path> <value>, rm <path>,

open <app>, apps, echo <text>, whoami, date, history, clear
Pipes supported: `cat /todo/items | echo`

---

Built by aahi.
