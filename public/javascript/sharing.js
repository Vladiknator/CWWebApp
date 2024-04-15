// Initialize popovers
const popoverTriggerList = document.querySelectorAll(
  '[data-bs-toggle="popover"]',
);
// eslint-disable-next-line no-unused-vars
const popoverList = [...popoverTriggerList].map(
  // eslint-disable-next-line no-undef
  (popoverTriggerEl) => new bootstrap.Popover(popoverTriggerEl),
);

const toastElList = document.querySelectorAll('.toast');
// eslint-disable-next-line no-unused-vars
const toastList = [...toastElList].map(
  // eslint-disable-next-line no-undef
  (toastEl) => new bootstrap.Toast(toastEl, { delay: 1000 }),
);

const toast = document.getElementById('liveToast');

// Get all elements with class "clipboard-button"
const clipboardButtons = document.querySelectorAll('.clipboard-button');
clipboardButtons.forEach((button) => {
  activateClipboardButton(button);
});

function activateClipboardButton(button) {
  button.addEventListener('click', async () => {
    // Get the previous sibling (which should be the textarea or text input)
    const textarea = button.previousElementSibling;

    try {
      // Use the Clipboard API to copy the text
      await navigator.clipboard.writeText(textarea.value);
      // eslint-disable-next-line no-undef
      const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toast);
      toastBootstrap.show();
    } catch (error) {
      console.error('Error copying text to clipboard:', error);
    }
  });
}

// eslint-disable-next-line no-unused-vars
function createLink() {
  const includeNotes = document.getElementById('include-notes-toggle').checked;
  const linkNote = document.getElementById('link-note').value;
  // eslint-disable-next-line no-undef
  const reqObj = { includeNotes, linkNote, docId, projId };
  let resObj;
  fetch('/document/link/create', {
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    // Serialize your JSON body
    body: JSON.stringify(reqObj),
  })
    .then(async (response) => {
      // Handle the response (e.g., process data)
      resObj = await response.json();
      if (resObj.message === 'Created Link') {
        document.getElementById('new-link').value =
          `${window.location.host}/shared/view/${resObj.uuid}`;
        createExistingLink(resObj);
      }
    })
    .catch((error) => {
      console.error('Error occurred:', error);
    });
}

function getLinks() {
  let resObj;
  // eslint-disable-next-line no-undef
  fetch(`/document/link/${docId}`, {
    method: 'get',
  })
    .then(async (response) => {
      // Handle the response (e.g., process data)
      resObj = await response.json();
      if (resObj.length > 0) {
        resObj.forEach((e) => {
          createExistingLink(e);
        });
      }
    })
    .catch((error) => {
      console.error('Error occurred:', error);
    });
}

getLinks();

// eslint-disable-next-line no-unused-vars
function deleteLink(button) {
  // Get the parent element of the button
  const parentElement = button.parentNode;

  fetch(`/document/link/${parentElement.id}`, {
    method: 'delete',
  })
    .then(async (response) => {
      // Handle the response (e.g., process data)
      const resObj = await response.json();
      if (resObj.message) {
        parentElement.remove();
      }
    })
    .catch((error) => {
      console.error('Error occurred:', error);
    });
}

function createExistingLink(e) {
  const container = document.getElementById('existing-links-container');
  const template = document.getElementById('existing-link');
  const clone = template.content.cloneNode(true);
  clone.querySelector('.form-check-input').checked = e.include_notes;
  clone.children[0].id = e.uuid;
  const textFields = clone.querySelectorAll('input[type="text"]');
  textFields[0].value = e.link_note;
  textFields[1].value = `${window.location.host}/shared/view/${e.uuid}`;
  activateClipboardButton(clone.querySelector('.clipboard-button'));
  container.appendChild(clone);
}
