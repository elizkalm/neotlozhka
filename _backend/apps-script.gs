/**
 * Приёмник заявок с лендинга «Маркетинг-неотложка».
 *
 * Что делает: принимает POST из формы, дописывает строку в Google-таблицу
 * и присылает уведомление в Telegram.
 *
 * Зачем так, а не напрямую из браузера: токен бота нельзя класть в код
 * страницы — его увидит любой, кто откроет исходник, и сможет писать от
 * имени бота. Здесь токен лежит в свойствах скрипта, наружу не попадает.
 *
 * --------------------------------------------------------------------------
 * КАК ПОДКЛЮЧИТЬ (делается один раз, ~10 минут)
 *
 * 1. Создать бота
 *    В Telegram написать @BotFather → /newbot → имя и логин бота.
 *    Он пришлёт токен вида 1234567890:AAF... — это TELEGRAM_TOKEN.
 *
 * 2. Узнать, куда слать
 *    Написать своему боту любое сообщение (или добавить его в общий чат
 *    и написать там). Затем открыть в браузере:
 *    https://api.telegram.org/bot<ТОКЕН>/getUpdates
 *    Найти "chat":{"id":...} — это TELEGRAM_CHAT_ID. У группы id с минусом.
 *
 * 3. Завести таблицу
 *    Создать Google-таблицу, скопировать её id из адреса:
 *    docs.google.com/spreadsheets/d/ВОТ_ЭТО/edit — это SHEET_ID.
 *
 * 4. Создать скрипт
 *    script.google.com → Новый проект → вставить этот файл целиком.
 *    Слева «Настройки проекта» → «Свойства скрипта» → добавить три штуки:
 *      TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, SHEET_ID
 *
 * 5. Опубликовать
 *    «Начать развёртывание» → «Веб-приложение»
 *      Запуск от имени: я
 *      Доступ: все
 *    Скопировать полученный адрес /exec.
 *
 * 6. Вставить адрес в сайт
 *    В файле site/script.js в самом верху заменить пустую строку:
 *    var FORM_ENDPOINT = 'https://script.google.com/macros/s/..../exec';
 * --------------------------------------------------------------------------
 */

function doPost(e) {
  try {
    var data = (e && e.parameter) ? e.parameter : {};
    var props = PropertiesService.getScriptProperties();

    var row = [
      new Date(),
      data.form || '',      // audit | podborka
      data.name || '',
      data.phone || data.contact || '',
      data.site || data.nisha || '',
      data.page || ''
    ];

    var sheetId = props.getProperty('SHEET_ID');
    if (sheetId) {
      var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Дата', 'Форма', 'Имя', 'Контакт', 'Сайт или ниша', 'Страница']);
      }
      sheet.appendRow(row);
    }

    var token = props.getProperty('TELEGRAM_TOKEN');
    var chat = props.getProperty('TELEGRAM_CHAT_ID');
    if (token && chat) {
      var title = data.form === 'podborka' ? 'Запрос подборки кейсов' : 'Заявка на аудит';
      var text = [
        '🚑 ' + title,
        '',
        'Имя: ' + (data.name || '—'),
        'Контакт: ' + (data.phone || data.contact || '—'),
        (data.site ? 'Сайт: ' + data.site : ''),
        (data.nisha ? 'Ниша: ' + data.nisha : '')
      ].filter(String).join('\n');

      UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'post',
        payload: { chat_id: chat, text: text },
        muteHttpExceptions: true
      });
    }

    return json({ ok: true });
  } catch (err) {
    // Заявку терять нельзя: пишем ошибку в журнал выполнения,
    // но наружу отвечаем спокойно, чтобы человек увидел «принято».
    console.error(err);
    return json({ ok: false });
  }
}

function doGet() {
  return json({ ok: true, hint: 'Приёмник заявок работает. Данные принимаются методом POST.' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
