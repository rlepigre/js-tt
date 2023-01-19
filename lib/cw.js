Array.prototype.swap = function (i, j) {
  var tmp = this[i];
  this[i] = this[j];
  this[j] = tmp;
  return this;
}

Array.prototype.pop_random = function () {
  if(this.length == 0) throw new Error("Empty array...");
  var i = Math.floor(Math.random() * this.length);
  this.swap(this.length - 1, i);
  return this.pop();
}

JSON_btoa = function (json) {
  return window.btoa(unescape(encodeURIComponent(JSON.stringify(json))));
}

JSON_atob = function (str) {
  return JSON.parse(decodeURIComponent(escape(window.atob(str))));
}

async function hash(string) {
  const enc = new TextEncoder().encode(string);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

let EMPTY_CELL = "."
let UNKNOWN_CELL = "?"

function can_be_inserted(w, x, y, horiz, grid) {
  // Recovering the grid size.
  var max_w = grid.length;
  var max_h = max_w > 0 ? grid[0].length : 0;

  // Checking that the word would fit in the grid.
  if(x < 0 || y < 0) return false;
  if( horiz && (x + w.length > max_w || y >= max_h)) return false;
  if(!horiz && (x >= max_w || y + w.length > max_h)) return false;

  // Checking for simple collisions.
  for(var k = 0; k < w.length; k++) {
    var xk = horiz ? x+k : x;
    var yk = horiz ? y : y+k;
    var ck = grid[xk][yk];
    if(ck === EMPTY_CELL) {
      if(horiz) {
        if(yk > 0 && grid[xk][yk-1] !== EMPTY_CELL) return false;
        if(yk < max_h-1 && grid[xk][yk+1] !== EMPTY_CELL) return false;
      } else {
        if(xk > 0 && grid[xk-1][yk] !== EMPTY_CELL) return false;
        if(xk < max_w-1 && grid[xk+1][yk] !== EMPTY_CELL) return false;
      }
    } else {
      if(ck !== w[k]) return false;
    }
  }

  // Ensuring no letter before the start or after the end of the word.
  if(horiz) {
    if(x > 0 && grid[x-1][y] !== EMPTY_CELL) return false;
    if(x+w.length < max_w && grid[x+w.length][y] !== EMPTY_CELL) return false;
  } else {
    if(y > 0 && grid[x][y-1] !== EMPTY_CELL) return false;
    if(y+w.length < max_h && grid[x][y+w.length] !== EMPTY_CELL) return false;
  }

  return true;
}

function generate_cw(max_w, max_h, candidate_words) {
  // Two-dimensional array representing the grid.
  var grid = new Array(max_w);
  for (var x = 0; x < max_w; x++) {
    grid[x] = new Array(max_h);
    for (var y = 0; y < max_h; y++) {
      grid[x][y] = EMPTY_CELL;
    }
  }

  // Indices of candidates that are left to be placed on the grid.
  var candidates = candidate_words.map((_, i) => i);

  // Indices of candidates that were discarded in the current run.
  var discarded = new Array();

  // Candidate words that have been placed on the grid.
  var placed = new Array();

  // Have we made progress in the current turn?
  var progress = false;

  // Run a turns of candidates placing as long as we make progress.
  do {
    // No progress so far.
    progress = false;

    // Try each candidate (in a random order), record progress.
    while(candidates.length > 0) {
      // Pick a random index.
      var i = candidates.pop_random();
      var w = candidate_words[i];

      // Case for placing the first word.
      if(placed.length == 0) {
        var ok_hrz = w.word.length <= max_w;
        var ok_vrt = w.word.length <= max_h;

        // Is the word too long in both directions? If yes, discard.
        if(!ok_hrz && !ok_vrt) {
          discarded.push(i);
          continue;
        }

        // We pick the direction.
        var horiz;
        if(!ok_hrz) {
          horiz = false;
        } else if(!ok_vrt) {
          horiz = true;
        } else {
          horiz = Math.random() < 0.5;
        }

        // We pick coordinates.
        var max_x;
        var max_y;
        if(horiz) {
          max_x = max_w - w.word.length;
          max_y = max_h;
        } else {
          max_x = max_w;
          max_y = max_h - w.word.length;
        }
        var x = Math.floor(Math.random() * max_x);
        var y = Math.floor(Math.random() * max_y);

        // Adding the word to the grid.
        for(var k = 0; k < w.word.length; k++) {
          grid[horiz ? x+k : x][horiz ? y : y+k] = w.word[k];
        }

        // Adding the word to the list of placed words..
        placed.push({ x: x, y: y, horiz: horiz, index: i });

        // Record that we made progress.
        progress = true;
        continue;
      }

      // Words in the grid are our targets for insertion.
      var targets = placed.map((_, i) => i);
      var word_placed = false;

      // We try target words randomly until we can place our word (or fail).
      while(targets.length > 0) {
        var target = placed[targets.pop_random()];
        var target_w = candidate_words[target.index];
        var horiz = !target.horiz;

        var join_points = new Array();
        for(var s_i = 0; s_i < w.word.length; s_i++) {
          for(var t_i = 0; t_i < target_w.word.length; t_i++) {
            if(w.word[s_i] === target_w.word[t_i]) {
              join_points.push({source_index: s_i, target_index: t_i});
            }
          }
        }

        while(join_points.length > 0) {
          var p = join_points.pop_random();
          var x_inter = target.x + (horiz ? 0 : p.target_index);
          var y_inter = target.y + (horiz ? p.target_index : 0);
          var x = x_inter - (horiz ? p.source_index : 0);
          var y = y_inter - (horiz ? 0 : p.source_index);

          if(can_be_inserted(w.word, x, y, horiz, grid)) {
            // Adding the word to the grid.
            for(var k = 0; k < w.word.length; k++) {
              grid[horiz ? x+k : x][horiz ? y : y+k] = w.word[k];
            }

            // Adding the word to the list of placed words..
            placed.push({ x: x, y: y, horiz: horiz, index: i });

            // Record that we made progress.
            progress = true;
            word_placed = true;
            break;
          }
        }

        if(word_placed) break;
      }

      if(!word_placed) {
        discarded.push(i);
      }
    }

    // Collect discarded candidates for the next turn.
    candidates = discarded;
    discarded = new Array();
  } while(progress && candidates.length > 0);

  // Returning an empty grid if no word was placed.
  if(placed.length == 0) {
    return { grid: new Array(), width: 0, height: 0, placed: placed };
  }

  // Computing a minimum bounding box.
  var x_min = max_w;
  var x_max = -1;
  var y_min = max_h;
  var y_max = -1;
  for(var x = 0; x < max_w; x++) {
    for(var y = 0; y < max_h; y++) {
      if(grid[x][y] !== EMPTY_CELL) {
        if(x < x_min) x_min = x;
        if(x > x_max) x_max = x;
        if(y < y_min) y_min = y;
        if(y > y_max) y_max = y;
      }
    }
  }

  // Computing the minimal grid.
  var w = x_max - x_min + 1;
  var h = y_max - y_min + 1;
  if(w != max_w || h != max_h) {
    var min_grid = new Array(w);
    for(var x = 0; x < w; x++) {
      min_grid[x] = new Array(h);
      for(var y = 0; y < h; y++) {
        min_grid[x][y] = grid[x + x_min][y + y_min];
      }
    }
    grid = min_grid;

    for(var k = 0; k < placed.length; k++) {
      var p = placed[k];
      var x = p.x - x_min;
      var y = p.y - y_min;
      placed[k] = { x: x, y: y, horiz: p.horiz, index: p.index };
    }
  }

  // Sorting the placed words.
  placed.sort((p1, p2) => {
    var c = p1.y - p2.y;
    if(c != 0) return c;
    c = p1.x - p2.x;
    if(c != 0) return c;
    return ((p1.horiz ? 1 : 0) - (p2.horiz ? 1 : 0)); }
  );

  // Adding numbers for the placed words.
  var c = 0;
  for(var i = 0; i < placed.length; i++) {
    if(i > 0 && placed[i-1].x === placed[i].x && placed[i-1].y === placed[i].y) {
      placed[i].ident = placed[i-1].ident;
    } else {
      c++;
      placed[i].ident = c;
    }
  }

  return { grid: grid, width: w, height: h, words: placed };
}

class Crossword {
  constructor(max_w, max_h, candidate_words, grid_elem, h_elem, v_elem) {
    this.candidate_words = candidate_words;

    // Elements (typically 'div's) where to add the grid and the definitions.
    this.grid_elem = grid_elem;
    this.h_defs_elem = h_elem;
    this.v_defs_elem = v_elem;

    // Generate a number of crosswords, keep the best.
    var crossword = generate_cw(max_w, max_h, candidate_words);
    for(var i = 0; i < 100; i++) {
      var c = generate_cw(max_w, max_h, candidate_words);

      // Less words, not better (we could also sum letters).
      if(c.words.length < crossword.words.length) continue;

      // More words, this is the best crossword so far.
      if(c.words.length > crossword.words.length) {
        crossword = c;
        continue;
      }

      // Same number of words, keep larger size (closer to user request).
      if(c.width + c.height > crossword.width + crossword.height) {
        crossword = c;
        continue;
      }
    }

    // Extract the data from the crossword.
    this.grid = crossword.grid;
    this.width = crossword.width;
    this.height = crossword.height;
    this.words = crossword.words;

    // Create the grid cells, following the grid structure.
    this.grid_cells = new Array(this.width);
    this.letters = new Array(this.width);
    for(var x = 0; x < this.width; x++) {
      this.grid_cells[x] = new Array(this.height);
      this.letters[x] = new Array(this.height);
      for(var y = 0; y < this.height; y++) {
        if(this.grid[x][y] === EMPTY_CELL) {
          this.grid_cells[x][y] = null;
          this.letters[x][y] = null;
          continue;
        }

        var d = document.createElement("div");
        var s = document.createElement("span");
        d.classList.add("cw_cell");
        s.classList.add("cw_contents");
        d.appendChild(s);
        if(this.grid[x][y] === " ") {
          d.classList.add("cw_space");
        } else if(this.grid[x][y].toLowerCase !== this.grid[x][y]) {
          d.classList.add("cw_letter");
          // FIXME DEBUG
          s.appendChild(document.createTextNode(this.grid[x][y]));
        } else {
          d.classList.add("cw_fixed");
          s.appendChild(document.createTextNode(this.grid[x][y]));
        }
        this.grid_cells[x][y] = d;
        this.letters[x][y] = s;
      }
    }

    // Generate the grid using a table.
    this.grid_table = document.createElement("table");
    this.grid_table.classList.add("cw_grid");
    for(var y = 0; y < this.height; y++) {
      var tr = document.createElement("tr");
      this.grid_table.appendChild(tr)
      for(var x = 0; x < this.width; x++) {
        var td = document.createElement("td");
        if(this.grid_cells[x][y] !== null) {
          td.appendChild(this.grid_cells[x][y]);
        }
        tr.appendChild(td);
      }
    }

    // Add the numbers to the grid.
    for(var i = 0; i < this.words.length; i++) {
      var w = this.words[i];
      if(i > 0 && this.words[i-1].ident == w.ident) continue;
      var s = document.createElement("div");
      s.classList.add("cw_number");
      s.appendChild(document.createTextNode(w.ident));
      this.grid_cells[w.x][w.y].insertBefore(s, this.letters[w.x][w.y]);
    }

    // Create the elements for the horizontal definitions.
    this.p_defs_hrz = document.createElement("p");
    this.p_defs_hrz.classList.add("cw_defs");
    this.span_hrz_title = document.createElement("span");
    this.span_hrz_title.classList.add("cw_defs_title");
    this.span_hrz_title.appendChild(document.createTextNode("Accross."));
    this.p_defs_hrz.appendChild(this.span_hrz_title);

    // Create the elements for the vertical definitions.
    this.p_defs_vrt = document.createElement("p");
    this.p_defs_vrt.classList.add("cw_defs");
    this.span_vrt_title = document.createElement("span");
    this.span_vrt_title.classList.add("cw_defs_title");
    this.span_vrt_title.appendChild(document.createTextNode("Down."));
    this.p_defs_vrt.appendChild(this.span_vrt_title);

    // Add the definitions to the lists.
    for(var i = 0; i < this.words.length; i++) {
      var w = this.words[i];
      var s = document.createElement("span");
      s.classList.add("cw_def");
      s.classList.add(`cw_def_${w.index}`);
      var s_num = document.createElement("span");
      s_num.classList.add("cw_def_num");
      s_num.appendChild(document.createTextNode(`${w.ident}.`));
      s.appendChild(s_num);
      s.appendChild(document.createTextNode(candidate_words[w.index].def));
      if(w.horiz) {
        this.p_defs_hrz.appendChild(s);
      } else {
        this.p_defs_vrt.appendChild(s);
      }
    }

    this.grid_container = document.createElement("div");
    this.grid_container.classList.add("cw_grid_container");
    this.grid_container.appendChild(this.grid_table);

    this.debug_p = document.createElement("p");
    this.debug_p.classList.add("debug");
    var debug = `size: ${this.width}×${this.height} `;
    debug += ` (max ${max_w}×${max_h})`;
    debug += `, words: ${this.words.length}/${candidate_words.length} `;
    this.debug_p.appendChild(document.createTextNode(debug));
    this.go_to_solver_b = document.createElement("button");
    this.go_to_solver_b.appendChild(document.createTextNode("Go to solver"));
    this.debug_p.appendChild(this.go_to_solver_b);

    this.grid_elem.appendChild(this.grid_container);
    this.grid_container.appendChild(this.debug_p);
    this.h_defs_elem.appendChild(this.p_defs_hrz);
    this.v_defs_elem.appendChild(this.p_defs_vrt);

    this.go_to_solver_b.onclick = (e) => {
      crossword_solver_data(cwd)
        .then(JSON_btoa)
        .then(encodeURIComponent)
        .then((s) => {
          var cur_url = window.location.href.split('?')[0];
          window.location.href = `${cur_url}?data=${s}`;
        });
    };
  }

  toString() {
    var s = "";
    for(var y = 0; y < this.height; y++) {
      for(var x = 0; x < this.width; x++) {
        s += this.grid[x][y];
      }
      s += "\n";
    }

    return s;
  }
}

function hide_word(w) {
  var res = "";
  for(var i = 0; i < w.length; i++) {
    res += w[i].toLowerCase() != w[i].toUpperCase() ? UNKNOWN_CELL : w[i];
  }
  return res;
}

async function crossword_solver_data(cwd) {
  const encoder = new TextEncoder();
  var json = {};
  json["width"] = cwd.width;
  json["height"] = cwd.height;

  var words = [];
  for(var i = 0; i < cwd.words.length; i++) {
    var data = cwd.words[i];
    var w = cwd.candidate_words[data.index];
    words[i] = {};
    words[i]["hash"] = await hash(w.word);
    words[i]["word"] = hide_word(w.word);
    words[i]["def"] = w.def;
    words[i]["x"] = data.x;
    words[i]["y"] = data.y;
    words[i]["horiz"] = data.horiz;
    words[i]["ident"] = data.ident;
  };
  json["words"] = words;

  return json;
}

async function check_hashes(data) {
  var res = await Promise.all(data.map(async (d) => {
    if(d === null) return null;
    var r = await hash(d.v);
    return d.h === r;
  }));
  return res;
}

class CrosswordSolver {
  constructor(data, grid_elem, h_elem, v_elem) {
    // Extracting the different pieces of data for the crossword.
    this.height = data.height;
    this.width = data.width;
    this.words = data.words;

    // Elements (typically 'div's) where to add the grid and the definitions.
    this.grid_elem = grid_elem;
    this.h_defs_elem = h_elem;
    this.v_defs_elem = v_elem;

    // Two-dimensional array representing the grid.
    this.grid = new Array(this.width);
    for (var x = 0; x < this.width; x++) {
      this.grid[x] = new Array(this.height);
      for (var y = 0; y < this.height; y++) {
        this.grid[x][y] = EMPTY_CELL;
      }
    }

    // All the words using any given cell.
    this.cell_words = new Array(this.width);
    for (var x = 0; x < this.width; x++) {
      this.cell_words[x] = new Array(this.height);
      for (var y = 0; y < this.height; y++) {
        this.cell_words[x][y] = new Array();
      }
    }

    // Inserting the words in the grid, and record cell usage.
    this.words.forEach((w) => {
      var x = w.x;
      var y = w.y;
      for(var i = 0; i < w.word.length; i++) {
        this.grid[x][y] = w.word[i];
        this.cell_words[x][y].push({w: w, i: i});
        if(w.horiz) { x++; } else { y++; }
      }
    });

    // Create the grid cells, following the grid structure.
    this.grid_cells = new Array(this.width);
    this.letters = new Array(this.width);
    for(var x = 0; x < this.width; x++) {
      this.grid_cells[x] = new Array(this.height);
      this.letters[x] = new Array(this.height);
      for(var y = 0; y < this.height; y++) {
        if(this.grid[x][y] === EMPTY_CELL) {
          this.grid_cells[x][y] = null;
          this.letters[x][y] = null;
          continue;
        }

        var d = document.createElement("div");
        var s = document.createElement("span");
        d.classList.add("cw_cell");
        s.classList.add("cw_contents");
        d.appendChild(s);
        if(this.grid[x][y] === " ") {
          d.classList.add("cw_space");
        } else if(this.grid[x][y] === UNKNOWN_CELL) {
          d.classList.add("cw_letter");
        } else {
          d.classList.add("cw_fixed");
          s.appendChild(document.createTextNode(this.grid[x][y]));
        }
        this.grid_cells[x][y] = d;
        this.letters[x][y] = s;
      }
    }

    // Generate the grid using a table.
    this.grid_table = document.createElement("table");
    this.grid_table.classList.add("cw_grid");
    for(var y = 0; y < this.height; y++) {
      var tr = document.createElement("tr");
      this.grid_table.appendChild(tr)
      for(var x = 0; x < this.width; x++) {
        var td = document.createElement("td");
        if(this.grid_cells[x][y] !== null) {
          td.appendChild(this.grid_cells[x][y]);
        }
        tr.appendChild(td);
      }
    }

    // Add the numbers to the grid.
    for(var i = 0; i < this.words.length; i++) {
      var w = this.words[i];
      if(i > 0 && this.words[i-1].ident == w.ident) continue;
      var s = document.createElement("div");
      s.classList.add("cw_number");
      s.appendChild(document.createTextNode(w.ident));
      this.grid_cells[w.x][w.y].insertBefore(s, this.letters[w.x][w.y]);
    }

    // Create the elements for the horizontal definitions.
    this.p_defs_hrz = document.createElement("p");
    this.p_defs_hrz.classList.add("cw_defs");
    this.span_hrz_title = document.createElement("span");
    this.span_hrz_title.classList.add("cw_defs_title");
    this.span_hrz_title.appendChild(document.createTextNode("Accross."));
    this.p_defs_hrz.appendChild(this.span_hrz_title);

    // Create the elements for the vertical definitions.
    this.p_defs_vrt = document.createElement("p");
    this.p_defs_vrt.classList.add("cw_defs");
    this.span_vrt_title = document.createElement("span");
    this.span_vrt_title.classList.add("cw_defs_title");
    this.span_vrt_title.appendChild(document.createTextNode("Down."));
    this.p_defs_vrt.appendChild(this.span_vrt_title);

    // Add the definitions to the lists.
    this.words.forEach((w, i) => {
      var s = document.createElement("span");
      s.classList.add("cw_def");
      s.classList.add(`cw_def_${i}`);
      var s_num = document.createElement("span");
      s_num.classList.add("cw_def_num");
      s_num.appendChild(document.createTextNode(`${w.ident}.`));
      s.appendChild(s_num);
      s.appendChild(document.createTextNode(w.def));
      if(w.horiz) {
        this.p_defs_hrz.appendChild(s);
      } else {
        this.p_defs_vrt.appendChild(s);
      }
    });

    this.selected = null;

    for(var x = 0; x < this.width; x++) {
      for(var y = 0; y < this.height; y++) {
        var cell = this.grid_cells[x][y];
        if(cell === null || !cell.classList.contains("cw_letter")) continue;
        cell.onclick = ((x, y) => (e) => {
          if(this.frozen) return false;
          if(this.selected === null) {
            this.selected = {x: x, y: y, k: 0, i: this.cell_words[x][y][0].i};
            this.set_word_highlight(this.cell_words[x][y][0].w, true);
            this.grid_cells[x][y].classList.add("selected");
          } else if(this.selected.x == x && this.selected.y == y) {
            var sx = this.selected.x;
            var sy = this.selected.y;
            var sk = this.selected.k;
            // Removing old selection.
            this.grid_cells[sx][sy].classList.remove("selected");
            this.set_word_highlight(this.cell_words[sx][sy][sk].w, false);
            if(sk == this.cell_words[sx][sy].length - 1) {
              // Clearing the selection.
              this.selected = null;
            } else {
              this.selected.k = sk + 1;
              this.selected.i = this.cell_words[x][y][sk + 1].i;
              this.set_word_highlight(this.cell_words[x][y][sk + 1].w, true);
              this.grid_cells[x][y].classList.add("selected");
            }
          } else {
            var sx = this.selected.x;
            var sy = this.selected.y;
            var sk = this.selected.k;
            // Removing old selection.
            this.grid_cells[sx][sy].classList.remove("selected");
            this.set_word_highlight(this.cell_words[sx][sy][sk].w, false);
            // Adding new selection.
            this.selected = {x: x, y: y, k: 0, i: this.cell_words[x][y][0].i};
            this.set_word_highlight(this.cell_words[x][y][0].w, true);
            this.grid_cells[x][y].classList.add("selected");
          }
          return true;
        })(x, y);
      }
    }

    this.grid_container = document.createElement("div");
    this.grid_container.classList.add("cw_grid_container");
    this.grid_container.appendChild(this.grid_table);

    this.grid_elem.appendChild(this.grid_container);
    this.h_defs_elem.appendChild(this.p_defs_hrz);
    this.v_defs_elem.appendChild(this.p_defs_vrt);

    this.check_b = document.createElement("button");
    this.check_b.appendChild(document.createTextNode("Check"));
    this.check_b.classList.add("validate_button");
    this.grid_container.appendChild(this.check_b);

    this.check_enabled = true;
    this.frozen = false;
    this.greened_words = this.words.map((w) => false);

    this.check_b.onclick = (e) => {
      this.check_b.disabled = true;
      if(this.check_enabled) {
        this.set_freeze(true);
        this.clear_selection();
        var data = this.words.map((w) => {
          var v = "";
          var x = w.x;
          var y = w.y;
          for(var i = 0; i < w.word.length; i++) {
            if(w.word[i] == UNKNOWN_CELL) {
              if(this.letters[x][y].innerHTML.length == 0) return null;
              v += this.letters[x][y].innerHTML;
            } else {
              v += w.word[i];
            }
            if(w.horiz) { x++; } else { y++; }
          }
          return {v: v, h: w.hash};
        });
        check_hashes(data).then((res) => {
          res.forEach((r, i) => {
            if(r === null) return;
            if(r === true) this.set_greened(i, true);
          });
          this.check_b.innerHTML = "Continue";
          this.check_enabled = false;
          this.check_b.disabled = false;
        });
      } else {
        this.set_freeze(false);
        this.clear_greened();
        this.check_enabled = true;
        this.check_b.innerHTML = "Check";
        this.check_b.disabled = false;
      }
    };

    this.grid_elem.tabIndex = 0; // Unables focusing, hence keyboard events.
    this.grid_elem.onkeydown = (e) => {
      if(e.getModifierState("Alt")) return true
      if(e.getModifierState("AltGraph")) return true;
      if(e.getModifierState("Control")) return true;
      if(e.getModifierState("Meta")) return true;
      if(this.selected === null) return true;
      if(this.frozen) return true;
      if(e.keyCode == 8) {
        // Backspace: delete and move back.
        this.letters[this.selected.x][this.selected.y].innerHTML = "";
        this.move_selection(false);
      } else if(e.keyCode == 13 || e.keyCode == 27) {
        // Enter or Escape: clear selection.
        this.clear_selection();
      } else {
        var s = String.fromCharCode(e.keyCode).toUpperCase();
        if(s.toLowerCase() === s) return true;
        // Letter: enter and move forward.
        this.letters[this.selected.x][this.selected.y].innerHTML = s;
        this.move_selection(true);
      }
      return false;
    };
  }

  set_freeze(b) {
    this.frozen = b;
  }

  set_greened(i, b) {
    if(this.greened_words[i] == b) return;
    this.greened_words[i] = b;
    var w = this.words[i];
    var x = w.x;
    var y = w.y;
    for(var i = 0; i < w.word.length; i++) {
      if(w.word[i] == UNKNOWN_CELL) {
        if(b) {
          this.grid_cells[x][y].classList.add("validated");
        } else {
          this.grid_cells[x][y].classList.remove("validated");
        }
      }
      if(w.horiz) { x++; } else { y++; }
    }
  }

  clear_greened() {
    this.greened_words.forEach((b, i) => {
      if(b) this.set_greened(i, false);
    });
  }

  set_word_highlight(w, b) {
    var x = w.x;
    var y = w.y;
    for(var i = 0; i < w.word.length; i++) {
      if(w.word[i] == UNKNOWN_CELL) {
        if(b) {
          this.grid_cells[x][y].classList.add("word_highlight");
        } else {
          this.grid_cells[x][y].classList.remove("word_highlight");
        }
      }
      if(w.horiz) { x++; } else { y++; }
    }
  }

  clear_selection() {
    var s = this.selected;
    if(s === null) return;
    this.grid_cells[s.x][s.y].classList.remove("selected");
    this.set_word_highlight(this.cell_words[s.x][s.y][s.k].w, false);
  }

  move_selection(forward) {
    // No selection? Nothing to do.
    if(s === null) return;
    // First letter and not forward? Do not move.
    var s = this.selected;
    if(s.i == 0 && !forward) return;
    // Last letter? Do not move.
    var sw = this.cell_words[s.x][s.y][s.k].w;
    if(this.selected.i == sw.word.length - 1 && forward) return;
    // We need to move! Clear the highlight.
    this.grid_cells[s.x][s.y].classList.remove("selected");
    // Move the index and coordinates.
    if(forward) {
      var n = 1
      while(sw.word[s.i + n] != UNKNOWN_CELL) n++;
      s.i += n;
      if(sw.horiz) { s.x += n; } else { s.y += n; };
    } else {
      var n = 1;
      while(sw.word[s.i - n] != UNKNOWN_CELL) n++;
      s.i -= n;
      if(sw.horiz) { s.x -= n; } else { s.y -= n; };
    }
    // Update the word cell index.
    s.k = this.cell_words[s.x][s.y].findIndex((x) => x.w === sw);
    // Set highlight.
    this.grid_cells[s.x][s.y].classList.add("selected");
  }

  toString() {
    var s = "";
    for(var y = 0; y < this.height; y++) {
      for(var x = 0; x < this.width; x++) {
        s += this.grid[x][y];
      }
      s += "\n";
    }

    return s;
  }
}

function append_number_input(form, label_name, value) {
  var e_label = document.createElement("label");
  var e_input = document.createElement("input");

  e_label.appendChild(document.createTextNode(label_name));
  e_input.type = "number";
  e_input.min = 8;
  e_input.value = value;

  form.appendChild(e_label);
  form.appendChild(document.createElement("br"));
  form.appendChild(e_input);
  form.appendChild(document.createElement("br"));

  return e_input;
}

function button_with_label(label) {
  var button = document.createElement("button");
  button.appendChild(document.createTextNode(label));
  button.type = "button";
  return button;
}

class CrosswordDataForm {
  constructor(form_elem) {
    this.form_elem = form_elem;
    this.form = document.createElement("form");

    // Creating the table that will give the layout of the form.
    this.defs_table = document.createElement("table");
    this.defs_lines = new Array();

    // Adding fields for the preferred height and width.
    this.h_input = this.add_num_input_line("Preferred height", 10);
    this.w_input = this.add_num_input_line("Preferred width", 10);

    // Add buttons for controlling the number of words.
    this.control_line = this.add_flexible_line("Words");
    this.add_1_line_button = button_with_label("Add 1 word");
    this.control_line.tds[2].appendChild(this.add_1_line_button);
    this.add_1_line_button.onclick = (e) => {
      this.add_def_line();
    };
    this.control_line.tds[2].appendChild(document.createTextNode(" "));
    this.add_5_lines_button = button_with_label("Add 5 words");
    this.control_line.tds[2].appendChild(this.add_5_lines_button);
    this.add_5_lines_button.onclick = (e) => {
      this.add_defs_lines(5);
    };

    // Add submit button.
    this.submit_line = this.add_flexible_line(null);
    this.submit_button = document.createElement("input");
    this.submit_button.type = "submit";
    this.submit_button.value = "Generate";
    this.submit_line.tds[0].appendChild(this.submit_button);

    this.form.onsubmit = (e) => {
      // Prevent moving to another page, but still run the validation.
      e.preventDefault();

      // Gathering the data.
      var height = this.h_input.value;
      var width = this.w_input.value;
      var words = [];
      this.defs_lines.forEach((l, i) => {
        words[i] = {};
        words[i]["word"] = l.word.value.toUpperCase();
        words[i]["def"] = l.def.value;
      });

      var json = {};
      json["height"] = height;
      json["width"] = width;
      json["words"] = words;

      var cur_url = window.location.href.split('?')[0];
      var s = encodeURIComponent(JSON_btoa(json));
      window.location.href = `${cur_url}?spec=${s}`;
      return false;
    };

    // Add the initial word lines.
    this.add_defs_lines(10);

    // Adding the form to the specified element on the page.
    this.form.appendChild(this.defs_table);
    this.form_elem.appendChild(this.form);
  }

  add_flexible_line(label) {
    var tr = document.createElement("tr");
    var label_td = document.createElement("td");
    var sep_td = document.createElement("td");
    var main_td = document.createElement("td");
    var last_td = document.createElement("td");

    if(label !== null) {
      label_td.appendChild(document.createTextNode(label));
      sep_td.appendChild(document.createTextNode(":"));
    }

    tr.appendChild(label_td);
    tr.appendChild(sep_td);
    tr.appendChild(main_td);
    tr.appendChild(last_td);

    this.defs_table.appendChild(tr);
    return {tr: tr, tds: [label_td, sep_td, main_td, last_td]};
  }

  add_num_input_line(label, value) {
    var tr = document.createElement("tr");
    var label_td = document.createElement("td");
    var sep_td = document.createElement("td");
    var input_td = document.createElement("td");
    var e_input = document.createElement("input");

    tr.appendChild(label_td);
    tr.appendChild(sep_td);
    tr.appendChild(input_td);
    tr.appendChild(document.createElement("td"));
    label_td.appendChild(document.createTextNode(label));
    sep_td.appendChild(document.createTextNode(":"));
    input_td.appendChild(e_input);

    e_input.type = "number";
    e_input.min = 8;
    e_input.value = value;
    e_input.required = true;

    this.defs_table.appendChild(tr);
    return e_input;
  }

  add_def_line() {
    var tr = document.createElement("tr");
    var word_td = document.createElement("td");
    var sep_td = document.createElement("td");
    var def_td = document.createElement("td");
    var del_td = document.createElement("td");
    var word_input = document.createElement("input");
    var def_input = document.createElement("input");
    var del_button = document.createElement("button");

    var line = {tr: tr, word: word_input, def: def_input, del: del_button};

    tr.appendChild(word_td);
    tr.appendChild(sep_td);
    tr.appendChild(def_td);
    tr.appendChild(del_td);
    word_td.appendChild(word_input);
    sep_td.appendChild(document.createTextNode(":"));
    def_td.appendChild(def_input);
    del_td.appendChild(del_button);

    word_input.type = "text";
    word_input.placeholder = "Word";
    word_input.size = 20;
    word_input.min_length = 2;
    word_input.required = true;
    def_input.type = "text";
    def_input.placeholder = "Definition.";
    def_input.size = 80;
    def_input.min_length = 1;
    def_input.required = true;
    del_button.appendChild(document.createTextNode("Delete line"));
    del_button.type = "button";

    del_button.onclick = (e) => {
      this.defs_table.removeChild(tr);
      var i = this.defs_lines.indexOf(line);
      this.defs_lines.splice(i, 1);
    };

    word_input.addEventListener('focusout', (e) => {
      word_input.value = word_input.value.toUpperCase();
    });

    this.defs_table.insertBefore(tr, this.submit_line.tr);
    this.defs_lines.push(line);
  }

  add_defs_lines(n) {
    for(var i = 0; i < n; i++) this.add_def_line();
  }
}
