let noteJSON;
let collIndex = 0;
let editors;
let matchingArray;
const projId = document.getElementById('proj-id').value;
const docId = document.getElementById('doc-id').value;

function download(id, format) {
  fetch(`/downloadDoc/${id}/${format}`)
    .then((response) => response.blob())
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
}

const tinyMCEConfig = {
  selector: 'textarea#document',
  promotion: false,
  plugins:
    'preview importcss searchreplace autolink save directionality code visualblocks visualchars fullscreen link codesample table charmap pagebreak nonbreaking anchor insertdatetime advlist lists wordcount help charmap quickbars emoticons accordion',
  menubar: 'file edit view insert format tools table help',
  toolbar:
    'save export | undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | align numlist bullist | table | lineheight outdent indent| forecolor backcolor removeformat | charmap emoticons | code fullscreen preview | save print | pagebreak anchor codesample | ltr rtl',
  importcss_append: true,
  save_onsavecallback: () => {
    submitForm(false);
  },
  setup: (editor) => {
    editor.ui.registry.addMenuButton('export', {
      text: 'Export Doc',
      fetch: (callback) => {
        const items = [
          {
            type: 'menuitem',
            text: 'Export Docx',
            onAction: () => {
              editor.save();
              download(docId, 'docx');
            },
          },
          {
            type: 'menuitem',
            text: 'Export PDF',
            onAction: () => {
              editor.save();
              download(docId, 'pdf');
            },
          },
        ];
        callback(items);
      },
    });
  },
  height: '80vh',
  quickbars_selection_toolbar:
    'bold italic | quicklink h2 h3 blockquote quicktable',
  noneditable_class: 'mceNonEditable',
  toolbar_mode: 'sliding',
  contextmenu: 'link table',
  skin: 'oxide',
  content_css: 'default',
  content_style:
    'body { font-family:Helvetica,Arial,sans-serif; font-size:16px; overflow-y: scroll}',
};

// Initial page load
async function loadApp() {
  // eslint-disable-next-line no-undef
  editors = await tinymce.init(tinyMCEConfig);
  const aliasButton = document.getElementById('test-alias');
  aliasButton.addEventListener(
    'click',
    highlightAliases.bind(null, editors[0]),
  );
  getNotesData();

  // Bind collections traversal buttons
  const nextButton = document.getElementById('next-collection');
  nextButton.addEventListener('click', nextCollection);
  const prevButton = document.getElementById('prev-collection');
  prevButton.addEventListener('click', prevCollection);

  // Bind Submit override to form
  document.getElementById('editor-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitForm(true);
  });

  // Autosave the form once a minuite without redirecting
  setInterval(() => submitForm(false), 60000);
}

// Load the app
loadApp();

/* Retrieve collections from server and load collcection 1 into collections tab,
create matching array from aliases and highlight editor */
async function getNotesData() {
  const noteRawData = await fetch(`notes/${projId}`);
  noteJSON = await noteRawData.json();
  loadCollection(0);
  matchingArray = createMatchingArray(noteJSON);
  highlightAliases(editors[0]);
}

// Load collection into collection pane
function loadCollection(i) {
  const coll = noteJSON[i];
  collIndex = i;
  const title = document.getElementById('collection-title');
  title.textContent = coll.title;
  const entries = document.getElementById('entries');
  entries.replaceChildren();
  // For each note create nodes and append them to entryDiv
  coll.notes.forEach((e) => {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'entry';
    entryDiv.id = e.id;

    const entryTitle = document.createElement('h3');
    entryTitle.textContent = `Title: ${e.title}`;
    entryDiv.appendChild(entryTitle);

    const alias = document.createElement('p');
    const aliasSpan = document.createElement('span');
    aliasSpan.textContent = `Aliases: ${e.alias}`;
    aliasSpan.style = `background-color: ${e.color}80; color: ${getContrastColor(e.color)};`;
    alias.appendChild(aliasSpan);
    entryDiv.appendChild(alias);

    const note = document.createElement('div');
    note.innerHTML = e.note;
    entryDiv.appendChild(note);

    entries.appendChild(entryDiv);
  });
}

// Functions to switch between collections for back and forward buttons
function nextCollection() {
  if (collIndex + 1 < noteJSON.length) {
    loadCollection(collIndex + 1);
  } else {
    loadCollection(0);
  }
}

function prevCollection() {
  if (collIndex > 0) {
    collIndex -= 1;
  } else {
    collIndex = noteJSON.length - 1;
  }
  loadCollection(collIndex);
}

// Move to correct collection and highligt selected note after clicking on highlighted text in editor
function selectNote(targetId, color) {
  const foundIndex = noteJSON.findIndex((c) =>
    c.notes.some((note) => note.id === targetId),
  );
  if (collIndex !== foundIndex) {
    loadCollection(foundIndex);
  }
  const entries = document.getElementById('entries');
  const target = document.getElementById(targetId);
  target.style.setProperty('--highlight-color', `${color}80`);

  const sectionPosition = target.offsetTop;

  // Scroll the div to the section
  entries.scrollTop = sectionPosition - 180;

  document.getElementById('highlight-style');

  target.classList.add('highlight');

  // Remove the highlight after a delay
  setTimeout(() => {
    target.classList.remove('highlight');
  }, 1300); // 1000ms = 1 seconds
}

