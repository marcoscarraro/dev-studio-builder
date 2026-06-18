document.addEventListener('DOMContentLoaded', function () {
  var sidebar = document.getElementById('appIconSidebar');
  if (!sidebar) return;

  var hasBs = typeof bootstrap !== 'undefined';
  var sideTips = [];
  if (hasBs && bootstrap.Tooltip) {
    sidebar.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
      sideTips.push(new bootstrap.Tooltip(el));
    });
  }
  function setTips(enabled) {
    sideTips.forEach(function (t) { t.hide(); enabled ? t.enable() : t.disable(); });
  }
  function collapseSidebar() {
    sidebar.classList.remove('is-expanded');
    sidebar.querySelectorAll('.side-item.open').forEach(function (i) { i.classList.remove('open'); });
    setTips(true);
  }
  function expandSidebar() {
    sidebar.classList.add('is-expanded');
    setTips(false);
  }
  sidebar.querySelectorAll('.side-link[data-sub]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var item = link.closest('.side-item');
      var willOpen = !item.classList.contains('open');
      expandSidebar();
      sidebar.querySelectorAll('.side-item.open').forEach(function (i) {
        if (i !== item) i.classList.remove('open');
      });
      item.classList.toggle('open', willOpen);
    });
  });
  sidebar.querySelectorAll('[data-leaf]').forEach(function (link) {
    link.addEventListener('click', function () {
      sidebar.querySelectorAll('.side-item.active').forEach(function (i) { i.classList.remove('active'); });
      sidebar.querySelectorAll('.side-sublink.active').forEach(function (a) { a.classList.remove('active'); });
      if (link.classList.contains('side-sublink')) {
        link.classList.add('active');
        link.closest('.side-item').classList.add('active');
      } else {
        link.closest('.side-item').classList.add('active');
      }
      collapseSidebar();
    });
  });
  document.addEventListener('click', function (e) {
    if (!sidebar.contains(e.target)) collapseSidebar();
  });
  collapseSidebar();
});
