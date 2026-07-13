var t = window.TrelloPowerUp.iframe();
var Promise = window.TrelloPowerUp.Promise;
var STORAGE_KEY = 'vacations';
var DAYS_TO_SHOW = 90;

var state = {
  currentMember: null,
  boardMembers: [],
  vacations: { version: 1, members: {} },
  startPicker: null,
  endPicker: null,
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
  if (typeof value !== 'string') {
    return null;
  }

  var isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  var displayMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);

  if (!isoMatch && !displayMatch) {
    return null;
  }

  var year = Number(isoMatch ? isoMatch[1] : displayMatch[3]);
  var month = Number(isoMatch ? isoMatch[2] : displayMatch[2]) - 1;
  var day = Number(isoMatch ? isoMatch[3] : displayMatch[1]);
  var date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
}

function formatDateOnly(date) {
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function formatDisplayDate(date) {
  if (!date) {
    return '';
  }

  var day = String(date.getDate()).padStart(2, '0');
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var year = date.getFullYear();
  return day + '.' + month + '.' + year;
}

function formatDisplayDateValue(value) {
  return formatDisplayDate(parseDateOnly(value));
}

function formatRangeDisplay(range) {
  return formatDisplayDateValue(range.start) + ' - ' + formatDisplayDateValue(range.end);
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

function isFirstOfMonth(date) {
  return date.getDate() === 1;
}

function isMonday(date) {
  return date.getDay() === 1;
}

function formatMonthLabel(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function formatWeekday(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
  }).slice(0, 3);
}

function getMonthGroups(days) {
  var groups = [];

  days.forEach(function(day) {
    var key = day.getFullYear() + '-' + day.getMonth();
    var group = groups[groups.length - 1];

    if (!group || group.key !== key) {
      groups.push({
        key: key,
        label: formatMonthLabel(day),
        span: 1,
      });
    } else {
      group.span += 1;
    }
  });

  return groups;
}

function getVacationForDay(ranges, day) {
  return ranges.find(function(range) {
    return isRangeActiveOn(range, day);
  });
}

function isRangeFinished(range, today) {
  var end = parseDateOnly(range.end);
  return end && end < today;
}

function sortRangesFromFurthest(ranges) {
  return ranges.slice().sort(function(a, b) {
    var aDate = parseDateOnly(a.start);
    var bDate = parseDateOnly(b.start);
    return (bDate ? bDate.getTime() : 0) - (aDate ? aDate.getTime() : 0);
  });
}

function getMembersWithVacations() {
  return Object.keys(state.vacations.members)
    .map(function(memberId) {
      var boardMember = state.boardMembers.find(function(member) {
        return member.id === memberId;
      });
      var stored = getStoredMember(memberId);

      return {
        id: memberId,
        fullName: stored.fullName || (boardMember && boardMember.fullName),
        username: stored.username || (boardMember && boardMember.username),
        initials: stored.initials || (boardMember && boardMember.initials),
        ranges: getValidRanges(stored),
      };
    })
    .filter(function(member) {
      return member.ranges.length > 0;
    })
    .sort(function(a, b) {
      return getMemberName(a).localeCompare(getMemberName(b));
    });
}

function buildDaysFrom(start, count) {
  var days = [];

  for (var index = 0; index < count; index += 1) {
    days.push(addDays(start, index));
  }

  return days;
}

function buildDaysBetween(start, end) {
  var days = [];
  var cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  while (cursor <= end) {
    days.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
    cursor = addDays(cursor, 1);
  }

  return days;
}

function isRangeActiveOn(range, date) {
  if (!range) {
    return false;
  }

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
  var member = state.vacations.members[memberId];

  if (!member || typeof member !== 'object' || Array.isArray(member)) {
    return { memberId: memberId, ranges: [] };
  }

  return member;
}

function getValidRanges(member) {
  if (!member || !Array.isArray(member.ranges)) {
    return [];
  }

  return member.ranges.filter(function(range) {
    var start = range && parseDateOnly(range.start);
    var end = range && parseDateOnly(range.end);
    return start && end && start <= end;
  });
}

function normalizeVacations(raw) {
  var vacations = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};

  if (!vacations.members || typeof vacations.members !== 'object' || Array.isArray(vacations.members)) {
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
    state.boardMembers = boardData && (boardData.members || boardData) || [];

    if (!Array.isArray(state.boardMembers)) {
      state.boardMembers = [];
    }

    state.vacations = normalizeVacations(results[2]);
    render();
  });
}

function saveVacations(vacations) {
  return t.set('board', 'shared', STORAGE_KEY, vacations).then(function() {
    state.vacations = vacations;
  });
}

function setMessage(message) {
  document.getElementById('message').textContent = message || '';
}