// Escape special chars in regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Create an array of objects that have a color, a note id and a array of regexs that match to aliases for each note that has an alias
function createMatchingArray(collections) {
  const matchingArrayLocal = [];
  collections.forEach((collection) => {
    collection.notes.forEach((note) => {
      // Clean and split aliases into array
      const aliases = note.alias.split(',');
      const cleanedAliases = aliases
        .map((e) => e.trim())
        .filter((e) => /[a-z]/i.test(e));

      if (cleanedAliases.length === 0) return;

      // Escape regex and transform each alias into regular expression
      const regexAliases = cleanedAliases.map(
        (e) => new RegExp(`\\b${escapeRegExp(e)}\\b`, 'gi'),
      );
      const matchObj = {
        color: note.color,
        regex: regexAliases,
        id: note.id,
      };
      matchingArrayLocal.push(matchObj);
      // eslint-disable-next-line no-undef
      tinymce.activeEditor.dom.addStyle(
        `.note${note.id} {background-color: ${note.color}80;  color: ${getContrastColor(note.color)}; transition: 0.3s; cursor:pointer;} 
        .note${note.id}:hover {background-color: ${note.color}FF;}`,
      );
    });
  });
  return matchingArrayLocal;
}

// Add highlights to editor using matching array
function highlightAliases(editor) {
  removeHighlights();
  // get all children of the editor body
  const body = editor.getBody();
  const { children } = body;

  // Loop through all direct children of the editor body
  Array.from(children).forEach((child) => {
    // Walk through each child node using the tinyMCE api
    // eslint-disable-next-line no-undef
    const walker = new tinymce.dom.TreeWalker(child);

    do {
      // only start doing regex matches if the current node is a text node
      if (walker.current().nodeType === 3) {
        const currentNode = walker.current();
        const { parentNode } = currentNode;
        const currentText = currentNode.textContent;
        const replacements = [];

        matchingArray.forEach((entry) => {
          entry.regex.forEach((regex) => {
            const matches = [...currentText.matchAll(regex)];
            if (matches.length > 0) {
              matches.forEach((match) => {
                const found = {
                  indexStart: match.index,
                  indexEnd: match.index + match[0].length,
                  match: match[0],
                  noteId: entry.id,
                  color: entry.color,
                };
                replacements.push(found);
              });
            }
          });
        });

        replacements.sort((a, b) => {
          if (a.indexStart === b.indexStart) {
            return a.indexEnd - b.indexEnd;
          }
          return a.indexStart - b.indexStart;
        });

        let overallIndex = 0;
        replacements.forEach((rep) => {
          if (rep.indexStart < overallIndex) {
            return;
          }
          const beforeMatch = currentText.slice(overallIndex, rep.indexStart);
          if (beforeMatch.length > 0) {
            const beforeMatchNode = document.createTextNode(beforeMatch);
            parentNode.insertBefore(beforeMatchNode, currentNode);
          }
          const matchNode = document.createElement('span');
          matchNode.dataset.noteId = rep.noteId;
          matchNode.textContent = rep.match;
          matchNode.className = 'alias';
          matchNode.classList.add(`note${rep.noteId}`);
          parentNode.insertBefore(matchNode, currentNode);
          overallIndex = rep.indexEnd;
          const finalNode = document.createTextNode('\u200b');
          parentNode.insertBefore(finalNode, currentNode);
          matchNode.addEventListener(
            'click',
            selectNote.bind(
              'null',
              parseInt(matchNode.dataset.noteId),
              rep.color,
            ),
          );
        });

        if (overallIndex < currentText.length - 1) {
          const trailing = currentText.slice(overallIndex, currentText.length);
          const trailingNode = document.createTextNode(trailing);
          parentNode.insertBefore(trailingNode, currentNode);
        }

        currentNode.remove();
      }
    } while (walker.next());
  });
}

// Remove all highlights from editor
function removeHighlights() {
  const spans = document
    .getElementById('document_ifr')
    .contentWindow.document.querySelectorAll('span.alias');
  spans.forEach((span) => {
    const parent = span.parentNode;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
    parent.normalize();
  });
  const body = editors[0].getBody();

  // eslint-disable-next-line no-undef
  const walker = new tinymce.dom.TreeWalker(body);

  do {
    if (walker.current().nodeType === 3) {
      walker.current().textContent = walker
        .current()
        .textContent.replace(/\u200B/g, '');
    }
  } while (walker.next());
}

// Handle editor form posting
function submitForm(redirectOnResponse) {
  // eslint-disable-next-line no-undef
  tinymce.get('document').save();
  removeHighlights();
  const formData = new URLSearchParams(
    new FormData(document.getElementById('editor-form')),
  );
  highlightAliases(editors[0]);

  fetch('/document', {
    method: 'POST',
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      if (redirectOnResponse && response.redirected) {
        window.location.href = response.url;
      } else {
        return response.text();
      }
    })
    .then((data) => {
      if (data) {
        console.log('Autosave Successful');
      }
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

// Calculate if white or black has better contrast
function getContrastColor(hexColor) {
  // Convert the hex color to RGB
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);

  // Calculate the brightness of the color
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // Return black for bright colors, white for dark colors
  return brightness > 128 ? 'black' : 'white';
}
