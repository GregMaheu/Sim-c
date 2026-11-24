const byId = id => document.getElementById(id);
const form = byId('ask');
const input = byId('message');
const submit = byId('submit');
const summary = byId('summary');
const rows = byId('rows');
const steps = byId('steps');

for (const button of document.querySelectorAll('[data-example]')) {
  button.addEventListener('click', () => {
    input.value = button.dataset.example;
    form.requestSubmit();
  });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  const message = input.value;
  submit.disabled = true;
  byId('output').hidden = false;
  byId('request').textContent = message;
  byId('table-wrap').hidden = true;
  byId('workflow').hidden = true;
  rows.replaceChildren();
  steps.replaceChildren();
  summary.textContent = 'Checking your request…';

  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const result = await response.json();
    if (!response.ok) {
      summary.textContent = result.error;
      return;
    }
    for (const row of result.rows) {
      const tr = rows.insertRow();
      for (const value of [row.name, row.supplier, row.onHand, row.incoming, row.projected, row.minimum, row.suggested]) {
        tr.insertCell().textContent = typeof value === 'number' ? `${value} ${row.unit}` : value;
      }
    }
    for (const step of result.steps) {
      const item = document.createElement('li');
      item.textContent = step;
      steps.append(item);
    }
    byId('engine').textContent = `Intent classifier: ${result.engine}`;
    byId('table-wrap').hidden = result.rows.length === 0;
    byId('workflow').hidden = false;
    summary.textContent = result.summary;
  } catch {
    summary.textContent = 'Could not reach Sim-C. Check that the local server is running.';
  } finally {
    submit.disabled = false;
  }
});
