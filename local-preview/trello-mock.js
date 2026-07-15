var TrelloMock = (function() {
  var STORAGE_PREFIX = 'trello_vacations_preview__';
  var STORAGE_KEY = STORAGE_PREFIX + 'board__shared__vacations';
  var SEEDED_KEY = STORAGE_PREFIX + 'seeded_v2';
  var themeListeners = [];
  var currentTheme = localStorage.getItem(STORAGE_PREFIX + 'theme') || 'light';

  var members = [
    { id: 'user123', fullName: 'John Doe', username: 'johndoe', initials: 'JD' },
    { id: 'user456', fullName: 'Jane Smith', username: 'janesmith', initials: 'JS' },
    { id: 'user789', fullName: 'Mike Johnson', username: 'mikej', initials: 'MJ' },
    { id: 'user101', fullName: 'Sarah Wilson', username: 'sarahw', initials: 'SW' },
    { id: 'user202', fullName: 'Tom Brown', username: 'tombrown', initials: 'TB' },
    { id: 'user303', fullName: 'Lisa Davis', username: 'lisad', initials: 'LD' },
  ];

  function addDays(date, days) {
    var next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
  }

  function formatDateOnly(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function buildSeedVacations() {
    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return {
      version: 1,
      members: {
        user123: {
          memberId: 'user123',
          fullName: 'John Doe',
          username: 'johndoe',
          initials: 'JD',
          updatedAt: new Date().toISOString(),
          ranges: [
            {
              id: 'preview-current-user-active',
              start: formatDateOnly(addDays(today, -2)),
              end: formatDateOnly(addDays(today, 3)),
              note: 'Family trip',
            },
            {
              id: 'preview-current-user-autumn',
              start: formatDateOnly(addDays(today, 63)),
              end: formatDateOnly(addDays(today, 70)),
              note: 'Autumn break',
            },
            {
              id: 'preview-current-user-distant',
              start: formatDateOnly(addDays(today, 145)),
              end: formatDateOnly(addDays(today, 150)),
              note: 'Distant holiday',
            },
          ],
        },
        user456: {
          memberId: 'user456',
          fullName: 'Jane Smith',
          username: 'janesmith',
          initials: 'JS',
          updatedAt: new Date().toISOString(),
          ranges: [
            {
              id: 'preview-jane-future',
              start: formatDateOnly(addDays(today, 13)),
              end: formatDateOnly(addDays(today, 18)),
              note: 'Beach',
            },
          ],
        },
        user789: {
          memberId: 'user789',
          fullName: 'Mike Johnson',
          username: 'mikej',
          initials: 'MJ',
          updatedAt: new Date().toISOString(),
          ranges: [
            {
              id: 'preview-mike-future',
              start: formatDateOnly(addDays(today, 33)),
              end: formatDateOnly(addDays(today, 39)),
              note: 'Out of office',
            },
          ],
        },
        user101: {
          memberId: 'user101',
          fullName: 'Sarah Wilson',
          username: 'sarahw',
          initials: 'SW',
          updatedAt: new Date().toISOString(),
          ranges: [
            {
              id: 'preview-sarah-future',
              start: formatDateOnly(addDays(today, 48)),
              end: formatDateOnly(addDays(today, 54)),
              note: 'Vacation',
            },
          ],
        },
        user202: {
          memberId: 'user202',
          fullName: 'Tom Brown',
          username: 'tombrown',
          initials: 'TB',
          updatedAt: new Date().toISOString(),
          ranges: [
            {
              id: 'preview-tom-future',
              start: formatDateOnly(addDays(today, 76)),
              end: formatDateOnly(addDays(today, 82)),
              note: 'Mountain trip',
            },
            {
              id: 'preview-tom-distant',
              start: formatDateOnly(addDays(today, 210)),
              end: formatDateOnly(addDays(today, 222)),
              note: 'Long-haul trip',
            },
          ],
        },
        user303: {
          memberId: 'user303',
          fullName: 'Lisa Davis',
          username: 'lisad',
          initials: 'LD',
          updatedAt: new Date().toISOString(),
          ranges: [
            {
              id: 'preview-lisa-distant',
              start: formatDateOnly(addDays(today, 320)),
              end: formatDateOnly(addDays(today, 326)),
              note: 'Winter break',
            },
          ],
        },
      },
    };
  }

  function seedData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSeedVacations()));
    localStorage.setItem(SEEDED_KEY, '1');
  }

  function ensureSeeded() {
    if (!localStorage.getItem(SEEDED_KEY)) {
      seedData();
    }
  }

  function getVacationData() {
    ensureSeeded();
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : buildSeedVacations();
  }

  function setVacationData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function createMockT() {
    return {
      board: function() {
        return Promise.resolve({ members: members });
      },

      member: function() {
        var selectedId = localStorage.getItem(STORAGE_PREFIX + 'memberId') || 'user123';
        var member = members.find(function(item) {
          return item.id === selectedId;
        }) || members[0];
        var result = {};

        Array.prototype.slice.call(arguments).forEach(function(field) {
          if (field === 'all') {
            Object.assign(result, member);
          } else if (Object.prototype.hasOwnProperty.call(member, field)) {
            result[field] = member[field];
          }
        });

        return Promise.resolve(result);
      },

      get: function(scope, visibility, key, fallback) {
        if (scope === 'board' && visibility === 'shared' && key === 'vacations') {
          return Promise.resolve(getVacationData());
        }

        return Promise.resolve(fallback || null);
      },

      set: function(scope, visibility, key, value) {
        if (scope === 'board' && visibility === 'shared' && key === 'vacations') {
          setVacationData(value);
        }

        return Promise.resolve();
      },

      modal: function(options) {
        window.location.href = 'vacations.html';
        return Promise.resolve(options);
      },

      render: function(callback) {
        return Promise.resolve(callback());
      },

      getContext: function() {
        return {
          theme: currentTheme,
          initialTheme: currentTheme,
        };
      },

      subscribeToThemeChanges: function(callback) {
        themeListeners.push(callback);
      },

      _triggerThemeChange: function(theme) {
        currentTheme = theme;
        localStorage.setItem(STORAGE_PREFIX + 'theme', theme);
        themeListeners.forEach(function(callback) {
          callback(theme);
        });
      },
    };
  }

  function reset() {
    seedData();
    window.location.reload();
  }

  function setCurrentMember(memberId) {
    localStorage.setItem(STORAGE_PREFIX + 'memberId', memberId);
    window.location.reload();
  }

  ensureSeeded();

  return {
    members: members,
    createMockT: createMockT,
    getVacationData: getVacationData,
    reset: reset,
    setCurrentMember: setCurrentMember,
  };
}());

window.TrelloPowerUp = {
  iframe: TrelloMock.createMockT,
  initialize: function() {},
  Promise: Promise,
};