function formatActiveCountText(count) {
  if (count === 1) {
    return 'member on vacation today';
  }

  return 'members on vacation today';
}

function initDatePickers() {
  if (!window.flatpickr) {
    return;
  }

  var endPicker = null;
  var pickerOptions = {
    altInput: true,
    altFormat: 'd.m.Y',
    dateFormat: 'Y-m-d',
    allowInput: true,
    disableMobile: true,
  };

  var startPicker = window.flatpickr('#start-date', Object.assign({}, pickerOptions, {
    onChange: function(selectedDates) {
      var startDate = selectedDates[0];

      if (!startDate || !endPicker) {
        return;
      }

      endPicker.open();
    },
  }));

  endPicker = window.flatpickr('#end-date', Object.assign({}, pickerOptions, {
    onChange: function() {},
  }));

  state.startPicker = startPicker;
  state.endPicker = endPicker;
}

function render() {
  renderMine();
  renderTimeline();
}

function renderMine() {
  var wrapper = document.getElementById('my-ranges');
  var current = getStoredMember(state.currentMember.id);
  var ranges = getValidRanges(current);
  var today = todayDateOnly();
  var activeRanges = sortRangesFromFurthest(ranges.filter(function(range) {
    return !isRangeFinished(range, today);
  }));
  var finishedRanges = sortRangesFromFurthest(ranges.filter(function(range) {
    return isRangeFinished(range, today);
  }));

  wrapper.innerHTML = '';

  if (ranges.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No vacation dates saved yet.';
    wrapper.appendChild(empty);
    return;
  }

  wrapper.appendChild(createRangeSection('Upcoming & Current', activeRanges, true, 'No upcoming or current vacation dates.'));
  wrapper.appendChild(createRangeSection('Past', finishedRanges, false, 'No past vacation dates.'));
}

function createRangeSection(title, ranges, isOpen, emptyText) {
  var section = document.createElement('details');
  section.className = 'range-section';
  section.open = isOpen;

  var summary = document.createElement('summary');
  summary.className = 'range-section-summary';
  summary.textContent = title + ' (' + ranges.length + ')';
  section.appendChild(summary);

  var content = document.createElement('div');
  content.className = 'range-section-content';

  if (ranges.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'empty-state compact';
    empty.textContent = emptyText;
    content.appendChild(empty);
  } else {
    ranges.forEach(function(range) {
      content.appendChild(createRangeItem(range, true));
    });
  }

  section.appendChild(content);
  return section;
}

function createRangeItem(range, canRemove) {
  var item = document.createElement('div');
  item.className = 'range-item';

  var details = document.createElement('div');
  var title = document.createElement('div');
  title.className = 'range-title';
  title.textContent = formatRangeDisplay(range);
  details.appendChild(title);

  item.appendChild(details);

  if (canRemove) {
    var remove = document.createElement('button');
    remove.className = 'remove-button';
    remove.type = 'button';
    remove.title = 'Remove vacation';
    remove.setAttribute('aria-label', 'Remove vacation');
    remove.textContent = '×';
    remove.addEventListener('click', function() {
      removeRange(range.id);
    });

    item.appendChild(remove);
  }

  return item;
}

function getHistoryEntries() {
  var entries = [];

  Object.keys(state.vacations.members).forEach(function(memberId) {
    var stored = getStoredMember(memberId);
    var boardMember = state.boardMembers.find(function(member) {
      return member.id === memberId;
    });
    var memberName = stored.fullName || (boardMember && boardMember.fullName) || stored.username || memberId;
    var ranges = getValidRanges(stored);

    ranges.forEach(function(range) {
      entries.push({
        memberName: memberName,
        range: range,
      });
    });
  });

  return entries;
}

function getHistoryDateBounds(entries) {
  var starts = [];
  var ends = [];

  entries.forEach(function(entry) {
    var start = parseDateOnly(entry.range.start);
    var end = parseDateOnly(entry.range.end);

    if (start) {
      starts.push(start);
    }

    if (end) {
      ends.push(end);
    }
  });

  return {
    start: new Date(Math.min.apply(null, starts)),
    end: new Date(Math.max.apply(null, ends)),
  };
}

function setGridColumns(element, days) {
  element.style.gridTemplateColumns = 'repeat(' + days.length + ', var(--day-column-width))';
}

function scrollScheduleToEnd(container) {
  var datesScroll = container.querySelector('.dates-scroll');

  if (!datesScroll) {
    return;
  }

  datesScroll.scrollLeft = datesScroll.scrollWidth;
}

