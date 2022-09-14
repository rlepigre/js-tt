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
        if(this.grid[x][y] === ".") {
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
    this.span_hrz_title.appendChild(document.createTextNode("Horizontal."));
    this.p_defs_hrz.appendChild(this.span_hrz_title);

    // Create the elements for the vertical definitions.
    this.p_defs_vrt = document.createElement("p");
    this.p_defs_vrt.classList.add("cw_defs");
    this.span_vrt_title = document.createElement("span");
    this.span_vrt_title.classList.add("cw_defs_title");
    this.span_vrt_title.appendChild(document.createTextNode("Vertical."));
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
    debug += `, words: ${this.words.length}/${candidate_words.length}`;
    this.debug_p.appendChild(document.createTextNode(debug));

    this.grid_elem.appendChild(this.grid_container);
    this.grid_container.appendChild(this.debug_p);
    this.h_defs_elem.appendChild(this.p_defs_hrz);
    this.v_defs_elem.appendChild(this.p_defs_vrt);

    console.log(window.location.href);
  }

  grid_as_string() {
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

async function crossword_solver_data(cwd) {
  var words = [];

  const encoder = new TextEncoder();

  cwd.words.forEach(async (data) => {
    var w = cwd.candidate_words[data.index];
    var word = {};
    word["def"] = w.def;
    word["x"] = data.x;
    word["y"] = data.y;
    word["horiz"] = data.horiz;
    word["ident"] = data.ident;
    word["hash"] = await hash(w.word);
    words.push(word);
  });

  var json = {};
  json["width"] = cwd.width;
  json["height"] = cwd.height;
  json["words"] = words;

  return json;
}
