function showCreateForm() {
  document.getElementById('defaultContent').style.display = 'none';
  document.getElementById('createForm').style.display = 'block';
  document.getElementById('existingForm').style.display = 'none';
}

function showExistingForm() {
  document.getElementById('defaultContent').style.display = 'none';
  document.getElementById('existingForm').style.display = 'block';
  document.getElementById('createForm').style.display = 'none';
}

function showDefaultContent() {
  document.getElementById('defaultContent').style.display = 'block';
  document.getElementById('createForm').style.display = 'none';
  document.getElementById('existingForm').style.display = 'none';
}