function renderScheduleGrid(container, days, membersWithVacations, emptyText) {
  container.innerHTML = '';

  if (membersWithVacations.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }

  var today = todayDateOnly();
  var timelineGrid = document.createElement('div');
  timelineGrid.className = 'timeline-grid';

  var memberLane = document.createElement('div');
  memberLane.className = 'member-lane';

  var datesScroll = document.createElement('div');
  datesScroll.className = 'dates-scroll';

  var datesCanvas = document.createElement('div');
  datesCanvas.className = 'dates-canvas';
  datesCanvas.style.minWidth = 'calc(' + days.length + ' * var(--day-column-width))';

  var memberMonthHeader = document.createElement('div');
  memberMonthHeader.className = 'member-cell member-month-header';
  memberMonthHeader.textContent = 'Member';
  memberLane.appendChild(memberMonthHeader);

  var memberDayHeader = document.createElement('div');
  memberDayHeader.className = 'member-cell member-day-header';
  memberLane.appendChild(memberDayHeader);

  var monthRow = document.createElement('div');
  monthRow.className = 'timeline-month-row';
  setGridColumns(monthRow, days);

  getMonthGroups(days).forEach(function(group) {
    var monthCell = document.createElement('div');
    var monthLabel = document.createElement('span');
    monthCell.className = 'month-cell';
    monthCell.style.gridColumn = 'span ' + group.span;
    monthLabel.className = 'month-label';
    monthLabel.textContent = group.label;
    monthCell.appendChild(monthLabel);
    monthRow.appendChild(monthCell);
  });

  datesCanvas.appendChild(monthRow);

  var dayRow = document.createElement('div');
  dayRow.className = 'timeline-day-row';
  setGridColumns(dayRow, days);

  days.forEach(function(day) {
    var cell = document.createElement('div');
    var classes = ['day-cell', 'header-day'];

    if (isSameDay(day, today)) {
      classes.push('today');
    }

    if (day.getDay() === 0 || day.getDay() === 6) {
      classes.push('weekend');
    }

    if (isFirstOfMonth(day)) {
      classes.push('month-start');
    }

    if (isMonday(day)) {
      classes.push('week-start');
    }

    cell.className = classes.join(' ');
    var number = document.createElement('span');
    number.className = 'date-number';
    number.textContent = String(day.getDate());
    var weekday = document.createElement('span');
    weekday.className = 'weekday-label';
    weekday.textContent = formatWeekday(day);
    cell.appendChild(weekday);
    cell.appendChild(number);
    dayRow.appendChild(cell);
  });

  datesCanvas.appendChild(dayRow);

  membersWithVacations.forEach(function(member, memberIndex) {
    var memberCell = document.createElement('div');
    memberCell.className = 'member-cell member-row-cell';

    if (memberIndex === membersWithVacations.length - 1) {
      memberCell.classList.add('last-row');
    }

    var avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = getMemberInitials(member);

    var name = document.createElement('span');
    name.textContent = getMemberName(member);

    memberCell.appendChild(avatar);
    memberCell.appendChild(name);
    memberLane.appendChild(memberCell);

    var row = document.createElement('div');
    row.className = 'timeline-row';
    setGridColumns(row, days);

    if (memberIndex === membersWithVacations.length - 1) {
      row.classList.add('last-row');
    }

    days.forEach(function(day) {
      var cell = document.createElement('div');
      var classes = ['day-cell'];
      var dayNumber = day.getDay();
      var vacation = getVacationForDay(member.ranges, day);

      if (isSameDay(day, today)) {
        classes.push('today');
      }

      if (dayNumber === 0 || dayNumber === 6) {
        classes.push('weekend');
      }

      if (isFirstOfMonth(day)) {
        classes.push('month-start');
      }

      if (isMonday(day)) {
        classes.push('week-start');
      }

      if (vacation) {
        classes.push('vacation');

        if (isSameDay(day, parseDateOnly(vacation.start))) {
          classes.push('vacation-start');
        }

        if (isSameDay(day, parseDateOnly(vacation.end))) {
          classes.push('vacation-end');
        }

        cell.title = formatRangeDisplay(vacation);
      }

      cell.className = classes.join(' ');
      row.appendChild(cell);
    });

    datesCanvas.appendChild(row);
  });

  datesScroll.appendChild(datesCanvas);
  timelineGrid.appendChild(memberLane);
  timelineGrid.appendChild(datesScroll);
  container.appendChild(timelineGrid);
}

