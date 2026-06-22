    window.addEventListener("load", function () {
        var fill = document.querySelector(".boot-bar-fill");
        setTimeout(function () {
            fill.style.width = "100%";
        }, 100);

        setTimeout(function () {
            document.querySelector("#bootScreen").classList.add("fade-out");
        }, 1300);

        setTimeout(function () {
            document.querySelector("#bootScreen").style.display = "none";
        }, 1700);
    });

    // ===== lampkernel: tiny virtual filesystem + event bus =====
    // this has to be defined before anything else in the file touches storage
    var LampKernel = (function () {
        var STORAGE_KEY = "lamposFS";
        var tree = {};
        var listeners = {};

        function loadTree() {
            try {
                tree = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            } catch (e) {
                tree = {};
            }
        }

        function persist() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
        }

        function splitPath(path) {
            return path.split("/").filter(function (p) { return p.length > 0; });
        }

        function read(path) {
            var parts = splitPath(path);
            var node = tree;
            for (var i = 0; i < parts.length; i++) {
                if (node == null || typeof node !== "object") return null;
                node = node[parts[i]];
            }
            return node === undefined ? null : node;
        }

        function write(path, value) {
            var parts = splitPath(path);
            var node = tree;
            for (var i = 0; i < parts.length - 1; i++) {
                if (typeof node[parts[i]] !== "object" || node[parts[i]] === null) {
                    node[parts[i]] = {};
                }
                node = node[parts[i]];
            }
            node[parts[parts.length - 1]] = value;
            persist();
            emit("fs:write", { path: path, value: value });
        }

        function remove(path) {
            var parts = splitPath(path);
            var node = tree;
            for (var i = 0; i < parts.length - 1; i++) {
                if (node[parts[i]] === undefined) return;
                node = node[parts[i]];
            }
            delete node[parts[parts.length - 1]];
            persist();
            emit("fs:delete", { path: path });
        }

        function list(path) {
            var node = read(path);
            if (node == null || typeof node !== "object") return [];
            return Object.keys(node);
        }

        function on(event, handler) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(handler);
        }

        function emit(event, payload) {
            (listeners[event] || []).forEach(function (fn) { fn(payload); });
        }

        loadTree();

        return { read: read, write: write, delete: remove, list: list, on: on, emit: emit };
    })();

    // ===== one-time migration from old flat localStorage keys =====
    (function migrateLegacyStorage() {
        if (LampKernel.read("/system/migrated")) return;

        var legacyMap = {
            lamposNotes: "/notes/items",
            lamposFiles: "/files/tree",
            lamposCalendar: "/calendar/events",
            lamposSettings: "/settings/config",
            lamposTodos: "/todo/items",
            lamposWeatherLocation: "/weather/location",
            lamposRecentSearches: "/search/recent",
            lamposSnakeHighScore: "/games/snake/highscore"
        };

        Object.keys(legacyMap).forEach(function (oldKey) {
            var raw = localStorage.getItem(oldKey);
            if (raw === null) return;
            var parsed;
            try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
            LampKernel.write(legacyMap[oldKey], parsed);
        });

        LampKernel.write("/system/migrated", true);
    })();

    function updateTime() {
        var savedSettings = LampKernel.read("/settings/config") || {};
        var format = savedSettings.clockFormat || "12";
        var now = new Date();
        var dateStr = now.toLocaleDateString();
        var timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: format === "12" });
        document.querySelector("#timeElement").innerHTML = dateStr + ", " + timeStr;
    }

    setInterval(updateTime, 1000);
    updateTime();

    dragElement(document.getElementById("welcome"));

    function dragElement(element) {
        var initialX = 0;
        var initialY = 0;
        var currentX = 0;
        var currentY = 0;

        if (document.getElementById(element.id + "header")) {
            document.getElementById(element.id + "header").onmousedown = startDragging;
        } else {
            element.onmousedown = startDragging
        }

        function startDragging(e) {
            e = e || window.event;
            e.preventDefault();
            initialX = e.clientX;
            initialY = e.clientY;
            document.onmouseup = stopDragging;
            document.onmousemove = drag;
        }

        function drag(e) {
            e = e || window.event;
            e.preventDefault();
            currentX = initialX - e.clientX;
            currentY = initialY - e.clientY;
            initialX = e.clientX;
            initialY = e.clientY;
            element.style.top = (element.offsetTop - currentY) + "px";
            element.style.left = (element.offsetLeft - currentX) + "px";
        }

        function stopDragging() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    dragElement(document.getElementById("welcome"));
    dragElement(document.getElementById("movies"));
    dragElement(document.getElementById("contact"));

    var welcomeScreen = document.querySelector("#welcome");
    var moviesScreen = document.querySelector("#movies")
    var contactScreen = document.querySelector("#contact")

    function positionWelcome(element) {
        element.style.top = "70px";
        element.style.right = "24px";
        element.style.left = "auto";
    }

    function centerWindow(element) {
        var w = element.offsetWidth;
        var h = element.offsetHeight;
        element.style.top = Math.max(60, (window.innerHeight - h) / 2) + "px";
        element.style.left = Math.max(20, (window.innerWidth - w) / 2) + "px";
        element.style.right = "auto";
    }

    positionWelcome(welcomeScreen);

    document.querySelectorAll("#desktopApps .app-icon").forEach(function (icon, i) {
        icon.style.animationDelay = (1.3 + i * 0.04) + "s";
    });

    function closeWindow(element) {
        element.classList.add("window-exit");
        setTimeout(function () {
            element.style.display = "none";
            element.classList.remove("window-exit");
        }, 160);
    }

    function openWindow(element) {
        element.style.display = "flex";

        if (element.id === "welcome") {
            positionWelcome(element);
        } else {
            centerWindow(element);
        }

        raiseWindows(element);
        element.classList.add("window-enter");
        void element.offsetWidth; // force reflow so the transition actually plays
        requestAnimationFrame(function () {
            element.classList.remove("window-enter");
        });
    }

    function openWindow(element) {
        element.style.display = "flex";

        if (element.id === "welcome") {
            positionWelcome(element);
        } else {
            centerWindow(element);
        }

        raiseWindows(element);
        element.classList.add("window-enter");
        void element.offsetWidth; // force reflow so the transition actually plays
        requestAnimationFrame(function () {
            element.classList.remove("window-enter");
        });
    }

    document.querySelector("#welcomeclose").addEventListener("click", function () {
        closeWindow(welcomeScreen);
    });

    document.querySelector("#moviesclose").addEventListener("click", function () {
        closeWindow(moviesScreen);
    });

    document.querySelector("#contactclose").addEventListener("click", function () {
        closeWindow(contactScreen);
    });

    document.querySelector("#welcomeopen").addEventListener("click", function () {
        openWindow(welcomeScreen);
    });

    var biggestIndex = 1;
    var topbar = document.querySelector(".topbar");

    function raiseWindows(element) {
        biggestIndex++;
        element.style.zIndex = biggestIndex;
        topbar.style.zIndex = biggestIndex + 1;
    }

    function addWindowTapHandling(element) {
        element.addEventListener("mousedown", function () {
            raiseWindows(element);
        });
    }

    addWindowTapHandling(welcomeScreen);
    addWindowTapHandling(moviesScreen);
    addWindowTapHandling(contactScreen);

    var selectedIcon = undefined;

    function selectIcon(element) {
        element.classList.add("selected");
        selectedIcon = element;
    }

    function deselectIcon(element) {
        if (element) {
            element.classList.remove("selected");
        }
        selectedIcon = undefined;
    }

    function handleIconTap(element) {
        if (element.classList.contains("selected")) {
            deselectIcon(element);
        } else {
            if (selectedIcon) {
                deselectIcon(selectedIcon);
            }
            selectIcon(element);
        }
    }

    var moviesIcon = document.querySelector("#moviesIcon");
    moviesIcon.addEventListener("click", function () {
        handleIconTap(moviesIcon);
        openWindow(moviesScreen);
    });

    var movies = [
        {
            title: "Obsession",
            year: "2026",
            rating: "7/10",
            content: "a midnight horror pick that turned into one of the better surprises of the year. simple premise — be careful what you wish for — but it goes way darker and weirder than i expected."
        },
        {
            title: "Avengers: Endgame",
            year: "2019",
            rating: "9/10",
            content: "the entire mcu building to this for over a decade and somehow it still landed. that final battle gives me chills every time, no matter how many times i've seen it."
        },
        {
            title: "F1",
            year: "2025",
            rating: "8/10",
            content: "didn't think i'd care about a racing movie this much. brad pitt does his thing, the racing sequences are genuinely tense, just don't think too hard about the actual f1 rules."
        },
        {
            title: "Avatar: Fire and Ash",
            year: "2025",
            rating: "7/10",
            content: "three movies in and cameron still makes pandora feel like somewhere real. story's thinner than the visuals deserve, but i'd watch the ash na'vi stuff again just for how it looks."
        },
        {
            title: "The Dark Knight",
            year: "2008",
            rating: "10/10",
            content: "heath ledger's joker still holds up as one of the best performances in any comic book movie, period. nolan made a genuinely great crime film that happens to have batman in it."
        },
        {
            title: "Top Gun: Maverick",
            year: "2022",
            rating: "9/10",
            content: "a legacy sequel that actually earns it. the flight sequences are unreal and tom cruise clearly still means it. one of the few rewatches that gets better every time."
        },
        {
            title: "Spider-Man: No Way Home",
            year: "2021",
            rating: "9/10",
            content: "the kind of fan-service movie that could've been a mess but actually pulled it off. tobey and andrew showing up still gets a reaction out of me every single time."
        },
        {
            title: "Gladiator",
            year: "2000",
            rating: "9/10",
            content: "ridley scott and russell crowe at their best. \"are you not entertained\" lives in my head rent free, and the colosseum scenes still hold up two and a half decades later."
        },
        {
            title: "Dune: Part One",
            year: "2021",
            rating: "5/10",
            content: "it’s just an excuse for sad space goths to wander around a cosmic sandpit arguing about sand-trout and glowing space dust while a giant worm plays the world's most aggressive game of whac-a-mole."
        },
        {
            title: "Oppenheimer",
            year: "2023",
            rating: "9/10",
            content: "three hours about a physicist building a bomb and somehow it's riveting the whole way through. the trinity test scene is some of the best sound design i've ever sat through in a theater."
        }
    ];

    function setMovieContent(index) {
        var movie = movies[index];
        var main = document.querySelector("#moviesMain");
        main.innerHTML = `
            <p class="movies-main-title">${movie.title}</p>
            <p class="movies-main-meta">${movie.year} — ${movie.rating}</p>
            <p class="movies-main-text">${movie.content}</p>
            
        `;

        document.querySelectorAll(".movie-entry").forEach(function (entry, i) {
            entry.classList.toggle("active", i === index);
        });
    }

    function buildMoviesSidebar() {
        var sidebar = document.querySelector("#moviesSidebar");
        movies.forEach(function (movie, index) {
            var entry = document.createElement("div");
            entry.className = "movie-entry";
            entry.innerHTML = `
                <p class="movie-entry-title">${movie.title}</p>
                <p class="movie-entry-year">${movie.year}</p>
            `;
            entry.addEventListener("click", function () {
                setMovieContent(index);
            });
            sidebar.appendChild(entry);
        });
    }

    buildMoviesSidebar()
    setMovieContent(0)

    var contactIcon = document.querySelector("#contactIcon");
    contactIcon.addEventListener("click", function () {
        handleIconTap(contactIcon);
        openWindow(contactScreen);
    });

    document.querySelectorAll(".contact-row").forEach(function (row) {
        row.addEventListener("click", function () {
            var text = row.getAttribute("data-copy");
            navigator.clipboard.writeText(text);

            var valueE1 = row.querySelector(".contact-value");
            var original = valueE1.textContent;
            valueE1.textContent = "copied!";
            setTimeout(function () {
                valueE1.textContent = original;
            }, 1000);
        });
    });


    var notesIcon = document.querySelector("#notesIcon");
    var notesScreen = document.querySelector("#notes");

    dragElement(document.getElementById("notes"));
    addWindowTapHandling(notesScreen);

    document.querySelector("#notesclose").addEventListener("click", function () {
        closeWindow(notesScreen);
    });

    notesIcon.addEventListener("click", function () {
        handleIconTap(notesIcon);
        openWindow(notesScreen);
    });

    var activeNoteId = null;
    var notes = LampKernel.read("/notes/items") || [];

    function saveNotes() {
        LampKernel.write("/notes/items", notes);
    }

    function renderNotesList() {
        var list = document.querySelector("#notesList");
        list.innerHTML = "";
        notes.forEach(function (note) {
            var entry = document.createElement("div");
            entry.className = "notes-entry" + (note.id === activeNoteId ? " active" : "");

            var title = document.createElement("p");
            title.className = "notes-entry-title";
            title.textContent = note.title || "untitled";

            var del = document.createElement("span");
            del.className = "notes-entry-delete";
            del.textContent = "x";
            del.addEventListener("click", function (e) {
                e.stopPropagation();
                deleteNote(note.id);
            });

            entry.appendChild(title);
            entry.appendChild(del);

            entry.addEventListener("click", function () {
                selectNote(note.id);
            });

            list.appendChild(entry);
        });
    }

    function selectNote(id) {
        activeNoteId = id;
        var note = notes.find(function (n) { return n.id === id; });
        document.querySelector("#noteTitleInput").value = note.title;
        document.querySelector("#noteContentInput").value = note.content;
        renderNotesList();
    }

    function createNote() {
        var note = {
            id: Date.now().toString(),
            title: "untitled",
            content: ""
        };
        notes.unshift(note);
        saveNotes();
        selectNote(note.id);
    }

    function deleteNote(id) {
        notes = notes.filter(function (n) { return n.id !== id; });
        saveNotes();
        if (activeNoteId === id) {
            activeNoteId = notes.length ? notes[0].id : null;
            if (activeNoteId) {
                selectNote(activeNoteId);
            } else {
                document.querySelector("#noteTitleInput").value = "";
                document.querySelector("#noteContentInput").value = "";
                renderNotesList();
            }
        } else {
            renderNotesList();
        }
    }

    function showSavedIndicator() {
        var indicator = document.querySelector("#notesSavedIndicator");
        indicator.classList.add("show");
        clearTimeout(indicator._timeout);
        indicator._timeout = setTimeout(function () {
            indicator.classList.remove("show");
        }, 1000);
    }

    document.querySelector("#newNoteButton").addEventListener("click", createNote);

    document.querySelector("#noteTitleInput").addEventListener("input", function (e) {
        var note = notes.find(function (n) { return n.id === activeNoteId; });
        if (!note) return;
        note.title = e.target.value;
        saveNotes();
        renderNotesList();
        showSavedIndicator();
    });

    document.querySelector("#noteContentInput").addEventListener("input", function (e) {
        var note = notes.find(function (n) { return n.id === activeNoteId; });
        if (!note) return;
        note.content = e.target.value;
        saveNotes();
        showSavedIndicator();
    });

    if (notes.length) {
        selectNote(notes[0].id);
    } else {
        createNote();
    }

    var calcScreen = document.querySelector("#calc");
    var calcIcon = document.querySelector("#calcIcon");

    dragElement(document.getElementById("calc"));
    addWindowTapHandling(calcScreen);

    document.querySelector("#calcclose").addEventListener("click", function () {
        closeWindow(calcScreen);
    });

    calcIcon.addEventListener("click", function () {
        handleIconTap(calcIcon);
        openWindow(calcScreen);
    });

    var calcDisplay = document.querySelector("#calcDisplay");
    var calcCurrent = "0";
    var calcPrev = "";
    var calcOp = null;
    var calcReset = false;

    document.querySelectorAll(".calc-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var val = btn.getAttribute("data-val");

            if (val === "C") {
                calcCurrent = "0";
                calcPrev = "";
                calcOp = null;
                calcReset = false;
            } else if (val === "+/-") {
                calcCurrent = String(parseFloat(calcCurrent) * -1);
            } else if (val === "%") {
                calcCurrent = String(parseFloat(calcCurrent) / 100);
            } else if (["+", "-", "*", "/"].includes(val)) {
                calcPrev = calcCurrent;
                calcOp = val;
                calcReset = true;
            } else if (val === "=") {
                if (!calcOp) return;
                var a = parseFloat(calcPrev);
                var b = parseFloat(calcCurrent);
                var result;
                if (calcOp === "+") result = a + b;
                if (calcOp === "-") result = a - b;
                if (calcOp === "*") result = a * b;
                if (calcOp === "/") result = a / b;
                calcCurrent = String(parseFloat(result.toFixed(10)));
                calcOp = null;
                calcReset = false;
            } else if (val === ".") {
                if (calcReset) { calcCurrent = "0"; calcReset = false; }
                if (!calcCurrent.includes(".")) calcCurrent += ".";
            } else {
                if (calcCurrent === "0" || calcReset) {
                    calcCurrent = val;
                    calcReset = false;
                } else {
                    calcCurrent += val;
                }
            }

            calcDisplay.textContent = calcCurrent;
        });
    });

    var filesScreen = document.querySelector("#files");
    var filesIcon = document.querySelector("#filesIcon");

    dragElement(document.getElementById("files"));
    addWindowTapHandling(filesScreen);

    document.querySelector("#filesclose").addEventListener("click", function () {
        closeWindow(filesScreen);
    });

    filesIcon.addEventListener("click", function () {
        handleIconTap(filesIcon);
        openWindow(filesScreen);
    });

    var fsData = LampKernel.read("/files/tree") || {};
    var activeFolderId = null;

    function saveFS() {
        LampKernel.write("/files/tree", fsData);
    }

    function getFileIcon(name) {
        if (name.endsWith(".txt")) return "📄";
        if (name.endsWith(".json")) return "📋";
        if (name.endsWith(".md")) return "📝";
        if (name.endsWith(".js")) return "📜";
        return "📄";
    }

    function renderFolders() {
        var list = document.querySelector("#folderList");
        list.innerHTML = "";
        Object.keys(fsData).forEach(function (folderId) {
            var folder = fsData[folderId];
            var entry = document.createElement("div");
            entry.className = "files-folder-entry" + (folderId === activeFolderId ? " active" : "");

            var name = document.createElement("p");
            name.className = "files-folder-name-text";
            name.textContent = "📁 " + folder.name;

            var del = document.createElement("span");
            del.className = "files-folder-delete";
            del.textContent = "x";
            del.addEventListener("click", function (e) {
                e.stopPropagation();
                if (confirm("Delete folder \"" + folder.name + "\" and all its files?")) {
                    delete fsData[folderId];
                    saveFS();
                    if (activeFolderId === folderId) {
                        activeFolderId = null;
                        document.querySelector("#filesFolderName").textContent = "select a folder";
                        document.querySelector("#newFileButton").style.display = "none";
                        document.querySelector("#fileList").innerHTML = "";
                    }
                    renderFolders();
                }
            });

            entry.appendChild(name);
            entry.appendChild(del);
            entry.addEventListener("click", function () {
                activeFolderId = folderId;
                document.querySelector("#filesFolderName").textContent = folder.name;
                document.querySelector("#newFileButton").style.display = "block";
                renderFolders();
                renderFiles();
            });

            list.appendChild(entry);
        });
    }

    function renderFiles() {
        var list = document.querySelector("#fileList");
        list.innerHTML = "";
        if (!activeFolderId || !fsData[activeFolderId]) return;

        var files = fsData[activeFolderId].files;
        if (!files || Object.keys(files).length === 0) {
            list.innerHTML = "<p class='files-empty'>no files yet</p>";
            return;
        }

        Object.keys(files).forEach(function (fileId) {
            var file = files[fileId];
            var entry = document.createElement("div");
            entry.className = "files-file-entry";

            var info = document.createElement("div");
            info.className = "files-file-info";

            var icon = document.createElement("span");
            icon.className = "files-file-icon";
            icon.textContent = getFileIcon(file.name);

            var name = document.createElement("p");
            name.className = "files-file-name";
            name.textContent = file.name;

            info.appendChild(icon);
            info.appendChild(name);

            var actions = document.createElement("div");
            actions.className = "files-file-actions";

            var rename = document.createElement("span");
            rename.className = "files-file-action";
            rename.textContent = "rename";
            rename.addEventListener("click", function (e) {
                e.stopPropagation();
                var newName = prompt("Rename file:", file.name);
                if (newName && newName.trim()) {
                    fsData[activeFolderId].files[fileId].name = newName.trim();
                    saveFS();
                    renderFiles();
                }
            });

            var del = document.createElement("span");
            del.className = "files-file-action";
            del.textContent = "delete";
            del.addEventListener("click", function (e) {
                e.stopPropagation();
                delete fsData[activeFolderId].files[fileId];
                saveFS();
                renderFiles();
            });

            actions.appendChild(rename);
            actions.appendChild(del);
            entry.appendChild(info);
            entry.appendChild(actions);
            list.appendChild(entry);
        });
    }

    document.querySelector("#newFolderButton").addEventListener("click", function () {
        var name = prompt("Folder name:");
        if (!name || !name.trim()) return;
        var id = Date.now().toString();
        fsData[id] = { name: name.trim(), files: {} };
        saveFS();
        renderFolders();
        activeFolderId = id;
        document.querySelector("#filesFolderName").textContent = name.trim();
        document.querySelector("#newFileButton").style.display = "block";
        renderFolders();
        renderFiles();
    });

    document.querySelector("#newFileButton").addEventListener("click", function () {
        if (!activeFolderId) return;
        var name = prompt("File name (e.g. notes.txt):");
        if (!name || !name.trim()) return;
        var id = Date.now().toString();
        fsData[activeFolderId].files[id] = { name: name.trim(), content: "" };
        saveFS();
        renderFiles();
    });

    renderFolders();

    var calendarScreen = document.querySelector("#calendar");
    var calendarIcon = document.querySelector("#calendarIcon");

    dragElement(document.getElementById("calendar"));
    addWindowTapHandling(calendarScreen);

    document.querySelector("#calendarclose").addEventListener("click", function () {
        closeWindow(calendarScreen);
    });

    calendarIcon.addEventListener("click", function () {
        handleIconTap(calendarIcon);
        openWindow(calendarScreen);
    });

    var calEvents = LampKernel.read("/calendar/events") || {};
    var calDate = new Date();
    var calSelectedDate = null;

    function saveCalEvents() {
        LampKernel.write("/calendar/events", calEvents);
    }

    function calDateKey(year, month, day) {
        return year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    }

    function renderCalendar() {
        var year = calDate.getFullYear();
        var month = calDate.getMonth();
        var today = new Date();

        document.querySelector("#calMonthLabel").textContent =
            calDate.toLocaleString("default", { month: "long" }) + " " + year;

        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();

        var container = document.querySelector("#calDays");
        container.innerHTML = "";

        for (var i = 0; i < firstDay; i++) {
            var empty = document.createElement("div");
            empty.className = "calendar-day empty";
            container.appendChild(empty);
        }

        for (var d = 1; d <= daysInMonth; d++) {
            var key = calDateKey(year, month, d);
            var cell = document.createElement("div");
            cell.className = "calendar-day";

            if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                cell.classList.add("today");
            }
            if (calSelectedDate === key) {
                cell.classList.add("selected");
            }
            if (calEvents[key] && calEvents[key].length > 0) {
                cell.classList.add("has-events");
            }

            cell.textContent = d;

            (function (day, dateKey) {
                cell.addEventListener("click", function () {
                    calSelectedDate = dateKey;
                    renderCalendar();
                    renderCalendarEvents(dateKey);
                });
            })(d, key);

            container.appendChild(cell);
        }
    }

    function renderCalendarEvents(dateKey) {
        var panel = document.querySelector("#calEvents");
        var parts = dateKey.split("-");
        var label = new Date(parts[0], parts[1] - 1, parts[2])
            .toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" });

        var events = calEvents[dateKey] || [];

        panel.innerHTML = "";

        var header = document.createElement("div");
        header.className = "calendar-events-header";

        var dateLabel = document.createElement("p");
        dateLabel.className = "calendar-events-date";
        dateLabel.textContent = label;

        var addBtn = document.createElement("span");
        addBtn.className = "calendar-add-event";
        addBtn.textContent = "+ add event";
        addBtn.addEventListener("click", function () {
            var name = prompt("Event name:");
            if (!name || !name.trim()) return;
            if (!calEvents[dateKey]) calEvents[dateKey] = [];
            calEvents[dateKey].push(name.trim());
            saveCalEvents();
            renderCalendar();
            renderCalendarEvents(dateKey);
        });

        header.appendChild(dateLabel);
        header.appendChild(addBtn);
        panel.appendChild(header);

        if (events.length === 0) {
            var empty = document.createElement("p");
            empty.className = "calendar-no-events";
            empty.textContent = "no events";
            panel.appendChild(empty);
        } else {
            events.forEach(function (event, index) {
                var item = document.createElement("div");
                item.className = "calendar-event-item";

                var name = document.createElement("p");
                name.className = "calendar-event-name";
                name.textContent = "· " + event;

                var del = document.createElement("span");
                del.className = "calendar-event-delete";
                del.textContent = "delete";
                del.addEventListener("click", function () {
                    calEvents[dateKey].splice(index, 1);
                    if (calEvents[dateKey].length === 0) delete calEvents[dateKey];
                    saveCalEvents();
                    renderCalendar();
                    renderCalendarEvents(dateKey);
                });

                item.appendChild(name);
                item.appendChild(del);
                panel.appendChild(item);
            });
        }
    }

    document.querySelector("#calPrev").addEventListener("click", function () {
        calDate.setMonth(calDate.getMonth() - 1);
        renderCalendar();
    });

    document.querySelector("#calNext").addEventListener("click", function () {
        calDate.setMonth(calDate.getMonth() + 1);
        renderCalendar();
    });

    renderCalendar();

    var settingsScreen = document.querySelector("#settings");
    var settingsIcon = document.querySelector("#settingsIcon");

    dragElement(document.getElementById("settings"));
    addWindowTapHandling(settingsScreen);

    document.querySelector("#settingsclose").addEventListener("click", function () {
        stopUptimeInterval();
        closeWindow(settingsScreen);
    });

    settingsIcon.addEventListener("click", function () {
        handleIconTap(settingsIcon);
        openWindow(settingsScreen);
    });

    var defaultSettings = {
        theme: "light",
        accent: "terracotta",
        wallpaper: "none",
        clockFormat: "12"
    };

    var lamposSettings = Object.assign({}, defaultSettings, LampKernel.read("/settings/config") || {});

    function saveSettings() {
        LampKernel.write("/settings/config", lamposSettings);
    }

    var accentPalettes = {
        terracotta: { name: "terracotta", accent: "#8c6a4e", light: "#e8ddd4", darkLight: "rgba(140,106,78,0.28)" },
        sage: { name: "sage", accent: "#6b8068", light: "#dce6da", darkLight: "rgba(107,128,104,0.28)" },
        dustyblue: { name: "dusty blue", accent: "#5d7a91", light: "#dbe4ea", darkLight: "rgba(93,122,145,0.28)" },
        plum: { name: "plum", accent: "#8a5a78", light: "#e7dbe3", darkLight: "rgba(138,90,120,0.28)" },
        mustard: { name: "mustard", accent: "#a9842f", light: "#ede2c8", darkLight: "rgba(169,132,47,0.28)" }
    };

    var wallpapers = {
        none: { name: "plain", css: "none" },
        dots: { name: "dotted", css: "radial-gradient(circle, var(--border) 1px, transparent 1px)", size: "14px 14px" },
        linen: { name: "linen", css: "linear-gradient(135deg, var(--bg), var(--accent-light))", size: "auto" },
        stripes: { name: "stripes", css: "repeating-linear-gradient(45deg, var(--surface2), var(--surface2) 10px, var(--bg) 10px, var(--bg) 20px)", size: "auto" }
    };

    function applyTheme() {
        document.body.classList.toggle("dark-mode", lamposSettings.theme === "dark");
        applyAccent();
    }

    function applyAccent() {
        var palette = accentPalettes[lamposSettings.accent] || accentPalettes.terracotta;
        document.body.style.setProperty("--accent", palette.accent);
        document.body.style.setProperty("--accent-light", lamposSettings.theme === "dark" ? palette.darkLight : palette.light);
    }

    function applyWallpaper() {
        var wp = wallpapers[lamposSettings.wallpaper] || wallpapers.none;
        document.body.style.backgroundImage = wp.css === "none" ? "none" : wp.css;
        document.body.style.backgroundSize = wp.size || "auto";
    }

    function applyAllSettings() {
        applyTheme();
        applyWallpaper();
    }

    applyAllSettings();

    var activeSettingsCategory = "appearance";
    var uptimeInterval = null;
    var bootTime = Date.now();

    function stopUptimeInterval() {
        if (uptimeInterval) {
            clearInterval(uptimeInterval);
            uptimeInterval = null;
        }
    }

    function selectSettingsCategory(cat) {
        activeSettingsCategory = cat;
        document.querySelectorAll(".settings-cat").forEach(function (el) {
            el.classList.toggle("active", el.getAttribute("data-cat") === cat);
        });
        renderSettingsMain(cat);
    }

    function renderSettingsMain(cat) {
        stopUptimeInterval();
        var main = document.querySelector("#settingsMain");
        if (cat === "appearance") {
            main.innerHTML = buildAppearanceSection();
            wireAppearanceSection();
        } else if (cat === "clock") {
            main.innerHTML = buildClockSection();
            wireClockSection();
        } else if (cat === "system") {
            main.innerHTML = buildSystemSection();
            wireSystemSection();
        } else if (cat === "about") {
            main.innerHTML = buildAboutSection();
        }
    }

    function buildAppearanceSection() {
        var darkOn = lamposSettings.theme === "dark";

        var swatches = Object.keys(accentPalettes).map(function (key) {
            var p = accentPalettes[key];
            var active = lamposSettings.accent === key ? " active" : "";
            return '<div class="settings-swatch' + active + '" data-accent="' + key + '" style="background-color:' + p.accent + '" title="' + p.name + '"></div>';
        }).join("");

        var wallpaperEls = Object.keys(wallpapers).map(function (key) {
            var w = wallpapers[key];
            var active = lamposSettings.wallpaper === key ? " active" : "";
            var bgStyle = w.css === "none" ? "" : "background-image:" + w.css + "; background-size:" + (w.size || "auto") + ";";
            return '<div class="settings-wallpaper' + active + '" data-wallpaper="' + key + '" style="' + bgStyle + '" title="' + w.name + '"></div>';
        }).join("");

        return (
            '<p class="settings-section-title">appearance</p>' +
            '<div class="settings-row">' +
            '<div>' +
            '<p class="settings-row-label">dark mode</p>' +
            '<p class="settings-row-desc">switch between light and dark</p>' +
            '</div>' +
            '<div class="settings-toggle' + (darkOn ? " on" : "") + '" id="darkModeToggle"><div class="settings-toggle-knob"></div></div>' +
            '</div>' +
            '<div class="settings-row" style="flex-direction:column; align-items:flex-start;">' +
            '<p class="settings-row-label">accent color</p>' +
            '<div class="settings-swatches">' + swatches + '</div>' +
            '</div>' +
            '<div class="settings-row" style="flex-direction:column; align-items:flex-start; border-bottom:none;">' +
            '<p class="settings-row-label">wallpaper</p>' +
            '<div class="settings-wallpapers">' + wallpaperEls + '</div>' +
            '</div>'
        );
    }

    function wireAppearanceSection() {
        document.querySelector("#darkModeToggle").addEventListener("click", function () {
            lamposSettings.theme = lamposSettings.theme === "dark" ? "light" : "dark";
            saveSettings();
            applyAllSettings();
            renderSettingsMain("appearance");
        });

        document.querySelectorAll(".settings-swatch").forEach(function (el) {
            el.addEventListener("click", function () {
                lamposSettings.accent = el.getAttribute("data-accent");
                saveSettings();
                applyAccent();
                renderSettingsMain("appearance");
            });
        });

        document.querySelectorAll(".settings-wallpaper").forEach(function (el) {
            el.addEventListener("click", function () {
                lamposSettings.wallpaper = el.getAttribute("data-wallpaper");
                saveSettings();
                applyWallpaper();
                renderSettingsMain("appearance");
            });
        });
    }

    function buildClockSection() {
        var is12 = lamposSettings.clockFormat === "12";
        return (
            '<p class="settings-section-title">clock</p>' +
            '<div class="settings-row" style="border-bottom:none;">' +
            '<div>' +
            '<p class="settings-row-label">time format</p>' +
            '<p class="settings-row-desc">choose how the topbar clock displays</p>' +
            '</div>' +
            '</div>' +
            '<div class="settings-clock-options">' +
            '<button class="settings-clock-btn' + (is12 ? " active" : "") + '" data-format="12">12-hour</button>' +
            '<button class="settings-clock-btn' + (!is12 ? " active" : "") + '" data-format="24">24-hour</button>' +
            '</div>'
        );
    }

    function wireClockSection() {
        document.querySelectorAll(".settings-clock-btn").forEach(function (el) {
            el.addEventListener("click", function () {
                lamposSettings.clockFormat = el.getAttribute("data-format");
                saveSettings();
                updateTime();
                renderSettingsMain("clock");
            });
        });
    }

    function getStorageBytes() {
        var raw = localStorage.getItem("lamposFS") || "";
        return raw.length;
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + " B";
        return (bytes / 1024).toFixed(1) + " KB";
    }

    function formatUptime(ms) {
        var totalSec = Math.floor(ms / 1000);
        var m = Math.floor(totalSec / 60);
        var s = totalSec % 60;
        return m + "m " + s + "s";
    }

    function buildSystemSection() {
        var notesCount = notes.length;
        var folderCount = Object.keys(fsData).length;
        var fileCount = Object.values(fsData).reduce(function (sum, f) { return sum + Object.keys(f.files || {}).length; }, 0);
        var eventCount = Object.values(calEvents).reduce(function (sum, arr) { return sum + arr.length; }, 0);

        return (
            '<p class="settings-section-title">system</p>' +
            '<div class="settings-stat-row"><span class="settings-stat-label">version</span><span class="settings-stat-value">v1.0.0</span></div>' +
            '<div class="settings-stat-row"><span class="settings-stat-label">uptime</span><span class="settings-stat-value" id="uptimeValue">0m 0s</span></div>' +
            '<div class="settings-stat-row"><span class="settings-stat-label">storage used</span><span class="settings-stat-value">' + formatBytes(getStorageBytes()) + '</span></div>' +
            '<div class="settings-stat-row"><span class="settings-stat-label">notes</span><span class="settings-stat-value">' + notesCount + '</span></div>' +
            '<div class="settings-stat-row"><span class="settings-stat-label">folders / files</span><span class="settings-stat-value">' + folderCount + ' / ' + fileCount + '</span></div>' +
            '<div class="settings-stat-row"><span class="settings-stat-label">calendar events</span><span class="settings-stat-value">' + eventCount + '</span></div>' +
            '<button class="settings-reset-btn" id="resetDataBtn">reset all data</button>'
        );
    }

    function wireSystemSection() {
        stopUptimeInterval();
        uptimeInterval = setInterval(function () {
            var el = document.querySelector("#uptimeValue");
            if (el) el.textContent = formatUptime(Date.now() - bootTime);
        }, 1000);

        document.querySelector("#resetDataBtn").addEventListener("click", function () {
            if (confirm("This will erase all notes, files, calendar events, to-dos, and settings. Continue?")) {
                localStorage.removeItem("lamposFS");
                ["lamposNotes", "lamposFiles", "lamposCalendar", "lamposSettings", "lamposTodos",
                    "lamposWeatherLocation", "lamposRecentSearches", "lamposSnakeHighScore"].forEach(function (k) {
                        localStorage.removeItem(k);
                    });
                location.reload();
            }
        });
    }

    function buildAboutSection() {
        return (
            '<p class="settings-about-logo">lampOS</p>' +
            '<p class="settings-about-version">version 1.0.0</p>' +
            '<p class="settings-about-text">a small desktop built from scratch — windows, apps, and all.</p>' +
            '<p class="settings-about-text">made by aahi</p>' +
            '<a href="https://github.com/aahi-ai" class="link">say hi →</a>'
        );
    }

    document.querySelectorAll(".settings-cat").forEach(function (el) {
        el.addEventListener("click", function () {
            selectSettingsCategory(el.getAttribute("data-cat"));
        });
    });

    renderSettingsMain(activeSettingsCategory);

    // live-update the settings system tab whenever ANY app writes to the kernel
    LampKernel.on("fs:write", function () {
        if (activeSettingsCategory === "system" && settingsScreen.style.display === "flex") {
            renderSettingsMain("system");
        }
    });

    var weatherScreen = document.querySelector("#weather");
    var weatherIcon = document.querySelector("#weatherIcon");

    dragElement(document.getElementById("weather"));
    addWindowTapHandling(weatherScreen);

    document.querySelector("#weatherclose").addEventListener("click", function () {
        closeWindow(weatherScreen);
    });

    weatherIcon.addEventListener("click", function () {
        handleIconTap(weatherIcon);
        openWindow(weatherScreen);
    });

    var weatherCodeMap = {
        0: { icon: "☀️", label: "clear sky" },
        1: { icon: "🌤️", label: "mainly clear" },
        2: { icon: "🌥️", label: "partly cloudy" },
        3: { icon: "☁️", label: "overcast" },
        45: { icon: "🌫️", label: "fog" },
        48: { icon: "🌫️", label: "freezing fog" },
        51: { icon: "🌦️", label: "light drizzle" },
        53: { icon: "🌦️", label: "drizzle" },
        55: { icon: "🌦️", label: "dense drizzle" },
        56: { icon: "🌧️", label: "freezing drizzle" },
        57: { icon: "🌧️", label: "freezing drizzle" },
        61: { icon: "🌧️", label: "light rain" },
        63: { icon: "🌧️", label: "rain" },
        65: { icon: "🌧️", label: "heavy rain" },
        66: { icon: "🌧️", label: "freezing rain" },
        67: { icon: "🌧️", label: "freezing rain" },
        71: { icon: "🌨️", label: "light snow" },
        73: { icon: "🌨️", label: "snow" },
        75: { icon: "🌨️", label: "heavy snow" },
        77: { icon: "🌨️", label: "snow grains" },
        80: { icon: "🌦️", label: "rain showers" },
        81: { icon: "🌦️", label: "rain showers" },
        82: { icon: "🌦️", label: "violent showers" },
        85: { icon: "🌨️", label: "snow showers" },
        86: { icon: "🌨️", label: "snow showers" },
        95: { icon: "⛈️", label: "thunderstorm" },
        96: { icon: "⛈️", label: "thunderstorm" },
        99: { icon: "⛈️", label: "thunderstorm" }
    };

    function getWeatherInfo(code) {
        return weatherCodeMap[code] || { icon: "🌡️", label: "unknown" };
    }

    var defaultWeatherLocation = { lat: 37.7749, lon: -122.4194, name: "San Francisco, US" };
    var weatherLocation = LampKernel.read("/weather/location") || defaultWeatherLocation;

    function saveWeatherLocation() {
        LampKernel.write("/weather/location", weatherLocation);
    }

    function renderWeatherLoading() {
        document.querySelector("#weatherCurrent").innerHTML = '<p class="weather-loading">loading weather...</p>';
        document.querySelector("#weatherForecast").innerHTML = "";
    }

    function renderWeatherError(message) {
        document.querySelector("#weatherCurrent").innerHTML = '<p class="weather-error">' + message + '</p>';
        document.querySelector("#weatherForecast").innerHTML = "";
    }

    function fetchWeather() {
        renderWeatherLoading();

        var url = "https://api.open-meteo.com/v1/forecast?latitude=" + weatherLocation.lat +
            "&longitude=" + weatherLocation.lon +
            "&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min" +
            "&temperature_unit=fahrenheit&timezone=auto&forecast_days=5";

        fetch(url)
            .then(function (res) { return res.json(); })
            .then(function (data) {
                renderWeatherCurrent(data);
                renderWeatherForecast(data);
            })
            .catch(function () {
                renderWeatherError("couldn't load weather. try again?");
            });
    }

    function renderWeatherCurrent(data) {
        var current = data.current_weather;
        var info = getWeatherInfo(current.weathercode);

        document.querySelector("#weatherCurrent").innerHTML =
            '<div class="weather-current-icon">' + info.icon + '</div>' +
            '<p class="weather-current-temp">' + Math.round(current.temperature) + '°</p>' +
            '<p class="weather-current-cond">' + info.label + '</p>' +
            '<p class="weather-current-location">' + weatherLocation.name + '</p>';
    }

    function renderWeatherForecast(data) {
        var daily = data.daily;
        var container = document.querySelector("#weatherForecast");
        container.innerHTML = "";

        daily.time.forEach(function (dateStr, i) {
            var info = getWeatherInfo(daily.weathercode[i]);
            var day = new Date(dateStr + "T00:00:00");
            var dayLabel = i === 0 ? "today" : day.toLocaleDateString("default", { weekday: "short" });

            var el = document.createElement("div");
            el.className = "weather-day";
            el.innerHTML =
                '<p class="weather-day-name">' + dayLabel + '</p>' +
                '<div class="weather-day-icon">' + info.icon + '</div>' +
                '<p class="weather-day-high">' + Math.round(daily.temperature_2m_max[i]) + '°</p>' +
                '<p class="weather-day-low">' + Math.round(daily.temperature_2m_min[i]) + '°</p>';
            container.appendChild(el);
        });
    }

    function searchWeatherLocations(query) {
        var resultsEl = document.querySelector("#weatherResults");
        resultsEl.style.display = "block";
        resultsEl.innerHTML = '<p class="weather-search-empty">searching...</p>';

        fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(query) + "&count=5&language=en&format=json")
            .then(function (res) { return res.json(); })
            .then(function (data) {
                renderWeatherSearchResults(data.results || []);
            })
            .catch(function () {
                resultsEl.innerHTML = '<p class="weather-search-empty">search failed, try again</p>';
            });
    }

    function renderWeatherSearchResults(results) {
        var resultsEl = document.querySelector("#weatherResults");

        if (results.length === 0) {
            resultsEl.innerHTML = '<p class="weather-search-empty">no matches found</p>';
            return;
        }

        resultsEl.innerHTML = "";
        results.forEach(function (place) {
            var label = place.name + (place.admin1 ? ", " + place.admin1 : "") + (place.country ? ", " + place.country : "");
            var row = document.createElement("div");
            row.className = "weather-search-result";
            row.textContent = label;
            row.addEventListener("click", function () {
                weatherLocation = { lat: place.latitude, lon: place.longitude, name: label };
                saveWeatherLocation();
                resultsEl.style.display = "none";
                resultsEl.innerHTML = "";
                document.querySelector("#weatherSearchInput").value = "";
                fetchWeather();
            });
            resultsEl.appendChild(row);
        });
    }

    document.querySelector("#weatherSearchBtn").addEventListener("click", function () {
        var query = document.querySelector("#weatherSearchInput").value.trim();
        if (!query) return;
        searchWeatherLocations(query);
    });

    document.querySelector("#weatherSearchInput").addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            var query = e.target.value.trim();
            if (!query) return;
            searchWeatherLocations(query);
        }
    });

    fetchWeather();

    var todoScreen = document.querySelector("#todo");
    var todoIcon = document.querySelector("#todoIcon");

    dragElement(document.getElementById("todo"));
    addWindowTapHandling(todoScreen);

    document.querySelector("#todoclose").addEventListener("click", function () {
        closeWindow(todoScreen);
    });

    todoIcon.addEventListener("click", function () {
        handleIconTap(todoIcon);
        openWindow(todoScreen);
    });

    var todos = LampKernel.read("/todo/items") || [];
    var todoNewPriority = "medium";
    var todoFilter = "all";

    function saveTodos() {
        LampKernel.write("/todo/items", todos);
        LampKernel.emit("todo:changed", todos);
    }

    var priorityRank = { high: 0, medium: 1, low: 2 };

    function getFilteredTodos() {
        var filtered = todos.filter(function (t) {
            if (todoFilter === "active") return !t.done;
            if (todoFilter === "done") return t.done;
            return true;
        });

        return filtered.slice().sort(function (a, b) {
            if (a.done !== b.done) return a.done ? 1 : -1;
            return priorityRank[a.priority] - priorityRank[b.priority];
        });
    }

    function renderTodos() {
        var list = document.querySelector("#todoList");
        var items = getFilteredTodos();

        list.innerHTML = "";

        if (items.length === 0) {
            list.innerHTML = '<p class="todo-empty">nothing here yet</p>';
        } else {
            items.forEach(function (todo) {
                var entry = document.createElement("div");
                entry.className = "todo-item";

                var checkbox = document.createElement("div");
                checkbox.className = "todo-checkbox" + (todo.done ? " checked" : "");
                checkbox.addEventListener("click", function () {
                    todo.done = !todo.done;
                    saveTodos();
                    renderTodos();
                });

                var text = document.createElement("p");
                text.className = "todo-text" + (todo.done ? " completed" : "");
                text.textContent = todo.text;

                var tag = document.createElement("span");
                tag.className = "todo-tag " + todo.priority;
                tag.textContent = todo.priority;

                var del = document.createElement("span");
                del.className = "todo-delete";
                del.textContent = "x";
                del.addEventListener("click", function () {
                    todos = todos.filter(function (t) { return t.id !== todo.id; });
                    saveTodos();
                    renderTodos();
                });

                entry.appendChild(checkbox);
                entry.appendChild(text);
                entry.appendChild(tag);
                entry.appendChild(del);
                list.appendChild(entry);
            });
        }

        var activeCount = todos.filter(function (t) { return !t.done; }).length;
        document.querySelector("#todoFooter").textContent =
            activeCount + (activeCount === 1 ? " task" : " tasks") + " left";
    }

    function addTodo() {
        var input = document.querySelector("#todoInput");
        var text = input.value.trim();
        if (!text) return;

        todos.unshift({
            id: Date.now().toString(),
            text: text,
            priority: todoNewPriority,
            done: false
        });

        saveTodos();
        input.value = "";
        renderTodos();
    }

    document.querySelector("#todoAddBtn").addEventListener("click", addTodo);
    document.querySelector("#todoInput").addEventListener("keydown", function (e) {
        if (e.key === "Enter") addTodo();
    });

    document.querySelectorAll(".todo-priority-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            todoNewPriority = btn.getAttribute("data-priority");
            document.querySelectorAll(".todo-priority-btn").forEach(function (b) {
                b.classList.remove("active");
            });
            btn.classList.add("active");
        });
    });

    document.querySelectorAll(".todo-filter-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            todoFilter = btn.getAttribute("data-filter");
            document.querySelectorAll(".todo-filter-btn").forEach(function (b) {
                b.classList.remove("active");
            });
            btn.classList.add("active");
            renderTodos();
        });
    });

    renderTodos();

    var searchScreen = document.querySelector("#search");
    var searchIcon = document.querySelector("#searchIcon");

    dragElement(document.getElementById("search"));
    addWindowTapHandling(searchScreen);

    document.querySelector("#searchclose").addEventListener("click", function () {
        closeWindow(searchScreen);
    });

    searchIcon.addEventListener("click", function () {
        handleIconTap(searchIcon);
        openWindow(searchScreen);
        document.querySelector("#searchInput").focus();
    });

    var recentSearches = LampKernel.read("/search/recent") || [];

    function saveRecentSearches() {
        LampKernel.write("/search/recent", recentSearches);
    }

    function renderRecentSearches() {
        var wrap = document.querySelector("#searchRecent");
        var list = document.querySelector("#searchRecentList");

        if (recentSearches.length === 0) {
            wrap.style.display = "none";
            return;
        }

        wrap.style.display = "block";
        list.innerHTML = "";

        recentSearches.forEach(function (term) {
            var item = document.createElement("div");
            item.className = "search-recent-item";
            item.textContent = term;
            item.addEventListener("click", function () {
                runSearch(term);
            });
            list.appendChild(item);
        });
    }

    function runSearch(query) {
        query = query.trim();
        if (!query) return;

        recentSearches = recentSearches.filter(function (t) { return t !== query; });
        recentSearches.unshift(query);
        recentSearches = recentSearches.slice(0, 5);
        saveRecentSearches();

        window.open(
            "https://www.google.com/search?q=" + encodeURIComponent(query),
            "_blank"
        );

        document.querySelector("#searchInput").value = "";
        renderRecentSearches();
    }

    document.querySelector("#searchGoBtn").addEventListener("click", function () {
        runSearch(document.querySelector("#searchInput").value);
    });

    document.querySelector("#searchInput").addEventListener("keydown", function (e) {
        if (e.key === "Enter") runSearch(e.target.value);
    });

    renderRecentSearches();

    var snakeScreen = document.querySelector("#snake");
    var snakeIconEl = document.querySelector("#snakeIcon");

    dragElement(document.getElementById("snake"));
    addWindowTapHandling(snakeScreen);

    document.querySelector("#snakeclose").addEventListener("click", function () {
        stopSnakeLoop();
        closeWindow(snakeScreen);
    });

    snakeIconEl.addEventListener("click", function () {
        handleIconTap(snakeIconEl);
        openWindow(snakeScreen);
    });

    var snakeCanvas = document.querySelector("#snakeCanvas");
    var snakeCtx = snakeCanvas.getContext("2d");
    var snakeCellSize = 14;
    var snakeGridCount = snakeCanvas.width / snakeCellSize;

    var snakeBody = [];
    var snakeDirection = { x: 1, y: 0 };
    var snakeNextDirection = { x: 1, y: 0 };
    var snakeFood = { x: 5, y: 5 };
    var snakeScoreValue = 0;
    var snakeHighScoreValue = parseInt(LampKernel.read("/games/snake/highscore") || "0", 10);
    var snakeLoopInterval = null;
    var snakeRunning = false;

    document.querySelector("#snakeHighScore").textContent = snakeHighScoreValue;

    function stopSnakeLoop() {
        if (snakeLoopInterval) {
            clearInterval(snakeLoopInterval);
            snakeLoopInterval = null;
        }
        snakeRunning = false;
    }

    function getSnakeColor(varName, fallback) {
        var val = getComputedStyle(document.body).getPropertyValue(varName).trim();
        return val || fallback;
    }

    function placeSnakeFood() {
        var occupied = true;
        while (occupied) {
            snakeFood = {
                x: Math.floor(Math.random() * snakeGridCount),
                y: Math.floor(Math.random() * snakeGridCount)
            };
            occupied = snakeBody.some(function (seg) { return seg.x === snakeFood.x && seg.y === snakeFood.y; });
        }
    }

    function resetSnakeGame() {
        var mid = Math.floor(snakeGridCount / 2);
        snakeBody = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
        snakeDirection = { x: 1, y: 0 };
        snakeNextDirection = { x: 1, y: 0 };
        snakeScoreValue = 0;
        document.querySelector("#snakeScore").textContent = snakeScoreValue;
        placeSnakeFood();
        drawSnakeFrame();
    }

    function drawSnakeFrame() {
        var bg = getSnakeColor("--surface2", "#f0ebe3");
        var snakeColor = getSnakeColor("--accent", "#8c6a4e");
        var foodColor = "#c47a5a";
        var gridLine = getSnakeColor("--border", "#e2d9cf");

        snakeCtx.fillStyle = bg;
        snakeCtx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

        snakeCtx.strokeStyle = gridLine;
        snakeCtx.globalAlpha = 0.3;
        for (var i = 1; i < snakeGridCount; i++) {
            snakeCtx.beginPath();
            snakeCtx.moveTo(i * snakeCellSize, 0);
            snakeCtx.lineTo(i * snakeCellSize, snakeCanvas.height);
            snakeCtx.stroke();
            snakeCtx.beginPath();
            snakeCtx.moveTo(0, i * snakeCellSize);
            snakeCtx.lineTo(snakeCanvas.width, i * snakeCellSize);
            snakeCtx.stroke();
        }
        snakeCtx.globalAlpha = 1;

        snakeCtx.fillStyle = foodColor;
        snakeCtx.beginPath();
        snakeCtx.arc(
            snakeFood.x * snakeCellSize + snakeCellSize / 2,
            snakeFood.y * snakeCellSize + snakeCellSize / 2,
            snakeCellSize / 2.6, 0, Math.PI * 2
        );
        snakeCtx.fill();

        snakeBody.forEach(function (seg, i) {
            snakeCtx.fillStyle = snakeColor;
            snakeCtx.globalAlpha = i === 0 ? 1 : 0.85;
            var pad = 1.5;
            snakeCtx.fillRect(
                seg.x * snakeCellSize + pad,
                seg.y * snakeCellSize + pad,
                snakeCellSize - pad * 2,
                snakeCellSize - pad * 2
            );
        });
        snakeCtx.globalAlpha = 1;
    }

    function stepSnake() {
        snakeDirection = snakeNextDirection;
        var head = snakeBody[0];
        var newHead = { x: head.x + snakeDirection.x, y: head.y + snakeDirection.y };

        var hitWall = newHead.x < 0 || newHead.x >= snakeGridCount || newHead.y < 0 || newHead.y >= snakeGridCount;
        var hitSelf = snakeBody.some(function (seg) { return seg.x === newHead.x && seg.y === newHead.y; });

        if (hitWall || hitSelf) {
            endSnakeGame();
            return;
        }

        snakeBody.unshift(newHead);

        if (newHead.x === snakeFood.x && newHead.y === snakeFood.y) {
            snakeScoreValue++;
            document.querySelector("#snakeScore").textContent = snakeScoreValue;
            placeSnakeFood();
        } else {
            snakeBody.pop();
        }

        drawSnakeFrame();
    }

    function endSnakeGame() {
        stopSnakeLoop();

        if (snakeScoreValue > snakeHighScoreValue) {
            snakeHighScoreValue = snakeScoreValue;
            LampKernel.write("/games/snake/highscore", snakeHighScoreValue);
            document.querySelector("#snakeHighScore").textContent = snakeHighScoreValue;
        }

        document.querySelector("#snakeOverlayTitle").textContent = "game over";
        document.querySelector("#snakeOverlaySub").textContent = "score: " + snakeScoreValue;
        document.querySelector("#snakeStartBtn").textContent = "play again";
        document.querySelector("#snakeOverlay").classList.add("show");
    }

    function startSnakeGame() {
        resetSnakeGame();
        document.querySelector("#snakeOverlay").classList.remove("show");
        stopSnakeLoop();
        snakeRunning = true;
        snakeLoopInterval = setInterval(stepSnake, 120);
    }

    document.querySelector("#snakeStartBtn").addEventListener("click", startSnakeGame);

    document.addEventListener("keydown", function (e) {
        if (!snakeRunning) return;
        if (snakeScreen.style.display !== "flex") return;

        var tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;

        var key = e.key.toLowerCase();
        var newDir = null;

        if (key === "arrowup" || key === "w") newDir = { x: 0, y: -1 };
        else if (key === "arrowdown" || key === "s") newDir = { x: 0, y: 1 };
        else if (key === "arrowleft" || key === "a") newDir = { x: -1, y: 0 };
        else if (key === "arrowright" || key === "d") newDir = { x: 1, y: 0 };

        if (!newDir) return;

        var isReverse = newDir.x === -snakeDirection.x && newDir.y === -snakeDirection.y;
        if (isReverse) return;

        e.preventDefault();
        snakeNextDirection = newDir;
    });

    resetSnakeGame();

    // ===== terminal: tokenizer + dispatch-table evaluator on top of LampKernel =====

    var terminalScreen = document.querySelector("#terminal");
    var terminalIcon = document.querySelector("#terminalIcon");

    dragElement(document.getElementById("terminal"));
    addWindowTapHandling(terminalScreen);

    document.querySelector("#terminalclose").addEventListener("click", function () {
        closeWindow(terminalScreen);
    });

    terminalIcon.addEventListener("click", function () {
        handleIconTap(terminalIcon);
        openWindow(terminalScreen);
        document.querySelector("#terminalInput").focus();
    });

    var terminalOutputEl = document.querySelector("#terminalOutput");
    var terminalHistory = [];
    var terminalHistoryIndex = -1;

    function terminalPrint(text, cls) {
        var line = document.createElement("p");
        line.className = "terminal-line" + (cls ? " " + cls : "");
        line.textContent = text;
        terminalOutputEl.appendChild(line);
        terminalOutputEl.scrollTop = terminalOutputEl.scrollHeight;
    }

    // raw input -> pipe-separated stages of tokens (quoted strings respected)
    function terminalTokenize(input) {
        var stages = input.split("|").map(function (s) { return s.trim(); }).filter(Boolean);
        return stages.map(function (stage) {
            var tokens = [];
            var regex = /"([^"]*)"|(\S+)/g;
            var match;
            while ((match = regex.exec(stage)) !== null) {
                tokens.push(match[1] !== undefined ? match[1] : match[2]);
            }
            return tokens;
        });
    }

    var terminalAppMap = {
        notes: notesScreen, todo: todoScreen, calendar: calendarScreen, files: filesScreen,
        settings: settingsScreen, weather: weatherScreen, search: searchScreen, snake: snakeScreen,
        calc: calcScreen, contact: contactScreen, movies: moviesScreen,
        welcome: welcomeScreen
    };

    var terminalIconMap = {
        notes: notesIcon, todo: todoIcon, calendar: calendarIcon, files: filesIcon,
        settings: settingsIcon, weather: weatherIcon, search: searchIcon, snake: snakeIconEl,
        calc: calcIcon, contact: contactIcon, movies: moviesIcon
    };


    var terminalCommands = {
        help: function () {
            return "commands: help, ls [path], cat <path>, write <path> <value>, rm <path>, " +
                "echo <text>, open <app>, apps, whoami, date, history, clear\n" +
                "pipes supported, e.g: cat /todo/items | echo";
        },
        ls: function (args) {
            var path = args[0] || "/";
            var keys = LampKernel.list(path);
            return keys.length ? keys.join("  ") : "(empty)";
        },
        cat: function (args) {
            if (!args[0]) return "usage: cat <path>";
            var val = LampKernel.read(args[0]);
            if (val === null) return "no such path: " + args[0];
            return JSON.stringify(val, null, 2);
        },
        write: function (args) {
            if (args.length < 2) return "usage: write <path> <value>";
            var path = args[0];
            var raw = args.slice(1).join(" ");
            var value;
            try { value = JSON.parse(raw); } catch (e) { value = raw; }
            LampKernel.write(path, value);
            return "wrote " + path;
        },
        rm: function (args) {
            if (!args[0]) return "usage: rm <path>";
            LampKernel.delete(args[0]);
            return "removed " + args[0];
        },
        echo: function (args, stdin) {
            var text = args.join(" ");
            if (stdin) text = (text ? text + " " : "") + stdin;
            return text || "";
        },
        apps: function () {
            return Object.keys(terminalAppMap).join("  ");
        },
        open: function (args) {
            var name = (args[0] || "").toLowerCase();
            var target = terminalAppMap[name];
            if (!target) return "unknown app: " + name + " (try 'apps')";
            openWindow(target);
            if (terminalIconMap[name]) handleIconTap(terminalIconMap[name]);
            return "opened " + name;
        },
        whoami: function () {
            return "aahi — building lampOS, one weekend at a time";
        },
        date: function () {
            return new Date().toString();
        },
        history: function () {
            return terminalHistory.length ? terminalHistory.join("\n") : "(no history yet)";
        },
        clear: function () {
            terminalOutputEl.innerHTML = "";
            return null;
        }
    };

    function terminalRun(input) {
        var stages = terminalTokenize(input);
        if (stages.length === 0) return;

        var stdin = null;
        var lastOutput = "";

        for (var i = 0; i < stages.length; i++) {
            var tokens = stages[i];
            var cmdName = (tokens[0] || "").toLowerCase();
            var args = tokens.slice(1);
            var fn = terminalCommands[cmdName];

            if (!fn) {
                terminalPrint("command not found: " + cmdName, "error");
                return;
            }

            lastOutput = fn(args, stdin);
            stdin = lastOutput;
        }

        if (lastOutput !== null && lastOutput !== undefined) {
            terminalPrint(lastOutput);
        }
    }

    function handleTerminalSubmit() {
        var input = document.querySelector("#terminalInput");
        var value = input.value.trim();
        if (!value) return;

        terminalPrint("lampos> " + value, "cmd");
        terminalHistory.push(value);
        terminalHistoryIndex = terminalHistory.length;
        input.value = "";

        try {
            terminalRun(value);
        } catch (err) {
            terminalPrint("error: " + err.message, "error");
        }
    }

    document.querySelector("#terminalInput").addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            handleTerminalSubmit();
        } else if (e.key === "ArrowUp") {
            if (terminalHistoryIndex > 0) {
                terminalHistoryIndex--;
                e.target.value = terminalHistory[terminalHistoryIndex] || "";
            }
            e.preventDefault();
        } else if (e.key === "ArrowDown") {
            if (terminalHistoryIndex < terminalHistory.length - 1) {
                terminalHistoryIndex++;
                e.target.value = terminalHistory[terminalHistoryIndex] || "";
            } else {
                terminalHistoryIndex = terminalHistory.length;
                e.target.value = "";
            }
            e.preventDefault();
        }
    });

    terminalPrint("lampos terminal — type 'help' to see available commands", "system");

    ["wifiStatus", "soundStatus", "cameraStatus"].forEach(function (id) {
        document.querySelector("#" + id).addEventListener("click", function () {
            this.classList.toggle("active");
        });
    });