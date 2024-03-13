const noteConfig = {
  selector: '.tinymce-body',
  menubar: false,
  inline: true,
  plugins: ['link', 'lists', 'autolink'],
  toolbar: [
    'undo redo | bold italic underline | fontfamily fontsize',
    'forecolor backcolor | alignleft aligncenter alignright alignfull | numlist bullist outdent indent',
  ],
  valid_elements: 'p[style],strong,em,span[style],a[href],ul,ol,li',
  valid_styles: {
    '*': 'font-size,font-family,color,text-decoration,text-align',
  },
};

// eslint-disable-next-line no-undef
tinymce.init(noteConfig);

function newEntry() {
  const container = document.getElementById('entryContainer');
  const entries = container.getElementsByClassName('entry');
  const lastEntry = entries[entries.length - 1];
  let count;
  try {
    count = parseInt(lastEntry.id.substring(5)) + 1;
  } catch (error) {
    count = 1;
  }

  const entryDiv = document.createElement('div');
  entryDiv.className = 'entry';
  entryDiv.id = `entry${count}`;

  const table = document.createElement('table');
  entryDiv.appendChild(table);

  const titles = ['Entry Title:', 'Aliases:', 'Notes:'];
  const ids = [`etitle${count}`, `ealias${count}`, `notes${count}`];

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < titles.length; i++) {
    const tr = document.createElement('tr');
    table.appendChild(tr);

    const td1 = document.createElement('td');
    const label = document.createElement('label');
    label.setAttribute('for', ids[i]);
    label.textContent = titles[i];
    td1.appendChild(label);
    tr.appendChild(td1);

    const td2 = document.createElement('td');
    if (i < 2) {
      // For 'Entry Title:' and 'Aliases:'
      const input = document.createElement('input');
      input.id = ids[i];
      input.name = ids[i];
      input.type = 'text';
      td2.appendChild(input);
    } else {
      // For 'Notes:'
      td2.className = 'absorb';
      const div = document.createElement('div');
      div.className = 'tinymce-body';
      div.id = ids[i];
      td2.appendChild(div);
    }
    tr.appendChild(td2);
  }

  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete Entry';
  deleteButton.onclick = () => deleteEntry(count); // Call deleteEntry() with the entry index
  entryDiv.appendChild(deleteButton);

  container.appendChild(entryDiv);

  const newConfig = noteConfig;
  newConfig.selector = `#notes${count}`;

  // eslint-disable-next-line no-undef
  tinymce.init(newConfig);
}

// eslint-disable-next-line no-unused-vars
function deleteEntry(i) {
  const entry = document.getElementById(`entry${i}`);
  entry.remove();
}
