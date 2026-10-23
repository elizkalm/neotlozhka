/**
 * Приёмник заявок с лендинга «Маркетинг-неотложка».
 *
 * Что делает: принимает POST из формы и рассылает заявку —
 * на почту, в Telegram и, если задана таблица, строкой в Google-таблицу.
 *
 * Зачем так, а не напрямую из браузера: токен бота нельзя класть в код
 * страницы — его увидит любой, кто откроет исходник. Здесь он лежит
 * в свойствах скрипта и наружу не попадает.
 *
 * --------------------------------------------------------------------------
 * ЧТО НАСТРОИТЬ
 *
 * Почта — работает сразу, ничего подключать не надо. Адреса ниже, в MAIL_TO.
 *
 * Telegram — по желанию. В «Настройках проекта» → «Свойства скрипта»:
 *   TELEGRAM_TOKEN  — токен бота от @BotFather
 *   TELEGRAM_CHAT_ID — куда слать, у группы id с минусом
 *
 * Таблица — по желанию. Там же:
 *   SHEET_ID — из адреса таблицы, кусок между /d/ и /edit
 *
 * После правки кода обязательно «Начать развёртывание» → «Управление
 * развёртываниями» → карандаш → «Создать» → новая версия. Без этого
 * сайт продолжит обращаться к старому коду.
 * --------------------------------------------------------------------------
 */

/** Куда присылать заявки. Можно указать несколько адресов через запятую. */
var MAIL_TO = 'landlizz@yandex.ru, neotlozhka-limar@yandex.ru';

function doPost(e) {
  try {
    var data = (e && e.parameter) ? e.parameter : {};
    var props = PropertiesService.getScriptProperties();

    var isPodborka = data.form === 'podborka';
    var title = isPodborka ? 'Запрос подборки кейсов' : 'Заявка на аудит';

    var name = data.name || '—';
    var contact = data.phone || data.contact || '—';
    var extra = data.site || data.nisha || '';
    var extraLabel = data.site ? 'Сайт' : (data.nisha ? 'Ниша' : '');
    var page = data.page || '';
    var when = Utilities.formatDate(new Date(), 'Europe/Moscow', 'dd.MM.yyyy HH:mm');

    // ---------- почта ----------
    // Главный канал: письмо приходит даже если Telegram отвалился.
    var lines = [
      '<b>' + title + '</b>',
      '',
      'Имя: ' + name,
      'Контакт: ' + contact,
      extraLabel ? (extraLabel + ': ' + extra) : '',
      '',
      'Время: ' + when + ' (МСК)',
      page ? ('Страница: ' + page) : '',
    ].filter(String);

    MailApp.sendEmail({
      to: MAIL_TO,
      subject: title + ' — ' + name + ', ' + contact,
      htmlBody: lines.join('<br>'),
      name: 'Сайт Маркетинг-неотложка',
    });

    // ---------- таблица (если задана) ----------
    var sheetId = props.getProperty('SHEET_ID');
    if (sheetId) {
      var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Дата', 'Форма', 'Имя', 'Контакт', 'Сайт или ниша', 'Страница']);
      }
      sheet.appendRow([new Date(), data.form || '', name, contact, extra, page]);
    }

    // ---------- Telegram (если задан) ----------
    var token = props.getProperty('TELEGRAM_TOKEN');
    var chat = props.getProperty('TELEGRAM_CHAT_ID');
    if (token && chat) {
      var text = [
        '🚑 ' + title,
        '',
        'Имя: ' + name,
        'Контакт: ' + contact,
        extraLabel ? (extraLabel + ': ' + extra) : '',
      ].filter(String).join('\n');

      UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'post',
        payload: { chat_id: chat, text: text },
        muteHttpExceptions: true,
      });
    }

    return json({ ok: true });
  } catch (err) {
    /* Заявку терять нельзя: пишем ошибку в журнал выполнения, но наружу
       отвечаем спокойно, чтобы человек увидел «принято». */
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
