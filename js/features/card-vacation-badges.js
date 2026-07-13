var VACATION_BADGE_ICON = './images/icon.png';
var VACATION_BADGE_STORAGE_KEY = 'vacations';
var VACATION_BADGE_ASSET_BASE = document.currentScript && document.currentScript.src
  ? new URL('../../', document.currentScript.src).href
  : window.location.href;

function resolveVacationBadgeIconUrl(path) {
  return new URL(path.replace(/^\.\//, ''), VACATION_BADGE_ASSET_BASE).href;
}

function parseVacationBadgeDate(value) {
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

function formatVacationBadgeDate(value) {
  var date = parseVacationBadgeDate(value);

  if (!date) {
    return value || '';
  }

  var day = String(date.getDate()).padStart(2, '0');
  var month = String(date.getMonth() + 1).padStart(2, '0');
  return day + '.' + month + '.' + date.getFullYear();
}

function todayVacationBadgeDate() {
  var now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isVacationBadgeRangeActive(range, today) {
  if (!range) {
    return false;
  }

  var start = parseVacationBadgeDate(range.start);
  var end = parseVacationBadgeDate(range.end);

  if (!start || !end) {
    return false;
  }

  return start <= today && today <= end;
}

function getCardMembers(card) {
  if (!card) {
    return [];
  }

  var members = card.members || card.memberIds || card.idMembers || [];
  return Array.isArray(members) ? members : [];
}

function getCardMemberId(member) {
  return typeof member === 'string' ? member : member && member.id;
}

function getVacationMemberName(memberRecord, boardMember, memberId) {
  return (memberRecord && (memberRecord.fullName || memberRecord.username)) ||
    (boardMember && (boardMember.fullName || boardMember.username)) ||
    memberId;
}

function getActiveCardVacations(card, vacations, boardMembers) {
  var today = todayVacationBadgeDate();
  var members = getCardMembers(card);
  var vacationMembers = vacations && vacations.members ? vacations.members : {};

  return members.map(function(member) {
    var memberId = getCardMemberId(member);

    if (!memberId) {
      return null;
    }

    var memberRecord = vacationMembers[memberId];
    var ranges = memberRecord && Array.isArray(memberRecord.ranges) ? memberRecord.ranges : [];
    var activeRange = ranges.find(function(range) {
      return isVacationBadgeRangeActive(range, today);
    });

    if (!activeRange) {
      return null;
    }

    var boardMember = boardMembers.find(function(item) {
      return item.id === memberId;
    });

    return {
      id: memberId,
      name: getVacationMemberName(memberRecord, boardMember, memberId),
      range: activeRange,
    };
  }).filter(Boolean);
}

function loadCardVacationData(t) {
  return window.TrelloPowerUp.Promise.all([
    t.card('id', 'members'),
    t.board('members'),
    t.get('board', 'shared', VACATION_BADGE_STORAGE_KEY, { version: 1, members: {} }),
  ]).then(function(results) {
    var card = results[0];
    var boardData = results[1];
    var boardMembers = boardData && (boardData.members || boardData) || [];
    var vacations = results[2];

    if (!Array.isArray(boardMembers)) {
      boardMembers = [];
    }

    return getActiveCardVacations(card, vacations, boardMembers);
  });
}

function cardBadgesHandler(t) {
  return loadCardVacationData(t).then(function(activeVacations) {
    if (activeVacations.length === 0) {
      return [];
    }

    return [{
      icon: resolveVacationBadgeIconUrl(VACATION_BADGE_ICON),
      text: String(activeVacations.length),
      color: 'orange',
    }];
  });
}

function cardDetailBadgesHandler(t) {
  return loadCardVacationData(t).then(function(activeVacations) {
    if (activeVacations.length === 0) {
      return [];
    }

    var text = activeVacations.map(function(vacation) {
      return vacation.name + ' · ' + formatVacationBadgeDate(vacation.range.start) + ' - ' + formatVacationBadgeDate(vacation.range.end);
    }).join('  •  ');

    return [{
      title: activeVacations.length === 1 ? 'Vacation' : 'Vacations',
      text: text,
      color: 'orange',
      callback: openVacationsModal,
    }];
  });
}