function renderHistory() {
  var content = document.getElementById('history-content');
  var entries = getHistoryEntries();

  content.innerHTML = '';

  if (entries.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No vacation history yet.';
    content.appendChild(empty);
    return;
  }

  var bounds = getHistoryDateBounds(entries);
  var summary = document.createElement('div');
  summary.className = 'history-summary';
  summary.textContent = formatDisplayDate(bounds.start) + ' - ' + formatDisplayDate(bounds.end);

  var timeline = document.createElement('div');
  timeline.className = 'timeline history-timeline';

  content.appendChild(summary);
  content.appendChild(timeline);
  renderScheduleGrid(timeline, buildDaysBetween(bounds.start, bounds.end), getMembersWithVacations(), 'No vacation history yet.');

  return timeline;
}

function openHistory() {
  var timeline = renderHistory();
  document.getElementById('history-panel').classList.remove('hidden');
  document.getElementById('history-close-button').focus();

  if (timeline) {
    window.requestAnimationFrame(function() {
      scrollScheduleToEnd(timeline);
    });
  }
}

function closeHistory() {
  document.getElementById('history-panel').classList.add('hidden');
  document.getElementById('history-button').focus();
}

function renderTimeline() {
  var timeline = document.getElementById('timeline');
  var activeCount = document.getElementById('active-count');
  var scheduleActiveCount = document.getElementById('schedule-active-count');
  var today = todayDateOnly();
  var days = buildDaysFrom(today, DAYS_TO_SHOW);
  var activeMemberIds = [];

  Object.keys(state.vacations.members).forEach(function(memberId) {
    var memberRecord = getStoredMember(memberId);
    var ranges = getValidRanges(memberRecord);

    if (ranges.some(function(range) { return isRangeActiveOn(range, today); })) {
      activeMemberIds.push(memberId);
    }
  });

  activeCount.textContent = activeMemberIds.length;
  scheduleActiveCount.textContent = formatActiveCountText(activeMemberIds.length);
  renderScheduleGrid(timeline, days, getMembersWithVacations(), 'No vacations have been saved on this board yet.');
}

function ensureCurrentMemberRecord(vacations) {
  var member = state.currentMember;
  var target = vacations || state.vacations;

  if (!target.members[member.id] || typeof target.members[member.id] !== 'object' || Array.isArray(target.members[member.id])) {
    target.members[member.id] = {
      memberId: member.id,
      ranges: [],
    };
  }

  target.members[member.id].fullName = member.fullName;
  target.members[member.id].username = member.username;
  target.members[member.id].initials = member.initials;
  target.members[member.id].updatedAt = new Date().toISOString();

  return target.members[member.id];
}

function createRangeId() {
  return state.currentMember.id + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

function addRange(event) {
  event.preventDefault();

  var startInput = document.getElementById('start-date');
  var endInput = document.getElementById('end-date');
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

  var range = {
    id: createRangeId(),
    start: formatDateOnly(start),
    end: formatDateOnly(end),
  };

  t.get('board', 'shared', STORAGE_KEY, { version: 1, members: {} })
    .then(function(latest) {
      var vacations = normalizeVacations(latest);
      var memberRecord = ensureCurrentMemberRecord(vacations);
      memberRecord.ranges = Array.isArray(memberRecord.ranges) ? memberRecord.ranges : [];
      memberRecord.ranges.push(range);
      return saveVacations(vacations);
    })
    .then(function() {
      if (state.startPicker && state.endPicker) {
        state.startPicker.clear();
        state.endPicker.clear();
      } else {
        startInput.value = '';
        endInput.value = '';
      }

      setMessage('');
      render();
    })
    .catch(function(error) {
      setMessage('Could not save: ' + error.message);
    });
}

function removeRange(rangeId) {
  t.get('board', 'shared', STORAGE_KEY, { version: 1, members: {} })
    .then(function(latest) {
      var vacations = normalizeVacations(latest);
      var memberRecord = ensureCurrentMemberRecord(vacations);
      memberRecord.ranges = (Array.isArray(memberRecord.ranges) ? memberRecord.ranges : []).filter(function(range) {
        return range.id !== rangeId;
      });

      if (memberRecord.ranges.length === 0) {
        delete vacations.members[state.currentMember.id];
      }

      return saveVacations(vacations);
    })
    .then(function() {
      setMessage('');
      render();
    })
    .catch(function(error) {
      setMessage('Could not remove: ' + error.message);
    });
}

document.getElementById('vacation-form').addEventListener('submit', addRange);
document.getElementById('history-button').addEventListener('click', openHistory);
document.getElementById('history-close-button').addEventListener('click', closeHistory);
document.getElementById('history-panel').addEventListener('click', function(event) {
  if (event.target.id === 'history-panel') {
    closeHistory();
  }
});
document.addEventListener('keydown', function(event) {
  var panel = document.getElementById('history-panel');

  if (event.key === 'Escape' && !panel.classList.contains('hidden')) {
    closeHistory();
  }
});
initDatePickers();

t.render(function() {
  return loadData();
});
