var VACATIONS_STORAGE_KEY = 'vacations';

function parseDateOnly(value) {
  if (typeof value !== 'string') {
    return null;
  }

  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  var year = Number(match[1]);
  var month = Number(match[2]) - 1;
  var day = Number(match[3]);
  var date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
}

function todayDateOnly() {
  var now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isVacationActive(range, today) {
  if (!range) {
    return false;
  }

  var startStr = Array.isArray(range) ? range[0] : range.start;
  var endStr = Array.isArray(range) ? range[1] : range.end;
  var start = parseDateOnly(startStr);
  var end = parseDateOnly(endStr);

  if (!start || !end) {
    return false;
  }

  return start <= today && today <= end;
}

function countActiveVacations(raw) {
  var today = todayDateOnly();
  var vacations = raw;

  if (typeof vacations === 'string') {
    try {
      vacations = JSON.parse(vacations);
    } catch (e) {
      vacations = null;
    }
  }

  var members = vacations && (vacations.members || vacations.m) ? (vacations.members || vacations.m) : {};

  return Object.keys(members).filter(function(memberId) {
    var member = members[memberId];
    var ranges = Array.isArray(member) ? member : (member && Array.isArray(member.ranges) ? member.ranges : []);

    return ranges.some(function(range) {
      return isVacationActive(range, today);
    });
  }).length;
}

function openVacationsModal(t) {
  return t.modal({
    url: './views/vacations.html',
    fullscreen: true,
    title: 'Vacations',
    accentColor: '#0c66e4',
  });
}

function boardButtonsHandler(t) {
  return t.get('board', 'shared', VACATIONS_STORAGE_KEY, { version: 1, members: {} })
  .then(function(vacations) {
    return [{
      icon: './images/icon.png',
      text: '(' + countActiveVacations(vacations) + ')',
      callback: openVacationsModal,
      condition: 'signedIn',
    }];
  });
}
