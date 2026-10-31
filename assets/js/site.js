(function () {
  'use strict';
  var KEY = 'ripple-public-selection:trail-v1';
  var MOTION = 'ripple-public-selection:motion-v1';
  var slugs = ['the-bound', 'drydock-7', 'hadal-terminus', 'effervesent', 'shared-rest'];
  var dialog = document.getElementById('trail-dialog');
  var opener = null, toastTimer = null, storageAvailable = true;
  function read(key) { try { return localStorage.getItem(key); } catch (e) { storageAvailable = false; return null; } }
  function write(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { storageAvailable = false; return false; } }
  function load() {
    var result = { order: [], complete: [] }, candidate;
    try { candidate = JSON.parse(read(KEY) || '{}'); } catch (e) { candidate = {}; }
    if (!candidate || typeof candidate !== 'object') candidate = {};
    ['order', 'complete'].forEach(function (key) {
      if (Array.isArray(candidate[key])) result[key] = candidate[key].filter(function (id, index, arr) { return slugs.indexOf(id) !== -1 && arr.indexOf(id) === index; }).slice(0, 5);
    });
    result.complete = result.complete.filter(function (id) { return result.order.indexOf(id) !== -1; });
    return result;
  }
  var trail = load();
  var current = document.body.dataset.record;
  function save() { write(KEY, JSON.stringify(trail)); }
  function toast(message) {
    var box = document.querySelector('.site-toast');
    if (!box) return;
    box.textContent = message;
    box.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.remove('visible'); }, 2800);
  }
  function refresh() {
    document.querySelectorAll('[data-trail-count]').forEach(function (n) { n.textContent = String(trail.order.length); });
    document.querySelectorAll('[data-record-row]').forEach(function (n) {
      n.classList.toggle('visited', trail.order.indexOf(n.dataset.recordRow) !== -1);
    });
    document.querySelectorAll('[data-opened-label]').forEach(function (n) {
      var id = n.dataset.openedLabel;
      n.textContent = trail.complete.indexOf(id) !== -1 ? 'Complete ✓' : trail.order.indexOf(id) !== -1 ? 'Opened' : '';
    });
    document.querySelectorAll('[data-trail-row]').forEach(function (n) {
      var id = n.dataset.trailRow, visited = trail.order.indexOf(id), done = trail.complete.indexOf(id) !== -1;
      n.classList.toggle('visited', visited !== -1);
      n.classList.toggle('complete', done);
      n.querySelector('.trail-row-state').textContent = done ? 'Complete' : visited !== -1 ? 'Opened ' + String(visited + 1).padStart(2, '0') : 'Unopened';
    });
    var list = document.querySelector('.trail-list');
    if (list) {
      Array.from(list.children).sort(function (a, b) {
        function rank(node) { var i = trail.order.indexOf(node.dataset.trailRow); return i !== -1 ? i : 5 + slugs.indexOf(node.dataset.trailRow); }
        return rank(a) - rank(b);
      }).forEach(function (node) { list.appendChild(node); });
    }
    var summary = document.querySelector('[data-trail-summary]');
    if (summary) summary.textContent = trail.order.length ? trail.order.length + ' of 5 opened / ' + trail.complete.length + ' complete.' : 'No records opened yet.';
    var state = document.querySelector('[data-completion-label]'), button = document.querySelector('[data-mark-complete]');
    if (state && button) {
      var complete = trail.complete.indexOf(current) !== -1;
      state.textContent = complete ? 'Marked complete on this device.' : 'This record is open in your trail.';
      button.classList.toggle('is-complete', complete);
      button.textContent = complete ? 'Complete ✓' : 'Mark complete ✓';
      button.setAttribute('aria-pressed', String(complete));
    }
    if (!storageAvailable) {
      var local = document.querySelector('.trail-summary>span');
      if (local) local.textContent = 'Storage is unavailable; this trail lasts for this page only.';
    }
  }
  if (slugs.indexOf(current) !== -1 && trail.order.indexOf(current) === -1) { trail.order.push(current); save(); }
  refresh();
  document.querySelectorAll('[data-open-trail]').forEach(function (button) {
    button.addEventListener('click', function () {
      opener = button;
      refresh();
      if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
      else toast('Reading trail requires a browser with dialog support. All five records remain available in the selection.');
    });
  });
  function close() { if (dialog && dialog.open) dialog.close(); }
  document.querySelectorAll('[data-close-trail]').forEach(function (button) { button.addEventListener('click', close); });
  if (dialog) {
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
    dialog.addEventListener('close', function () { if (opener && opener.isConnected) opener.focus(); });
  }
  var completeButton = document.querySelector('[data-mark-complete]');
  if (completeButton) completeButton.addEventListener('click', function () {
    if (trail.order.indexOf(current) === -1) trail.order.push(current);
    var i = trail.complete.indexOf(current);
    if (i === -1) { trail.complete.push(current); toast('Record marked complete.'); }
    else { trail.complete.splice(i, 1); toast('Completion mark removed.'); }
    save(); refresh();
  });
  var clear = document.querySelector('[data-clear-trail]');
  if (clear) clear.addEventListener('click', function () {
    if (!window.confirm('Clear the reading trail saved in this browser?')) return;
    trail = { order: [], complete: [] };
    // A record currently on screen remains open, even after clearing earlier history.
    if (slugs.indexOf(current) !== -1) trail.order.push(current);
    save(); refresh();
    var note = document.querySelector('[data-trail-announcement]');
    if (note) note.textContent = current ? 'Earlier trail cleared. The current record remains open.' : 'Reading trail cleared.';
  });
  function setMotion(reduced) {
    document.body.classList.toggle('motion-reduced', reduced);
    document.querySelectorAll('.motion-toggle').forEach(function (b) {
      b.setAttribute('aria-pressed', String(reduced));
      b.textContent = reduced ? 'Motion reduced' : 'Reduce motion';
    });
  }
  setMotion(read(MOTION) === 'reduced');
  document.querySelectorAll('.motion-toggle').forEach(function (b) {
    b.addEventListener('click', function () {
      var reduced = !document.body.classList.contains('motion-reduced');
      setMotion(reduced); write(MOTION, reduced ? 'reduced' : 'default');
    });
  });
  window.addEventListener('storage', function (event) {
    if (event.key === KEY || event.key === null) { trail = load(); refresh(); }
    if (event.key === MOTION || event.key === null) setMotion(read(MOTION) === 'reduced');
  });
  var body = document.querySelector('.record-body'), progress = document.querySelector('.reading-progress');
  if (body && progress) {
    var scheduled = false;
    function updateProgress() {
      scheduled = false;
      var rect = body.getBoundingClientRect();
      var amount = Math.max(0, Math.min(1, (window.innerHeight * 0.8 - rect.top) / rect.height));
      progress.style.transform = 'scaleX(' + amount + ')';
    }
    window.addEventListener('scroll', function () { if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); } }, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
  }
  var artDialog = document.getElementById('art-dialog');
  var artOpener = null;
  document.querySelectorAll('[data-open-art]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (!artDialog || typeof artDialog.showModal !== 'function') return;
      event.preventDefault();
      artOpener = link;
      var image = link.querySelector('img');
      var full = document.getElementById('art-full-image');
      full.src = link.href;
      full.alt = image ? image.alt : '';
      document.getElementById('art-title').textContent = link.dataset.artTitle || 'Illustration';
      document.getElementById('art-original').href = link.href;
      artDialog.showModal();
    });
  });
  function closeArt() { if (artDialog && artDialog.open) artDialog.close(); }
  document.querySelectorAll('[data-close-art]').forEach(function (button) { button.addEventListener('click', closeArt); });
  if (artDialog) {
    artDialog.addEventListener('close', function () { if (artOpener && artOpener.isConnected) artOpener.focus(); });
    artDialog.addEventListener('click', function (event) {
      if (event.target !== artDialog) return;
      var rect = artDialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeArt();
    });
  }
}());
