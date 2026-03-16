const state = {
  events: [],
  selectedId: null,
  filter: 'all',
  tab: 'payload',
  connected: false,
  ws: null
};

const refs = {
  list: document.getElementById('event-list'),
  detail: document.getElementById('detail'),
  replay: document.getElementById('replay-btn'),
  copyCurl: document.getElementById('copy-curl'),
  copyFetch: document.getElementById('copy-fetch'),
  copyUrl: document.getElementById('copy-url'),
  statusDot: document.getElementById('status-dot'),
  statusLabel: document.getElementById('status-label')
};

function selectedEvent() {
  return state.events.find((event) => event.id === state.selectedId) ?? null;
}

function toRelative(iso) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m`;
}

function filteredEvents() {
  return state.filter === 'failed' ? state.events.filter((event) => event.failed) : state.events;
}

function renderList() {
  const events = filteredEvents();
  refs.list.innerHTML = '';
  for (const event of events) {
    const row = document.createElement('button');
    row.className = `event-row ${event.id === state.selectedId ? 'selected' : ''}`;
    row.innerHTML = `<div class="row-top"><span><span class="badge">${event.method}</span> ${event.platform ?? 'webhook'}</span><span class="badge ${event.failed ? 'fail' : 'ok'}">${event.status ?? (event.failed ? 'ERR' : 'PENDING')}</span></div><div class="row-meta">${event.id.slice(0, 16)} · ${toRelative(event.receivedAt)}</div>`;
    row.addEventListener('click', () => {
      state.selectedId = event.id;
      render();
    });
    refs.list.appendChild(row);
  }
}

function renderDetail() {
  const event = selectedEvent();
  if (!event) {
    refs.detail.className = 'detail empty';
    refs.detail.textContent = 'Waiting for webhooks… paste your tunnel URL in provider settings.';
    return;
  }

  refs.detail.className = 'detail';
  if (state.tab === 'payload') {
    refs.detail.textContent = event.bodyParsed ? JSON.stringify(event.bodyParsed, null, 2) : event.body;
  } else if (state.tab === 'headers') {
    refs.detail.textContent = Object.entries(event.headers).map(([k, v]) => `${k}: ${v}`).join('\n');
  } else if (state.tab === 'response') {
    refs.detail.textContent = `status: ${event.status ?? 'N/A'}\nlatency: ${event.latency ?? '-'}ms\nerror: ${event.error ?? 'none'}`;
  } else {
    refs.detail.textContent = `Verify signatures with provider SDK using raw body and headers.\n\nID: ${event.id}`;
  }
}

function renderStatus() {
  refs.statusDot.className = `dot ${state.connected ? 'live' : 'disconnected'}`;
  refs.statusLabel.textContent = state.connected ? 'Live' : 'Disconnected';
}

function render() {
  renderList();
  renderDetail();
  renderStatus();
}

function upsertEvent(event) {
  const idx = state.events.findIndex((e) => e.id === event.id);
  if (idx === -1) {
    state.events.unshift(event);
    if (!state.selectedId) state.selectedId = event.id;
  } else {
    state.events[idx] = event;
  }
}

async function boot() {
  const result = await fetch('/api/events');
  const data = await result.json();
  state.events = data.events || [];
  if (state.events[0]) state.selectedId = state.events[0].id;
  render();
  connectWs();
}

function connectWs() {
  state.ws = new WebSocket(`ws://${location.hostname}:${location.port ? Number(location.port) + 1 : 2020}`);

  state.ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.type === 'event' || data.type === 'update') {
      upsertEvent(data.event);
      render();
    }
    if (data.type === 'clear') {
      state.events = [];
      state.selectedId = null;
      render();
    }
    if (data.type === 'status') {
      state.connected = data.connected;
      renderStatus();
    }
  };

  state.ws.onclose = () => {
    state.connected = false;
    renderStatus();
    setTimeout(connectWs, 2000);
  };
}

for (const filter of document.querySelectorAll('.filter')) {
  filter.addEventListener('click', () => {
    for (const el of document.querySelectorAll('.filter')) el.classList.remove('active');
    filter.classList.add('active');
    state.filter = filter.dataset.filter;
    renderList();
  });
}

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    for (const el of document.querySelectorAll('.tab')) el.classList.remove('active');
    tab.classList.add('active');
    state.tab = tab.dataset.tab;
    renderDetail();
  });
}

refs.copyUrl.addEventListener('click', async () => {
  await navigator.clipboard.writeText(refs.copyUrl.textContent.trim());
});

refs.replay.addEventListener('click', async () => {
  const event = selectedEvent();
  if (!event) return;
  refs.replay.disabled = true;
  refs.replay.textContent = 'Replaying…';
  await fetch('/api/replay', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: event.id })
  });
  refs.replay.disabled = false;
  refs.replay.textContent = 'Replay';
});

refs.copyCurl.addEventListener('click', async () => {
  const event = selectedEvent();
  if (!event) return;
  const headers = Object.entries(event.headers).map(([k, v]) => `-H '${k}: ${String(v).replaceAll("'", "'\\''")}'`).join(' ');
  const cmd = `curl -X ${event.method} ${headers} --data-raw '${event.body.replaceAll("'", "'\\''")}' '${refs.copyUrl.textContent.trim()}${event.path}'`;
  await navigator.clipboard.writeText(cmd);
});

refs.copyFetch.addEventListener('click', async () => {
  const event = selectedEvent();
  if (!event) return;
  const snippet = `await fetch('${refs.copyUrl.textContent.trim()}${event.path}', {\n  method: '${event.method}',\n  headers: ${JSON.stringify(event.headers, null, 2)},\n  body: ${JSON.stringify(event.body)}\n});`;
  await navigator.clipboard.writeText(snippet);
});

document.addEventListener('keydown', (event) => {
  const currentIndex = filteredEvents().findIndex((item) => item.id === state.selectedId);
  if (event.key === 'ArrowDown') {
    const next = filteredEvents()[Math.min(filteredEvents().length - 1, currentIndex + 1)];
    if (next) { state.selectedId = next.id; render(); }
  }
  if (event.key === 'ArrowUp') {
    const prev = filteredEvents()[Math.max(0, currentIndex - 1)];
    if (prev) { state.selectedId = prev.id; render(); }
  }
  if (event.key.toLowerCase() === 'r') refs.replay.click();
  if (event.key.toLowerCase() === 'c') refs.copyUrl.click();
  if (event.key === 'Escape') { state.selectedId = null; render(); }
});

boot();
