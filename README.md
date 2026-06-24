# lampOS

lampOS is a minimalistic, brower-based operating system built with HTML, CSS, and JavaScript.

This project started as a simple idea to make a web application as similar as possible to an operating system. Overtime, the project evolved into a complete interactive desktop experience with several different applications. 

Unlike traditional dashboard projects, lampOS focuses on recreating the feeling of using a desktop directly inside the browser.
## Features

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
