let noteJSON;
let collIndex = 0;
const projId = document.getElementById('proj_id').value;

async function getNotesData() {
  const noteRawData = await fetch(`notes/${projId}`);
  noteJSON = await noteRawData.json();
  console.log(noteJSON);
  loadCollection(0);
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

getNotesData();

const nextButton = document.getElementById('nextCollection');
nextButton.addEventListener('click', nextCollection);
const prevButton = document.getElementById('prevCollection');
prevButton.addEventListener('click', prevCollection);
