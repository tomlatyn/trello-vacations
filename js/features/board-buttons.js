var VACATIONS_ICON = './images/icon.png';
var VACATIONS_STORAGE_KEY = 'vacations';

function parseDateOnly(value) {
  if (!value) {
    return null;
  }

  var parts = value.split('-').map(function(part) {
    return parseInt(part, 10);
  });

  if (parts.length !== 3 || parts.some(isNaN)) {
    return null;
  }

  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function todayDateOnly() {
  var now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isVacationActive(range, today) {
  var start = parseDateOnly(range.start);
  var end = parseDateOnly(range.end);

  if (!start || !end) {
    return false;
  }

  return start <= today && today <= end;
}

function countActiveVacations(vacations) {
  var today = todayDateOnly();
  var members = vacations && vacations.members ? vacations.members : {};

  return Object.keys(members).filter(function(memberId) {
    var member = members[memberId];
    var ranges = member && Array.isArray(member.ranges) ? member.ranges : [];

    return ranges.some(function(range) {
      return isVacationActive(range, today);
    });
  }).length;
}

function boardButtonsHandler(t) {
  return t.get('board', 'shared', VACATIONS_STORAGE_KEY, { version: 1, members: {} })
  .then(function(vacations) {
    return [{
      icon: {
        dark: VACATIONS_ICON,
        light: VACATIONS_ICON,
      },
      text: '(' + countActiveVacations(vacations) + ')',
      callback: function(t) {
        return t.boardBar({
          url: './views/vacations.html',
          height: 520,
          resizable: true,
          title: 'Vacations',
          accentColor: '#0079bf',
        });
      },
      condition: 'signedIn',
    }];
  });
}
