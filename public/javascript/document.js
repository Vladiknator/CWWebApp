let noteJSON;
let collIndex = 0;
let editors;
const projId = document.getElementById('proj_id').value;

const tinyMCEConfig = {
  selector: 'textarea#document',
  plugins:
    'preview importcss searchreplace autolink save directionality code visualblocks visualchars fullscreen link codesample table charmap pagebreak nonbreaking anchor insertdatetime advlist lists wordcount help charmap quickbars emoticons accordion',
  menubar: 'file edit view insert format tools table help',
  toolbar:
    'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | align numlist bullist | table | lineheight outdent indent| forecolor backcolor removeformat | charmap emoticons | code fullscreen preview | save print | pagebreak anchor codesample | ltr rtl',
  importcss_append: true,
  height: 600,
  quickbars_selection_toolbar:
    'bold italic | quicklink h2 h3 blockquote quicktable',
  noneditable_class: 'mceNonEditable',
  toolbar_mode: 'sliding',
  contextmenu: 'link table',
  skin: 'oxide',
  content_css: 'default',
  content_style:
    'body { font-family:Helvetica,Arial,sans-serif; font-size:16px }',
};

// eslint-disable-next-line no-undef
// tinymce.init(tinyMCEConfig);

async function getNotesData() {
  const noteRawData = await fetch(`notes/${projId}`);
  noteJSON = await noteRawData.json();
  console.log(noteJSON);
  // eslint-disable-next-line no-undef
  editors = await tinymce.init(tinyMCEConfig);
  loadCollection(0);
  highlightAliases(noteJSON, editors[0]);
  const aliasButton = document.getElementById('testAlias');
  aliasButton.addEventListener(
    'type',
    highlightAliases.bind(null, noteJSON, editors[0]),
  );
}

function loadCollection(i) {
  const coll = noteJSON[i];
  console.log(i);
  const title = document.getElementById('collectionTitle');
  title.textContent = coll.title;
  const entries = document.getElementById('entries');
  entries.replaceChildren();
  coll.notes.forEach((e) => {
    const entryDiv = document.createElement('div');
    entryDiv.className = 'entry';

    const entryTitle = document.createElement('h3');
    entryTitle.textContent = `Title: ${e.title}`;
    entryDiv.appendChild(entryTitle);

    const alias = document.createElement('p');
    alias.textContent = `Aliases: ${e.alias}`;
    entryDiv.appendChild(alias);

    const note = document.createElement('div');
    note.innerHTML = e.note;
    entryDiv.appendChild(note);

    entries.appendChild(entryDiv);
  });
}

function nextCollection() {
  if (collIndex + 1 < noteJSON.length) {
    collIndex += 1;
  } else {
    collIndex = 0;
  }
  loadCollection(collIndex);
}

function prevCollection() {
  if (collIndex > 0) {
    collIndex -= 1;
  } else {
    collIndex = noteJSON.length - 1;
  }
  loadCollection(collIndex);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function highlightAliases(collections, editor) {
  // Iterate over each object
  collections.forEach((collection) => {
    collection.notes.forEach((note) => {
      // Split the aliases string into an array
      const aliases = note.alias.split(',');

      // Iterate over each alias in the current object
      aliases.forEach((alias) => {
        // Trim whitespace from the alias
        // eslint-disable-next-line no-param-reassign
        alias = alias.trim();

        // Escape special characters in the alias
        const escapedAlias = escapeRegExp(alias);

        // Create a regular expression to find the alias in the editor content
        const regex = new RegExp(`\\b${escapedAlias}\\b`, 'gi');

        // Use the TinyMCE API to traverse the editor's content
        editor.getBody().normalize();
        // Code below does not yet work
        // eslint-disable-next-line no-undef
        tinymce.activeEditor.dom.walk(
          editor.getBody(),
          (node) => {
            if (node.nodeType === 3) {
              // Text node
              const nodeVal = node.nodeValue;
              const match = nodeVal.match(regex);
              if (match) {
                const newNode = editor.getDoc().createElement('span');
                newNode.style.color = 'blue';
                // eslint-disable-next-line prefer-destructuring
                newNode.textContent = match[0];
                node.parentNode.replaceChild(newNode, node);
              }
            }
          },
          'childNodes',
        );
      });
    });
  });
}

getNotesData();

const nextButton = document.getElementById('nextCollection');
nextButton.addEventListener('click', nextCollection);
const prevButton = document.getElementById('prevCollection');
prevButton.addEventListener('click', prevCollection);
