# ConnectMessager Windows Desktop

Desktop-оболочка для `ConnectMessager` на `C#`, рассчитанная на `Windows 10/11`, с архитектурой `WPF + WebView2`.

Основная идея проекта:

- не переписывать рабочий web-мессенджер с нуля;
- использовать существующий сайт как главный UI и бизнес-слой;
- завернуть его в нативный Windows-клиент;
- добавить desktop-функции: отдельное окно, системные уведомления, визуальный фокус окна, tray, single-instance, bridge между сайтом и C#;
- подготовить проект к двум форматам доставки:
  - компактный desktop-клиент;
  - оффлайн portable/single-file сборка;
  - затем оффлайн установщик `ConnectMessager_Install.exe`.

Репозиторий web-проекта: [OpenFunRus/ConnectMessager](https://github.com/OpenFunRus/ConnectMessager)  
Тестовый домен: [testpobeda.duckdns.org](https://testpobeda.duckdns.org/)

## Почему выбрано именно это решение

Под текущее ТЗ это оптимальный путь:

- целевая платформа только `Windows`;
- приложение должно быть на `C#`;
- текущий мессенджер уже полноценно работает в web;
- в будущем нужны уведомления, захват экрана, камера, микрофон и звонки;
- нужен путь к portable/offline поставке.

Поэтому основа проекта:

1. `WPF` как зрелая и стабильная desktop-оболочка под Windows.
2. `WebView2` как встроенный Chromium/Edge-движок без Electron.
3. `Native Bridge` между вебом и C# для системных возможностей.
4. Подготовка к двум вариантам распространения:
   - легкая сборка через установку зависимостей;
   - более тяжелая оффлайн single-file сборка;
   - следующий этап: единый оффлайн установщик.

Это лучше, чем `Electron`/`CEF`, потому что:

- меньше размер;
- меньше потребление памяти;
- проще интеграция с Windows;
- нативный C#-код сразу готов для будущих desktop-функций.

## Что уже создано

Создана папка `windows` с полноценным desktop-проектом:

```text
windows/
  ConnectMessager.Windows.sln
  publish-framework-dependent.bat
  publish-single-file-offline.bat
  ConnectMessager.Desktop/
    App.xaml
    App.xaml.cs
    MainWindow.xaml
    MainWindow.xaml.cs
    ConnectMessager.Desktop.csproj
    app.manifest
    desktopsettings.json
    Configuration/
      DesktopSettings.cs
      DesktopSettingsLoader.cs
    Interop/
      DesktopBridgeModels.cs
      DesktopBridgeScript.cs
    Services/
      NativeNotificationService.cs
      WindowAttentionService.cs
```

## Что умеет текущий desktop-клиент

Сейчас проект уже реализует desktop-shell, который:

- открывает `ConnectMessager` внутри `WebView2`;
- использует отдельный `userDataFolder` для профиля webview;
- читает настройки из `desktopsettings.json`;
- поддерживает запуск только в одном экземпляре;
- умеет открывать внешние ссылки через системный браузер;
- перехватывает сообщения из web-приложения через `chrome.webview.postMessage`;
- отправляет обратно в сайт информацию о desktop-хосте;
- показывает системный `tray icon`;
- показывает нативные balloon-уведомления Windows;
- мигает окном/панелью задач при новых событиях;
- умеет обновлять unread badge в заголовке окна;
- готов к дальнейшему расширению под deep links, автообновление, installer, screen capture workflow и звонки.

## Архитектура

### 1. WPF Host

`MainWindow` это основное окно desktop-клиента. Оно содержит:

- верхнюю служебную панель;
- `WebView2`;
- overlay для стадий загрузки и ошибок;
- кнопки быстрого обновления и открытия сайта во внешнем браузере.

### 2. Desktop Settings

Файл `desktopsettings.json` задает:

- имя приложения;
- окружение;
- стартовый URL;
- папку профиля webview;
- доступность devtools;
- trusted origins.

За загрузку отвечает `Configuration/DesktopSettingsLoader.cs`.

### 3. Native Bridge

Bridge строится через `chrome.webview.postMessage(...)`.

На старте в webview автоматически инжектируется `window.ConnectMessagerDesktop`, который дает фронту понятный API:

```js
window.ConnectMessagerDesktop.notify("Новое сообщение", "Вам написал сотрудник", {
  unreadCount: 3
});

window.ConnectMessagerDesktop.flashWindow();
window.ConnectMessagerDesktop.setUnreadCount(5);
window.ConnectMessagerDesktop.openExternal("https://testpobeda.duckdns.org/");
window.ConnectMessagerDesktop.requestAppInfo();
```

Поддержанные команды на стороне desktop-shell:

- `desktop.app.ready`
- `desktop.info.request`
- `desktop.notification.show`
- `desktop.window.flash`
- `desktop.window.focus`
- `desktop.window.set-title`
- `desktop.external.open`
- `desktop.badge.set`

### 4. Native Services

Сейчас выделены два сервиса:

- `Services/NativeNotificationService.cs`
  - tray icon;
  - контекстное меню;
  - balloon-уведомления;
  - обновление tooltip по unread count.
- `Services/WindowAttentionService.cs`
  - мигание окна и taskbar-кнопки через Win32 API.

## Сборка

Проверенная локальная сборка:

```bash
dotnet build windows\ConnectMessager.Windows.sln -c Release
```

### Вариант 1. Компактная desktop-сборка

Скрипт:

```bat
windows\publish-framework-dependent.bat
```

Что делает:

- публикует `win-x64` сборку;
- не вшивает весь .NET runtime;
- оставляет размер приложения меньше;
- подходит для сценария, где рантаймы ставятся отдельно или через установщик.

### Вариант 2. Offline / Portable / Single-file сборка

Скрипт:

```bat
windows\publish-single-file-offline.bat
```

Что делает:

- публикует `win-x64`;
- включает `self-contained`;
- собирает single-file билд;
- подходит как база для portable/offline варианта.

### Результат текущей локальной проверки

На этой машине проект уже был собран и опубликован:

- `dotnet build windows\ConnectMessager.Windows.sln -c Release` - успешно;
- `windows\publish-framework-dependent.bat` - успешно;
- `windows\publish-single-file-offline.bat` - успешно.

Фактические артефакты после publish:

- `windows/artifacts/framework-dependent/ConnectMessager.exe` - около `151 KB` самого launcher-файла;
- вся папка `framework-dependent` - около `26 MB` вместе с библиотеками проекта;
- `windows/artifacts/single-file-offline/ConnectMessager.exe` - около `78 MB` как один оффлайн portable exe.

Важно понимать компромисс:

- если нужен реально один файл `ConnectMessager.exe`, размер будет больше;
- если нужен минимальный размер, лучше ставить зависимости через установщик;
- итоговая стратегия для продакшена обычно такая:
  1. либо компактный клиент + installer;
  2. либо single-file portable;
  3. либо single-file + offline installer.

## Что важно про WebView2

`WebView2` сам по себе не обязан раздувать приложение до сотен мегабайт. Обычно размер вырастает из-за:

- `self-contained` publish;
- single-file публикации;
- упаковки .NET runtime внутрь;
- упаковки дополнительных зависимостей в один portable-пакет.

В этом проекте уже подготовлены оба сценария:

- компактный;
- оффлайн single-file.

Следующим шагом будет оффлайн установщик, который сможет ставить:

- сам `ConnectMessager.exe`;
- `WebView2 Runtime`;
- нужный `.NET Desktop Runtime`;
- дополнительные библиотеки.

## Что делать фронтенду для desktop-функций

Чтобы web-клиент начал использовать нативные возможности Windows, во frontend можно вызывать bridge:

```js
if (window.ConnectMessagerDesktop) {
  window.ConnectMessagerDesktop.notify("Новое сообщение", "Сообщение от Анны", {
    unreadCount: 7
  });
}
```

Для интеграции с unread/bell/чатами логика обычно такая:

1. web получает новое сообщение;
2. если окно не в фокусе или чат не открыт, фронт шлет `desktop.notification.show`;
3. desktop shell показывает уведомление и мигание окна;
4. фронт обновляет unread через `desktop.badge.set`.

## Следующий этап

Следующим шагом нужно сделать `ConnectMessager_Install.exe` в оффлайн формате.

План на установщик:

1. Упаковать desktop build.
2. Добавить в установщик оффлайн `WebView2 Runtime`.
3. Добавить оффлайн `.NET Desktop Runtime` или использовать self-contained сборку.
4. Сделать ярлык, uninstall, проверку версии и установку зависимостей без интернета.
5. Получить два финальных артефакта:
   - `ConnectMessager.exe`
   - `ConnectMessager_Install.exe`

## Итог

Сделан базовый, но уже рабочий desktop-проект `ConnectMessager` на `C#`, который соответствует выбранной стратегии:

- `WPF + WebView2`;
- нативные уведомления и tray;
- bridge между web и desktop;
- подготовка к portable/offline;
- база для будущего оффлайн-инсталлятора и дальнейших desktop-функций.
