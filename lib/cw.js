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

function generate_cw(max_width, max_height, candidate_words) {
  // Two-dimensional array representing the grid.
  var grid = new Array(max_width);
  for (var x = 0; x < max_width; x++) {
    grid[x] = new Array(max_height);
    for (var y = 0; y < max_height; y++) {
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
        var ok_hrz = w.word.length <= max_width;
        var ok_vrt = w.word.length <= max_height;

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
          max_x = max_width - w.word.length;
          max_y = max_height;
        } else {
          max_x = max_width;
          max_y = max_height - w.word.length;
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
  var x_min = max_width;
  var x_max = -1;
  var y_min = max_height;
  var y_max = -1;
  for(var x = 0; x < max_width; x++) {
    for(var y = 0; y < max_height; y++) {
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
  if(w != max_width || h != max_height) {
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

  return { grid: grid, width: w, height: h, words: placed };
}

class Crossword {
  constructor(max_width, max_height, candidate_words, parent_element) {
    // Element (typically a 'div') in which to add the crossword.
    this.parent_element = parent_element;

    // Generate a number of crosswords, keep the best.
    var crossword = generate_cw(max_width, max_height, candidate_words);
    for(var i = 0; i < 100; i++) {
      var c = generate_cw(max_width, max_height, candidate_words);

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

    this.grid = crossword.grid;
    this.width = crossword.width;
    this.height = crossword.height;
    this.placed_words = crossword.words;

    this.placed_words.forEach((w) =>
      console.log(`Word ${candidate_words[w.index].word} placed at (${w.x}, ${w.y}), ${w.horiz ? 'horizontally' : 'vertically'}`)
    );
    console.log(this.grid_as_string());
    console.log(`width : ${this.width}/${max_width}`);
    console.log(`height: ${this.height}/${max_height}`);
    console.log(`words : ${this.placed_words.length}/${candidate_words.length}`);
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
