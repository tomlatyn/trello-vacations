var t = window.TrelloPowerUp.iframe();
var Promise = window.TrelloPowerUp.Promise;
var STORAGE_KEY = 'vacations';
var DAYS_TO_SHOW = 30;

var state = {
  currentMember: null,
  boardMembers: [],
  vacations: { version: 1, members: {} },
};

function applyTheme() {
  var context = t.getContext();
  var theme = context ? (context.theme || context.initialTheme || 'light') : 'light';
  document.body.classList.toggle('dark-mode', theme === 'dark');
}

applyTheme();

t.subscribeToThemeChanges(function(theme) {
  document.body.classList.toggle('dark-mode', theme === 'dark');
});

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

function formatDateOnly(date) {
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function addDays(date, days) {
  var next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function todayDateOnly() {
  var now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isRangeActiveOn(range, date) {
  var start = parseDateOnly(range.start);
  var end = parseDateOnly(range.end);

  if (!start || !end) {
    return false;
  }

  return start <= date && date <= end;
}

function getMemberName(member) {
  return member.fullName || member.username || member.initials || 'Unknown member';
}

function getMemberInitials(member) {
  if (member.initials) {
    return member.initials;
  }

  return getMemberName(member)
    .split(' ')
    .map(function(part) { return part.charAt(0); })
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getStoredMember(memberId) {
  return state.vacations.members[memberId] || { memberId: memberId, ranges: [] };
}

function normalizeVacations(raw) {
  var vacations = raw || {};

  if (!vacations.members) {
    vacations.members = {};
  }

  vacations.version = vacations.version || 1;
  return vacations;
}

function loadData() {
  return Promise.all([
    t.member('id', 'fullName', 'username', 'initials', 'avatar'),
    t.board('members'),
    t.get('board', 'shared', STORAGE_KEY, { version: 1, members: {} }),
  ]).then(function(results) {
    var boardData = results[1];
    state.currentMember = results[0];
    state.boardMembers = boardData.members || boardData || [];
    state.vacations = normalizeVacations(results[2]);
    render();
  });
}

function saveVacations() {
  return t.set('board', 'shared', STORAGE_KEY, state.vacations);
}

function setMessage(message) {
  document.getElementById('message').textContent = message || '';
}

function render() {
  renderMember();
  renderMine();
  renderTimeline();
}

function renderMember() {
  document.getElementById('member-name').textContent = getMemberName(state.currentMember);
}

function renderMine() {
  var wrapper = document.getElementById('my-ranges');
  var current = getStoredMember(state.currentMember.id);
  var ranges = current.ranges || [];

  wrapper.innerHTML = '';

  if (ranges.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No vacation dates saved yet.';
    wrapper.appendChild(empty);
    return;
  }

  ranges
    .slice()
    .sort(function(a, b) { return a.start.localeCompare(b.start); })
    .forEach(function(range) {
      var item = document.createElement('div');
      item.className = 'range-item';

      var details = document.createElement('div');
      var title = document.createElement('div');
      title.className = 'range-title';
      title.textContent = range.start + ' to ' + range.end;
      details.appendChild(title);

      if (range.note) {
        var note = document.createElement('div');
        note.className = 'range-note';
        note.textContent = range.note;
        details.appendChild(note);
      }

      var remove = document.createElement('button');
      remove.className = 'remove-button';
      remove.type = 'button';
      remove.title = 'Remove vacation';
      remove.textContent = 'x';
      remove.addEventListener('click', function() {
        removeRange(range.id);
      });

      item.appendChild(details);
      item.appendChild(remove);
      wrapper.appendChild(item);
    });
}

function renderTimeline() {
  var timeline = document.getElementById('timeline');
  var activeCount = document.getElementById('active-count');
  var rangeLabel = document.getElementById('range-label');
  var today = todayDateOnly();
  var days = [];
  var activeMemberIds = [];

  for (var index = 0; index < DAYS_TO_SHOW; index += 1) {
    days.push(addDays(today, index));
  }

  Object.keys(state.vacations.members).forEach(function(memberId) {
    var memberRecord = state.vacations.members[memberId];
    var ranges = memberRecord.ranges || [];

    if (ranges.some(function(range) { return isRangeActiveOn(range, today); })) {
      activeMemberIds.push(memberId);
    }
  });

  activeCount.textContent = activeMemberIds.length;
  rangeLabel.textContent = formatDateOnly(days[0]) + ' to ' + formatDateOnly(days[days.length - 1]);
  timeline.innerHTML = '';

  var membersWithVacations = Object.keys(state.vacations.members)
    .map(function(memberId) {
      var boardMember = state.boardMembers.find(function(member) {
        return member.id === memberId;
      });
      var stored = state.vacations.members[memberId];

      return {
        id: memberId,
        fullName: stored.fullName || (boardMember && boardMember.fullName),
        username: stored.username || (boardMember && boardMember.username),
        initials: stored.initials || (boardMember && boardMember.initials),
        ranges: stored.ranges || [],
      };
    })
    .filter(function(member) {
      return member.ranges.length > 0;
    })
    .sort(function(a, b) {
      return getMemberName(a).localeCompare(getMemberName(b));
    });

  if (membersWithVacations.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No vacations have been saved on this board yet.';
    timeline.appendChild(empty);
    return;
  }

  var header = document.createElement('div');
  header.className = 'timeline-header';
  var spacer = document.createElement('div');
  spacer.className = 'member-cell';
  spacer.textContent = 'Member';
  header.appendChild(spacer);

  days.forEach(function(day) {
    var cell = document.createElement('div');
    cell.className = 'day-cell';
    var number = document.createElement('span');
    number.className = 'date-number';
    number.textContent = String(day.getDate());
    cell.appendChild(number);
    header.appendChild(cell);
  });

  timeline.appendChild(header);

  membersWithVacations.forEach(function(member) {
    var row = document.createElement('div');
    row.className = 'timeline-row';

    var memberCell = document.createElement('div');
    memberCell.className = 'member-cell';

    var avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = getMemberInitials(member);

    var name = document.createElement('span');
    name.textContent = getMemberName(member);

    memberCell.appendChild(avatar);
    memberCell.appendChild(name);
    row.appendChild(memberCell);

    days.forEach(function(day) {
      var cell = document.createElement('div');
      var classes = ['day-cell'];
      var dayNumber = day.getDay();

      if (isSameDay(day, today)) {
        classes.push('today');
      }

      if (dayNumber === 0 || dayNumber === 6) {
        classes.push('weekend');
      }

      if (member.ranges.some(function(range) { return isRangeActiveOn(range, day); })) {
        classes.push('vacation');
      }

      cell.className = classes.join(' ');
      row.appendChild(cell);
    });

    timeline.appendChild(row);
  });
}

function ensureCurrentMemberRecord() {
  var member = state.currentMember;

  if (!state.vacations.members[member.id]) {
    state.vacations.members[member.id] = {
      memberId: member.id,
      ranges: [],
    };
  }

  state.vacations.members[member.id].fullName = member.fullName;
  state.vacations.members[member.id].username = member.username;
  state.vacations.members[member.id].initials = member.initials;
  state.vacations.members[member.id].updatedAt = new Date().toISOString();

  return state.vacations.members[member.id];
}

function addRange(event) {
  event.preventDefault();

  var startInput = document.getElementById('start-date');
  var endInput = document.getElementById('end-date');
  var noteInput = document.getElementById('note');
  var start = parseDateOnly(startInput.value);
  var end = parseDateOnly(endInput.value);

  if (!start || !end) {
    setMessage('Choose both dates.');
    return;
  }

  if (end < start) {
    setMessage('End date must be on or after the start date.');
    return;
  }

  var memberRecord = ensureCurrentMemberRecord();
  memberRecord.ranges = memberRecord.ranges || [];
  memberRecord.ranges.push({
    id: String(Date.now()),
    start: startInput.value,
    end: endInput.value,
    note: noteInput.value.trim(),
  });

  saveVacations()
    .then(function() {
      startInput.value = '';
      endInput.value = '';
      noteInput.value = '';
      setMessage('Saved.');
      render();
    })
    .catch(function(error) {
      setMessage('Could not save: ' + error.message);
    });
}

function removeRange(rangeId) {
  var memberRecord = ensureCurrentMemberRecord();
  memberRecord.ranges = (memberRecord.ranges || []).filter(function(range) {
    return range.id !== rangeId;
  });

  if (memberRecord.ranges.length === 0) {
    delete state.vacations.members[state.currentMember.id];
  }

  saveVacations()
    .then(function() {
      setMessage('Removed.');
      render();
    })
    .catch(function(error) {
      setMessage('Could not remove: ' + error.message);
    });
}

document.getElementById('vacation-form').addEventListener('submit', addRange);

t.render(function() {
  return loadData();
});
