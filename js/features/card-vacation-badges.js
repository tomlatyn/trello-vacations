var VACATION_BADGE_ICON = './images/icon.png';
var VACATION_BADGE_STORAGE_KEY = 'vacations';

function parseVacationBadgeDate(value) {
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
  var start = parseVacationBadgeDate(range.start);
  var end = parseVacationBadgeDate(range.end);

  if (!start || !end) {
    return false;
  }

  return start <= today && today <= end;
}

function getCardMembers(card) {
  return card.members || card.memberIds || card.idMembers || [];
}

function getCardMemberId(member) {
  return typeof member === 'string' ? member : member.id;
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
    var boardMembers = boardData.members || boardData || [];
    var vacations = results[2];

    return getActiveCardVacations(card, vacations, boardMembers);
  });
}

function cardBadgesHandler(t) {
  return loadCardVacationData(t).then(function(activeVacations) {
    if (activeVacations.length === 0) {
      return [];
    }

    return [{
      icon: VACATION_BADGE_ICON,
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

    return [{
      title: 'Vacations',
      text: activeVacations.map(function(item) {
        return item.name + ' (' + formatVacationBadgeDate(item.range.start) + ' - ' + formatVacationBadgeDate(item.range.end) + ')';
      }).join(', '),
      color: 'orange',
    }];
  });
}
